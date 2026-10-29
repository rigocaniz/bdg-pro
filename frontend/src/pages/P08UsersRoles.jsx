import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  LogOut,
  Edit2,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const P08UsersRoles = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [q, setQ] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Catálogos
  const [rolesCatalog, setRolesCatalog] = useState([]);
  const [suppliersCatalog, setSuppliersCatalog] = useState([]);

  // Modal de Roles
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const { showToast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: {
          q: q || undefined,
          estado: estadoFilter || undefined,
          rol: rolFilter || undefined,
          page,
          size
        }
      });
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar la lista de usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const [rRes, pRes] = await Promise.all([
        api.get('/users/roles/catalog'),
        api.get('/suppliers', { params: { size: 100 } })
      ]);
      setRolesCatalog(rRes.data || []);
      setSuppliersCatalog(pRes.data.items || []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, estadoFilter, rolFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleEstado = async (user, nuevoEstado) => {
    try {
      await api.patch(`/users/${user.id}`, { estado: nuevoEstado });
      showToast(`Usuario ${user.nombre} actualizado a '${nuevoEstado}'.`, 'success');
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al cambiar estado.';
      showToast(msg, 'error');
    }
  };

  const handleForceLogout = async (user) => {
    if (!window.confirm(`¿Está seguro de forzar el cierre de todas las sesiones activas de ${user.nombre}?`)) {
      return;
    }
    try {
      const res = await api.post(`/users/${user.id}/force-logout`);
      showToast(res.data.mensaje || 'Sesión cerrada forzosamente.', 'success');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al forzar cierre de sesión.';
      showToast(msg, 'error');
    }
  };

  const openRolesModal = (user) => {
    setEditingUser(user);
    setSelectedRoles(user.roles || []);
    setSelectedSupplierId(user.proveedor_id || '');
  };

  const handleSaveRoles = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    if (selectedRoles.includes('Proveedor') && !selectedSupplierId) {
      showToast('Debe seleccionar el proveedor al que está vinculado este usuario.', 'warning');
      return;
    }

    setModalLoading(true);
    try {
      await api.patch(`/users/${editingUser.id}/roles`, {
        roles: selectedRoles,
        proveedor_id: selectedRoles.includes('Proveedor') ? selectedSupplierId : null
      });
      showToast('Roles del usuario actualizados exitosamente.', 'success');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al actualizar roles.';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const toggleRoleSelection = (roleName) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleName));
    } else {
      setSelectedRoles([...selectedRoles, roleName]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            Gestión de Usuarios y Roles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de cuentas, estados, asignación de roles y control de sesiones activas (RF-SEG-05).
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o correo electrónico..."
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <select
            value={rolFilter}
            onChange={(e) => {
              setRolFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-hidden"
          >
            <option value="">Todos los roles</option>
            {rolesCatalog.map((r) => (
              <option key={r.id} value={r.nombre}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Roles Asignados</th>
                <th className="py-3.5 px-4">Vinculación</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Intentos</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No se encontraron usuarios con los criterios indicados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const prov = suppliersCatalog.find((p) => p.id === u.proveedor_id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{u.nombre}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {prov ? (
                          <span className="text-[11px] font-medium text-slate-700">
                            🏢 {prov.nombre}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.estado === 'activo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.estado === 'bloqueado'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : u.estado === 'pendiente'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={u.intentos_fallidos > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                          {u.intentos_fallidos}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón editar roles */}
                          <button
                            onClick={() => openRolesModal(u)}
                            title="Editar roles y permisos"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Activar / Desbloquear */}
                          {u.estado === 'bloqueado' || u.estado === 'inactivo' ? (
                            <button
                              onClick={() => handleToggleEstado(u, 'activo')}
                              title="Activar / Desbloquear cuenta"
                              className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 transition"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleEstado(u, 'inactivo')}
                              title="Desactivar usuario"
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Forzar cierre de sesión */}
                          <button
                            onClick={() => handleForceLogout(u)}
                            title="Forzar cierre de sesión única"
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} usuarios registrados</span>
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

      {/* Modal: Asignar Roles y Vincular Proveedor */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Asignar Roles y Proveedor</h3>
                <p className="text-xs text-slate-500">{editingUser.nombre} ({editingUser.email})</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoles} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Seleccione los roles del usuario:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {rolesCatalog.map((r) => {
                    const isSelected = selectedRoles.includes(r.nombre);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRoleSelection(r.nombre)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-sky-50 border-sky-300 text-sky-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p>{r.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{r.descripcion}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proveedor selector si tiene rol 'Proveedor' */}
              {selectedRoles.includes('Proveedor') && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <label className="font-semibold text-amber-900 block">
                    Vincular a Proveedor (Obligatorio para rol Proveedor):
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full py-2 px-3 bg-white border border-amber-300 rounded-lg text-slate-800 text-xs focus:outline-hidden"
                  >
                    <option value="">-- Seleccione un proveedor --</option>
                    {suppliersCatalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {modalLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
