import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { currencyApi, CurrencyDto } from '@/api/currency';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Coins, RefreshCw, Check } from 'lucide-react';

export default function CurrencyManagementPage() {
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [defaultCode, setDefaultCode] = useState<string>('TND');
  const [loading, setLoading] = useState(true);
  const [savingDefault, setSavingDefault] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [list, defaultRes] = await Promise.all([
        currencyApi.list(),
        currencyApi.getDefault(),
      ]);
      setCurrencies(list);
      setDefaultCode(defaultRes.code || 'TND');
    } catch (e) {
      toast.error('Impossible de charger les devises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSetDefault = async (code: string) => {
    try {
      setSavingDefault(true);
      await currencyApi.setDefault(code);
      setDefaultCode(code);
      toast.success(`Devise par défaut: ${code}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingDefault(false);
    }
  };

  const handleImportBCT = async () => {
    try {
      setImporting(true);
      const result = await currencyApi.importBCT();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Import BCT: ${result.imported} taux enregistrés. Devises: ${result.currencies?.join(', ') || '-'}`,
      );
      await load();
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || e.message || 'Erreur lors de l\'import des cours BCT',
      );
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-text-secondary text-[13px]">
        Chargement des devises...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title flex items-center gap-2">
        <Coins className="w-5 h-5" />
        Devise et change
      </h1>
      <p className="text-[13px] text-text-muted">
        Définissez la devise par défaut de l'application et importez les cours depuis la Banque
        Centrale de Tunisie (BCT).
      </p>

      <div
        className="rounded-[10px] border border-[#2A2A38] p-5"
        style={{ background: '#1E1E28' }}
      >
        <h2 className="section-heading mb-3" style={{ fontSize: 14 }}>
          Devise par défaut
        </h2>
        <p className="text-[12px] text-text-muted mb-3">
          Cette devise sera utilisée pour les factures sans devise choisie et pour l'affichage du
          tableau de bord.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {currencies.length > 0 ? (
            <Select
              value={defaultCode}
              onChange={(e) => handleSetDefault(e.target.value)}
              disabled={savingDefault}
              className="input w-[200px] h-9"
              options={currencies.map((c) => ({
                value: c.code,
                label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''} - ${c.name}`,
              }))}
            />
          ) : (
            <span className="text-[13px] text-text-secondary">
              {defaultCode} — importez les cours BCT pour débloquer le choix.
            </span>
          )}
          {savingDefault && (
            <span className="text-[12px] text-text-muted">Enregistrement...</span>
          )}
        </div>
      </div>

      <div
        className="rounded-[10px] border border-[#2A2A38] p-5"
        style={{ background: '#1E1E28' }}
      >
        <h2 className="section-heading mb-3" style={{ fontSize: 14 }}>
          Import des cours BCT
        </h2>
        <p className="text-[12px] text-text-muted mb-3">
          Récupère les cours moyens des devises cotées en dinar tunisien depuis le site de la BCT.
          Les devises importées seront disponibles pour les factures.
        </p>
        <Button
          variant="primary"
          onClick={handleImportBCT}
          disabled={importing}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
          {importing ? 'Import en cours...' : 'Importer les cours BCT'}
        </Button>
      </div>

      <div
        className="rounded-[10px] border border-[#2A2A38] p-5"
        style={{ background: '#1E1E28' }}
      >
        <h2 className="section-heading mb-3" style={{ fontSize: 14 }}>
          Devises disponibles
        </h2>
        <p className="text-[12px] text-text-muted mb-3">
          Liste des devises sélectionnables pour les factures. Lancez l'import BCT pour en ajouter.
        </p>
        <ul className="space-y-1.5 text-[13px]">
          {currencies.length === 0 ? (
            <li className="text-text-muted">Aucune devise. Utilisez « Importer les cours BCT ».</li>
          ) : (
            currencies.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0"
              >
                <span className="text-text-primary">
                  {c.code}
                  {c.symbol && (
                    <span className="text-text-muted ml-1">({c.symbol})</span>
                  )}{' '}
                  – {c.name}
                </span>
                {c.code === defaultCode && (
                  <span className="text-success text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Par défaut
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
