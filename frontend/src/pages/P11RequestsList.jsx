import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  PlusCircle,
  Eye,
  Send,
  XCircle,
  CheckCircle,
  Truck,
  ArrowRight,
  Filter
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';

export const P11RequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [q, setQ] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal cancelar solicitud
  const [cancelingReq, setCancelingReq] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelingLoading, setCancelingLoading] = useState(false);

  const { user, hasPermission, hasRole } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests', {
        params: {
          q: q || undefined,
          estado: estadoFilter || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
          page,
          size
        }
      });
      setRequests(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar la lista de solicitudes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, estadoFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleSendDraft = async (reqId) => {
    if (!window.confirm('¿Desea enviar formalmente esta solicitud al proveedor?')) return;
    try {
      await api.post(`/requests/${reqId}/send`);
      showToast('Solicitud enviada exitosamente al proveedor.', 'success');
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al enviar la solicitud.';
      showToast(msg, 'error');
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelingReq || !cancelMotivo.trim()) return;

    setCancelingLoading(true);
    try {
      await api.post(`/requests/${cancelingReq.id}/cancel`, {
        motivo: cancelMotivo.trim()
      });
      showToast('Solicitud cancelada exitosamente.', 'success');
      setCancelingReq(null);
      setCancelMotivo('');
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al cancelar la solicitud.';
      showToast(msg, 'error');
    } finally {
      setCancelingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-600" />
            Solicitudes a Proveedores
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control integral del ciclo de vida de los pedidos (RF-NEG-02, RF-NEG-03, RF-NEG-04).
          </p>
        </div>

        {hasPermission('Crear / editar / cancelar solicitudes') && (
          <Link
            to="/solicitudes/nueva"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Solicitud
          </Link>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por número (SOL-...) u observaciones..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Enviada">Enviada</option>
              <option value="Por entregar">Por entregar</option>
              <option value="Entregada">Entregada</option>
              <option value="Entregada parcial">Entregada parcial</option>
              <option value="Cerrada con faltante">Cerrada con faltante</option>
              <option value="Rechazada">Rechazada</option>
              <option value="Cancelada">Cancelada</option>
            </select>

            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha entrega desde"
              className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            />
            <span className="text-xs text-slate-400">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha entrega hasta"
              className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            />

            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Requests table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4">Fecha Entrega</th>
                <th className="py-3.5 px-4">Líneas</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No se encontraron solicitudes registradas.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/solicitudes/${req.id}`}
                        className="font-mono font-bold text-sky-700 hover:text-sky-900"
                      >
                        {req.numero}
                      </Link>
                      {req.observaciones && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {req.observaciones}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {req.proveedor_nombre}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {req.fecha_entrega}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {req.lineas?.length || 0} productos
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        estado={req.estado}
                        esConfirmacionParcial={req.es_confirmacion_parcial}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Ver Detalle */}
                        <Link
                          to={`/solicitudes/${req.id}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Proveedor: Confirmar cantidades si está Enviada */}
                        {req.estado === 'Enviada' && hasRole('Proveedor') && (
                          <Link
                            to={`/solicitudes/${req.id}/confirmar`}
                            className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Confirmar
                          </Link>
                        )}

                        {/* Bodega: Registrar recepción si Por entregar o Entregada parcial */}
                        {(req.estado === 'Por entregar' || req.estado === 'Entregada parcial') && hasRole('Bodega') && (
                          <Link
                            to={`/solicitudes/${req.id}/recibir`}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <Truck className="w-3 h-3" />
                            Recibir
                          </Link>
                        )}

                        {/* Compras: Enviar si Borrador */}
                        {req.estado === 'Borrador' && hasPermission('Enviar solicitud al proveedor') && (
                          <button
                            onClick={() => handleSendDraft(req.id)}
                            className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Enviar al proveedor"
                          >
                            <Send className="w-3 h-3" />
                            Enviar
                          </button>
                        )}

                        {/* Compras: Cancelar si Borrador o Enviada */}
                        {(req.estado === 'Borrador' || req.estado === 'Enviada') && hasPermission('Crear / editar / cancelar solicitudes') && (
                          <button
                            onClick={() => setCancelingReq(req)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            title="Cancelar solicitud"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} solicitudes</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition font-medium"
            >
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              disabled={page * size >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal Cancelar con Motivo */}
      {cancelingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-rose-50">
              <h3 className="font-bold text-rose-900 text-base">Cancelar Solicitud {cancelingReq.numero}</h3>
              <p className="text-xs text-rose-700 mt-0.5">Esta acción es irreversible y cambiará el estado a Cancelada.</p>
            </div>

            <form onSubmit={handleConfirmCancel} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Motivo de la cancelación (Obligatorio):</label>
                <textarea
                  rows={3}
                  required
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Explique la razón de la cancelación..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelingReq(null)}
                  className="px-4 py-2 font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={cancelingLoading || !cancelMotivo.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {cancelingLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
