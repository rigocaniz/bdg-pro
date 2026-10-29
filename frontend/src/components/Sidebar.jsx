import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Package,
  Truck,
  Boxes,
  History,
  Users,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, hasPermission, hasRole } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Panel de Inicio',
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: '/solicitudes',
      label: 'Solicitudes',
      icon: FileText,
      show: true,
    },
    {
      to: '/solicitudes/nueva',
      label: 'Nueva Solicitud',
      icon: PlusCircle,
      show: hasPermission('Crear / editar / cancelar solicitudes'),
    },
    {
      to: '/productos',
      label: 'Productos',
      icon: Package,
      show: hasPermission('Consultar inventario y productos'),
    },
    {
      to: '/proveedores',
      label: 'Proveedores',
      icon: Truck,
      show: hasRole('Compras') || hasRole('Administrador'),
    },
    {
      to: '/inventario',
      label: 'Inventario',
      icon: Boxes,
      show: hasPermission('Consultar inventario y productos'),
    },
    {
      to: '/movimientos',
      label: 'Movimientos',
      icon: History,
      show: hasPermission('Consultar movimientos'),
    },
    {
      to: '/usuarios',
      label: 'Usuarios y Roles',
      icon: Users,
      show: hasRole('Administrador'),
    },
    {
      to: '/seguridad',
      label: 'Bitácora de Seguridad',
      icon: ShieldAlert,
      show: hasRole('Administrador'),
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-900/50">
          B
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-tight">BDG PRO</h1>
          <p className="text-[11px] text-slate-400 font-medium">Compras & Inventario</p>
        </div>
      </div>

      {/* Nav list */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Módulos
        </div>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </div>

      {/* User footer badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-slate-400 font-medium">Sesión activa protegida</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {user?.roles?.map((r) => (
            <span
              key={r}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
