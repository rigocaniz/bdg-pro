import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, KeyRound, Check, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const P06ResetPassword = () => {
  const [token, setToken] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenQuery = params.get('token');
    if (tokenQuery) {
      setToken(tokenQuery);
    }
  }, [location]);

  // Validación en tiempo real
  const rules = {
    length: nuevaPassword.length >= 8,
    uppercase: /[A-Z]/.test(nuevaPassword),
    lowercase: /[a-z]/.test(nuevaPassword),
    number: /\d/.test(nuevaPassword),
    symbol: /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(nuevaPassword),
  };
  const allRulesPass = Object.values(rules).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg('Token de recuperación no proporcionado.');
      return;
    }

    if (nuevaPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!allRulesPass) {
      setErrorMsg('La contraseña no cumple con todas las reglas de seguridad requeridas.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        nueva_password: nuevaPassword,
        confirm_password: confirmPassword
      });

      showToast('Contraseña restablecida exitosamente. Todas sus sesiones previas fueron cerradas.', 'success');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al restablecer contraseña.';
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
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Definir Nueva Contraseña</h2>
          <p className="text-xs text-slate-500 mt-1">
            Requisitos de seguridad (RF-SEG-04)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!location.search.includes('token') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Token de Recuperación</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pegue aquí el token recibido"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Reglas visibles */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <p className="font-semibold text-slate-700 mb-1">Requisitos obligatorios:</p>
            <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rules.length ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              Mínimo 8 caracteres
            </div>
            <div className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rules.uppercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              Al menos una letra mayúscula (A-Z)
            </div>
            <div className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rules.lowercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              Al menos una letra minúscula (a-z)
            </div>
            <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rules.number ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              Al menos un número (0-9)
            </div>
            <div className={`flex items-center gap-1.5 ${rules.symbol ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rules.symbol ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              Al menos un símbolo especial (!@#$%...)
            </div>
            <p className="text-[11px] text-slate-400 italic pt-1">
              Nota: No puede repetir ninguna de sus últimas 3 contraseñas.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Guardando nueva contraseña...' : 'Actualizar Contraseña'}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-700">
              Cancelar y volver al inicio
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
