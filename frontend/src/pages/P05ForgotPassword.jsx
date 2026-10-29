import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { CaptchaWidget } from '../components/CaptchaWidget';

export const P05ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!captchaToken) {
      setErrorMsg('Debe resolver la validación de reCAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        email,
        captcha_token: captchaToken
      });
      setSubmitted(true);
      showToast('Solicitud enviada correctamente.', 'success');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al solicitar recuperación.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center bg-linear-to-b from-sky-50 to-white border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-600/30">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Recuperar Contraseña</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Ingrese su correo para recibir las instrucciones de restablecimiento (RF-SEG-04)
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">Enlace de recuperación enviado</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Si el correo <strong>{email}</strong> existe en el sistema, recibirá un enlace válido por 30 minutos de un solo uso.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full inline-block py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
              >
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Correo Electrónico Registrado</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@sistema.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="pt-1">
              <CaptchaWidget onVerify={(token) => setCaptchaToken(token)} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Enviando enlace...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Enlace de Recuperación</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
