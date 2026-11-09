# Modèle de données affiliation

## Collections

### `affiliate_memberships`

Document recommandé : `<affiliateUserId>_<productId>`.

```ts
{
  affiliateUserId: string,
  affiliateCode: string,
  productId: string,
  ownerId: string,
  ownerName: string,
  name: string,
  commissionRate: number,
  joinedAt: string
}
```

Le code doit être stable. Ne pas utiliser le nom affiché comme identifiant unique.

### `affiliate_clicks`

```ts
{
  affiliateCode: string,
  affiliateUserId?: string,
  productId: string,
  landingPath: string,
  referrer?: string,
  userAgent?: string,
  createdAt: string
}
```

Un clic peut être anonyme. L’affiliation finale doit néanmoins résoudre le code vers une adhésion valide.

### `affiliate_commissions`

Clé déterministe recommandée : `affiliate_<invoiceId>_<affiliateUserId>`.

```ts
{
  invoiceId: string,
  affiliateUserId: string,
  productId: string,
  ownerId: string,
  grossAmount: number,
  commissionRate: number,
  commissionAmount: number,
  currency: string,
  status: "pending" | "available" | "reversed",
  createdAt: string,
  availableAt: string
}
```

## Invariants

1. Une facture ne crée jamais deux commissions pour le même affilié.
2. `affiliateUserId` ne peut pas être le propriétaire de l’offre ou l’acheteur.
3. Le taux vient de l’adhésion/programme persistant, jamais d’un champ de formulaire non vérifié.
4. Une commission `pending` n’est pas retirable avant `availableAt`.
5. Un retrait réserve le solde dans le ledger avant le transfert.
6. Un échec de payout recrédite le ledger ; un remboursement crée une écriture inverse.

## Index et règles

Préparer les index nécessaires pour les requêtes :

- `affiliate_memberships`: `affiliateUserId`, `affiliateCode + productId`.
- `affiliate_clicks`: `affiliateUserId`, éventuellement `affiliateCode + productId`.
- `affiliate_commissions`: `affiliateUserId`, `status`, `availableAt`.

Les règles doivent permettre à un affilié de lire ses propres adhésions/commissions, limiter l’écriture des commissions aux fonctions serveur ou à un webhook authentifié, et empêcher un client de modifier `commissionAmount`, `ownerId` ou `affiliateUserId` après création.
