import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, MapPin, User, Percent, ArrowDownCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { suppliersApi } from '@/api/suppliers';
import { Supplier, CreateSupplierDto } from '@/types/supplier';
import { useAuthStore } from '@/stores/authStore';

const supplierSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  contactPerson: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
  paymentTerms: z.string().optional(),
  discount: z.number().min(0).max(100, 'La remise doit être entre 0 et 100%').optional(),
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateSupplierDto>({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    loadSuppliers();
  }, [searchTerm]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.getAll({
        search: searchTerm || undefined,
      });
      setSuppliers(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateSupplierDto) => {
    try {
      // Nettoyer les champs vides
      const cleanedData: CreateSupplierDto = {
        name: data.name,
      };
      Object.keys(data).forEach((key) => {
        if (key === 'name') return;
        const value = data[key as keyof CreateSupplierDto];
        if (value !== undefined && value !== null && value !== '') {
          (cleanedData as unknown as Record<string, unknown>)[key] = value;
        }
      });

      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, cleanedData);
        toast.success('Fournisseur modifié avec succès');
      } else {
        await suppliersApi.create(cleanedData);
        toast.success('Fournisseur créé avec succès');
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      reset();
      loadSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      postalCode: supplier.postalCode || '',
      country: supplier.country || '',
      vatNumber: supplier.vatNumber || '',
      paymentTerms: supplier.paymentTerms || '',
      discount: supplier.discount || undefined,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;

    try {
      await suppliersApi.delete(id);
      toast.success('Fournisseur supprimé avec succès');
      loadSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleNew = () => {
    setEditingSupplier(null);
    reset({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      vatNumber: '',
      paymentTerms: '',
      discount: undefined,
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Fournisseurs</h1>
        {isAdminOrManager && (
          <Button onClick={handleNew} className="btn">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nouveau fournisseur
          </Button>
        )}
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher un fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-3.5 h-3.5" />}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-[10px] border flex flex-col items-center justify-center py-12" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <Building2 className="w-9 h-9 mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
          <p className="text-[12px] font-medium text-text-muted">Aucun fournisseur trouvé</p>
          <p className="text-[11px] text-text-muted mt-0.5">Créez un fournisseur ou modifiez la recherche</p>
        </div>
      ) : (
        <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-text-muted" />
                        {supplier.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.contactPerson ? (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4 text-text-muted" />
                          {supplier.contactPerson}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4 text-text-muted" />
                          {supplier.email}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4 text-text-muted" />
                          {supplier.phone}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.address || supplier.city ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="w-4 h-4 text-text-muted" />
                          {[supplier.address, supplier.city, supplier.postalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.discount !== undefined && supplier.discount !== null ? (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <Percent className="w-4 h-4" />
                          {supplier.discount}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-secondary">
                        {supplier._count?.products || 0} produit{supplier._count?.products !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isAdminOrManager && (
                                <>
                                  <button
                                    type="button"
                                    className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                                    onClick={() => navigate(`/entries?supplierId=${supplier.id}`)}
                                    title="Créer une entrée"
                                  >
                                    <ArrowDownCircle className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                                  </button>
                                  <button
                                    type="button"
                                    className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                                    onClick={() => handleEdit(supplier)}
                                    title="Modifier"
                                  >
                                    <Edit className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                                  </button>
                                  {user?.role === 'ADMIN' && (
                                    <button
                                      type="button"
                                      className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                                      onClick={() => handleDelete(supplier.id)}
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
          reset();
        }}
        title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSupplier(null);
                reset();
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
              {editingSupplier ? 'Modifier' : 'Créer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nom du fournisseur *"
            {...register('name')}
            error={errors.name?.message}
          />

          <Input
            label="Personne de contact"
            {...register('contactPerson')}
            error={errors.contactPerson?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Téléphone"
              {...register('phone')}
              error={errors.phone?.message}
            />
          </div>

          <Input
            label="Adresse"
            {...register('address')}
            error={errors.address?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Ville"
              {...register('city')}
              error={errors.city?.message}
            />
            <Input
              label="Code postal"
              {...register('postalCode')}
              error={errors.postalCode?.message}
            />
            <Input
              label="Pays"
              {...register('country')}
              error={errors.country?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Numéro de TVA"
              {...register('vatNumber')}
              error={errors.vatNumber?.message}
            />
            <Input
              label="Remise (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('discount', { valueAsNumber: true })}
              error={errors.discount?.message}
            />
          </div>

          <Input
            label="Conditions de paiement"
            placeholder="Ex: 30 jours, 60 jours..."
            {...register('paymentTerms')}
            error={errors.paymentTerms?.message}
          />
        </form>
      </Modal>
    </div>
  );
}
