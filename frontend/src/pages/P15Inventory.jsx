import React, { useState, useEffect } from 'react';
import { Boxes, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const P15Inventory = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState(1);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: {
          q: q || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          page,
          size
        }
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar datos de inventario.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, sortBy, sortDir]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 1 ? -1 : 1);
    } else {
      setSortBy(field);
      setSortDir(1);
    }
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/inventory/export', {
        params: { q: q || undefined },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventario_disponible.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Archivo CSV descargado exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar inventario.', 'error');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return sortDir === 1 ? (
      <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-bold" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-sky-600" />
            Consulta de Inventario Disponible
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Existencias actualizadas en tiempo real producto de las recepciones en bodega (RF-NEG-05).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Exportar a CSV / Excel
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort('codigo')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Código de Producto</span>
                    {renderSortIcon('codigo')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nombre de Producto</span>
                    {renderSortIcon('nombre')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cantidad')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition w-48"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Cantidad Disponible</span>
                    {renderSortIcon('cantidad')}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Última Actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    Cargando inventario...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    No se encontraron registros de inventario.
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const isLow = it.cantidad <= 15;
                  const fechaStr = new Date(it.actualizado_en).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-800">
                        {it.codigo}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {it.nombre}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${
                            isLow
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {it.cantidad} unidades
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {fechaStr}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} artículos en inventario</span>
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
    </div>
  );
};
