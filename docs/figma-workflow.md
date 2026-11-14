# Workflow Figma ↔ application Mansa

## Objectif

Utiliser Figma comme espace de modification visuelle, puis demander à Manus de réintégrer les changements dans l’application sans casser les fonctionnalités existantes.

Le workflow cible principalement les changements suivants :

- modifier ou supprimer un texte ;
- recentrer un élément ;
- ajuster une largeur, une hauteur ou un espacement ;
- déplacer une carte, un bouton ou une section ;
- modifier la disposition responsive d’un bloc.

Les comportements fonctionnels — navigation, authentification, formulaires, appels Firebase/Supabase, modales et permissions — restent définis par le code et ne doivent pas être déduits uniquement d’une maquette Figma.

## Prérequis Figma

1. Créer ou ouvrir un fichier Figma dédié au projet.
2. Créer une page nommée `Mansa — écrans exportés`.
3. Activer le mode de partage permettant à Manus de consulter le fichier : accès de lecture au minimum pour l’export initial, puis accès de lecture au fichier modifié pour la phase de comparaison.
4. Conserver l’URL du fichier Figma et, si une intégration Figma est activée ultérieurement, fournir également l’identifiant du fichier et le connecteur autorisé.
5. Ne pas utiliser de données utilisateurs réelles dans les maquettes. Les comptes, emails, tokens et secrets restent dans l’environnement de développement.

> Dans l’environnement actuel, aucun connecteur Figma dédié n’est configuré. L’export initial devra donc être réalisé avec un plugin ou une intégration Figma autorisée, ou à partir de captures de l’application déposées dans le fichier Figma. Une URL Figma seule ne donne pas automatiquement à Manus le droit de lire ou de modifier le fichier.

## Premier lot recommandé

Commencer par quatre écrans publics et un écran authentifié :

| Ordre | Nom Figma | Route | État à capturer | Priorité |
|---|---|---|---|---|
| 01 | `Landing — desktop` | `/` | page complète, viewport desktop | obligatoire |
| 02 | `Landing — mobile` | `/` | breakpoint mobile, viewport 375 × 812 | obligatoire |
| 03 | `Connexion — login` | `/login?mode=login` | formulaire de connexion vide | obligatoire |
| 04 | `Connexion — inscription` | `/login?mode=signup` | formulaire d’inscription vide | recommandé |
| 05 | `Application — tableau de bord` | `/app` | utilisateur de démonstration authentifié | recommandé |

Ajouter ensuite, dans une seconde passe :

- `/documentation` ;
- `/cgu` ;
- `/mentions-legales` ;
- `/privacy` ;
- `/affiliate/:code` avec un code de démonstration ;
- les modales et écrans secondaires ouverts depuis `/app`.

L’écran `/app` doit être capturé avec un compte de démonstration dédié. Il ne faut pas exporter un écran contenant des informations personnelles ou des données de production.

## Procédure d’export initial

### 1. Démarrer l’application

Depuis la racine du dépôt :

```bash
pnpm install --frozen-lockfile
pnpm dev --host 0.0.0.0 --port 5173
```

La prévisualisation locale est disponible sur `http://localhost:5173/`. Utiliser l’URL de prévisualisation fournie par Manus lorsque l’écran doit être consulté depuis Figma ou un autre environnement distant.

### 2. Capturer les écrans

Pour chaque route du premier lot :

1. ouvrir la route dans l’application ;
2. régler le viewport à la taille attendue ;
3. attendre le chargement complet des polices, images et animations ;
4. capturer la page complète pour les écrans longs ;
5. noter l’URL, la taille du viewport et l’état d’authentification ;
6. masquer les données personnelles éventuelles avant insertion dans Figma.

Tailles de référence :

- desktop : `1440 × 900` ;
- tablette : `768 × 1024` si nécessaire ;
- mobile : `375 × 812`.

### 3. Organiser le fichier Figma

Créer une frame par écran, avec ce nommage :

```text
[01] Landing / desktop / 1440x900
[02] Landing / mobile / 375x812
[03] Login / login / 1440x900
[04] Login / signup / 1440x900
[05] App / dashboard / 1440x900
```

Dans chaque frame, ajouter une petite zone non exportée nommée `__META` contenant :

