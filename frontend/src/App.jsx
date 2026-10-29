import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pantallas públicas de seguridad
import { P01Login } from './pages/P01Login';
import { P02VerifyOtp } from './pages/P02VerifyOtp';
import { P03ActiveSessionNotice } from './pages/P03ActiveSessionNotice';
import { P04Register } from './pages/P04Register';
import { P05ForgotPassword } from './pages/P05ForgotPassword';
import { P06ResetPassword } from './pages/P06ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';

// Pantallas protegidas del sistema
import { P07Dashboard } from './pages/P07Dashboard';
import { P08UsersRoles } from './pages/P08UsersRoles';
import { SecurityAudit } from './pages/SecurityAudit';
import { P09Products } from './pages/P09Products';
import { P10Suppliers } from './pages/P10Suppliers';
import { P11RequestsList } from './pages/P11RequestsList';
import { P12NewEditRequest } from './pages/P12NewEditRequest';
import { P13ConfirmRequest } from './pages/P13ConfirmRequest';
import { P14ReceiveDelivery } from './pages/P14ReceiveDelivery';
import { P15Inventory } from './pages/P15Inventory';
import { P16Movements } from './pages/P16Movements';
import { RequestDetail } from './pages/RequestDetail';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<P01Login />} />
            <Route path="/verificar-otp" element={<P02VerifyOtp />} />
            <Route path="/aviso-sesion-activa" element={<P03ActiveSessionNotice />} />
            <Route path="/registro" element={<P04Register />} />
            <Route path="/recuperar-contrasena" element={<P05ForgotPassword />} />
            <Route path="/nueva-contrasena" element={<P06ResetPassword />} />
            <Route path="/verificar-email" element={<VerifyEmail />} />

            {/* Rutas Protegidas bajo Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                {/* P07: Dashboard principal */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<P07Dashboard />} />

                {/* P08: Usuarios y Roles (Admin) */}
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute requiredRole="Administrador">
                      <P08UsersRoles />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seguridad"
                  element={
                    <ProtectedRoute requiredRole="Administrador">
                      <SecurityAudit />
                    </ProtectedRoute>
                  }
                />

                {/* P09: Catálogo de Productos */}
                <Route
                  path="/productos"
                  element={
                    <ProtectedRoute requiredPermission="Consultar inventario y productos">
                      <P09Products />
                    </ProtectedRoute>
                  }
                />

                {/* P10: Catálogo de Proveedores */}
                <Route
                  path="/proveedores"
                  element={
                    <ProtectedRoute requiredRole="Compras">
                      <P10Suppliers />
                    </ProtectedRoute>
                  }
                />

                {/* P11, P12, P13, P14: Gestión de Solicitudes */}
                <Route path="/solicitudes" element={<P11RequestsList />} />
                <Route
                  path="/solicitudes/nueva"
                  element={
                    <ProtectedRoute requiredPermission="Crear / editar / cancelar solicitudes">
                      <P12NewEditRequest />
                    </ProtectedRoute>
                  }
                />
                <Route path="/solicitudes/:id" element={<RequestDetail />} />
                <Route
                  path="/solicitudes/:id/editar"
                  element={
                    <ProtectedRoute requiredPermission="Crear / editar / cancelar solicitudes">
                      <P12NewEditRequest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/solicitudes/:id/confirmar"
                  element={
                    <ProtectedRoute requiredPermission="Confirmar cantidades a entregar">
                      <P13ConfirmRequest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/solicitudes/:id/recibir"
                  element={
                    <ProtectedRoute requiredPermission="Registrar recepción de entrega">
                      <P14ReceiveDelivery />
                    </ProtectedRoute>
                  }
                />

                {/* P15: Consulta de Inventario */}
                <Route
                  path="/inventario"
                  element={
                    <ProtectedRoute requiredPermission="Consultar inventario y productos">
                      <P15Inventory />
                    </ProtectedRoute>
                  }
                />

                {/* P16: Consulta de Movimientos */}
                <Route
                  path="/movimientos"
                  element={
                    <ProtectedRoute requiredPermission="Consultar movimientos">
                      <P16Movements />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
