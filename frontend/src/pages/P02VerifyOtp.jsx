import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, RefreshCw, ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const P02VerifyOtp = () => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timer5min, setTimer5min] = useState(300); // 5 minutos = 300s
  const [cooldown60s, setCooldown60s] = useState(60);
  const [intentosRestantes, setIntentosRestantes] = useState(3);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inputRefs = useRef([]);
  const { verifyOtp, resendOtp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loginTicket = sessionStorage.getItem('bdg_login_ticket');
  const tempEmail = sessionStorage.getItem('bdg_temp_email') || 'tu correo';

  useEffect(() => {
    if (!loginTicket) {
      navigate('/login');
      return;
    }

    // Timer de 5 minutos
    const interval5m = setInterval(() => {
      setTimer5min((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Timer de 60 segundos para reenvío
    const interval60s = setInterval(() => {
      setCooldown60s((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(interval5m);
      clearInterval(interval60s);
    };
  }, [loginTicket, navigate]);

  const handleChangeDigit = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto avance al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(paste)) {
      const arr = paste.split('');
      setDigits(arr);
      inputRefs.current[5]?.focus();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    const code = digits.join('');
    if (code.length !== 6) {
      setErrorMsg('Por favor ingrese el código completo de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(loginTicket, code, false);

      if (res.requiere_confirmacion_cierre) {
        // Redirigir a P03 para que el usuario confirme si cierra la otra sesión
        sessionStorage.setItem('bdg_temp_otp', code);
        navigate('/aviso-sesion-activa');
        return;
      }

      showToast('¡Autenticación exitosa! Bienvenido al sistema.', 'success');
      sessionStorage.removeItem('bdg_login_ticket');
      sessionStorage.removeItem('bdg_temp_otp');
      sessionStorage.removeItem('bdg_temp_email');
      navigate('/dashboard');
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.mensaje || 'Error al validar el código OTP.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      if (intentosRestantes > 1) {
        setIntentosRestantes((prev) => prev - 1);
      } else {
        setIntentosRestantes(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown60s > 0) return;
    setErrorMsg('');
    try {
      await resendOtp(loginTicket);
      showToast('Nuevo código OTP enviado exitosamente.', 'success');
      setCooldown60s(60);
      setTimer5min(300);
      setIntentosRestantes(3);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al reenviar código.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center bg-linear-to-b from-sky-50 to-white border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Verificación de Seguridad</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Hemos enviado un código OTP de 6 dígitos a <br />
            <strong className="text-slate-700">{tempEmail}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 6 Digit Inputs */}
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChangeDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-sky-600 focus:bg-white focus:outline-hidden transition"
              />
            ))}
          </div>

          {/* Counter info */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Vence en: <strong className="text-slate-700">{formatTime(timer5min)}</strong></span>
            </div>
            <span className="font-medium">
              Intentos restantes:{' '}
              <strong className={intentosRestantes <= 1 ? 'text-rose-600' : 'text-slate-700'}>
                {intentosRestantes}
              </strong>
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || timer5min === 0}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verificando código...' : 'Validar Código y Acceder'}
          </button>

          {/* Resend button */}
          <div className="text-center pt-2 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown60s > 0}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 disabled:text-slate-400 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cooldown60s > 0 ? '' : 'animate-pulse'}`} />
              {cooldown60s > 0
                ? `Reenviar código en (${cooldown60s} s)`
                : 'Reenviar código OTP'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs text-slate-400 hover:text-slate-600 transition flex items-center gap-1 mt-1"
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
