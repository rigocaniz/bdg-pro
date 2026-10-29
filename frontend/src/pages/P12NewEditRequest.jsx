import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Truck,
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const P12NewEditRequest = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selector temporal para agregar producto
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Fecha mínima: hoy en formato YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers', { params: { activo: true, size: 100 } }),
          api.get('/products', { params: { activo: true, size: 200 } })
        ]);
        setSuppliers(supRes.data.items || []);
        setProducts(prodRes.data.items || []);

        if (isEditing) {
          const reqRes = await api.get(`/requests/${id}`);
          const data = reqRes.data;
          setProveedorId(data.proveedor_id);
          setFechaEntrega(data.fecha_entrega);
          setObservaciones(data.observaciones || '');
          setLineas(
            data.lineas.map((l) => ({
              producto_id: l.producto_id,
              codigo: l.codigo,
              nombre: l.nombre,
              cant_solicitada: l.cant_solicitada
            }))
          );
        } else {
          // Pre-seleccionar fecha mañana por comodidad
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 2);
          setFechaEntrega(tomorrow.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error(err);
        showToast('Error al cargar datos base.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditing]);

  const handleAddLine = () => {
    if (!selectedProdId) {
      showToast('Seleccione un producto para agregar.', 'warning');
      return;
    }
    if (selectedQty <= 0) {
      showToast('La cantidad debe ser mayor a 0.', 'warning');
      return;
    }
    // Evitar productos duplicados en la misma solicitud (RF-NEG-02)
    if (lineas.some((l) => l.producto_id === selectedProdId)) {
      showToast('No se puede repetir el mismo producto en la solicitud.', 'warning');
      return;
    }

    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    setLineas([
      ...lineas,
      {
        producto_id: prod.id,
        codigo: prod.codigo,
        nombre: prod.nombre,
        cant_solicitada: parseInt(selectedQty, 10)
      }
    ]);

    setSelectedProdId('');
    setSelectedQty(1);
  };

  const handleRemoveLine = (index) => {
    setLineas(lineas.filter((_, i) => i !== index));
  };

  const handleQtyChange = (index, newQty) => {
    const val = parseInt(newQty, 10);
    if (val > 0) {
      const updated = [...lineas];
      updated[index].cant_solicitada = val;
      setLineas(updated);
    }
  };

  const handleSave = async (enviarInmediatamente = false) => {
    setErrorMsg('');
    if (!proveedorId) {
      setErrorMsg('Debe seleccionar un proveedor activo.');
      return;
    }
    if (!fechaEntrega) {
      setErrorMsg('Debe indicar la fecha de entrega requerida.');
      return;
    }
    if (fechaEntrega < todayStr) {
      setErrorMsg('La fecha de entrega no puede ser anterior a la fecha actual.');
      return;
    }
    if (lineas.length === 0) {
      setErrorMsg('Debe incluir al menos un producto en la solicitud.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        proveedor_id: proveedorId,
        fecha_entrega: fechaEntrega,
        observaciones,
        lineas: lineas.map((l) => ({
          producto_id: l.producto_id,
          cant_solicitada: l.cant_solicitada
        })),
        enviar_inmediatamente: enviarInmediatamente
      };

      if (isEditing) {
        await api.patch(`/requests/${id}`, payload);
        if (enviarInmediatamente) {
          await api.post(`/requests/${id}/send`);
          showToast('Solicitud actualizada y enviada al proveedor.', 'success');
        } else {
          showToast('Borrador de solicitud actualizado exitosamente.', 'success');
        }
      } else {
        const res = await api.post('/requests', payload);
        const numero = res.data.numero;
        if (enviarInmediatamente) {
          showToast(`Solicitud ${numero} creada y enviada al proveedor.`, 'success');
        } else {
          showToast(`Solicitud ${numero} guardada como Borrador.`, 'success');
        }
      }

      navigate('/solicitudes');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar la solicitud.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/solicitudes"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a lista de solicitudes
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-linear-to-b from-sky-50/60 to-white">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-600" />
            {isEditing ? 'Editar Solicitud (Borrador)' : 'Crear Nueva Solicitud a Proveedor'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Indique el proveedor, la fecha de entrega requerida y las líneas de producto (RF-NEG-02).
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Proveedor Activo *
              </label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Seleccionar proveedor --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} - {s.nombre} (NIT: {s.nit})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fecha de Entrega Requerida *
              </label>
              <input
                type="date"
                min={todayStr}
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-400">
                No puede ser anterior a la fecha actual.
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Observaciones (Opcional)</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Instrucciones especiales de entrega, horarios, condiciones..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Agregar productos a la solicitud */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Líneas de Solicitud</h3>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-end gap-3">
              <div className="flex-1 w-full space-y-1">
                <label className="font-semibold text-slate-700">Buscar Producto</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden"
                >
                  <option value="">-- Seleccionar producto para agregar --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} - {p.nombre} ({p.unidad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-32 space-y-1">
                <label className="font-semibold text-slate-700">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-center font-bold focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={handleAddLine}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            </div>

            {/* Tabla de líneas agregadas */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Nombre del Producto</th>
                    <th className="py-2.5 px-3 text-center w-36">Cant. Solicitada</th>
                    <th className="py-2.5 px-3 text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lineas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No ha agregado ninguna línea de producto a la solicitud.
                      </td>
                    </tr>
                  ) : (
                    lineas.map((linea, idx) => (
                      <tr key={linea.producto_id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                          {linea.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {linea.nombre}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={linea.cant_solicitada}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="w-20 text-center py-1 border border-slate-300 rounded font-bold bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave(false)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar como Borrador</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                'Procesando...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar al Proveedor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
