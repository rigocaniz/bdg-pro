import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Check, X, Tag } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const P09Products = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [q, setQ] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad: 'unidad',
    activo: true
  });
  const [submitting, setSubmitting] = useState(false);

  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManageProducts = hasPermission('Crear / editar / cancelar productos');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          q: q || undefined,
          activo: activoFilter !== '' ? activoFilter === 'true' : undefined,
          page,
          size
        }
      });
      setProducts(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar productos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, activoFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      unidad: 'unidad',
      activo: true
    });
    setShowModal(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      codigo: prod.codigo,
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      unidad: prod.unidad || 'unidad',
      activo: prod.activo
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          unidad: formData.unidad,
          activo: formData.activo
        });
        showToast('Producto actualizado correctamente.', 'success');
      } else {
        await api.post('/products', formData);
        showToast('Producto registrado exitosamente.', 'success');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar el producto.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-sky-600" />
            Catálogo de Productos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro y consulta de bienes disponibles para pedidos a proveedores (RF-NEG-01, RF-NEG-06).
          </p>
        </div>

        {canManageProducts && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código o nombre de producto..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Buscar
          </button>
        </form>

        <select
          value={activoFilter}
          onChange={(e) => {
            setActivoFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden w-full md:w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Nombre del Producto</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Unidad</th>
                <th className="py-3.5 px-4">Estado</th>
                {canManageProducts && <th className="py-3.5 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Cargando catálogo de productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-800">
                      {p.codigo}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {p.descripcion || '—'}
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[11px] text-slate-600 font-medium">
                      {p.unidad}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.activo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canManageProducts && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition"
                          title="Editar producto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} productos en catálogo</span>
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
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Código de Producto (Único)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProduct}
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="PRD-011"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 uppercase font-mono disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Marcador Pizarra Blanca Azul"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Descripción</label>
                <textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles técnicos o presentación..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Unidad de Medida</label>
                  <input
                    type="text"
                    required
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    placeholder="unidad, caja, resma..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300"
                    />
                    <span className="font-semibold text-slate-700">Producto Activo</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
