import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, Check, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { CaptchaWidget } from '../components/CaptchaWidget';

export const P04Register = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Reglas de contraseña
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(password),
  };

  const score = Object.values(rules).filter(Boolean).length;

  const getStrengthLabel = () => {
    if (score <= 2) return { text: 'Débil', color: 'bg-rose-500', width: 'w-1/3' };
    if (score <= 4) return { text: 'Media', color: 'bg-amber-500', width: 'w-2/3' };
    return { text: 'Fuerte', color: 'bg-emerald-500', width: 'w-full' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (score < 5) {
      setErrorMsg('La contraseña debe cumplir todos los requisitos de seguridad.');
      return;
    }

    if (!captchaToken) {
      setErrorMsg('Debe resolver la validación de reCAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nombre,
        email,
        password,
        confirm_password: confirmPassword,
        captcha_token: captchaToken
      });

      setRegisteredSuccess(true);
      showToast('Registro exitoso. Se ha enviado un correo de verificación.', 'success');
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.mensaje || 'Error al procesar el registro.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (registeredSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">¡Cuenta Creada Exitosamente!</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Se ha enviado un correo de verificación a <br />
            <strong className="text-slate-800">{email}</strong>.
            <br />
            Por favor revise su bandeja de entrada (o la consola simulada) y confirme su cuenta para activar su rol inicial <strong>Consulta</strong>.
          </p>
          <div className="pt-4">
            <Link
              to="/login"
              className="w-full inline-block py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        <div className="p-6 text-center bg-linear-to-b from-sky-50 to-white border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">Crear Nueva Cuenta</h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro público de usuarios (RF-SEG-01)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Nombre Completo</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Correo Electrónico (Único)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

            {/* Medidor de fortaleza */}
            {password && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Fortaleza:</span>
                  <span className="font-semibold text-slate-700">{getStrengthLabel().text}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${getStrengthLabel().color} ${getStrengthLabel().width} transition-all duration-300`}></div>
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-slate-600">
                  <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.length ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                    Mínimo 8 caracteres
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.uppercase ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                    Una mayúscula
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.lowercase ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                    Una minúscula
                  </div>
                  <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.number ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                    Al menos un número
                  </div>
                  <div className={`col-span-2 flex items-center gap-1.5 ${rules.symbol ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.symbol ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                    Un símbolo (!@#$%^&*...)
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <CaptchaWidget onVerify={(token) => setCaptchaToken(token)} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Creando cuenta...' : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Registrar Cuenta</span>
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              ¿Ya tiene una cuenta?{' '}
              <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-800">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
