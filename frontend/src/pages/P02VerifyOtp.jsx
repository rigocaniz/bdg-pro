
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Clock
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const OTP_LENGTH = 6;
const OTP_EXPIRATION_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 60;

const MAX_LOGIN_TICKET_LENGTH = 4096;
const MAX_EMAIL_LENGTH = 254;
const MAX_ERROR_LENGTH = 200;

const DEFAULT_OTP_ERROR = 'Error al validar el código OTP.';
const DEFAULT_RESEND_ERROR = 'Error al reenviar código.';

const sanitizeMessage = (message, fallback) => {
  if (typeof message !== 'string') {
    return fallback;
  }

  const sanitized = message
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, MAX_ERROR_LENGTH);

  return sanitized || fallback;
};

const getSessionValue = (key) => {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const removeTemporaryOtpData = () => {
  try {
    sessionStorage.removeItem('bdg_login_ticket');
    sessionStorage.removeItem('bdg_temp_email');
    sessionStorage.removeItem('bdg_temp_otp');
    sessionStorage.removeItem('bdg_has_active_session');
  } catch {
    // El navegador puede bloquear el almacenamiento.
  }
};

const isValidLoginTicket = (ticket) => {
  return (
    typeof ticket === 'string' &&
    ticket.trim().length > 0 &&
    ticket.length <= MAX_LOGIN_TICKET_LENGTH
  );
};

export const P02VerifyOtp = () => {
  const [digits, setDigits] = useState(
    Array(OTP_LENGTH).fill('')
  );

  const [timer5min, setTimer5min] = useState(
    OTP_EXPIRATION_SECONDS
  );

  const [cooldown60s, setCooldown60s] = useState(
    RESEND_COOLDOWN_SECONDS
  );

  const [intentosRestantes, setIntentosRestantes] = useState(3);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inputRefs = useRef([]);
  const submitLockRef = useRef(false);
  const resendLockRef = useRef(false);

  const { verifyOtp, resendOtp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Leer los datos temporales de forma controlada.
  const [loginTicket] = useState(() =>
    getSessionValue('bdg_login_ticket')
  );

  const [tempEmail] = useState(() => {
    const value = getSessionValue('bdg_temp_email');

    if (
      typeof value === 'string' &&
      value.length <= MAX_EMAIL_LENGTH
    ) {
      return value;
    }

    return 'tu correo';
  });

  useEffect(() => {
    if (!isValidLoginTicket(loginTicket)) {
      removeTemporaryOtpData();
      navigate('/login', { replace: true });
      return;
    }

    // Temporizadores exclusivamente visuales.
    // La expiración real del OTP debe validarla el backend.
    const interval5m = setInterval(() => {
      setTimer5min((prev) => Math.max(0, prev - 1));
    }, 1000);

    const interval60s = setInterval(() => {
      setCooldown60s((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval5m);
      clearInterval(interval60s);
    };
  }, [loginTicket, navigate]);

  const handleChangeDigit = (index, value) => {
    if (loading || resendLoading) {
      return;
    }

    // Solo aceptar dígitos.
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newDigits = [...digits];

    // Algunos navegadores pueden entregar varios dígitos
    // mediante autocompletado.
    if (value.length > 1) {
      const availableDigits = value
        .slice(0, OTP_LENGTH - index)
        .split('');

      availableDigits.forEach((digit, offset) => {
        newDigits[index + offset] = digit;
      });

      setDigits(newDigits);

      const nextIndex = Math.min(
        index + availableDigits.length,
        OTP_LENGTH - 1
      );

      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (loading || resendLoading) {
      return;
    }

    if (
      e.key === 'Backspace' &&
      !digits[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      e.key === 'ArrowLeft' &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      e.key === 'ArrowRight' &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    if (loading || resendLoading) {
      return;
    }

    e.preventDefault();

    const paste = e.clipboardData
      .getData('text')
      .trim();

    if (!/^\d{6}$/.test(paste)) {
      setErrorMsg('El código debe contener exactamente 6 dígitos.');
      return;
    }

    setDigits(paste.split(''));
    inputRefs.current[OTP_LENGTH - 1]?.focus();
    setErrorMsg('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (
      submitLockRef.current ||
      loading ||
      resendLoading
    ) {
      return;
    }

    setErrorMsg('');

    if (timer5min <= 0) {
      setErrorMsg(
        'El tiempo de validez del código ha finalizado. Solicite uno nuevo.'
      );
      return;
    }

    if (!isValidLoginTicket(loginTicket)) {
      removeTemporaryOtpData();
      navigate('/login', { replace: true });
      return;
    }

    const code = digits.join('');

    if (!/^\d{6}$/.test(code)) {
      setErrorMsg(
        'Por favor ingrese el código completo de 6 dígitos.'
      );
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      const res = await verifyOtp(
        loginTicket,
        code,
        false
      );

      if (res?.requiere_confirmacion_cierre === true) {
        // Se conserva el flujo original hacia P03.
        // El código temporal se mantiene por compatibilidad,
        // pero debe eliminarse al finalizar esa confirmación.
        try {
          sessionStorage.setItem('bdg_temp_otp', code);
        } catch {
          throw new Error(
            'No fue posible continuar con la confirmación de sesión.'
          );
        }

        navigate('/aviso-sesion-activa');
        return;
      }

      // No continuar si la respuesta no confirma el proceso esperado.
      if (!res || typeof res !== 'object') {
        throw new Error(DEFAULT_OTP_ERROR);
      }

      showToast(
        '¡Autenticación exitosa! Bienvenido al sistema.',
        'success'
      );

      removeTemporaryOtpData();

      navigate('/dashboard', { replace: true });

    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.mensaje;

      const msg = sanitizeMessage(
        serverMessage,
        DEFAULT_OTP_ERROR
      );

      setErrorMsg(msg);
      showToast(msg, 'error');

      // Este contador solo es informativo.
      // Los intentos reales deben controlarse en el backend.
      if ([400, 401, 422].includes(status)) {
        setIntentosRestantes((prev) =>
          Math.max(0, prev - 1)
        );
      }

    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (
      resendLockRef.current ||
      resendLoading ||
      loading ||
      cooldown60s > 0 ||
      timer5min <= 0
    ) {
      return;
    }

    if (!isValidLoginTicket(loginTicket)) {
      removeTemporaryOtpData();
      navigate('/login', { replace: true });
      return;
    }

    resendLockRef.current = true;
    setResendLoading(true);
    setErrorMsg('');

    try {
      await resendOtp(loginTicket);

      showToast(
        'Nuevo código OTP enviado exitosamente.',
        'success'
      );

      setCooldown60s(RESEND_COOLDOWN_SECONDS);
      setTimer5min(OTP_EXPIRATION_SECONDS);
      setIntentosRestantes(3);
      setDigits(Array(OTP_LENGTH).fill(''));

      inputRefs.current[0]?.focus();

    } catch (err) {
      const msg = sanitizeMessage(
        err.response?.data?.mensaje,
        DEFAULT_RESEND_ERROR
      );

      setErrorMsg(msg);
      showToast(msg, 'error');

    } finally {
      resendLockRef.current = false;
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (loading || resendLoading) {
      return;
    }

    removeTemporaryOtpData();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

        <div className="p-8 text-center bg-linear-to-b from-sky-50 to-white border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Verificación de Seguridad
          </h2>

          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Hemos enviado un código OTP de 6 dígitos a
            <br />

            <strong className="text-slate-700 break-all">
              {tempEmail}
            </strong>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6"
          noValidate
        >
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5 break-words"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 6 Digit Inputs */}
          <div
            className="flex justify-between gap-2"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                name={`otp-digit-${index + 1}`}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={
                  loading ||
                  resendLoading ||
                  timer5min === 0
                }
                aria-label={`Dígito ${index + 1} del código OTP`}
                onChange={(e) =>
                  handleChangeDigit(index, e.target.value)
                }
                onKeyDown={(e) =>
                  handleKeyDown(index, e)
                }
                className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-sky-600 focus:bg-white focus:outline-hidden transition disabled:opacity-60"
              />
            ))}
          </div>

          {/* Counter info */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-slate-400" />

              <span>
                Vence en:{' '}
                <strong className="text-slate-700">
                  {formatTime(timer5min)}
                </strong>
              </span>
            </div>

            <span className="font-medium">
              Intentos restantes:{' '}

              <strong
                className={
                  intentosRestantes <= 1
                    ? 'text-rose-600'
                    : 'text-slate-700'
                }
              >
                {intentosRestantes}
              </strong>
            </span>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              resendLoading ||
              timer5min === 0
            }
            aria-busy={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Verificando código...'
              : 'Validar Código y Acceder'}
          </button>

          {/* Resend button */}
          <div className="text-center pt-2 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={
                cooldown60s > 0 ||
                timer5min === 0 ||
                loading ||
                resendLoading
              }
              aria-busy={resendLoading}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 disabled:text-slate-400 transition flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  cooldown60s > 0 || resendLoading
                    ? ''
                    : 'animate-pulse'
                }`}
              />

              {resendLoading
                ? 'Enviando código...'
                : cooldown60s > 0
                  ? `Reenviar código en (${cooldown60s} s)`
                  : 'Reenviar código OTP'}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              disabled={loading || resendLoading}
              className="text-xs text-slate-400 hover:text-slate-600 transition flex items-center gap-1 mt-1 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al inicio de sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
