
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  X,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const MAX_LOGIN_TICKET_LENGTH = 4096;
const MAX_OTP_LENGTH = 6;
const MAX_ERROR_LENGTH = 200;

const DEFAULT_ERROR =
  'Error al cerrar la sesión previa. Intente nuevamente.';

const TEMPORARY_SESSION_KEYS = [
  'bdg_login_ticket',
  'bdg_temp_otp',
  'bdg_temp_email',
  'bdg_has_active_session'
];

const getSessionValue = (key) => {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const clearTemporarySessionData = () => {
  try {
    TEMPORARY_SESSION_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch {
    // El navegador puede bloquear el almacenamiento.
  }
};

const sanitizeMessage = (message) => {
  if (typeof message !== 'string') {
    return DEFAULT_ERROR;
  }

  const sanitized = message
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, MAX_ERROR_LENGTH);

  return sanitized || DEFAULT_ERROR;
};

const isValidLoginTicket = (ticket) => {
  return (
    typeof ticket === 'string' &&
    ticket.trim().length > 0 &&
    ticket.length <= MAX_LOGIN_TICKET_LENGTH
  );
};

const isValidOtp = (otp) => {
  return (
    typeof otp === 'string' &&
    /^\d{6}$/.test(otp)
  );
};

export const P03ActiveSessionNotice = () => {
  const [loading, setLoading] = useState(false);

  // Evita solicitudes simultáneas incluso ante clics rápidos.
  const actionLockRef = useRef(false);

  const { verifyOtp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Leer los datos temporales de forma controlada.
  const [loginTicket] = useState(() =>
    getSessionValue('bdg_login_ticket')
  );

  const [tempOtp] = useState(() =>
    getSessionValue('bdg_temp_otp')
  );

  useEffect(() => {
    if (
      !isValidLoginTicket(loginTicket) ||
      !isValidOtp(tempOtp)
    ) {
      clearTemporarySessionData();
      navigate('/login', { replace: true });
    }
  }, [loginTicket, tempOtp, navigate]);

  const handleForceCloseAndLogin = async () => {
    if (actionLockRef.current || loading) {
      return;
    }

    if (
      !isValidLoginTicket(loginTicket) ||
      !isValidOtp(tempOtp)
    ) {
      clearTemporarySessionData();
      navigate('/login', { replace: true });
      return;
    }

    actionLockRef.current = true;
    setLoading(true);

    try {
      const res = await verifyOtp(
        loginTicket,
        tempOtp,
        true
      );

      // Se espera una respuesta que confirme la autenticación.
      // No continuar si el backend no devuelve los datos de sesión.
      if (
        !res ||
        typeof res.access_token !== 'string' ||
        !res.access_token ||
        !res.usuario ||
        typeof res.usuario !== 'object'
      ) {
        throw new Error(DEFAULT_ERROR);
      }

      clearTemporarySessionData();

      showToast(
        'La sesión anterior fue cerrada. Bienvenido.',
        'success'
      );

      navigate('/dashboard', { replace: true });

    } catch (err) {
      const serverMessage = err.response?.data?.mensaje;

      const msg = sanitizeMessage(serverMessage);

      showToast(msg, 'error');

    } finally {
      actionLockRef.current = false;
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (actionLockRef.current || loading) {
      return;
    }

    clearTemporarySessionData();

    showToast(
      'Inicio de sesión cancelado.',
      'info'
    );

    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-amber-200 overflow-hidden">

        {/* Warning banner */}
        <div className="p-8 text-center bg-amber-50/70 border-b border-amber-100">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            Ya existe una sesión activa
          </h2>

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
              type="button"
              onClick={handleForceCloseAndLogin}
              disabled={loading}
              aria-busy={loading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
