import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getDeviceId } from '../services/device';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Restaurar sesión desde almacenamiento local
    const savedToken = localStorage.getItem('bdg_token');
    const savedUser = localStorage.getItem('bdg_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('bdg_token');
        localStorage.removeItem('bdg_user');
      }
    }
    setLoading(false);

    // Escuchar evento de sesión invalidada por otro equipo (RF-SEG-06)
    const handleSessionExpired = (e) => {
      const msg = e.detail?.mensaje || 'Su sesión fue cerrada porque se inició en otro equipo';
      setUser(null);
      setToken(null);
      showToast(msg, 'warning', 6000);
      window.location.href = `/login?reason=${encodeURIComponent(msg)}`;
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [showToast]);

  const loginStep1 = async (email, password, captchaToken) => {
    const dispositivo_id = getDeviceId();
    const res = await api.post('/auth/login', {
      email,
      password,
      captcha_token: captchaToken,
      dispositivo_id
    });
    return res.data;
  };

  const verifyOtp = async (loginTicket, otpCode, forzarCierrePrevia = false) => {
    const res = await api.post('/auth/verify-otp', {
      login_ticket: loginTicket,
      otp_code: otpCode,
      forzar_cierre_previa: forzarCierrePrevia
    });

    if (res.data.access_token) {
      const { access_token, usuario } = res.data;
      setToken(access_token);
      setUser(usuario);
      localStorage.setItem('bdg_token', access_token);
      localStorage.setItem('bdg_user', JSON.stringify(usuario));
    }
    return res.data;
  };

  const resendOtp = async (loginTicket) => {
    const res = await api.post('/auth/resend-otp', {
      login_ticket: loginTicket
    });
    return res.data;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    } finally {
      localStorage.removeItem('bdg_token');
      localStorage.removeItem('bdg_user');
      setUser(null);
      setToken(null);
      showToast('Sesión cerrada correctamente', 'info');
      window.location.href = '/login';
    }
  };

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.includes('Administrador') || user.roles.includes(roleName);
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.roles && user.roles.includes('Administrador')) return true;
    return user.permisos && user.permisos.includes(permissionName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
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

export const useAuth = () => useContext(AuthContext);
