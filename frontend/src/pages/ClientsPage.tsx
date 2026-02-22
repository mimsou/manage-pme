import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, User, Building2, Mail, Phone, MapPin, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { clientsApi } from '@/api/clients';
import { Client, ClientType, CreateClientDto } from '@/types/client';
import { useAuthStore } from '@/stores/authStore';

const clientSchema = z.object({
  type: z.nativeEnum(ClientType).default(ClientType.PARTICULIER),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === ClientType.PARTICULIER) {
      return !!(data.firstName || data.lastName);
    } else {
      return !!data.companyName;
    }
  },
  {
    message: 'Le nom/prénom est requis pour un particulier, le nom de l\'entreprise est requis pour une société',
  }
);

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuthStore();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreateClientDto>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: ClientType.PARTICULIER,
    },
  });

  const clientType = watch('type');

  useEffect(() => {
    loadClients();
  }, [page, searchTerm]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientsApi.getAll({
        search: searchTerm || undefined,
        page,
        limit: 20,
      });
      setClients(response.data);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateClientDto) => {
    try {
      // Nettoyer les champs vides
      const cleanedData = { ...data } as CreateClientDto;
      Object.keys(cleanedData).forEach((key) => {
        const value = cleanedData[key as keyof CreateClientDto];
        if (value === undefined || value === null || value === '') {
          delete cleanedData[key as keyof CreateClientDto];
        }
      });

      if (editingClient) {
        await clientsApi.update(editingClient.id, cleanedData);
        toast.success('Client modifié avec succès');
      } else {
        await clientsApi.create(cleanedData);
        toast.success('Client créé avec succès');
      }
      setIsModalOpen(false);
      setEditingClient(null);
      reset();
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    reset({
      type: client.type,
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      companyName: client.companyName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postalCode: client.postalCode || '',
      country: client.country || '',
      vatNumber: client.vatNumber || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      await clientsApi.delete(id);
      toast.success('Client supprimé avec succès');
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleNew = () => {
    setEditingClient(null);
    reset({
      type: ClientType.PARTICULIER,
    });
    setIsModalOpen(true);
  };

  const getClientName = (client: Client) => {
    if (client.type === ClientType.SOCIETE) {
      return client.companyName || 'Société sans nom';
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client sans nom';
  };

  const getClientTypeLabel = (type: ClientType) => {
    return type === ClientType.PARTICULIER ? 'Particulier' : 'Société';
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Clients</h1>
        {isAdminOrManager && (
          <Button onClick={handleNew} className="btn">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nouveau client
          </Button>
        )}
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher un client..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          icon={<Search className="w-3.5 h-3.5" />}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[13px] text-text-secondary">Chargement...</div>
      ) : clients.length === 0 ? (
        <div className="rounded-[10px] border flex flex-col items-center justify-center py-12" style={{ background: '#1E1E28', border: '1px solid #2A2A38' }}>
          <User className="w-9 h-9 mb-2" style={{ color: 'rgba(99,102,241,0.3)' }} />
          <p className="text-[12px] font-medium text-text-muted">Aucun client trouvé</p>
          <p className="text-[11px] text-text-muted mt-0.5">Créez un client ou modifiez la recherche</p>
        </div>
      ) : (
        <>
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Ventes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <span
                          className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.04em]"
                          style={{
                            height: 20,
                            padding: '0 8px',
                            borderRadius: 9999,
                            fontSize: 10,
                            ...(client.type === ClientType.PARTICULIER
                              ? { background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }
                              : { background: 'rgba(99,102,241,0.12)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)' }),
                          }}
                        >
                          {client.type === ClientType.PARTICULIER ? <User className="w-3 h-3 mr-0.5" /> : <Building2 className="w-3 h-3 mr-0.5" />}
                          {getClientTypeLabel(client.type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-primary">{getClientName(client)}</TableCell>
                      <TableCell>
                        {client.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4 text-text-muted" />
                            {client.email}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {client.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-text-muted" />
                            {client.phone}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {client.address || client.city ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="w-4 h-4 text-text-muted" />
                            {[client.address, client.city, client.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text-secondary">
                          {client._count?.sales || 0} vente{client._count?.sales !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/credits?clientId=${client.id}`}
                            className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                            title="Voir le crédit client"
                          >
                            <Wallet className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                          </Link>
                          {isAdminOrManager && (
                            <>
                              <button
                                type="button"
                                className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-text-primary transition-colors"
                                onClick={() => handleEdit(client)}
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" style={{ width: 14, height: 14 }} />
                              </button>
                              {user?.role === 'ADMIN' && (
                                <button
                                  type="button"
                                  className="w-[26px] h-[26px] rounded-[5px] flex items-center justify-center text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                                  onClick={() => handleDelete(client.id)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <Button variant="outline" className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Précédent</Button>
              <span className="text-[13px] text-text-secondary">Page {page} sur {totalPages}</span>
              <Button variant="outline" className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant</Button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
          reset();
        }}
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingClient(null);
                reset();
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
              {editingClient ? 'Modifier' : 'Créer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Type de client *"
            options={[
              { value: ClientType.PARTICULIER, label: 'Particulier' },
              { value: ClientType.SOCIETE, label: 'Société' },
            ]}
            value={clientType}
            onChange={(e) => {
              reset({
                type: e.target.value as ClientType,
                firstName: '',
                lastName: '',
                companyName: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                postalCode: '',
                country: '',
                vatNumber: '',
              });
            }}
          />
          {errors.type && (
            <p className="text-sm text-danger">{errors.type.message}</p>
          )}

          {clientType === ClientType.PARTICULIER ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Nom"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                />
              </div>
            </>
          ) : (
            <>
              <Input
                label="Nom de l'entreprise *"
                {...register('companyName')}
                error={errors.companyName?.message}
              />
              <Input
                label="Numéro de TVA"
                {...register('vatNumber')}
                error={errors.vatNumber?.message}
              />
            </>
          )}

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
        </form>
      </Modal>
    </div>
  );
}
