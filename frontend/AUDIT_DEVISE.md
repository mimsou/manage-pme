# Audit – Gestion devise et conversion

## Règles métier

1. **Devise par défaut** : configurée dans Admin > Devise et change ; utilisée pour les factures sans devise choisie et pour le dashboard.
2. **Facture** : une seule devise par facture (choix global) ; si non indiqué → devise par défaut.
3. **Dashboard** : tous les montants (CA, marge, graphique) sont affichés dans la devise par défaut ; les ventes en autre devise sont converties via les taux BCT (base TND).
4. **Impression (PDF)** : facture, ticket et avoir sont toujours imprimés dans la **devise d’origine** de la vente, sans conversion.
5. **Conversion** : formule unique `amount * rateToTND(from) / rateToTND(to)` (passage par TND).

---

## Backend

| Fichier | Vérification |
|--------|----------------|
| `currency.service.ts` | `convert(amount, from, to, rates)` : `amount * rates[from] / rates[to]` avec `rates['TND'] = 1`. Pas de double conversion. |
| `currency.service.ts` | `getLatestRates()` : retourne un taux par devise (dernier connu ≤ aujourd’hui), TND = 1. |
| `currency.service.ts` | `importFromBCT()` : crée TND (rate 1) + devises du tableau ; `rateToTND = valeur / unit`. Cohérent avec la cotation BCT (X unités = Y TND). |
| `sales.service.ts` | À la création de vente : `currencyCode = data.currencyCode \|\| defaultCurrency` ; pas de conversion des montants (saisis déjà dans la devise choisie). |
| `dashboard.service.ts` | `getStats` : récupère les ventes avec `total`, `margin`, `currencyCode` ; somme après conversion vers la devise par défaut. Pas d’agrégat SQL direct multi-devises. |
| `dashboard.service.ts` | `getSalesChart` : chaque vente convertie en devise par défaut avant envoi au frontend. |

**Cohérence calcul** :  
- Un seul sens de conversion (vers devise cible via TND).  
- Aucune conversion à l’enregistrement de la vente (les montants sont stockés dans la devise de la facture).

---

## Frontend

| Fichier | Vérification |
|--------|----------------|
| `pdf.ts` | Facture, ticket, avoir : tous les montants utilisent `getSaleCurrencyLabel(sale)` (devise d’origine). Aucune conversion dans le PDF. |
| `DashboardPage.tsx` | CA, marge, sous-total achats et graphique utilisent `stats.defaultCurrencyCode` et le symbole associé ; les valeurs viennent du backend déjà converties. |
| `POSPage.tsx` | Envoi de `currencyCode` dans `CreateSaleDto` (ou devise par défaut). Choix de devise dans le modal paiement. |
| `SalesPage.tsx` | Liste : montant et marge par vente affichés avec `getSaleCurrencyLabel(sale)`. Détail vente et avoir : idem. Les totaux en haut de page sont en "devises d’origine" (non convertis, à titre indicatif). |
| `CurrencyManagementPage.tsx` | Liste des devises, définition de la devise par défaut, bouton import BCT ; message d’erreur si le scraping échoue. |

**Cohérence affichage** :  
- Dashboard : tout en devise par défaut (backend convertit).  
- Liste/détail ventes et PDF : devise d’origine de chaque vente, sans conversion.

---

## Points d’attention

- **Prisma** : après mise à jour du schéma (Sale.currencyCode, Currency, ExchangeRate), exécuter `npx prisma generate` (et si besoin `npx prisma migrate` ou `db push`) dans `backend` pour régénérer le client et appliquer les changements en base.
- **Première utilisation** : sans import BCT, la table `currencies` peut être vide ; la devise par défaut renvoyée par l’API reste "TND", mais on ne peut pas changer la devise par défaut tant qu’aucune devise n’existe. Après un import BCT réussi, TND et les autres devises sont créés.
- **Page Ventes** : les indicateurs "CA Total" et "Marge Totale" additionnent des montants dans leurs devises d’origine (non convertis). Pour une vue consolidée en une seule devise, utiliser le Dashboard.

---

## Résumé

- Conversion : uniquement côté backend, formule unique via TND, pas de double conversion.  
- Stockage : les montants des ventes sont toujours dans la devise de la facture (`currencyCode`).  
- Affichage : dashboard en devise par défaut (converti) ; factures/tickets/liste ventes en devise d’origine.  
- Import BCT : erreur explicite si le scraping échoue (page injoignable ou format de tableau modifié).
