import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { inventoryApi } from '@/api/inventory';
import { useAuthStore } from '@/stores/authStore';
import type { Inventory } from '@/types/inventory';

const statusLabel: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  VALIDATED: 'Validé',
};

const statusClass: Record<string, string> = {
  DRAFT: 'bg-text-muted/20 text-text-secondary',
  IN_PROGRESS: 'bg-brand/20 text-brand',
  COMPLETED: 'bg-amber-500/20 text-amber-400',
  VALIDATED: 'bg-emerald-500/20 text-emerald-400',
};

function formatCreatedAt(value: string | undefined): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR');
}

function canDeleteInventory(status: string): boolean {
  return status !== 'VALIDATED';
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [list, setList] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getAll();
      setList(data);
    } catch {
      toast.error('Impossible de charger les inventaires');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      const inv = await inventoryApi.create({});
      toast.success(`Inventaire ${inv.reference} créé`);
      navigate(`/inventory/${inv.id}`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Erreur à la création');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await inventoryApi.delete(deleteTarget.id);
      toast.success(`Inventaire ${deleteTarget.reference} supprimé`);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(typeof msg === 'string' ? msg : 'Suppression impossible');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>
            Inventaire physique
          </h1>
          <p className="text-[13px] text-text-secondary max-w-xl">
            Créez une session, ouvrez-la, puis appuyez sur « Démarrer » avant de compter. Ensuite, clôturez et
            validez pour ajuster les stocks. La suppression est possible tant que l’inventaire n’est pas validé
            (Admin / Manager).
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel inventaire
        </Button>
      </div>

      {loading ? (
        <p className="text-[13px] text-text-secondary">Chargement…</p>
      ) : list.length === 0 ? (
        <div
          className="rounded-[10px] border border-border-subtle p-10 text-center"
          style={{ background: '#1E1E28' }}
        >
          <ClipboardList className="w-10 h-10 mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary text-[13px] mb-4">Aucun inventaire pour le moment.</p>
          <Button variant="primary" onClick={handleCreate}>
            Créer le premier inventaire
          </Button>
        </div>
      ) : (
        <div
          className="rounded-[10px] border border-border-subtle overflow-hidden"
          style={{ background: '#1E1E28' }}
        >
          <table className="w-full text-left text-[13px]">
            <thead style={{ background: '#252532' }}>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 font-medium text-text-secondary">Référence</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Statut</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Lignes</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Créé le</th>
                <th className="px-4 py-3 font-medium text-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => (
                <tr key={inv.id} className="border-b border-border-subtle/80 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-text-primary">{inv.reference}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${statusClass[inv.status] || ''}`}
                    >
                      {statusLabel[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {inv._count?.items ?? inv.items?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatCreatedAt(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <Link to={`/inventory/${inv.id}`}>
                        <Button variant="outline" size="sm">
                          Ouvrir
                        </Button>
                      </Link>
                      {isAdminOrManager && canDeleteInventory(inv.status) && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="!px-2"
                          title="Supprimer cet inventaire"
                          onClick={() => setDeleteTarget(inv)}
                          aria-label={`Supprimer ${inv.reference}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Supprimer l’inventaire ?"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} isLoading={deleting}>
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-text-secondary">
          {deleteTarget && (
            <>
              L’inventaire <strong className="text-text-primary font-mono">{deleteTarget.reference}</strong> et ses
              lignes seront définitivement supprimés. Cette action est irréversible.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
