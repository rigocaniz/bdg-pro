import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const P03ActiveSessionNotice = () => {
  const [loading, setLoading] = useState(false);
  const { verifyOtp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loginTicket = sessionStorage.getItem('bdg_login_ticket');
  const tempOtp = sessionStorage.getItem('bdg_temp_otp');

  const handleForceCloseAndLogin = async () => {
    if (!loginTicket || !tempOtp) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(loginTicket, tempOtp, true);
      showToast('La sesión anterior fue cerrada. Bienvenido.', 'success');
      sessionStorage.removeItem('bdg_login_ticket');
      sessionStorage.removeItem('bdg_temp_otp');
      sessionStorage.removeItem('bdg_temp_email');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al cerrar la sesión previa.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.clear();
    showToast('Inicio de sesión cancelado.', 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
        {/* Warning banner */}
        <div className="p-8 text-center bg-amber-50/70 border-b border-amber-100">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Ya existe una sesión activa</h2>
          <p className="text-xs text-amber-900 mt-1 font-medium">
            Control de Sesión Única (RF-SEG-06)
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Su cuenta tiene una sesión actualmente abierta en otro equipo o navegador.
            </p>
            <p className="font-semibold text-slate-800">
              Por políticas de seguridad, solo se permite una sesión activa simultánea por usuario en el sistema.
            </p>
            <p>
              Si continúa, la sesión anterior quedará automáticamente invalidada y expulsará a quien esté usando ese equipo.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleForceCloseAndLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Cerrando sesión previa...'
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar la otra sesión e ingresar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancelar inicio de sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
