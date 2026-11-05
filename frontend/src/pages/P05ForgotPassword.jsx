
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { CaptchaWidget } from '../components/CaptchaWidget';

const MAX_EMAIL_LENGTH = 254;
const MAX_ERROR_LENGTH = 200;

const GENERIC_SUCCESS_MESSAGE =
  'Si el correo está registrado, recibirá instrucciones para restablecer su contraseña.';

const GENERIC_ERROR_MESSAGE =
  'No fue posible procesar la solicitud. Inténtelo nuevamente más tarde.';

export const P05ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submitLockRef = useRef(false);

  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current) {
      return;
    }

    setErrorMsg('');

    const normalizedEmail = email.trim();
    const normalizedCaptchaToken =
      typeof captchaToken === 'string' ? captchaToken.trim() : '';

    if (
      !normalizedEmail ||
      normalizedEmail.length > MAX_EMAIL_LENGTH
    ) {
      setErrorMsg('Ingrese un correo electrónico válido.');
      return;
    }

    if (!normalizedCaptchaToken) {
      setErrorMsg('Debe resolver la validación de reCAPTCHA.');
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        email: normalizedEmail,
        captcha_token: normalizedCaptchaToken
      });

      setEmail(normalizedEmail);
      setSubmitted(true);

      showToast('Solicitud procesada correctamente.', 'success');
    } catch (err) {
      // No mostrar mensajes del backend que puedan revelar
      // si una cuenta existe o información interna del sistema.
      setErrorMsg(GENERIC_ERROR_MESSAGE);

      showToast(GENERIC_ERROR_MESSAGE, 'error');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);

    if (errorMsg) {
      setErrorMsg('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

        <div className="p-8 text-center bg-linear-to-b from-sky-50 to-white border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-600/30">
            <Mail className="w-6 h-6" aria-hidden="true" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Recuperar Contraseña
          </h2>

          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Ingrese su correo para recibir las instrucciones de
            restablecimiento (RF-SEG-04)
          </p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-5">

            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                Solicitud procesada
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {GENERIC_SUCCESS_MESSAGE}
              </p>

              <p className="text-xs text-slate-500 pt-2">
                Si recibe un enlace, utilícelo dentro del tiempo de
                validez indicado en el correo.
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
          <form
            onSubmit={handleSubmit}
            className="p-8 space-y-5"
            aria-busy={loading}
            noValidate={false}
          >

            {errorMsg && (
              <div
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle
                  className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />

                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="recovery-email"
                className="text-xs font-semibold text-slate-700"
              >
                Correo Electrónico Registrado
              </label>

              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
                  aria-hidden="true"
                />

                <input
                  id="recovery-email"
                  name="email"
                  type="email"
                  required
                  maxLength={MAX_EMAIL_LENGTH}
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="ejemplo@sistema.com"
                  disabled={loading}
                  aria-invalid={Boolean(errorMsg)}
                  aria-describedby={errorMsg ? 'recovery-error' : undefined}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition disabled:opacity-60"
                />
              </div>
            </div>

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
              aria-disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Enviando solicitud...'
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Enviar Enlace de Recuperación</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Volver al inicio de sesión
              </Link>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
