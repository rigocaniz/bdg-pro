import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  Package,
  PlusCircle,
  Truck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const P07Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/dashboard/metrics');
        setMetrics(res.data);
      } catch (err) {
        console.error("Error al cargar métricas del dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const estados = metrics?.solicitudes_por_estado || {};

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-linear-to-r from-sky-800 to-sky-950 rounded-2xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-700/60 text-sky-200 border border-sky-600/50">
            Panel Principal
          </span>
          <h2 className="text-2xl font-bold mt-2">¡Hola, {user?.nombre}!</h2>
          <p className="text-sky-200 text-sm mt-1 max-w-xl">
            Resumen operativo de solicitudes a proveedores, próximas entregas y estado del inventario.
          </p>
        </div>

        {hasPermission('Crear / editar / cancelar solicitudes') && (
          <Link
            to="/solicitudes/nueva"
            className="px-4 py-2.5 bg-white text-sky-900 hover:bg-sky-50 text-sm font-semibold rounded-xl shadow-xs transition flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-sky-600" />
            Nueva Solicitud
          </Link>
        )}
      </div>

      {/* 1. Tarjeta: Solicitudes por Estado */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            Solicitudes por Estado
          </h3>
          <Link to="/solicitudes" className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <p className="text-xs text-slate-500 font-medium">Borrador</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{estados['Borrador'] || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-blue-200 shadow-2xs">
            <p className="text-xs text-blue-600 font-medium">Enviada</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{estados['Enviada'] || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs">
            <p className="text-xs text-amber-700 font-medium">Por entregar</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{estados['Por entregar'] || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs">
            <p className="text-xs text-emerald-600 font-medium">Entregada</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{estados['Entregada'] || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-orange-200 shadow-2xs">
            <p className="text-xs text-orange-600 font-medium">Entregada parcial</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{estados['Entregada parcial'] || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs">
            <p className="text-xs text-rose-600 font-medium">Canceladas / Rech.</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">
              {(estados['Cancelada'] || 0) + (estados['Rechazada'] || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas: Entregas próximas + Inventario bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Entregas próximas (7 días) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Entregas Próximas (7 Días)</h3>
                  <p className="text-xs text-slate-400">Requeridas en el corto plazo</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {metrics?.total_proximas_entregas || 0} pendientes
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {metrics?.proximas_entregas?.length > 0 ? (
                metrics.proximas_entregas.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/solicitudes/${item.id}`}
                          className="font-bold text-sky-600 hover:text-sky-800 text-xs"
                        >
                          {item.numero}
                        </Link>
                        <StatusBadge estado={item.estado} />
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{item.proveedor_nombre}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-700 block">
                        {item.fecha_entrega}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.total_lineas} {item.total_lineas === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No hay entregas pendientes programadas para los próximos 7 días.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-2">
            <Link
              to="/solicitudes"
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center justify-center gap-1"
            >
              Consultar todas las entregas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 3. Productos con inventario bajo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Productos con Inventario Bajo</h3>
                  <p className="text-xs text-slate-400">Stock menor o igual a 15 unidades</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {metrics?.total_productos_bajos || 0} en alerta
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {metrics?.productos_bajos?.length > 0 ? (
                metrics.productos_bajos.map((prod) => (
                  <div key={prod.producto_id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {prod.codigo}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {prod.nombre}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                        {prod.cantidad} disp.
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Todo el catálogo cuenta con niveles de stock óptimos.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-2">
            <Link
              to="/inventario"
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center justify-center gap-1"
            >
              Ver reporte completo de inventario <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
