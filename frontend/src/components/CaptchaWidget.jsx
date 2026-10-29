import React, { useState } from 'react';
import { Check, ShieldCheck, RefreshCw } from 'lucide-react';

export const CaptchaWidget = ({ onVerify, isVerified = false }) => {
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(isVerified);

  const handleClick = () => {
    if (checked || loading) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setChecked(true);
      // Pasa el token de prueba estándar de reCAPTCHA
      onVerify('test-token-valid-recaptcha-bypass');
    }, 600);
  };

  return (
    <div className="w-full max-w-sm p-3.5 bg-slate-50 border border-slate-300 rounded-lg shadow-xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={checked || loading}
          className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
            checked
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-slate-400 hover:border-slate-600 cursor-pointer'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
          ) : checked ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : null}
        </button>
        <span className="text-sm font-medium text-slate-700 select-none cursor-pointer" onClick={handleClick}>
          {checked ? 'Verificación completada' : 'No soy un robot'}
        </span>
      </div>

      <div className="flex flex-col items-center select-none opacity-80">
        <ShieldCheck className="w-6 h-6 text-sky-600" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
          reCAPTCHA
        </span>
        <span className="text-[9px] text-slate-400 leading-none">Privacidad · Términos</span>
      </div>
    </div>
  );
};
