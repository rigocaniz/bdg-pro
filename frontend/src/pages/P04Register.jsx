
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  UserPlus,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { CaptchaWidget } from '../components/CaptchaWidget';

// Límites de entrada
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MAX_ERROR_LENGTH = 200;

// Palabras SQL reservadas.
// Se detectan como palabras completas, no como fragmentos.
const RESERVED_WORDS_REGEX =
  /\b(?:OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE|GRANT|REVOKE|WHERE|FROM|HAVING|JOIN|SLEEP|BENCHMARK)\b/i;

// Caracteres permitidos para nombres de personas.
// Admite Unicode, acentos, espacios, puntos, apóstrofes y guiones.
const INVALID_NAME_CHARACTERS = /[^\p{L}\p{M}\s.'’-]/gu;

// Obtiene mensajes externos de forma controlada.
// React debe renderizarlos siempre como texto, nunca como HTML.
const getSafeErrorMessage = (error) => {
  const serverMessage = error?.response?.data?.mensaje;

  if (
    typeof serverMessage === 'string' &&
    serverMessage.trim().length > 0
  ) {
    return serverMessage.trim().slice(0, MAX_ERROR_LENGTH);
  }

  return 'Error al procesar el registro. Intente nuevamente.';
};

// Normalización del nombre
const normalizeName = (value) => {
  return value
    .replace(INVALID_NAME_CHARACTERS, '')
    .slice(0, MAX_NAME_LENGTH);
};

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
    length:
      password.length >= 8 &&
      password.length <= MAX_PASSWORD_LENGTH,

    uppercase: /[A-Z]/.test(password),

    lowercase: /[a-z]/.test(password),

    number: /\d/.test(password),

    symbol: /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\/`~]/.test(password),
  };

  const score = Object.values(rules).filter(Boolean).length;

  const getStrengthLabel = () => {
    if (score <= 2) {
      return {
        text: 'Débil',
        color: 'bg-rose-500',
        width: 'w-1/3'
      };
    }

    if (score <= 4) {
      return {
        text: 'Media',
        color: 'bg-amber-500',
        width: 'w-2/3'
      };
    }

    return {
      text: 'Fuerte',
      color: 'bg-emerald-500',
      width: 'w-full'
    };
  };

  // Validaciones previas al envío
  const validateForm = () => {
    const normalizedName = nombre.trim().replace(/\s+/g, ' ');
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      return 'El nombre completo es obligatorio.';
    }

    if (normalizedName.length > MAX_NAME_LENGTH) {
      return 'El nombre supera la longitud permitida.';
    }

    // Detección de palabras reservadas independientes
    if (RESERVED_WORDS_REGEX.test(normalizedName)) {
      return 'El nombre contiene palabras reservadas no permitidas.';
    }

    if (!normalizedEmail) {
      return 'El correo electrónico es obligatorio.';
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return 'El correo electrónico supera la longitud permitida.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return 'Ingrese un correo electrónico válido.';
    }

    if (
      !password ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return 'La contraseña supera la longitud permitida o está vacía.';
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    if (score < 5) {
      return 'La contraseña debe cumplir todos los requisitos de seguridad.';
    }

    if (!captchaToken || typeof captchaToken !== 'string') {
      return 'Debe resolver la validación de reCAPTCHA.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Previene envíos simultáneos
    if (loading) return;

    setErrorMsg('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    // Normalización final antes de enviar
    const normalizedName = nombre.trim().replace(/\s+/g, ' ');
    const normalizedEmail = email.trim();

    setLoading(true);

    try {
      await api.post('/auth/register', {
        nombre: normalizedName,
        email: normalizedEmail,
        password,
        confirm_password: confirmPassword,
        captcha_token: captchaToken
      });

      setRegisteredSuccess(true);

      showToast(
        'Registro exitoso. Se ha enviado un correo de verificación.',
        'success'
      );

    } catch (err) {
      const msg = getSafeErrorMessage(err);

      setErrorMsg(msg);
      showToast(msg, 'error');

    } finally {
      setLoading(false);
    }
  };

  // Validación del token recibido del CAPTCHA
  const handleCaptchaVerify = (token) => {
    setCaptchaToken(
      typeof token === 'string' ? token : ''
    );
  };

  // Pantalla de registro exitoso
  if (registeredSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">

          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            ¡Cuenta Creada Exitosamente!
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed">
            Se ha enviado un correo de verificación a <br />

            <strong className="text-slate-800">
              {email.trim()}
            </strong>.

            <br />

            Por favor revise su bandeja de entrada
            (o la consola simulada) y confirme su cuenta
            para activar su rol inicial <strong>Consulta</strong>.
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
          <h2 className="text-2xl font-bold text-slate-800">
            Crear Nueva Cuenta 
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Registro público de usuarios (RF-SEG-01)
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 md:p-8 space-y-4"
          noValidate
        >

          {/* Mensajes de error */}
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre completo */}
          <div className="space-y-1">

            <label
              htmlFor="register-name"
              className="text-xs font-semibold text-slate-700"
            >
              Nombre Completo
            </label>

            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                id="register-name"
                name="nombre"
                type="text"
                required
                autoComplete="name"
                value={nombre}
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => {
                  setNombre(normalizeName(e.target.value));
                }}
                placeholder="Juan Pérez"
                aria-label="Nombre completo"
                aria-invalid={!!errorMsg}
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

            <p className="text-[10px] text-slate-400 text-right">
              {nombre.length}/{MAX_NAME_LENGTH}
            </p>

          </div>

          {/* Correo electrónico */}
          <div className="space-y-1">

            <label
              htmlFor="register-email"
              className="text-xs font-semibold text-slate-700"
            >
              Correo Electrónico (Único)
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                id="register-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                maxLength={MAX_EMAIL_LENGTH}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                aria-label="Correo electrónico"
                aria-invalid={!!errorMsg}
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

          </div>

          {/* Contraseña */}
          <div className="space-y-1">

            <label
              htmlFor="register-password"
              className="text-xs font-semibold text-slate-700"
            >
              Contraseña
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                id="register-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-label="Contraseña"
                aria-invalid={!!password && score < 5}
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

            {/* Medidor de fortaleza */}
            {password && (
              <div className="pt-2 space-y-2">

                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">
                    Fortaleza:
                  </span>

                  <span className="font-semibold text-slate-700">
                    {getStrengthLabel().text}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStrengthLabel().color} ${getStrengthLabel().width} transition-all duration-300`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-slate-600">

                  <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.length
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <X className="w-3 h-3 text-slate-300" />
                    }
                    Mínimo 8 caracteres
                  </div>

                  <div className={`flex items-center gap-1.5 ${rules.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.uppercase
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <X className="w-3 h-3 text-slate-300" />
                    }
                    Una mayúscula
                  </div>

                  <div className={`flex items-center gap-1.5 ${rules.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.lowercase
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <X className="w-3 h-3 text-slate-300" />
                    }
                    Una minúscula
                  </div>

                  <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.number
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <X className="w-3 h-3 text-slate-300" />
                    }
                    Al menos un número
                  </div>

                  <div className={`col-span-2 flex items-center gap-1.5 ${rules.symbol ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {rules.symbol
                      ? <Check className="w-3 h-3 text-emerald-600" />
                      : <X className="w-3 h-3 text-slate-300" />
                    }
                    Un símbolo (!@#$%^&*...)
                  </div>

                </div>

                <p className="text-[10px] text-slate-400">
                  Máximo {MAX_PASSWORD_LENGTH} caracteres.
                </p>

              </div>
            )}

          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-1">

            <label
              htmlFor="register-confirm-password"
              className="text-xs font-semibold text-slate-700"
            >
              Confirmar Contraseña
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

              <input
                id="register-confirm-password"
                name="confirm_password"
                type="password"
                required
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                aria-label="Confirmar contraseña"
                aria-invalid={
                  !!confirmPassword &&
                  password !== confirmPassword
                }
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

          </div>

          {/* CAPTCHA */}
          <div className="pt-2">
            <CaptchaWidget onVerify={handleCaptchaVerify} />
          </div>

          {/* Botón de registro */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              'Creando cuenta...'
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Registrar Cuenta</span>
              </>
            )}
          </button>

          {/* Navegación */}
          <div className="text-center pt-2">

            <p className="text-xs text-slate-500">
              ¿Ya tiene una cuenta?{' '}

              <Link
                to="/login"
                className="font-semibold text-sky-600 hover:text-sky-800"
              >
                Iniciar Sesión
              </Link>
            </p>

          </div>

        </form>
      </div>
    </div>
  );
};
