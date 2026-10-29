import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CaptchaWidget } from '../components/CaptchaWidget';

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
    // Si viene con mensaje de redirección por sesión invalidada (RF-SEG-06)
    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');
    if (reason) {
      setErrorMsg(reason);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!captchaToken) {
      setErrorMsg('Debe resolver la validación de seguridad (reCAPTCHA).');
      return;
    }

    setLoading(true);
    try {
      const data = await loginStep1(email, password, captchaToken);
      if (data.otp_required) {
        showToast('Código de seguridad enviado a su correo electrónico.', 'info');
        // Si tiene sesión activa en otro lugar, guardar bandera
        sessionStorage.setItem('bdg_login_ticket', data.login_ticket);
        sessionStorage.setItem('bdg_temp_email', email);
        sessionStorage.setItem('bdg_has_active_session', data.has_active_session_elsewhere ? 'true' : 'false');

        navigate('/verificar-otp');
      }
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.mensaje || 'Credenciales inválidas o cuenta no disponible.';
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
          <h2 className="text-2xl font-bold text-slate-800">Iniciar Sesión</h2>
          <p className="text-sm text-slate-500 mt-1">
            Sistema de Solicitudes a Proveedores e Inventario
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Correo Electrónico</label>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Contraseña</label>
              <Link
                to="/recuperar-contrasena"
                className="text-xs font-medium text-sky-600 hover:text-sky-800 transition"
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* reCAPTCHA Widget */}
          <div className="pt-1">
            <CaptchaWidget onVerify={(token) => setCaptchaToken(token)} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
              <Link to="/registro" className="font-semibold text-sky-600 hover:text-sky-800">
                Registrarse
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
