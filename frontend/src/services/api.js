
import axios from 'axios';
import { getDeviceId } from './device';

// ======================================================
// CONFIGURACIÓN
// ======================================================

const DEFAULT_API_URL = 'http://localhost:8000/api/v1';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).trim();

const REQUEST_TIMEOUT = 15000;
const MAX_DEVICE_ID_LENGTH = 128;
const MAX_SESSION_MESSAGE_LENGTH = 200;

const SESSION_ERROR_CODES = new Set([
  'SESSION_INVALIDATED',
  'SESSION_TIMEOUT',
  'TOKEN_EXPIRED'
]);

// ======================================================
// VALIDACIÓN DE CONFIGURACIÓN
// ======================================================

// Resuelve y valida la URL del backend.
const validateApiUrl = (url) => {
  try {
    const baseOrigin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost';

    const parsedUrl = new URL(url, baseOrigin);

    // Solo se permiten conexiones HTTP o HTTPS.
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Protocolo de API no permitido.');
    }

    // Evita credenciales incrustadas en la URL.
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error('La URL de API no puede contener credenciales.');
    }

    // No permitir parámetros ni fragmentos en la URL base.
    if (parsedUrl.search || parsedUrl.hash) {
      throw new Error('La URL base de API contiene parámetros no permitidos.');
    }

    return {
      url,
      origin: parsedUrl.origin
    };

  } catch (error) {
    throw new Error(
      `Configuración de API inválida: ${error.message}`
    );
  }
};

const API_CONFIGURATION = validateApiUrl(API_BASE_URL);

// ======================================================
// ALMACENAMIENTO SEGURO
// ======================================================

// Lectura controlada de localStorage.
const getStoredValue = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Eliminación controlada de información de sesión.
const clearSessionStorage = () => {
  try {
    localStorage.removeItem('bdg_token');
    localStorage.removeItem('bdg_user');
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador.
    // No se expone información interna.
  }
};

// ======================================================
// VALIDACIÓN DE DISPOSITIVO
// ======================================================

const getValidatedDeviceId = () => {
  try {
    const deviceId = getDeviceId();

    if (
      typeof deviceId !== 'string' ||
      deviceId.length === 0 ||
      deviceId.length > MAX_DEVICE_ID_LENGTH
    ) {
      return null;
    }

    // Permite UUID y otros identificadores alfanuméricos habituales.
    if (!/^[a-zA-Z0-9._:-]+$/.test(deviceId)) {
      return null;
    }

    return deviceId;

  } catch {
    return null;
  }
};

// ======================================================
// VALIDACIÓN DEL DESTINO
// ======================================================

// Comprueba que la solicitud se dirija al backend configurado.
const isTrustedApiDestination = (config) => {
  try {
    const baseURL = config.baseURL || API_CONFIGURATION.url;

    const requestURL = new URL(
      config.url || '',
      new URL(baseURL, window.location.origin)
    );

    return (
      ['http:', 'https:'].includes(requestURL.protocol) &&
      requestURL.origin === API_CONFIGURATION.origin
    );

  } catch {
    return false;
  }
};

// Elimina encabezados sensibles cuando el destino no es confiable.
const removeHeader = (headers, name) => {
  if (typeof headers.delete === 'function') {
    headers.delete(name);
  } else {
    const headerName = Object.keys(headers).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );

    if (headerName) {
      delete headers[headerName];
    }
  }
};

// ======================================================
// INSTANCIA AXIOS
// ======================================================

const api = axios.create({
  baseURL: API_CONFIGURATION.url,

  headers: {
    'Content-Type': 'application/json'
  },

  timeout: REQUEST_TIMEOUT
});

// ======================================================
// INTERCEPTOR DE SOLICITUDES
// ======================================================

api.interceptors.request.use(
  (config) => {

    // Garantiza que exista un objeto de encabezados.
    if (!config.headers) {
      config.headers = {};
    }

    // Verifica el destino antes de adjuntar información sensible.
    const trustedDestination = isTrustedApiDestination(config);

    if (!trustedDestination) {

      // Evita filtraciones de JWT e identificadores.
      removeHeader(config.headers, 'Authorization');
      removeHeader(config.headers, 'X-Device-Id');

      return config;
    }

    // Adjuntar JWT si existe.
    const token = getStoredValue('bdg_token');

    if (
      typeof token === 'string' &&
      token.length > 0 &&
      token.length <= 8192
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      removeHeader(config.headers, 'Authorization');
    }

    // Adjuntar identificador validado del dispositivo.
    const deviceId = getValidatedDeviceId();

    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId;
    } else {
      removeHeader(config.headers, 'X-Device-Id');
    }

    return config;
  },

  (error) => Promise.reject(error)
);

// ======================================================
// INTERCEPTOR DE RESPUESTAS
// ======================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {

    // Solo procesar respuestas HTTP 401.
    if (error?.response?.status === 401) {

      const errData = error.response.data;

      // Validar estructura de respuesta.
      const responseData =
        errData !== null &&
        typeof errData === 'object' &&
        !Array.isArray(errData)
          ? errData
          : {};

      const codigo =
        typeof responseData.codigo === 'string'
          ? responseData.codigo
          : '';

      // Solo actuar ante códigos de sesión conocidos.
      if (SESSION_ERROR_CODES.has(codigo)) {

        const mensaje =
          typeof responseData.mensaje === 'string' &&
          responseData.mensaje.trim().length > 0
            ? responseData.mensaje
                .trim()
                .slice(0, MAX_SESSION_MESSAGE_LENGTH)
            : 'Su sesión fue cerrada porque se inició en otro equipo.';

        // Limpiar información de sesión.
        clearSessionStorage();

        // Notificar a los componentes suscritos.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('session-expired', {
              detail: {
                mensaje
              }
            })
          );
        }
      }
    }

    // Mantener el comportamiento original de Axios.
    return Promise.reject(error);
  }
);

export default api;
