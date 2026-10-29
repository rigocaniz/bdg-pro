import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const SecurityAudit = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(15);
  const [emailFilter, setEmailFilter] = useState('');
  const [eventoFilter, setEventoFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/security', {
        params: {
          email: emailFilter || undefined,
          evento: eventoFilter || undefined,
          page,
          size
        }
      });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar bitácora de seguridad.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, eventoFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-sky-600" />
          Bitácora de Eventos de Seguridad (RF-SEG-07)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Registro inmutable de inicios de sesión, envíos de OTP, bloqueos, cambios de contraseña y cierres forzados.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Filtrar por correo de usuario..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Buscar
          </button>
        </form>

        <select
          value={eventoFilter}
          onChange={(e) => {
            setEventoFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden w-full md:w-auto"
        >
          <option value="">Todos los eventos</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="OTP_SENT">OTP_SENT</option>
          <option value="OTP_FAILED">OTP_FAILED</option>
          <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED</option>
          <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
          <option value="ROLES_CHANGED">ROLES_CHANGED</option>
          <option value="FORCED_LOGOUT">FORCED_LOGOUT</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">Evento</th>
                <th className="py-3.5 px-4">Usuario / Correo</th>
                <th className="py-3.5 px-4">IP & Dispositivo</th>
                <th className="py-3.5 px-4">Resultado</th>
                <th className="py-3.5 px-4">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Cargando bitácora de seguridad...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No se registran eventos de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const fechaStr = new Date(log.fecha).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {fechaStr}
                      </td>
                      <td className="py-3 px-4 font-bold text-sky-900 font-mono">
                        {log.evento}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {log.email}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {log.ip} {log.dispositivo_id && `· ${log.dispositivo_id.substring(0, 8)}...`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.exito
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.exito ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {log.exito ? 'Éxito' : 'Fallo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {log.detalle || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} eventos auditados</span>
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
    </div>
  );
};
