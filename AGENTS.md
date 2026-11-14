<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Do not rewrite
> published Git history: no force push, rebase, amend, or squash of commits
> already pushed. Pushed commits synchronize with Lovable and must remain usable.

<!-- LOVABLE:END -->

# Code de conduite du dépôt Mansa

## Article 1 — Périmètre technique

1.1. L’application Mansa se trouve dans `src/mansa` et est rendue côté client depuis `src/routes/index.tsx`.

1.2. L’application dépend des API navigateur et du SDK Firebase client pendant la migration.

1.3. La version `0.546.0` de `lucide-react` est verrouillée. Toute mise à jour est interdite sans vérification de compatibilité avec les icônes de marque utilisées.

1.4. Le style de la page publique doit utiliser ses tokens sémantiques et ses variantes `Button` partagées. Il est interdit de modifier involontairement le thème des écrans vendeur importés.

## Article 2 — Historique et publication

2.1. Il est interdit de réécrire l’historique Git déjà publié : aucun force push, rebase, amend ou squash.

2.2. Tout commit poussé doit laisser la branche dans un état fonctionnel et vérifiable.

## Article 3 — Ajout d’interface

3.1. Il est interdit d’ajouter un texte, badge, libellé, bannière, icône, carte ou autre élément visible sans demande explicite de l’utilisateur.

3.2. Avant toute proposition d’ajout visible, demander l’accord de l’utilisateur en précisant l’emplacement, le contenu et la justification.

3.3. Les modifications visuelles ne doivent pas modifier le comportement fonctionnel existant sans demande explicite.

## Article 4 — Messages et erreurs

4.1. Aucun message technique ne doit être affiché à l’utilisateur.

4.2. Sont notamment interdits dans l’interface : exceptions brutes, messages SDK, détails Firebase, erreurs réseau ou serveur, traces d’exécution, identifiants internes et codes de validation techniques.

4.3. Les détails techniques doivent rester dans les logs ou les outils d’observabilité autorisés.

4.4. Les erreurs affichées doivent être fixes, claires, contextualisées et compréhensibles. Les messages métier validés peuvent être conservés.

4.5. Il est interdit d’afficher directement dans l’interface une URL ou un lien brut vers une image. Une image doit être rendue via un aperçu visuel, un composant d’image ou une action clairement libellée ; son URL technique peut uniquement rester dans les données internes ou être copiée via une action dédiée si l’utilisateur le demande.

## Article 5 — Logos, marques et icônes d’applications

5.1. Les logos de marque doivent utiliser `BrandLogo` ou un composant de marque dédié, avec leurs couleurs officielles.

5.2. Lorsqu’une application ou une marque existante est ajoutée — Facebook, Instagram, Telegram, Discord, WhatsApp, etc. — il est obligatoire de récupérer sa vraie icône depuis une source fiable ou un composant officiel.

5.3. Il est interdit d’inventer, dessiner, générer ou imiter l’icône d’une marque existante.

5.4. Les couleurs et l’identité visuelle officielles des marques doivent être préservées.

5.5. Les icônes fonctionnelles, de navigation, de formulaire, de tableau de bord et de modale doivent utiliser une bibliothèque cohérente, de préférence les icônes Lucide/Tabler déjà présentes.

5.6. Les nouvelles icônes d’interface doivent utiliser `var(--mansa-icon-color)` (`oklch(0.91 0.01 285)`) en mode sombre, sauf couleur sémantique nécessaire à un état métier explicite.

5.7. Il est interdit d’appliquer la teinte d’icône d’interface sur un logo ou un SVG dont le remplissage officiel est explicite.

5.8. Après toute modification d’icône, vérifier les rendus desktop et mobile ainsi que les états actif, survolé, désactivé et erreur concernés.

## Article 6 — Mode clair et contraste

6.1. Le mode clair constitue un thème complet. Il est interdit de modifier uniquement les arrière-plans en laissant des textes ou icônes blancs illisibles.

6.2. Les textes principaux doivent utiliser `var(--mansa-light-text)` et les textes secondaires `var(--mansa-light-muted)`.

6.3. Les icônes d’interface en mode clair doivent utiliser une teinte foncée lisible, par défaut `#334155`.

6.4. Les classes `text-white`, `text-[#eeeeee]`, `text-[#f2f4f5]` et équivalentes sont interdites sur une surface claire, sauf contraste explicitement vérifié.

6.5. Les placeholders, bordures, états actifs, survols, focus, états désactivés et messages de succès ou d’erreur doivent rester lisibles en mode clair.

6.6. Tous les titres et sous-titres doivent être noirs (`#000000`) en mode clair. Cette règle concerne `h1` à `h6`, `[role="heading"]`, `.font-heading`, `[data-title]` et les éléments explicitement identifiés comme sous-titres.

6.7. La landing page conserve son identité visuelle propre, sauf demande contraire de l’utilisateur.

6.8. Les couleurs officielles de marque et les couleurs sémantiques d’état doivent être conservées lorsqu’elles restent suffisamment contrastées.

## Article 7 — Vérification obligatoire

7.1. Toute modification du thème clair doit être vérifiée réellement, et pas uniquement par compilation.

7.2. Vérifier au minimum le dashboard, la connexion, les paramètres, les modales et les écrans secondaires.

7.3. Vérifier les rendus desktop et mobile.

7.4. Avant publication, exécuter au minimum la compilation, le contrôle du diff Git et une vérification visuelle ou navigateur des écrans concernés.
