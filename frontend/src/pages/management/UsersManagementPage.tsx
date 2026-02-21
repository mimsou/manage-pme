import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../../api/client';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';

type UserRole = 'ADMIN' | 'MANAGER' | 'VENDEUR';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'VENDEUR' as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await apiClient.get<User[]>('/users');
      setUsers(data);
    } catch (e) {
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'VENDEUR',
    });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        await apiClient.put(`/users/${editUser.id}`, {
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          isActive: true,
        });
        toast.success('Utilisateur mis à jour');
      } else {
        if (!form.password || form.password.length < 6) {
          toast.error('Le mot de passe doit faire au moins 6 caractères');
          setSaving(false);
          return;
        }
        await apiClient.post('/users', {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        });
        toast.success('Utilisateur créé');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/users/${id}`);
      toast.success('Utilisateur supprimé');
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      toast.error('Impossible de supprimer l\'utilisateur');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await apiClient.put(`/users/${user.id}`, {
        isActive: !user.isActive,
      });
      toast.success(user.isActive ? 'Utilisateur désactivé' : 'Utilisateur activé');
      loadUsers();
    } catch (err) {
      toast.error('Erreur');
    }
  };

  if (loading) {
    return <div className="text-text-muted">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Créer, modifier ou supprimer les comptes utilisateurs de l'application.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-primary">Nom</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-primary">Email</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-primary">Rôle</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-text-primary">Statut</th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-elevated transition-colors duration-default ease-default">
                <td className="px-4 py-3 text-text-primary">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-brand/20 text-brand">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(user)}
                    className={`text-sm font-medium ${user.isActive ? 'text-success' : 'text-danger'}`}
                  >
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </button>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    className="p-2 text-text-secondary hover:text-brand hover:bg-elevated rounded transition-colors duration-default ease-default"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deleteConfirm === user.id ? (
                    <span className="flex items-center gap-1 text-sm">
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="text-danger font-medium"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="text-text-muted"
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(user.id)}
                      className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors duration-default ease-default"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="glass bg-card rounded-lg shadow-elevated max-w-md w-full mx-4 p-6 border border-border-subtle" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 text-text-primary">{editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Prénom</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nom</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  required
                  disabled={!!editUser}
                />
                {editUser && <p className="text-xs text-text-muted mt-1">L'email ne peut pas être modifié.</p>}
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="input"
                    minLength={6}
                    placeholder="Min. 6 caractères"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="input"
                >
                  <option value="VENDEUR">Vendeur</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Enregistrement...' : editUser ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
