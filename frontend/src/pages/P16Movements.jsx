import React, { useState, useEffect } from 'react';
import {
  History,
  FileText,
  Boxes,
  GitCommit,
  Search,
  Filter,
  Eye,
  X,
  Calendar,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';

export const P16Movements = () => {
  // Pestañas estrictas según sección 5 y 9: 1 Pedidos, 2 Productos ingresados, 3 Cambios
  const [activeTab, setActiveTab] = useState('pedidos'); // 'pedidos' | 'ingresos' | 'cambios'

  const [dataItems, setDataItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filtros comunes
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [numeroSolicitud, setNumeroSolicitud] = useState('');

  // Catálogos para filtros
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // Modal detalle de pedido (Pestaña 1)
  const [selectedPedido, setSelectedPedido] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers', { params: { size: 100 } }),
          api.get('/products', { params: { size: 200 } })
        ]);
        setSuppliers(supRes.data.items || []);
        setProducts(prodRes.data.items || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCatalogs();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/movements', {
        params: {
          tipo: activeTab,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
          proveedor_id: proveedorId || undefined,
          producto_id: productoId || undefined,
          numero_solicitud: numeroSolicitud || undefined,
          page,
          size
        }
      });
      setDataItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar movimientos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleClearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setProveedorId('');
    setProductoId('');
    setNumeroSolicitud('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <History className="w-6 h-6 text-sky-600" />
          Consulta de Movimientos
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Auditoría y trazabilidad completa de compras, ingresos y cambios de estado (RF-NEG-07).
        </p>
      </div>

      {/* 3 Tabs in exact specified order */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => {
            setActiveTab('pedidos');
            setPage(1);
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'pedidos'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Pedidos</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('ingresos');
            setPage(1);
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'ingresos'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>2. Productos Ingresados</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('cambios');
            setPage(1);
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'cambios'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>3. Cambios desde Pedido hasta Entrega</span>
        </button>
      </div>

      {/* Common Filters for all 3 tabs */}
      <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600">Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600">Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600">Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600">Producto</label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            >
              <option value="">Todos los productos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600">N° de Solicitud</label>
            <input
              type="text"
              value={numeroSolicitud}
              onChange={(e) => setNumeroSolicitud(e.target.value)}
              placeholder="SOL-2026-..."
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-mono uppercase"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-800 transition font-medium"
          >
            Limpiar filtros
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
          >
            Aplicar Filtros
          </button>
        </div>
      </form>

      {/* Tab 1: Pedidos */}
      {activeTab === 'pedidos' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Número</th>
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-4">Fecha Creación</th>
                  <th className="py-3.5 px-4">Fecha Requerida</th>
                  <th className="py-3.5 px-4">Estado Actual</th>
                  <th className="py-3.5 px-4 text-center">Total Líneas</th>
                  <th className="py-3.5 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : dataItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No se encontraron pedidos.
                    </td>
                  </tr>
                ) : (
                  dataItems.map((ped) => (
                    <tr key={ped.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-800">
                        {ped.numero}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {ped.proveedor_nombre}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(ped.fecha_creacion).toLocaleDateString('es-GT')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {ped.fecha_entrega}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge estado={ped.estado} />
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {ped.total_lineas}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPedido(ped)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Productos Ingresados */}
      {activeTab === 'ingresos' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Fecha Recepción</th>
                  <th className="py-3.5 px-4">N° Solicitud</th>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4 text-center">Cant. Recibida</th>
                  <th className="py-3.5 px-4">Usuario que Recibió</th>
                  <th className="py-3.5 px-4">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Cargando ingresos de bodega...
                    </td>
                  </tr>
                ) : dataItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No se registran ingresos a inventario con estos filtros.
                    </td>
                  </tr>
                ) : (
                  dataItems.map((ing) => (
                    <tr key={ing.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(ing.fecha_recepcion).toLocaleString('es-GT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-800">
                        {ing.numero_solicitud}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {ing.codigo_producto}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {ing.nombre_producto}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        +{ing.cantidad}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        👤 {ing.usuario_recibio}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {ing.proveedor_nombre}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cambios desde Pedido hasta Entrega (Línea de tiempo) */}
      {activeTab === 'cambios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
          <div className="space-y-6">
            {loading ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Cargando historial de cambios...
              </div>
            ) : dataItems.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No hay movimientos registrados en la línea de tiempo.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {dataItems.map((c) => {
                  const fechaStr = new Date(c.fecha).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div key={c.id} className="relative flex items-start gap-4 text-xs">
                      {/* Punto en timeline */}
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-3 border-sky-600"></div>

                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sky-800">
                              {c.numero_solicitud}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                              {c.tipo}
                            </span>
                            {c.proveedor_nombre && (
                              <span className="text-slate-500 font-medium">
                                · {c.proveedor_nombre}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {fechaStr}
                          </span>
                        </div>

                        {/* Evolución de estados / cantidades */}
                        {(c.estado_anterior || c.estado_nuevo) && (
                          <div className="flex items-center gap-2 pt-1 font-semibold">
                            {c.estado_anterior && <StatusBadge estado={c.estado_anterior} />}
                            {c.estado_anterior && <ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                            {c.estado_nuevo && <StatusBadge estado={c.estado_nuevo} />}
                          </div>
                        )}

                        {c.nombre_producto && (
                          <p className="font-semibold text-slate-800">
                            Producto: {c.nombre_producto} ({c.codigo_producto}) — Cantidad: {c.cantidad}
                          </p>
                        )}

                        {c.comentario && (
                          <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200 italic">
                            "{c.comentario}"
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pt-1">
                          <User className="w-3 h-3" />
                          <span>Registrado por: <strong className="text-slate-700">{c.usuario_nombre}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>Total: {total} registros</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition font-medium"
          >
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            disabled={page * size >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition font-medium"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal Detalle de Pedido (Pestaña 1) */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Detalle del Pedido {selectedPedido.numero}</h3>
                <p className="text-xs text-slate-500">{selectedPedido.proveedor_nombre}</p>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400">Estado:</span>
                  <div className="mt-0.5"><StatusBadge estado={selectedPedido.estado} /></div>
                </div>
                <div>
                  <span className="text-slate-400">Fecha Requerida:</span>
                  <p className="font-semibold text-slate-800">{selectedPedido.fecha_entrega}</p>
                </div>
              </div>

              {selectedPedido.observaciones && (
                <div>
                  <span className="font-semibold text-slate-700">Observaciones:</span>
                  <p className="text-slate-600 mt-0.5">{selectedPedido.observaciones}</p>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700 block mb-2">Líneas del Pedido:</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Código</th>
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3 text-center">Solicitado</th>
                        <th className="py-2 px-3 text-center">Confirmado</th>
                        <th className="py-2 px-3 text-center">Recibido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPedido.lineas?.map((l) => (
                        <tr key={l.producto_id}>
                          <td className="py-2 px-3 font-mono font-bold text-sky-800">{l.codigo}</td>
                          <td className="py-2 px-3">{l.nombre}</td>
                          <td className="py-2 px-3 text-center">{l.cant_solicitada}</td>
                          <td className="py-2 px-3 text-center font-semibold text-amber-700">{l.cant_confirmada}</td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700">{l.cant_recibida}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedPedido(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
