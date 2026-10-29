import React from 'react';

export const StatusBadge = ({ estado, esConfirmacionParcial = false }) => {
  const getBadgeStyle = (est) => {
    switch (est) {
      case 'Borrador':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Enviada':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Por entregar':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Entregada':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Entregada parcial':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      case 'Rechazada':
      case 'Cancelada':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'Cerrada con faltante':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`px-2.5 py-1 text-xs font-semibold rounded-full border shadow-xs inline-flex items-center gap-1.5 ${getBadgeStyle(
          estado
        )}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
        {estado}
      </span>
      {esConfirmacionParcial && (
        <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-100 text-amber-900 border border-amber-300">
          Confirmación parcial
        </span>
      )}
    </div>
  );
};
