import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((mensaje, tipo = 'success', duracion = 4500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duracion);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

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
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 ${getBorderColor(
              toast.tipo
            )}`}
          >
            {getIcon(toast.tipo)}
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {toast.mensaje}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
