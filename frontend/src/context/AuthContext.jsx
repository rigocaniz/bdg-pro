
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef
} from 'react';

import api from '../services/api';
import { getDeviceId } from '../services/device';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'bdg_token';
const USER_STORAGE_KEY = 'bdg_user';

const TEMPORARY_SESSION_KEYS = [
  'bdg_login_ticket',
  'bdg_temp_email',
  'bdg_has_active_session'
];

const MAX_TOKEN_LENGTH = 8192;
const MAX_LOGIN_TICKET_LENGTH = 4096;
const MAX_MESSAGE_LENGTH = 200;

const DEFAULT_SESSION_MESSAGE =
  'Su sesión fue cerrada porque se inició en otro equipo.';

const DEFAULT_LOGIN_ERROR =
  'No fue posible completar la autenticación.';

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
};

const isValidToken = (value) => {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_TOKEN_LENGTH
  );
};

const isValidUser = (value) => {
  return (
    isPlainObject(value) &&
    (
      value.roles === undefined ||
      Array.isArray(value.roles)
    ) &&
    (
      value.permisos === undefined ||
      Array.isArray(value.permisos)
    )
  );
};

const sanitizeMessage = (message, fallback) => {
  if (typeof message !== 'string') {
    return fallback;
  }

  const sanitized = message
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

  return sanitized || fallback;
};

const clearAuthStorage = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // El navegador puede bloquear el acceso al almacenamiento.
  }
};

const clearTemporarySessionStorage = () => {
  try {
    TEMPORARY_SESSION_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch {
    // El navegador puede bloquear el acceso al almacenamiento.
  }
};

const clearAllSessionStorage = () => {
  clearAuthStorage();
  clearTemporarySessionStorage();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  // Evita procesar varias veces el mismo evento de expiración.
  const sessionExpiredRef = useRef(false);

  useEffect(() => {
    // Restaurar sesión desde almacenamiento local.
    try {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (savedToken && savedUser) {
        const parsedUser = JSON.parse(savedUser);

        if (
          isValidToken(savedToken) &&
          isValidUser(parsedUser)
        ) {
          setToken(savedToken);
          setUser(parsedUser);
        } else {
          clearAuthStorage();
        }
      } else {
        // Evita conservar datos parciales o inconsistentes.
        clearAuthStorage();
      }
    } catch {
      clearAuthStorage();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }

    // Escuchar evento de sesión invalidada por otro equipo (RF-SEG-06).
    const handleSessionExpired = (e) => {
      if (sessionExpiredRef.current) {
        return;
      }

      sessionExpiredRef.current = true;

      const msg = sanitizeMessage(
        e?.detail?.mensaje,
        DEFAULT_SESSION_MESSAGE
      );

      clearAllSessionStorage();

      setUser(null);
      setToken(null);

      showToast(msg, 'warning', 6000);

      window.location.href =
        `/login?reason=${encodeURIComponent(msg)}`;
    };

    window.addEventListener(
      'session-expired',
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        'session-expired',
        handleSessionExpired
      );
    };
  }, [showToast]);

  /**
   * Primer paso de autenticación.
   * Conserva el endpoint y el contrato original.
   */
  const loginStep1 = async (email, password, captchaToken) => {
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof captchaToken !== 'string' ||
      !email.trim() ||
      !password ||
      !captchaToken.trim() ||
      email.length > 254 ||
      password.length > 128
    ) {
      throw new Error(DEFAULT_LOGIN_ERROR);
    }

    const dispositivo_id = getDeviceId();

    const res = await api.post('/auth/login', {
      email: email.trim(),
      password,
      captcha_token: captchaToken,
      dispositivo_id
    });

    return res.data;
  };

  /**
   * Segundo paso de autenticación: verificación OTP.
   */
  const verifyOtp = async (
    loginTicket,
    otpCode,
    forzarCierrePrevia = false
  ) => {
    if (
      typeof loginTicket !== 'string' ||
      !loginTicket.trim() ||
      loginTicket.length > MAX_LOGIN_TICKET_LENGTH ||
      typeof otpCode !== 'string' ||
      !otpCode.trim()
    ) {
      throw new Error(DEFAULT_LOGIN_ERROR);
    }

    const res = await api.post('/auth/verify-otp', {
      login_ticket: loginTicket,
      otp_code: otpCode,
      forzar_cierre_previa: forzarCierrePrevia === true
    });

    const responseData = res.data;

    if (responseData?.access_token) {
      const { access_token, usuario } = responseData;

      // Validar la estructura recibida antes de establecer
      // el estado autenticado de la aplicación.
      if (
        !isValidToken(access_token) ||
        !isValidUser(usuario)
      ) {
        throw new Error(DEFAULT_LOGIN_ERROR);
      }

      try {
        // Se conserva el mecanismo de persistencia existente.
        localStorage.setItem(
          TOKEN_STORAGE_KEY,
          access_token
        );

        localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify(usuario)
        );

      } catch {
        clearAuthStorage();

        throw new Error(
          'No fue posible guardar la sesión en el navegador.'
        );
      }

      // Actualizar el estado únicamente después de persistir
      // correctamente los datos.
      setToken(access_token);
      setUser(usuario);

      // El proceso OTP terminó; ya no se necesita el ticket temporal.
      clearTemporarySessionStorage();
    }

    return responseData;
  };

  /**
   * Reenvío del código OTP.
   */
  const resendOtp = async (loginTicket) => {
    if (
      typeof loginTicket !== 'string' ||
      !loginTicket.trim() ||
      loginTicket.length > MAX_LOGIN_TICKET_LENGTH
    ) {
      throw new Error(DEFAULT_LOGIN_ERROR);
    }

    const res = await api.post('/auth/resend-otp', {
      login_ticket: loginTicket
    });

    return res.data;
  };

  /**
   * Cierre de sesión.
   */
  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch {
      // El cierre local debe continuar aunque falle la petición.
      // No se imprimen errores que puedan contener información sensible.
    } finally {
      clearAllSessionStorage();

      setUser(null);
      setToken(null);

      sessionExpiredRef.current = false;

      showToast(
        'Sesión cerrada correctamente',
        'info'
      );

      window.location.href = '/login';
    }
  };

  /**
   * Comprobar si el usuario posee un rol.
   * La comprobación local sirve para la interfaz;
   * no sustituye la autorización del backend.
   */
  const hasRole = (roleName) => {
    if (
      !user ||
      !Array.isArray(user.roles) ||
      typeof roleName !== 'string'
    ) {
      return false;
    }

    return (
      user.roles.includes('Administrador') ||
      user.roles.includes(roleName)
    );
  };

  /**
   * Comprobar si el usuario posee un permiso.
   * La autorización definitiva debe realizarse en el servidor.
   */
  const hasPermission = (permissionName) => {
    if (
      !user ||
      typeof permissionName !== 'string'
    ) {
      return false;
    }

    if (
      Array.isArray(user.roles) &&
      user.roles.includes('Administrador')
    ) {
      return true;
    }

    return (
      Array.isArray(user.permisos) &&
      user.permisos.includes(permissionName)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        loading,
        loginStep1,
        verifyOtp,
        resendOtp,
        logout,
        hasRole,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de un AuthProvider.'
    );
  }

  return context;
};
