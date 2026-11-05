
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CaptchaWidget } from '../components/CaptchaWidget';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MAX_ERROR_LENGTH = 200;

const SESSION_STORAGE_KEYS = [
  'bdg_login_ticket',
  'bdg_temp_email',
  'bdg_has_active_session'
];

const DEFAULT_LOGIN_ERROR =
  'Credenciales inválidas o cuenta no disponible.';

const SESSION_INVALIDATED_MESSAGE =
  'Su sesión fue cerrada porque se inició en otro equipo.';

const sanitizeMessage = (message, fallback = DEFAULT_LOGIN_ERROR) => {
  if (typeof message !== 'string') {
    return fallback;
  }

  const sanitized = message
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, MAX_ERROR_LENGTH);

  return sanitized || fallback;
};

const clearTemporaryLoginData = () => {
  try {
    SESSION_STORAGE_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador.
  }
};

export const P01Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { loginStep1 } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');

    if (reason) {
      setErrorMsg(sanitizeMessage(
        reason,
        SESSION_INVALIDATED_MESSAGE
      ));
    } else {
      setErrorMsg('');
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Evita envíos repetidos mientras existe una petición activa.
    if (loading) {
      return;
    }

    setErrorMsg('');

    const normalizedEmail = email.trim();

    // Validación de longitud y contenido básico.
    if (
      !normalizedEmail ||
      normalizedEmail.length > MAX_EMAIL_LENGTH ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setErrorMsg('Ingrese un correo electrónico válido.');
      return;
    }

    if (
      !password ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      setErrorMsg('La contraseña no cumple con el formato permitido.');
      return;
    }

    if (
      typeof captchaToken !== 'string' ||
      !captchaToken.trim()
    ) {
      setErrorMsg(
        'Debe resolver la validación de seguridad (reCAPTCHA).'
      );
      return;
    }

    setLoading(true);

    try {
      const data = await loginStep1(
        normalizedEmail,
        password,
        captchaToken
      );

      // La respuesta debe indicar expresamente que corresponde
      // continuar con el proceso de autenticación de dos factores.
      if (
        data?.otp_required === true &&
        typeof data.login_ticket === 'string' &&
        data.login_ticket.length > 0 &&
        data.login_ticket.length <= 4096
      ) {
        try {
          // Se conserva el mecanismo de almacenamiento existente
          // para no modificar el contrato con la pantalla OTP.
          sessionStorage.setItem(
            'bdg_login_ticket',
            data.login_ticket
          );

          sessionStorage.setItem(
            'bdg_temp_email',
            normalizedEmail
          );

          sessionStorage.setItem(
            'bdg_has_active_session',
            data.has_active_session_elsewhere === true
              ? 'true'
              : 'false'
          );
        } catch {
          clearTemporaryLoginData();

          throw new Error(
            'No fue posible preparar la verificación de seguridad. '
            + 'Revise la configuración de almacenamiento del navegador.'
          );
        }

        showToast(
          'Código de seguridad enviado a su correo electrónico.',
          'info'
        );

        navigate('/verificar-otp');
        return;
      }

      // No se avanza a OTP si la respuesta no cumple el contrato esperado.
      throw new Error(DEFAULT_LOGIN_ERROR);

    } catch (err) {
      clearTemporaryLoginData();

      const serverMessage = err.response?.data?.mensaje;

      const msg = sanitizeMessage(
        serverMessage,
        err.message === DEFAULT_LOGIN_ERROR
          ? DEFAULT_LOGIN_ERROR
          : 'No fue posible iniciar sesión. Verifique sus datos e intente nuevamente.'
      );

      setErrorMsg(msg);
      showToast(msg, 'error');

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="p-8 text-center bg-linear-to-b from-sky-50 to-white border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-600/30">
            B
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Iniciar Sesión
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Sistema de Solicitudes a Proveedores e Inventario
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-5"
          noValidate
        >
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5 break-words"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="text-xs font-semibold text-slate-700"
            >
              Correo Electrónico
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="username"
                maxLength={MAX_EMAIL_LENGTH}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@sistema.com"
                disabled={loading}
                aria-invalid={Boolean(errorMsg)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-700"
              >
                Contraseña
              </label>

              <Link
                to="/recuperar-contrasena"
                className="text-xs font-medium text-sky-600 hover:text-sky-800 transition"
                tabIndex={loading ? -1 : 0}
                aria-disabled={loading}
                onClick={(e) => {
                  if (loading) {
                    e.preventDefault();
                  }
                }}
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                maxLength={MAX_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition disabled:opacity-60"
              />
            </div>
          </div>

          {/* reCAPTCHA Widget */}
          <div className="pt-1">
            <CaptchaWidget
              onVerify={(token) => {
                setCaptchaToken(
                  typeof token === 'string' ? token : ''
                );
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span
                className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                aria-label="Procesando"
              />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Continuar con Doble Factor (2FA)</span>
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              ¿No tiene una cuenta?{' '}

              <Link
                to="/registro"
                className="font-semibold text-sky-600 hover:text-sky-800"
              >
                Registrarse
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
