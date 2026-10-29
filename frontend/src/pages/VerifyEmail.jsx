import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';

export const VerifyEmail = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    const verify = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setSuccess(false);
        setMessage('Token de verificación no suministrado en el enlace.');
        setLoading(false);
        return;
      }

      try {
        const res = await api.post('/auth/verify-email', { token });
        setSuccess(true);
        setMessage(res.data.mensaje || 'Cuenta verificada exitosamente.');
      } catch (err) {
        setSuccess(false);
        setMessage(err.response?.data?.mensaje || 'El token de verificación es inválido o ha expirado.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
        {loading ? (
          <div className="py-8 space-y-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500">Verificando cuenta...</p>
          </div>
        ) : success ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">¡Cuenta Activada!</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
            <p className="text-xs text-slate-400">
              Su cuenta se encuentra activa con el rol inicial <strong>Consulta</strong>.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="w-full inline-block py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
              >
                Iniciar Sesión Ahora
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Verificación Fallida</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
            <div className="pt-4">
              <Link
                to="/login"
                className="w-full inline-block py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm transition"
              >
                Volver al Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
