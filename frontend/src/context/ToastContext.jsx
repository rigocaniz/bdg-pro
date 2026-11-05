
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef
} from 'react';

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X
} from 'lucide-react';

const ToastContext = createContext(null);

// Configuración de seguridad y comportamiento
const MAX_TOASTS = 5;
const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_DURATION = 4500;
const MIN_DURATION = 1000;
const MAX_DURATION = 10000;

// Tipos de notificación permitidos
const VALID_TOAST_TYPES = [
  'success',
  'error',
  'warning',
  'info'
];

// Normalización segura de mensajes
const normalizeMessage = (mensaje) => {
  if (typeof mensaje === 'string') {
    return mensaje.slice(0, MAX_MESSAGE_LENGTH);
  }

  if (typeof mensaje === 'number' && Number.isFinite(mensaje)) {
    return String(mensaje);
  }

  return 'Se ha producido una notificación.';
};

// Normalización de tipos
const normalizeType = (tipo) => {
  return VALID_TOAST_TYPES.includes(tipo)
    ? tipo
    : 'info';
};

// Control de duración
const normalizeDuration = (duracion) => {
  if (
    typeof duracion !== 'number' ||
    !Number.isFinite(duracion)
  ) {
    return DEFAULT_DURATION;
  }

  return Math.min(
    Math.max(duracion, MIN_DURATION),
    MAX_DURATION
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Referencias para administrar temporizadores
  const timersRef = useRef(new Map());

  // Identificador incremental
  const idCounterRef = useRef(0);

  // Limpieza de temporizadores al desmontar el Provider
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });

      timersRef.current.clear();
    };
  }, []);

  // Eliminar notificación
  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((prev) =>
      prev.filter((toast) => toast.id !== id)
    );
  }, []);

  // Crear notificación
  const showToast = useCallback((
    mensaje,
    tipo = 'success',
    duracion = DEFAULT_DURATION
  ) => {

    const safeMessage = normalizeMessage(mensaje);
    const safeType = normalizeType(tipo);
    const safeDuration = normalizeDuration(duracion);

    // Identificador interno único durante la vida del Provider
    const id = `toast-${++idCounterRef.current}`;

    const newToast = {
      id,
      mensaje: safeMessage,
      tipo: safeType
    };

    // Agregar notificación con límite de elementos
    setToasts((prev) => [
      ...prev,
      newToast
    ].slice(-MAX_TOASTS));

    // Temporizador de eliminación automática
    const timer = setTimeout(() => {
      timersRef.current.delete(id);

      setToasts((prev) =>
        prev.filter((toast) => toast.id !== id)
      );

    }, safeDuration);

    timersRef.current.set(id, timer);

  }, []);

  // Iconos según el tipo de notificación
  const getIcon = (tipo) => {
    switch (tipo) {
      case 'success':
        return (
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
        );

      case 'error':
        return (
          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
        );

      case 'warning':
        return (
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        );

      default:
        return (
          <Info className="w-5 h-5 text-sky-500 shrink-0" />
        );
    }
  };

  // Colores según el tipo de notificación
  const getBorderColor = (tipo) => {
    switch (tipo) {
      case 'success':
        return 'border-emerald-200 bg-white text-emerald-950 shadow-emerald-50';

      case 'error':
        return 'border-rose-200 bg-white text-rose-950 shadow-rose-50';

      case 'warning':
        return 'border-amber-200 bg-white text-amber-950 shadow-amber-50';

      default:
        return 'border-sky-200 bg-white text-sky-950 shadow-sky-50';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>

      {children}

      {/* Contenedor de notificaciones */}
      <div
        aria-label="Notificaciones"
        className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none px-4"
      >

        {toasts.map((toast) => {

          const isError = toast.tipo === 'error';

          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              aria-live={isError ? 'assertive' : 'polite'}
              aria-atomic="true"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 ${getBorderColor(
                toast.tipo
              )}`}
            >

              {getIcon(toast.tipo)}

              {/* 
                IMPORTANTE:
                Renderizado seguro mediante interpolación JSX.
                React trata mensaje como texto y no interpreta HTML.
              */}
              <div className="flex-1 text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">
                {toast.mensaje}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Cerrar notificación"
                title="Cerrar notificación"
                className="text-slate-400 hover:text-slate-600 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>

            </div>
          );
        })}

      </div>

    </ToastContext.Provider>
  );
};

// Hook de acceso al contexto
export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      'useToast debe utilizarse dentro de un ToastProvider.'
    );
  }

  return context;
};
