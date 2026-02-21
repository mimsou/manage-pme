import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../../api/client';

interface Company {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  siret: string | null;
  vatNumber: string | null;
  logo: string | null;
}

const defaultCompany: Partial<Company> = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'FR',
  phone: '',
  email: '',
  siret: '',
  vatNumber: '',
  logo: null,
};

export default function CompanyIdentityPage() {
  const [company, setCompany] = useState<Partial<Company>>(defaultCompany);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const { data } = await apiClient.get<Company>('/company');
      setCompany({
        ...defaultCompany,
        ...data,
        name: data.name ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        postalCode: data.postalCode ?? '',
        country: data.country ?? 'FR',
        phone: data.phone ?? '',
        email: data.email ?? '',
        siret: data.siret ?? '',
        vatNumber: data.vatNumber ?? '',
        logo: data.logo ?? null,
      });
    } catch (e) {
      toast.error('Impossible de charger les informations');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Company, value: string | null) => {
    setCompany((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image (PNG, JPG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCompany((prev) => ({ ...prev, logo: dataUrl }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/company', {
        name: company.name || undefined,
        address: company.address || undefined,
        city: company.city || undefined,
        postalCode: company.postalCode || undefined,
        country: company.country || undefined,
        phone: company.phone || undefined,
        email: company.email || undefined,
        siret: company.siret || undefined,
        vatNumber: company.vatNumber || undefined,
        logo: company.logo || undefined,
      });
      toast.success('Informations enregistrées');
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Chargement...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Identité de la société</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Ces informations seront affichées sur les documents (factures, tickets, etc.).
      </p>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logo
          </label>
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img
                src={company.logo}
                alt="Logo"
                className="h-20 w-auto object-contain border border-gray-200 dark:border-gray-600 rounded"
              />
            ) : (
              <div className="h-20 w-32 border border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-400 text-sm">
                Aucun logo
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary text-sm"
              >
                {company.logo ? 'Changer le logo' : 'Importer un logo'}
              </button>
              {company.logo && (
                <button
                  type="button"
                  onClick={() => handleChange('logo', null)}
                  className="ml-2 text-sm text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison sociale / Nom</label>
            <input
              type="text"
              value={company.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input"
              placeholder="Ma Société SARL"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
            <input
              type="text"
              value={company.address ?? ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="input"
              placeholder="123 rue Example"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ville</label>
            <input
              type="text"
              value={company.city ?? ''}
              onChange={(e) => handleChange('city', e.target.value)}
              className="input"
              placeholder="Paris"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code postal</label>
            <input
              type="text"
              value={company.postalCode ?? ''}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              className="input"
              placeholder="75001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pays</label>
            <input
              type="text"
              value={company.country ?? ''}
              onChange={(e) => handleChange('country', e.target.value)}
              className="input"
              placeholder="FR"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
            <input
              type="text"
              value={company.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="input"
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={company.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="input"
              placeholder="contact@entreprise.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SIRET</label>
            <input
              type="text"
              value={company.siret ?? ''}
              onChange={(e) => handleChange('siret', e.target.value)}
              className="input"
              placeholder="123 456 789 00012"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° TVA intracommunautaire</label>
            <input
              type="text"
              value={company.vatNumber ?? ''}
              onChange={(e) => handleChange('vatNumber', e.target.value)}
              className="input"
              placeholder="FR12345678901"
            />
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
