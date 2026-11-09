# Accès gratuit temporaire — même navigateur

## Ce que fait le mode

Le drapeau `TEMPORARY_FREE_ACCESS_ENABLED` dans `src/mansa/utils/temporaryFreeAccess.ts` permet d’ouvrir gratuitement les offres et contenus créateur déjà présents dans le stockage local de **ce même navigateur**. Le parcours membre affiche « Accéder gratuitement » au lieu d’ouvrir le checkout. Aucun paiement, facture, commission ou entitlement `paid` n’est créé.

Ce mode ne rend pas les données locales accessibles depuis un autre navigateur, un autre appareil ou un autre profil de navigateur. Il ne change pas non plus les règles Firestore/Storage : les contenus cloud restent protégés par les droits habituels.

## Désactivation rapide

1. Dans `src/mansa/utils/temporaryFreeAccess.ts`, passer `TEMPORARY_FREE_ACCESS_ENABLED` à `false`.
2. Publier/recharger l’application. Le parcours normal de paiement et les droits d’accès locaux habituels reviennent.
3. Aucune règle Firebase n’a besoin d’être déployée ou modifiée pour désactiver ce mode local.

## Suppression complète du code temporaire

Après avoir remis le drapeau à `false` et vérifié le parcours membre :

- supprimer `src/mansa/utils/temporaryFreeAccess.ts` et ses imports;
- dans `src/mansa/utils/rightsAccessEngine.ts`, retirer l’ajout de toutes les offres de l’entreprise dans `normalizeUnlockedOfferIds`;
- dans `src/mansa/components/dashboard/EnterpriseMemberView.tsx`, retirer le message gratuit, la branche « Accéder gratuitement » et restaurer le bouton qui ouvre `OfferCheckoutModal`;
- retirer le test du mode temporaire dans `src/test/rights-access-engine-resources.test.ts`;
- lancer la suite de tests, le build et `git diff --check`.

Les règles `firestore.rules` et `storage.rules` restent inchangées et ne nécessitent aucune opération de retrait.
