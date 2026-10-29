import axios from 'axios';
import { getDeviceId } from './device';

// Detectar base URL del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor de solicitudes: adjunta token de acceso y dispositivo_id
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bdg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const deviceId = getDeviceId();
    config.headers['X-Device-Id'] = deviceId;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas: captura sesión invalidada por otro equipo (RF-SEG-06)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const errData = error.response.data || {};
      const codigo = errData.codigo || '';
      const mensaje = errData.mensaje || 'Su sesión fue cerrada porque se inició en otro equipo';

      if (
        codigo === 'SESSION_INVALIDATED' || 
        codigo === 'SESSION_TIMEOUT' || 
        codigo === 'TOKEN_EXPIRED'
      ) {
        localStorage.removeItem('bdg_token');
        localStorage.removeItem('bdg_user');
        // Notificar y redirigir
        window.dispatchEvent(
          new CustomEvent('session-expired', { detail: { mensaje } })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;