```text
Route: /
Viewport: 1440x900
Source commit: <hash Git ou date>
État: baseline
Fonctionnalités à préserver: navigation, formulaires, authentification
```

Ne pas aplatir les textes si l’objectif est de les modifier. Pour une maquette structurée, conserver séparément :

- les textes ;
- les boutons ;
- les cartes ;
- les images ;
- les conteneurs de layout ;
- les éléments de navigation.

Les noms de calques doivent rester explicites, par exemple `Header`, `Hero`, `CTA principal`, `Marketplace card`, `Footer`.

## Convention de modification dans Figma

Avant de demander la réintégration, dupliquer la page initiale :

- `Mansa — écrans exportés` : version de référence ;
- `Mansa — modifications v1` : version éditée.

Dans la page modifiée :

1. ne changer que les éléments voulus ;
2. ne pas supprimer les annotations `__META` ;
3. ajouter une note Figma sur toute modification ambiguë ;
4. utiliser des commentaires pour préciser l’intention responsive ;
5. indiquer explicitement si une modification concerne desktop, mobile ou les deux.

Exemple de commentaire :

```text
Modifier uniquement le texte du CTA. Conserver le lien et le comportement de navigation.
Appliquer le même changement sur mobile.
```

## Demande de réintégration à Manus

Après modification, transmettre :

1. l’URL du fichier Figma ;
2. le nom de la page modifiée ;
3. les frames concernées ;
4. le lien de prévisualisation du site actuel ;
5. le résumé des changements attendus ;
6. les routes ou fonctionnalités qui doivent impérativement rester inchangées.

Message type :

```text
Voici le fichier Figma modifié : <URL_FIGMA>

Page : Mansa — modifications v1
Frames concernées : [01] Landing / desktop / 1440x900 et [02] Landing / mobile / 375x812

Réintègre uniquement les changements visuels de cette page :
- <changement 1>
- <changement 2>

Préserve les routes, les liens, l’authentification, les formulaires et les appels de données existants.
Compare avec le code actuel avant de modifier.
Teste desktop et mobile après intégration, puis fournis la liste des fichiers modifiés et les tests exécutés.
```

## Contrôle effectué par Manus après réintégration

La réintégration doit suivre cet ordre :

1. comparer les frames Figma modifiées avec la baseline ;
2. identifier les composants et fichiers concernés ;
3. traduire les changements en styles/layouts plutôt qu’en duplication de composants ;
4. conserver les routes et la logique métier ;
5. vérifier l’affichage desktop et mobile ;
6. vérifier la navigation et les interactions touchées ;
7. exécuter les tests existants et le lint ;
8. comparer visuellement les écrans avec les frames Figma ;
9. fournir un récapitulatif : fichiers modifiés, comportement préservé, écarts restants.

Commandes minimales de vérification :

```bash
pnpm lint
pnpm test -- --run
pnpm build
```

Pour une modification limitée à un écran, le test doit au minimum couvrir la route concernée et les interactions qui l’utilisent. Une compilation réussie seule ne suffit pas.

## Limites à connaître

Figma décrit très bien l’apparence, mais pas toujours l’intention technique. Une carte déplacée peut nécessiter une modification de `flex`, de `grid`, des contraintes responsive ou d’un composant partagé. Manus doit donc comparer la maquette au code et ne pas remplacer automatiquement toute la structure de l’écran.

De même, un texte supprimé dans Figma peut être :

- un simple libellé visuel ;
- une validation fonctionnelle ;
- un texte d’accessibilité ;
- une information affichée conditionnellement.

Les suppressions ambiguës doivent être confirmées avant modification du comportement.

## Critères de réussite du pilote

Le pilote est validé si :

- les cinq frames du premier lot sont identifiables et reliées à une route ;
- les modifications visuelles sont retrouvées sans ambiguïté ;
- les routes et interactions existantes fonctionnent toujours ;
- les écrans sont corrects sur desktop et mobile ;
- la liste des changements de code est fournie ;
- aucun secret ni donnée utilisateur réelle n’est présent dans Figma.

Une fois ce pilote validé, le même modèle peut être étendu aux pages publiques restantes, puis aux écrans internes et aux états de modales.
