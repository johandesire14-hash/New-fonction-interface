---
name: firebase-firestore-moderation
description: Audit, conception et validation des règles de sécurité Cloud Firestore pour les files de modération, signalements, dossiers de support, notes internes et rôles d’équipe. À utiliser lorsqu’on doit créer ou modifier firestore.rules, mettre en place des custom claims Firebase, protéger des collections sensibles ou tester un contrôle d’accès par rôle.
---

# Sécuriser une file de modération Firestore

Suivre ce workflow pour concevoir des règles alignées sur le schéma et les opérations réellement utilisées par l’application. Ne jamais traiter un formulaire, une route cachée ou un champ `role` modifiable par le client comme une protection.

## 1. Auditer le dépôt et son état

1. Lire les instructions du dépôt et `git status`. Préserver les changements de l’utilisateur et ne pas inclure de fichiers sans rapport.
2. Rechercher `firebase.json`, `.firebaserc`, `firestore.rules`, les index, le projet Firebase configuré et les règles existantes. Si les règles de production ne sont pas dans le dépôt, demander ou signaler qu’il faut les récupérer depuis Firebase avant de les remplacer.
3. Inventorier tous les accès Firestore (`collection`, `doc`, `collectionGroup`, sous-collections), leurs lectures/écritures, leurs requêtes, leurs écrivains (navigateur ou serveur) et leurs champs d’appartenance (`uid`, `ownerId`, `creatorId`). Chercher aussi les chemins construits dynamiquement.
4. Classer chaque collection : données publiques, données du propriétaire, demandes de modération, notes internes, KYC, paiements, journaux ou données d’administration. Noter les opérations côté client qui seront bloquées par une politique sûre.
5. Vérifier que les filtres des requêtes Firestore prouvent les conditions des règles. Les règles ne filtrent pas les résultats à la place de la requête.

Ne pas remplacer un jeu de règles existant par une règle partielle sans avertir : une règle `match` non couverte est refusée par défaut et peut casser des fonctions non auditées. À l’inverse, une règle globale permissive peut neutraliser les règles spécifiques, car plusieurs autorisations correspondantes sont combinées.

## 2. Définir les rôles

Utiliser Firebase Authentication et des custom claims définies uniquement depuis un serveur de confiance avec le Firebase Admin SDK. Modèle courant à adapter : `supportAgent` pour les dossiers de support, `moderator` pour les signalements, `kycReviewer` pour les vérifications d’identité, `financeReviewer` pour les paiements et `admin` pour la gestion globale.

- Ne jamais laisser le client définir ou modifier ses propres claims.
- Ne jamais autoriser sur la seule base d’un champ `role`, `isAdmin` ou équivalent dans un profil Firestore contrôlé par l’utilisateur.
- Utiliser les claims dans l’interface uniquement pour afficher/masquer des écrans ; les règles et le serveur doivent faire l’autorisation effective.
- Rappeler que les claims arrivent dans le jeton à son renouvellement. Préserver les claims existantes lorsqu’on en ajoute ou retire une.
- Le SDK Admin contourne les règles Firestore : chaque fonction serveur utilisant ce SDK doit vérifier elle-même l’authentification et les claims avant toute lecture ou écriture privilégiée.

## 3. Écrire des règles à privilège minimal

Créer `firestore.rules` en `rules_version = '2'` et fermer l’accès par défaut. Écrire des blocs explicites par collection et par sous-collection.

Pour chaque création, vérifier l’identité propriétaire (`request.resource.data.userId == request.auth.uid` ou le véritable champ propriétaire), le schéma autorisé (`keys().hasOnly/hasAll`), les types, longueurs, énumérations et valeurs initiales imposées. Pour les mises à jour, comparer `request.resource.data.diff(resource.data).affectedKeys()` et n’autoriser que les champs que ce rôle peut modifier. Refuser la suppression si elle n’est pas nécessaire.

Pour un dossier de support : laisser le client créer uniquement son propre dossier en état initial, et lire uniquement ses dossiers ; accorder à l’équipe concernée la lecture de la file et la modification limitée du statut, de l’assignation et du résumé. Interdire au client de s’attribuer un agent, de changer un statut, ou d’écrire des champs internes. Ne pas considérer un ID de transaction saisi par un client comme une transaction vérifiée.

Pour `reports` : limiter la création à des comptes authentifiés et à un schéma fermé avec statut initial imposé ; réserver la lecture globale et le traitement aux modérateurs et administrateurs. Ne pas considérer un champ honeypot comme un contrôle d’autorisation.

Placer les notes internes dans une sous-collection explicite telle que `/{ticketCollection}/{ticketId}/internalNotes/{noteId}`. Ne pas accorder au propriétaire du dossier l’accès à cette sous-collection. Autoriser la lecture et la création aux seuls rôles autorisés ; faire correspondre `authorId` au UID authentifié ; préférer `serverTimestamp()` ; refuser la modification et la suppression après création, sauf besoin métier documenté.

Pour les transactions, soldes, grands livres, paiements, trésorerie et décisions KYC, interdire les écritures navigateur si elles permettent de falsifier une validation ou un montant. Les déplacer vers des fonctions backend qui vérifient explicitement les rôles. Les données KYC doivent avoir un rôle de lecture distinct du rôle de support général.

## 4. Tester dans l’émulateur

Configurer Firebase CLI pour pointer vers le bon fichier de règles, puis utiliser un projet de démonstration et Firestore Emulator, jamais le projet de production pendant les tests. Écrire des tests avec `@firebase/rules-unit-testing` qui vérifient au minimum :

- lecture non authentifiée refusée ;
- utilisateur A autorisé sur son dossier, refusé sur le dossier de B ;
- client incapable de lire la file, modifier un statut, créer une note interne ou s’octroyer un rôle ;
- `supportAgent`/`moderator` autorisé uniquement sur ses collections et actions prévues ;
- notes internes invisibles au client et immuables ;
- création de signalement valide autorisée, lecture et traitement réservés au modérateur ;
- écriture client sur les transactions, grands livres et soldes refusée ;
- requêtes de liste acceptées uniquement lorsqu’elles respectent les contraintes de propriété.

Exécuter les tests, confirmer dans les journaux que l’émulateur a chargé le fichier attendu, puis examiner chaque refus observé afin de distinguer une assertion attendue d’une régression. Vérifier aussi le diff et `git diff --check`.

## 5. Livrer sans déployer par défaut

Fournir le chemin du fichier, les rôles/claims attendus, les collections explicitement protégées, les écritures client qui ne fonctionneront plus et les changements de schéma ou de backend requis. Ne pas déployer les règles, attribuer des rôles réels, modifier la console Firebase ou pousser vers GitHub sans demande explicite. Avant un déploiement, préserver et intégrer les règles déjà en production ; déployer un jeu incomplet peut couper l’accès aux autres fonctions de l’application.

## Documentation officielle

- [Custom claims et règles de sécurité Firebase](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Règles de sécurité Cloud Firestore](https://firebase.google.com/docs/firestore/security/get-started)
- [Structure et correspondances de règles](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Tester les règles avec l’émulateur](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Fonctions Callable Firebase](https://firebase.google.com/docs/functions/callable)
