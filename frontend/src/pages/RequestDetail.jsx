import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Truck,
  Calendar,
  User,
  ArrowLeft,
  Send,
  Edit,
  XCircle,
  CheckCircle,
  Boxes,
  Lock,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';

export const RequestDetail = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal Cerrar con Faltante
  const [showCloseShortage, setShowCloseShortage] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { user, hasPermission, hasRole } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar la solicitud.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSendToSupplier = async () => {
    if (!window.confirm('¿Desea enviar formalmente esta solicitud al proveedor?')) return;
    setActionLoading(true);
    try {
      await api.post(`/requests/${id}/send`);
      showToast('Solicitud enviada al proveedor.', 'success');
      fetchDetail();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al enviar.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCloseShortage = async (e) => {
    e.preventDefault();
    if (!motivoCierre.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/requests/${id}/close-shortage`, { motivo: motivoCierre.trim() });
      showToast('Solicitud cerrada con faltante.', 'success');
      setShowCloseShortage(false);
      fetchDetail();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al cerrar solicitud.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
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
          Volver a lista de solicitudes
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-linear-to-b from-sky-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-bold text-sky-900">{request.numero}</span>
              <StatusBadge
                estado={request.estado}
                esConfirmacionParcial={request.es_confirmacion_parcial}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Creado el {new Date(request.creado_en).toLocaleString('es-GT')} por {request.creado_por_nombre || 'Compras'}
            </p>
          </div>

          {/* Contextual actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Borrador: Enviar o Editar */}
            {request.estado === 'Borrador' && hasPermission('Enviar solicitud al proveedor') && (
              <button
                onClick={handleSendToSupplier}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar al Proveedor
              </button>
            )}

            {/* Enviada: Confirmar (Proveedor) */}
            {request.estado === 'Enviada' && hasRole('Proveedor') && (
              <Link
                to={`/solicitudes/${id}/confirmar`}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Confirmar Entrega
              </Link>
            )}

            {/* Por entregar o Entregada parcial: Recibir (Bodega) */}
            {(request.estado === 'Por entregar' || request.estado === 'Entregada parcial') && hasRole('Bodega') && (
              <Link
                to={`/solicitudes/${id}/recibir`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                Registrar Recepción
              </Link>
            )}

            {/* Entregada parcial: Cerrar con faltante (Compras) */}
            {request.estado === 'Entregada parcial' && hasPermission('Crear / editar / cancelar solicitudes') && (
              <button
                onClick={() => setShowCloseShortage(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Cerrar con Faltante
              </button>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6 text-xs">
          {/* Motivo rechazo o cancelacion si aplica */}
          {request.motivo_rechazo_cancelacion && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <span className="font-bold text-rose-900 block">
                Motivo registrado ({request.estado}):
              </span>
              <p className="text-rose-800">{request.motivo_rechazo_cancelacion}</p>
            </div>
          )}

          {/* Cards generales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-semibold block mb-1">Proveedor</span>
              <p className="text-sm font-bold text-slate-800">{request.proveedor_nombre}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-semibold block mb-1">Fecha de Entrega Requerida</span>
              <p className="text-sm font-bold text-slate-800">{request.fecha_entrega}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-semibold block mb-1">Última Actualización</span>
              <p className="text-sm font-bold text-slate-800">
                {new Date(request.actualizado_en).toLocaleString('es-GT')}
              </p>
            </div>
          </div>

          {request.observaciones && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-semibold text-slate-700 block mb-1">Observaciones:</span>
              <p className="text-slate-600">{request.observaciones}</p>
            </div>
          )}

          {/* Líneas de solicitud */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Detalle de Líneas de Producto</h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-center">Cant. Solicitada</th>
                    <th className="py-2.5 px-3 text-center">Cant. Confirmada</th>
                    <th className="py-2.5 px-3 text-center">Cant. Recibida</th>
                    <th className="py-2.5 px-3">Motivo / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {request.lineas?.map((l) => (
                    <tr key={l.producto_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{l.codigo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{l.nombre}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{l.cant_solicitada}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">{l.cant_confirmada}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{l.cant_recibida}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {l.motivo ? (
                          <span className="text-rose-700 font-medium">{l.motivo}</span>
                        ) : l.comentario_proveedor ? (
                          <span>{l.comentario_proveedor}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cerrar con Faltante */}
      {showCloseShortage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-purple-50">
              <h3 className="font-bold text-purple-900 text-base">Cerrar Solicitud con Faltante</h3>
              <p className="text-xs text-purple-700 mt-0.5">
                La solicitud quedará en estado final y no se admitirán recepciones posteriores.
              </p>
            </div>

            <form onSubmit={handleConfirmCloseShortage} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Motivo del Cierre Definitivo (Obligatorio):</label>
                <textarea
                  rows={3}
                  required
                  value={motivoCierre}
                  onChange={(e) => setMotivoCierre(e.target.value)}
                  placeholder="Proveedor comunicó fin de producción, no se esperarán entregas adicionales..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCloseShortage(false)}
                  className="px-4 py-2 font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !motivoCierre.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {actionLoading ? 'Cerrando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
