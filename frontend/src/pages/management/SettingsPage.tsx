import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Sliders, Wallet, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { settingsApi, SETTING_KEYS } from '@/api/settings';

const DEFAULT_CREDIT_OVERDUE_DAYS = 30;

export default function SettingsPage() {
  const [creditOverdueDays, setCreditOverdueDays] = useState<string>(String(DEFAULT_CREDIT_OVERDUE_DAYS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const all = await settingsApi.getAll();
      const days = all[SETTING_KEYS.CREDIT_OVERDUE_DAYS_THRESHOLD];
      setCreditOverdueDays(days ?? String(DEFAULT_CREDIT_OVERDUE_DAYS));
    } catch (e) {
      toast.error('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const days = parseInt(creditOverdueDays, 10);
    if (!Number.isFinite(days) || days < 0) {
      toast.error('Le nombre de jours doit être un entier positif.');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update({
        [SETTING_KEYS.CREDIT_OVERDUE_DAYS_THRESHOLD]: String(days),
      });
      toast.success('Paramètres enregistrés.');
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-text-muted text-sm py-8">
        Chargement des paramètres...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Sliders className="w-6 h-6 text-brand" />
          Paramétrage
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Paramètres centralisés de l&apos;application. Cette section sera enrichie pour plus de flexibilité.
        </p>
      </div>

      <div className="rounded-xl border border-border-default overflow-hidden" style={{ background: '#1E1E28' }}>
        <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-text-primary">Crédits clients</h2>
        </div>
        <div className="p-6 space-y-4">
          <Input
            label="Seuil de jours pour notification (factures impayées depuis X jours)"
            type="number"
            min={0}
            value={creditOverdueDays}
            onChange={(e) => setCreditOverdueDays(e.target.value)}
            placeholder={String(DEFAULT_CREDIT_OVERDUE_DAYS)}
          />
          <p className="text-[12px] text-text-muted">
            Le badge sur « Crédits clients » dans le menu affiche le nombre de factures/tickets impayés depuis au moins ce nombre de jours.
          </p>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
