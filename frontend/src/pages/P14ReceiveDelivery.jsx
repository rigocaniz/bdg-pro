import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Package,
  Boxes,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';

export const P14ReceiveDelivery = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [linesReceive, setLinesReceive] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/requests/${id}`);
        const data = res.data;
        setRequest(data);

        setLinesReceive(
          data.lineas.map((l) => {
            const restanteConfirmado = l.cant_confirmada - (l.cant_recibida || 0);
            return {
              producto_id: l.producto_id,
              codigo: l.codigo,
              nombre: l.nombre,
              cant_solicitada: l.cant_solicitada,
              cant_confirmada: l.cant_confirmada,
              cant_recibida_previa: l.cant_recibida || 0,
              recibido: restanteConfirmado > 0,
              cant_recibida: Math.max(0, restanteConfirmado),
              motivo: l.motivo || ''
            };
          })
        );
      } catch (err) {
        console.error(err);
        showToast('Error al cargar la solicitud.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleToggleCheck = (index) => {
    const updated = [...linesReceive];
    const item = updated[index];
    const newCheck = !item.recibido;
    item.recibido = newCheck;
    if (!newCheck) {
      item.cant_recibida = 0;
    } else {
      const max = item.cant_confirmada - item.cant_recibida_previa;
      item.cant_recibida = max;
    }
    setLinesReceive(updated);
  };

  const handleQtyChange = (index, value) => {
    const parsed = parseInt(value, 10) || 0;
    const max = linesReceive[index].cant_confirmada - linesReceive[index].cant_recibida_previa;
    const val = Math.max(0, Math.min(parsed, max));

    const updated = [...linesReceive];
    updated[index].cant_recibida = val;
    updated[index].recibido = val > 0;
    setLinesReceive(updated);
  };

  const handleMotivoChange = (index, motivoVal) => {
    const updated = [...linesReceive];
    updated[index].motivo = motivoVal;
    setLinesReceive(updated);
  };

  // Cálculo del resumen que entrará al inventario
  const productosAEntrar = linesReceive.filter((l) => l.cant_recibida > 0);
  const totalUnidadesEntrantes = productosAEntrar.reduce((acc, l) => acc + l.cant_recibida, 0);

  // Determinar si hay faltantes en lo confirmado
  const hayFaltante = linesReceive.some((l) => {
    const totalRecibido = l.cant_recibida_previa + l.cant_recibida;
    return totalRecibido < l.cant_confirmada;
  });

  const handleConfirmReception = async () => {
    setErrorMsg('');

    // Validar motivo obligatorio si es menor a lo confirmado
    for (const l of linesReceive) {
      const totalRecibido = l.cant_recibida_previa + l.cant_recibida;
      if (totalRecibido < l.cant_confirmada && !l.motivo.trim()) {
        setErrorMsg(
          `Debe especificar el motivo obligatorio para '${l.nombre}' (faltante, dañado, producto incorrecto, etc.).`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/requests/${id}/receive`, {
        lineas: linesReceive.map((l) => ({
          producto_id: l.producto_id,
          recibido: l.recibido,
          cant_recibida: l.cant_recibida,
          motivo: l.motivo || undefined
        })),
        observaciones_recepcion: observaciones
      });

      showToast(res.data.mensaje || 'Recepción registrada con éxito.', 'success');
      navigate('/solicitudes');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al procesar la recepción.';
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

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Solicitud no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/solicitudes"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-linear-to-b from-emerald-50/50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-sky-800">{request.numero}</span>
              <StatusBadge estado={request.estado} />
              {hayFaltante && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-orange-100 text-orange-900 border border-orange-300">
                  Resultará en Entrega Parcial
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 mt-1">
              Registro de Recepción de Entrega (Rol Bodega)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspeccione los bienes físicos y confirme las unidades recibidas para ingresar al inventario (RF-NEG-04).
            </p>
          </div>

          <div className="text-right text-xs text-slate-600 space-y-1 self-start sm:self-auto">
            <p><strong className="text-slate-800">Proveedor:</strong> {request.proveedor_nombre}</p>
            <p><strong className="text-slate-800">Fecha Requerida:</strong> {request.fecha_entrega}</p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tabla de recepción */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Productos Confirmados por el Proveedor</h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">Recibido</th>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-center">Confirmado</th>
                    <th className="py-2.5 px-3 text-center">Ya Ingresado</th>
                    <th className="py-2.5 px-3 text-center w-28">Recibido Ahora</th>
                    <th className="py-2.5 px-3 w-64">Motivo si es menor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {linesReceive.map((line, idx) => {
                    const totalRecibido = line.cant_recibida_previa + line.cant_recibida;
                    const isFaltante = totalRecibido < line.cant_confirmada;

                    return (
                      <tr key={line.producto_id} className={isFaltante ? 'bg-orange-50/30' : 'hover:bg-slate-50/50'}>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(idx)}
                            className="text-slate-600 hover:text-emerald-600 cursor-pointer"
                          >
                            {line.recibido ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                          {line.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {line.nombre}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                          {line.cant_confirmada}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                          {line.cant_recibida_previa}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={line.cant_confirmada - line.cant_recibida_previa}
                            value={line.cant_recibida}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className={`w-20 text-center py-1.5 border rounded-lg font-bold text-sm ${
                              isFaltante
                                ? 'border-orange-400 bg-orange-50 text-orange-900'
                                : 'border-slate-300 bg-white text-slate-800'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          {isFaltante ? (
                            <select
                              value={line.motivo}
                              onChange={(e) => handleMotivoChange(idx, e.target.value)}
                              className="w-full py-1.5 px-2 border border-orange-300 rounded-lg bg-white text-slate-800 font-medium"
                            >
                              <option value="">-- Motivo obligatorio --</option>
                              <option value="faltante">Faltante de entrega</option>
                              <option value="dañado">Producto dañado / en mal estado</option>
                              <option value="producto incorrecto">Producto incorrecto</option>
                              <option value="otro">Otro motivo justificado</option>
                            </select>
                          ) : (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen de lo que entrará al inventario (Sección 9 - P14) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-2 text-xs">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Resumen de Unidades que Ingresarán al Inventario:
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {totalUnidadesEntrantes} unidades en total
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {productosAEntrar.map((p) => (
                <div key={p.producto_id} className="p-2 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                  <p className="font-bold text-slate-800 truncate">{p.nombre}</p>
                  <p className="text-[11px] text-emerald-700 font-bold font-mono">
                    +{p.cant_recibida} unidades
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Observaciones de la Recepción (Opcional)</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Estado del empaque, número de guía o transportista..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/solicitudes"
              className="px-4 py-2 font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </Link>

            <button
              type="button"
              disabled={submitting || totalUnidadesEntrantes === 0}
              onClick={handleConfirmReception}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Recepción e Ingresar a Inventario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
