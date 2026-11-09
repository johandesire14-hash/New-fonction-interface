<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- The imported Mansa app lives in src/mansa and is rendered client-only from src/routes/index.tsx — it relies on browser APIs and Firebase client SDK during migration.
- lucide-react is pinned to 0.546.0 — newer versions removed brand icons (Instagram etc.) the Mansa UI imports.
- Public-home styling uses scoped store semantic tokens and shared Button variants so changes do not retheme the imported seller screens.
- Do not add new user-facing text, badges, labels, banners, icons, cards, or other UI elements unless the user explicitly requests them. Before proposing any such addition, submit a concise request explaining where it will appear, what it will contain, and why; without explicit approval, add nothing and preserve the existing content.
- Never display technical messages to users on any page: do not render raw exception or SDK messages, Firebase/network/server details, stack traces, debug output, internal identifiers, or machine validation codes. Keep technical details in logs/authorized observability only and show fixed, clear, contextual user-facing copy or an explicitly approved mapping for known business error codes. Preserve user-readable business validation messages. Apply this to forms, alerts, toasts, upload feedback, API responses, and fallback states; never pass through `error.message`, `err.message`, or a raw server error body.
- Les logos de marque doivent utiliser le composant BrandLogo avec leurs couleurs officielles ; les icônes d’interface utilisent une bibliothèque cohérente et une couleur cohérente.
