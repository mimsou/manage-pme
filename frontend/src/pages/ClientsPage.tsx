import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, User, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
      const cleanedData: CreateClientDto = {};
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof CreateClientDto];
        if (value !== undefined && value !== null && value !== '') {
          cleanedData[key as keyof CreateClientDto] = value;
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Clients</h1>
        {isAdminOrManager && (
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            icon={<Search className="w-4 h-4" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun client trouvé</div>
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.type === ClientType.PARTICULIER
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}
                        >
                          {client.type === ClientType.PARTICULIER ? (
                            <User className="w-3 h-3 mr-1" />
                          ) : (
                            <Building2 className="w-3 h-3 mr-1" />
                          )}
                          {getClientTypeLabel(client.type)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{getClientName(client)}</TableCell>
                      <TableCell>
                        {client.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {client.email}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {client.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {client.phone}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {client.address || client.city ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {[client.address, client.city, client.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {client._count?.sales || 0} vente{client._count?.sales !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isAdminOrManager && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(client)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {user?.role === 'ADMIN' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(client.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
            <p className="text-sm text-red-600 dark:text-red-400">{errors.type.message}</p>
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
