import React from 'react';
import { LogOut, User as UserIcon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDeviceId } from '../services/device';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const deviceId = getDeviceId().substring(0, 8);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-2xs z-10">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5 text-slate-500" />
          Equipo: {deviceId}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User profile */}
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-none">{user?.nombre}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* Logout button */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
};
