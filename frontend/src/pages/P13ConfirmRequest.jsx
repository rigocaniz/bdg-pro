import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Truck,
  FileText
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';

export const P13ConfirmRequest = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [linesConfirm, setLinesConfirm] = useState([]);
  const [comentarioGeneral, setComentarioGeneral] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal Rechazar
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/requests/${id}`);
        const data = res.data;
        setRequest(data);

        // Inicializar confirmación por defecto con lo solicitado
        setLinesConfirm(
          data.lineas.map((l) => ({
            producto_id: l.producto_id,
            codigo: l.codigo,
            nombre: l.nombre,
            cant_solicitada: l.cant_solicitada,
            cant_confirmada: l.cant_confirmada || l.cant_solicitada,
            fecha_estimada: l.fecha_estimada || data.fecha_entrega,
            comentario: l.comentario_proveedor || ''
          }))
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

  const handleQtyChange = (index, value) => {
    const parsed = parseInt(value, 10) || 0;
    const max = linesConfirm[index].cant_solicitada;
    const val = Math.max(0, Math.min(parsed, max));

    const updated = [...linesConfirm];
    updated[index].cant_confirmada = val;
    setLinesConfirm(updated);
  };

  const handleLineCommentChange = (index, text) => {
    const updated = [...linesConfirm];
    updated[index].comentario = text;
    setLinesConfirm(updated);
  };

  const handleLineDateChange = (index, dateVal) => {
    const updated = [...linesConfirm];
    updated[index].fecha_estimada = dateVal;
    setLinesConfirm(updated);
  };

  // Detectar si hay confirmación parcial
  const esParcial = linesConfirm.some((l) => l.cant_confirmada < l.cant_solicitada);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.post(`/requests/${id}/confirm`, {
        lineas: linesConfirm.map((l) => ({
          producto_id: l.producto_id,
          cant_confirmada: l.cant_confirmada,
          fecha_estimada: l.fecha_estimada || undefined,
          comentario: l.comentario || undefined
        })),
        comentario_general: comentarioGeneral
      });

      showToast(
        `Solicitud confirmada exitosamente ${esParcial ? '(Confirmación Parcial)' : ''}.`,
        'success'
      );
      navigate('/solicitudes');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al confirmar la solicitud.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!motivoRechazo.trim()) {
      showToast('El motivo de rechazo es obligatorio.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/requests/${id}/reject`, {
        motivo: motivoRechazo.trim()
      });
      showToast('Solicitud rechazada.', 'info');
      setShowRejectModal(false);
      navigate('/solicitudes');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al rechazar solicitud.';
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
        <div className="p-6 md:p-8 border-b border-slate-100 bg-linear-to-b from-amber-50/50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-sky-800">{request.numero}</span>
              <StatusBadge estado={request.estado} />
              {esParcial && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Confirmación parcial detectada
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 mt-1">
              Confirmación de Solicitud de Compra (Rol Proveedor)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verifique los productos e indique las cantidades reales que podrá abastecer (RF-NEG-03).
            </p>
          </div>

          <div className="text-right text-xs text-slate-600 space-y-1 self-start sm:self-auto">
            <p><strong className="text-slate-800">Fecha Requerida:</strong> {request.fecha_entrega}</p>
            <p><strong className="text-slate-800">Proveedor:</strong> {request.proveedor_nombre}</p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6 text-xs">
          {request.observaciones && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-semibold text-slate-700 block mb-0.5">Observaciones del comprador:</span>
              <p className="text-slate-600">{request.observaciones}</p>
            </div>
          )}

          {/* Tabla de confirmación de líneas */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Líneas de Producto a Confirmar</h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-center">Cant. Solicitada</th>
                    <th className="py-2.5 px-3 text-center w-36">Puede Entregar</th>
                    <th className="py-2.5 px-3">Fecha Estimada</th>
                    <th className="py-2.5 px-3">Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {linesConfirm.map((line, idx) => {
                    const isLineParcial = line.cant_confirmada < line.cant_solicitada;
                    return (
                      <tr key={line.producto_id} className={isLineParcial ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">
                          {line.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {line.nombre}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                          {line.cant_solicitada}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={line.cant_solicitada}
                            value={line.cant_confirmada}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className={`w-24 text-center py-1.5 border rounded-lg font-bold text-sm ${
                              isLineParcial
                                ? 'border-amber-400 bg-amber-50 text-amber-900'
                                : 'border-slate-300 bg-white text-slate-800'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="date"
                            value={line.fecha_estimada}
                            onChange={(e) => handleLineDateChange(idx, e.target.value)}
                            className="py-1 px-2 border border-slate-300 rounded text-slate-700 bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={line.comentario}
                            onChange={(e) => handleLineCommentChange(idx, e.target.value)}
                            placeholder={isLineParcial ? 'Motivo de entrega parcial...' : 'Opcional...'}
                            className="w-full py-1 px-2 border border-slate-300 rounded text-slate-700 bg-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Comentario General al Comprador (Opcional)</label>
            <textarea
              rows={2}
              value={comentarioGeneral}
              onChange={(e) => setComentarioGeneral(e.target.value)}
              placeholder="Indique información relevante sobre despacho, logística o embalaje..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowRejectModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Rechazar Solicitud Completa</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{esParcial ? 'Confirmar Cantidades (Parcial)' : 'Confirmar Entrega Total'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Rechazar Solicitud */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-rose-50">
              <h3 className="font-bold text-rose-900 text-base">Rechazar Solicitud {request.numero}</h3>
              <p className="text-xs text-rose-700 mt-0.5">El comprador será notificado de la imposibilidad de entrega.</p>
            </div>

            <form onSubmit={handleReject} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Motivo del Rechazo (Obligatorio):</label>
                <textarea
                  rows={3}
                  required
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Sin disponibilidad de materia prima, descontinuado..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={submitting || !motivoRechazo.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
