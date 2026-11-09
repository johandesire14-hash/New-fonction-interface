---
name: web-affiliate-implementation
description: Implémentation et audit de systèmes d’affiliation pour applications web. Utiliser pour importer, diagnostiquer ou rendre persistant un module d’affiliation avec liens référents, tracking des clics, attribution des ventes, commissions, ledger et retraits.
---

# Implémentation d’un système d’affiliation web

## Objectif

Transformer une interface d’affiliation simulée en flux persistant et traçable, en réutilisant l’authentification, la base de données, le paiement et le ledger financier déjà présents dans le projet.

Ne jamais déclarer le système « pleinement opérationnel » uniquement parce que l’interface affiche un lien ou un succès local. Vérifier la persistance, l’attribution idempotente et le passage effectif vers le ledger.

## Workflow

1. **Lire le contexte du projet**
   - Lire la compétence webdev et les guides du framework avant toute modification.
   - Identifier l’authentification, l’identifiant utilisateur, le modèle produit/offre, le point de confirmation du paiement, le stockage Firebase/SQL et le service de retrait.
   - Rechercher `affiliate`, `referral`, `commission`, `payout`, `ledger`, `transaction`, ainsi que les valeurs codées à zéro ou les handlers qui ne font que changer un état React.

2. **Auditer le module existant**
   Classer chaque fonction dans une des catégories suivantes : interface seulement, persistance, attribution, finance ou paiement réel. Signaler les trous avant de coder. Les faux positifs courants sont `MARKETPLACE_DATA = []`, les métriques codées à `0`, les succès de retrait sans appel réseau et les liens `?a=user` sans identifiant produit ni adhésion persistée.

3. **Définir le modèle minimal**
   Utiliser les collections/tables équivalentes au stockage du projet :
   - `affiliate_memberships` : `affiliateUserId`, `affiliateCode`, `productId`, `ownerId`, `commissionRate`, `joinedAt`.
   - `affiliate_clicks` : `affiliateCode`, `affiliateUserId` si résolu, `productId`, `landingPath`, `referrer`, `userAgent`, `createdAt`.
   - `affiliate_commissions` : `invoiceId`, `affiliateUserId`, `productId`, `ownerId`, `grossAmount`, `commissionRate`, `commissionAmount`, `currency`, `status`, `createdAt`, `availableAt`.
   - `transactions` et le ledger existants : créer une transaction de type `affiliate` et une entrée financière pour le bénéficiaire.

   Lire [references/firestore-model.md](references/firestore-model.md) pour le contrat détaillé et les invariants.

4. **Implémenter le service d’affiliation**
   Créer un service dédié fournissant au minimum `getAffiliatePrograms`, `joinAffiliateProgram`, `getJoinedAffiliatePrograms`, `captureAffiliateAttribution`, `trackAffiliateClick`, `recordAffiliateConversion` et `getAffiliateDashboardData`.

   Utiliser un code stable et une clé de document déterministe. Conserver un fallback local uniquement pour la preview hors Firebase ; journaliser les erreurs Firestore au lieu de les masquer en production.

5. **Capturer et attribuer**
   - Générer des liens du type `/p/<productId>?a=<affiliateCode>&p=<productId>`.
   - Capturer le code dès l’arrivée publique, avant le checkout.
   - Conserver l’attribution pendant une durée explicite, par défaut 30 jours.
   - Ne pas attribuer une vente à soi-même ni au propriétaire de l’offre.
   - Vérifier côté stockage que le code correspond à une adhésion au produit demandé.

6. **Brancher le paiement**
   Appeler `recordAffiliateConversion()` uniquement après confirmation réussie, avec l’identifiant de facture, le produit, le propriétaire, le montant brut et la devise.

   Calculer la commission à partir de la valeur persistée du programme. Écrire une commission et une transaction affiliée avec la même clé idempotente, puis réutiliser le ledger existant pour la période de retenue et le solde.

   Si le projet utilise encore `test-confirm`, le signaler comme blocage de production et remplacer cette simulation par le webhook signé du prestataire.

7. **Brancher le dashboard et les retraits**
   - Recharger adhésions et métriques depuis le service au montage.
   - Afficher les commissions mûres, pas simplement les commissions créées.
   - Synchroniser les commissions mûres avec le compte retirable.
   - Appeler le service de retrait existant avec idempotence et contrôles KYC, moyen de paiement et solde.
   - Ne jamais afficher un retrait transmis si l’appel a échoué.

8. **Valider**
   - Lancer le build de production et les tests paiement/transactions/dashboard.
   - Vérifier les diagnostics du langage après les modifications.
   - Vérifier HTTP 200 sur la preview et le manifeste de routes si applicable.
   - Parcourir : adhésion → lien → capture → checkout confirmé → commission unique → maturité → retrait.
   - Vérifier les règles/index de base et documenter les migrations nécessaires.

## Sécurité et fiabilité

- Ne jamais faire confiance au montant, au taux ou à l’identité fournis uniquement par le navigateur.
- En production, recalculer attribution et commission côté serveur/webhook ou dans une transaction protégée par les règles de base.
- Utiliser des clés idempotentes déterministes.
- Ne pas créditer avant confirmation définitive.
- Traiter remboursements et chargebacks comme des événements de ledger séparés.
- Préserver les changements concurrents et ne pas réinitialiser le projet pour une simple modification.

## Livraison

Résumer les fichiers modifiés, les validations, l’URL de preview et les blocages restants. Distinguer **preview fonctionnelle** et **production opérationnelle** : cette dernière exige webhook réel, règles de base, sécurité serveur, migrations et payouts validés.
