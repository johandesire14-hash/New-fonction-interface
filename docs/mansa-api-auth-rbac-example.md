# Exemple TypeScript : authentification et RBAC des routes `/api/mansa/*`

Cet exemple montre une protection **côté serveur** pour les routes Mansa :

- vérification d’un Firebase ID token ;
- identification fiable par `uid` issu du token ;
- contrôle du rôle et du tenant ;
- validation stricte des corps JSON avec Zod ;
- séparation entre routes de lecture, d’administration et d’opérations privilégiées ;
- absence de confiance envers `x-user-id`, `creatorId` ou un rôle fourni par le navigateur ;
- refus des routes de simulation en production.

L’exemple est volontairement indépendant du framework HTTP : il utilise les primitives Web `Request` et `Response`, compatibles avec un handler serveur de type Fetch.

> Le code ne remplace pas les règles Firestore, la validation HMAC des webhooks, le rate limiting distribué ou les contrôles métier. Il constitue la première couche d’authentification et d’autorisation.

## Dépendances

```bash
pnpm add firebase-admin zod
```

Les clés Firebase Admin doivent rester dans les variables d’environnement du serveur. Elles ne doivent jamais être préfixées par `VITE_` et ne doivent jamais être envoyées au navigateur.

```env
FIREBASE_PROJECT_ID=mansa-production
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mansa-production.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NODE_ENV=production
```

## 1. Initialisation Firebase Admin

### `src/server/security/firebaseAdmin.ts`

```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

Ne pas importer ce module dans un composant React ou dans du code envoyé au client.

## 2. Types de sécurité

### `src/server/security/types.ts`

```ts
import type { DecodedIdToken } from "firebase-admin/auth";

export type MansaRole =
  | "mansa_admin"
  | "mansa_support"
  | "creator"
  | "auditor";

export type MansaPermission =
  | "mansa:subscriptions:read"
  | "mansa:logs:read"
  | "mansa:logs:delete"
  | "mansa:config:read"
  | "mansa:automation:test"
  | "mansa:cron:run";

export interface MansaPrincipal {
  uid: string;
  email: string | null;
  roles: MansaRole[];
  tenantIds: string[];
  token: DecodedIdToken;
}

export interface MansaRequestContext {
  requestId: string;
  principal: MansaPrincipal;
}

export interface MansaRoutePolicy {
  permissions: MansaPermission[];
  requireAllPermissions?: boolean;
  allowInProduction?: boolean;
  resolveTenantId?: (request: Request) => Promise<string | null>;
}
```

Les rôles utilisés ici doivent être définis dans des **custom claims Firebase** administrées côté serveur, par exemple :

```json
{
  "roles": ["creator"],
  "tenantIds": ["company_123"]
}
```

Ne jamais accepter ces valeurs depuis le corps, la query string ou les en-têtes du client.

## 3. Réponses d’erreur uniformes

### `src/server/security/http.ts`

```ts
export function requestIdFrom(request: Request): string {
  // Un identifiant entrant peut être conservé pour corrélation, mais il ne doit
  // jamais servir de preuve d’identité. En production, on peut aussi le générer
  // systématiquement côté serveur.
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && incoming.length <= 100 ? incoming : crypto.randomUUID();
}

export function json<T>(body: T, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function unauthorized(requestId: string): Response {
  return json({ error: "Unauthorized", requestId }, 401, {
    "www-authenticate": 'Bearer realm="mansa-api"',
  });
}

export function forbidden(requestId: string): Response {
  return json({ error: "Forbidden", requestId }, 403);
}

export function badRequest(message: string, requestId: string): Response {
  return json({ error: message, requestId }, 400);
}

export function notFound(requestId: string): Response {
  return json({ error: "Not found", requestId }, 404);
}

export function methodNotAllowed(requestId: string, methods: string[]): Response {
  return json({ error: "Method not allowed", requestId }, 405, {
    allow: methods.join(", "),
  });
}

export function serverError(requestId: string): Response {
  return json({ error: "Internal server error", requestId }, 500);
}
```

Le client reçoit des messages génériques. Les détails Firebase, Discord, Telegram ou Firestore doivent rester dans les logs serveur contrôlés.

## 4. Authentification Firebase et autorisation RBAC

### `src/server/security/mansaAuth.ts`

```ts
import { adminAuth, adminDb } from "./firebaseAdmin";
import {
  forbidden,
  json,
  requestIdFrom,
  unauthorized,
} from "./http";
import type {
  MansaPermission,
  MansaPrincipal,
  MansaRequestContext,
  MansaRole,
  MansaRoutePolicy,
} from "./types";

const KNOWN_ROLES: ReadonlySet<MansaRole> = new Set([
  "mansa_admin",
  "mansa_support",
  "creator",
  "auditor",
]);

const ROLE_PERMISSIONS: Record<MansaRole, readonly MansaPermission[]> = {
  mansa_admin: [
    "mansa:subscriptions:read",
    "mansa:logs:read",
    "mansa:logs:delete",
    "mansa:config:read",
    "mansa:automation:test",
    "mansa:cron:run",
  ],
  mansa_support: [
    "mansa:subscriptions:read",
    "mansa:logs:read",
    "mansa:automation:test",
  ],
  creator: ["mansa:subscriptions:read"],
  auditor: ["mansa:subscriptions:read", "mansa:logs:read"],
};

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value) return null;

  const match = /^Bearer[ \t]+([^ \t]+)$/i.exec(value);
  return match?.[1] ?? null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function authenticate(request: Request, requestId: string): Promise<MansaPrincipal | Response> {
  const token = bearerToken(request);
  if (!token) return unauthorized(requestId);

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    const claims = decoded as typeof decoded & {
      roles?: unknown;
      tenantIds?: unknown;
    };

    const roles = normalizeStringArray(claims.roles).filter(
      (role): role is MansaRole => KNOWN_ROLES.has(role as MansaRole),
    );
    const tenantIds = normalizeStringArray(claims.tenantIds);

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      roles,
      tenantIds,
      token: decoded,
    };
  } catch (error) {
    // Ne pas renvoyer error.message au client : cela peut divulguer des détails
    // sur la configuration Firebase ou la validité du token.
    console.warn("Mansa authentication failed", {
      requestId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return unauthorized(requestId);
  }
}

function grantedPermissions(principal: MansaPrincipal): Set<MansaPermission> {
  const permissions = new Set<MansaPermission>();
  for (const role of principal.roles) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      permissions.add(permission);
    }
  }
  return permissions;
}

function hasRequiredPermissions(
  principal: MansaPrincipal,
  policy: MansaRoutePolicy,
): boolean {
  const granted = grantedPermissions(principal);
  return policy.requireAllPermissions === false
    ? policy.permissions.some((permission) => granted.has(permission))
    : policy.permissions.every((permission) => granted.has(permission));
}

async function verifyTenant(
  principal: MansaPrincipal,
  request: Request,
  policy: MansaRoutePolicy,
): Promise<boolean> {
  if (!policy.resolveTenantId) return true;

  const tenantId = await policy.resolveTenantId(request);
  if (!tenantId) return false;

  // Le tenant vient d’une ressource résolue côté serveur, jamais d’un simple
  // creatorId approuvé parce qu’il est présent dans le JSON client.
  if (principal.tenantIds.includes(tenantId)) return true;

  // Exemple optionnel : une table Firestore d’appartenance peut compléter les
  // custom claims pour les changements de droits sans attendre le renouvellement
  // du token Firebase.
  const membership = await adminDb
    .doc(`tenants/${tenantId}/members/${principal.uid}`)
    .get();

  return membership.exists && membership.data()?.active === true;
}

export async function requireMansaAccess(
  request: Request,
  policy: MansaRoutePolicy,
): Promise<MansaRequestContext | Response> {
  const requestId = requestIdFrom(request);
  const principal = await authenticate(request, requestId);
  if (principal instanceof Response) return principal;

  if (!hasRequiredPermissions(principal, policy)) {
    console.warn("Mansa authorization denied", {
      requestId,
      uid: principal.uid,
      path: new URL(request.url).pathname,
      roles: principal.roles,
    });
    return forbidden(requestId);
  }

  if (process.env.NODE_ENV === "production" && policy.allowInProduction === false) {
    return json({ error: "Route disabled in production", requestId }, 404);
  }

  try {
    const tenantAllowed = await verifyTenant(principal, request, policy);
    if (!tenantAllowed) return forbidden(requestId);
  } catch (error) {
    console.error("Mansa tenant authorization failed", { requestId, error });
    return forbidden(requestId);
  }

  return { requestId, principal };
}
```

### Pourquoi ne pas utiliser `x-user-id` ?

Un en-tête comme `x-user-id` est entièrement contrôlable par le navigateur. Il peut être utilisé pour la corrélation dans un environnement de confiance, mais il ne doit jamais déterminer l’identité, le rôle ou le tenant de la requête.

## 5. Validation des entrées

### `src/server/security/mansaSchemas.ts`

```ts
import { z } from "zod";

export const simulateWebhookSchema = z
  .object({
    user_id: z.string().trim().min(1).max(128),
    platform: z.enum(["discord", "telegram", "mobile_money"]),
    status: z.enum(["active", "expired", "cancelled", "pending"]),
    plan_name: z.string().trim().min(1).max(120),
    customer_name: z.string().trim().min(1).max(120),
    customer_phone: z.string().trim().min(6).max(32),
    amount_xof: z.number().int().min(0).max(100_000_000),
    payment_method: z.string().trim().min(1).max(50),
    transaction_id: z.string().trim().min(8).max(150),
  })
  .strict();

export const discordTestSchema = z
  .object({
    userId: z.string().regex(/^\d{15,22}$/, "Invalid Discord user ID"),
    roleName: z.string().trim().min(1).max(100),
  })
  .strict();

export const telegramInviteSchema = z
  .object({
    // Les valeurs hors de cette plage peuvent créer des invitations trop
    // longues ou trop courtes pour le besoin métier.
    expireHours: z.number().int().min(1).max(24 * 7),
  })
  .strict();

export const telegramRevokeSchema = z
  .object({
    userId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export async function readJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; error: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, error: "Content-Type must be application/json" };
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32_768) {
    return { ok: false, error: "Request body too large" };
  }

  try {
    const payload: unknown = await request.json();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: "Invalid request body" };
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}
```

## 6. Politiques de routes

### `src/server/security/mansaPolicies.ts`

```ts
import type { MansaRoutePolicy } from "./types";

export const policies = {
  subscriptionsRead: {
    permissions: ["mansa:subscriptions:read"],
  },

  logsRead: {
    permissions: ["mansa:logs:read"],
  },

  configRead: {
    permissions: ["mansa:config:read"],
  },

  logsDelete: {
    permissions: ["mansa:logs:delete"],
  },

  automationTest: {
    permissions: ["mansa:automation:test"],
    // Les routes de simulation sont interdites en production.
    allowInProduction: false,
  },

  cronRun: {
    permissions: ["mansa:cron:run"],
    // En pratique, cette route devrait idéalement être appelée par un
    // scheduler interne avec un mécanisme d’authentification de service.
    allowInProduction: true,
  },
} satisfies Record<string, MansaRoutePolicy>;
```

## 7. Exemple de routeur `/api/mansa/*`

### `src/server/routes/mansaRoutes.ts`

```ts
import { z } from "zod";
import { requireMansaAccess } from "../security/mansaAuth";
import {
  badRequest,
  json,
  methodNotAllowed,
  notFound,
  serverError,
} from "../security/http";
import {
  discordTestSchema,
  readJson,
  simulateWebhookSchema,
  telegramInviteSchema,
  telegramRevokeSchema,
} from "../security/mansaSchemas";
import { policies } from "../security/mansaPolicies";

const ALLOWED_DISCORD_ROLES = new Set([
  "Membre VIP Mansa",
  "Premium Mansa",
]);

function routeParts(request: Request): string[] {
  const pathname = new URL(request.url).pathname;
  const prefix = "/api/mansa";
  if (!pathname.startsWith(prefix)) return [];
  return pathname.slice(prefix.length).split("/").filter(Boolean);
}

function productionGuard(requestId: string): Response | null {
  if (process.env.NODE_ENV === "production") {
    return json({ error: "Simulation routes are disabled in production", requestId }, 404);
  }
  return null;
}

export async function handleMansaRoutes(request: Request): Promise<Response> {
  const parts = routeParts(request);
  if (parts.length === 0) return notFound(crypto.randomUUID());

  // Les routes de démonstration sont refusées avant même toute logique métier.
  if (parts[0] === "webhook" && parts[1] === "simulate") {
    const access = await requireMansaAccess(request, policies.automationTest);
    if (access instanceof Response) return access;

    const blocked = productionGuard(access.requestId);
    if (blocked) return blocked;
    if (request.method !== "POST") {
      return methodNotAllowed(access.requestId, ["POST"]);
    }

    const parsed = await readJson(request, simulateWebhookSchema);
    if (!parsed.ok) return badRequest(parsed.error, access.requestId);

    // Important : cet exemple montre seulement une simulation contrôlée.
    // Aucun paiement réel, rôle Discord ou accès Telegram ne doit être accordé
    // par cette route.
    return json(
      {
        success: true,
        simulated: true,
        requestId: access.requestId,
        actorUid: access.principal.uid,
        event: parsed.data,
      },
      202,
    );
  }

  if (parts[0] === "discord" && parts[1] === "test-grant") {
    return handleDiscordTest(request, "grant");
  }

  if (parts[0] === "discord" && parts[1] === "test-revoke") {
    return handleDiscordTest(request, "revoke");
  }

  if (parts[0] === "telegram" && parts[1] === "test-invite") {
    return handleTelegramInvite(request);
  }

  if (parts[0] === "telegram" && parts[1] === "test-revoke") {
    return handleTelegramRevoke(request);
  }

  if (parts[0] === "subscriptions" && request.method === "GET") {
    const access = await requireMansaAccess(request, policies.subscriptionsRead);
    if (access instanceof Response) return access;

    // Utiliser access.principal.uid ou un tenant résolu côté serveur. Ne pas
    // accepter creatorId depuis la query string comme preuve d’appartenance.
    const subscriptions = await listSubscriptionsForActor(access.principal.uid);
    return json({ subscriptions, requestId: access.requestId });
  }

  if (parts[0] === "logs" && request.method === "GET") {
    const access = await requireMansaAccess(request, policies.logsRead);
    if (access instanceof Response) return access;

    const logs = await listLogsForActor(access.principal.uid);
    return json({ logs, requestId: access.requestId });
  }

  if (parts[0] === "logs" && request.method === "DELETE") {
    const access = await requireMansaAccess(request, policies.logsDelete);
    if (access instanceof Response) return access;

    await deleteLogsForAdmin(access.principal.uid);
    return json({ success: true, requestId: access.requestId });
  }

  if (parts[0] === "config" && request.method === "GET") {
    const access = await requireMansaAccess(request, policies.configRead);
    if (access instanceof Response) return access;

    // Ne renvoyer que des indicateurs. Ne jamais renvoyer les valeurs de secrets.
    return json({
      hasDiscordToken: Boolean(process.env.DISCORD_BOT_TOKEN),
      hasTelegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      hasKpayWebhookSecret: Boolean(process.env.KPAY_WEBHOOK_SECRET),
      requestId: access.requestId,
    });
  }

  if (parts[0] === "cron" && parts[1] === "run") {
    const access = await requireMansaAccess(request, policies.cronRun);
    if (access instanceof Response) return access;
    if (request.method !== "POST") {
      return methodNotAllowed(access.requestId, ["POST"]);
    }

    const result = await runExpirationScanOnce();
    return json({ ...result, requestId: access.requestId });
  }

  return notFound(crypto.randomUUID());
}

async function handleDiscordTest(
  request: Request,
  action: "grant" | "revoke",
): Promise<Response> {
  const access = await requireMansaAccess(request, policies.automationTest);
  if (access instanceof Response) return access;

  const blocked = productionGuard(access.requestId);
  if (blocked) return blocked;
  if (request.method !== "POST") {
    return methodNotAllowed(access.requestId, ["POST"]);
  }

  const parsed = await readJson(request, discordTestSchema);
  if (!parsed.ok) return badRequest(parsed.error, access.requestId);

  if (!ALLOWED_DISCORD_ROLES.has(parsed.data.roleName)) {
    return json({ error: "Role not allowed", requestId: access.requestId }, 403);
  }

  try {
    // guildId et token sont pris depuis la configuration serveur, jamais depuis
    // le corps client.
    const result =
      action === "grant"
        ? await grantDiscordRoleServerSide(parsed.data.userId, parsed.data.roleName)
        : await revokeDiscordRoleServerSide(parsed.data.userId, parsed.data.roleName);

    return json({ success: true, result, requestId: access.requestId });
  } catch (error) {
    console.error("Discord test operation failed", {
      requestId: access.requestId,
      uid: access.principal.uid,
      action,
      error,
    });
    return serverError(access.requestId);
  }
}

async function handleTelegramInvite(request: Request): Promise<Response> {
  const access = await requireMansaAccess(request, policies.automationTest);
  if (access instanceof Response) return access;

  const blocked = productionGuard(access.requestId);
  if (blocked) return blocked;
  if (request.method !== "POST") {
    return methodNotAllowed(access.requestId, ["POST"]);
  }

  const parsed = await readJson(request, telegramInviteSchema);
  if (!parsed.ok) return badRequest(parsed.error, access.requestId);

  try {
    const invite = await createTelegramInviteServerSide(parsed.data.expireHours);
    // Si cette route devient accessible à un navigateur de confiance, l’URL
    // doit être retournée uniquement après authentification + RBAC.
    return json({ success: true, inviteLink: invite, requestId: access.requestId });
  } catch (error) {
    console.error("Telegram invite creation failed", {
      requestId: access.requestId,
      uid: access.principal.uid,
      error,
    });
    return serverError(access.requestId);
  }
}

async function handleTelegramRevoke(request: Request): Promise<Response> {
  const access = await requireMansaAccess(request, policies.automationTest);
  if (access instanceof Response) return access;

  const blocked = productionGuard(access.requestId);
  if (blocked) return blocked;
  if (request.method !== "POST") {
    return methodNotAllowed(access.requestId, ["POST"]);
  }

  const parsed = await readJson(request, telegramRevokeSchema);
  if (!parsed.ok) return badRequest(parsed.error, access.requestId);

  try {
    const result = await revokeTelegramAccessServerSide(parsed.data.userId);
    return json({ success: true, result, requestId: access.requestId });
  } catch (error) {
    console.error("Telegram revoke failed", {
      requestId: access.requestId,
      uid: access.principal.uid,
      error,
    });
    return serverError(access.requestId);
  }
}

// Ces fonctions sont des ports serveur des intégrations existantes. Elles ne
// doivent être appelées que depuis le serveur et doivent lire leurs secrets
// depuis process.env ou un secret manager.
async function grantDiscordRoleServerSide(userId: string, roleName: string) {
  // Appeler Discord avec DISCORD_BOT_TOKEN côté serveur.
  return { action: "grant", userId, roleName };
}

async function revokeDiscordRoleServerSide(userId: string, roleName: string) {
  return { action: "revoke", userId, roleName };
}

async function createTelegramInviteServerSide(expireHours: number) {
  return `server-generated-invite-${expireHours}h`;
}

async function revokeTelegramAccessServerSide(userId: number) {
  return { action: "revoke", userId };
}

async function listSubscriptionsForActor(uid: string) {
  // Requête Firestore filtrée par l’identité serveur et les règles Firestore.
  return [{ actorUid: uid }];
}

async function listLogsForActor(uid: string) {
  return [{ actorUid: uid }];
}

async function deleteLogsForAdmin(uid: string) {
  console.info("Mansa logs deletion requested", { uid });
}

async function runExpirationScanOnce() {
  return { scannedCount: 0, revokedCount: 0 };
}
```

Les fonctions métier ci-dessus sont des stubs intentionnels : elles montrent où placer la frontière serveur, mais ne prétendent pas remplacer les clients Discord, Telegram ou Firestore de production.

## 8. Branchement dans `server.ts`

```ts
import { handleMansaRoutes } from "./routes/mansaRoutes";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/mansa/")) {
      return handleMansaRoutes(request);
    }

    // Continuer vers le handler TanStack Start pour les autres routes.
    return nextHandler.fetch(request, env, ctx);
  },
};
```

Le branchement doit être placé avant le fallback SSR, mais après les contrôles globaux de sécurité déjà présents dans l’application.

## 9. Génération du Bearer token côté client

Le navigateur peut obtenir un Firebase ID token, mais il ne doit jamais fabriquer lui-même un `uid` ou un rôle :

```ts
import { getAuth } from "firebase/auth";

const auth = getAuth();
const token = await auth.currentUser?.getIdToken();

if (!token) throw new Error("Authentication required");

const response = await fetch("/api/mansa/subscriptions", {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  },
});
```

Pour les opérations sensibles, renouveler le token si nécessaire avec `getIdToken(true)` selon le flux Firebase utilisé.

## 10. Tests négatifs minimaux

Tester au minimum :

```ts
import { describe, expect, it } from "vitest";

const url = "https://example.test/api/mansa/config";

function request(headers: HeadersInit = {}) {
  return new Request(url, { method: "GET", headers });
}

describe("Mansa API security", () => {
  it("rejects requests without a bearer token", async () => {
    const response = await handleMansaRoutes(request());
    expect(response.status).toBe(401);
  });

  it("does not trust x-user-id", async () => {
    const response = await handleMansaRoutes(
      request({ "x-user-id": "admin", "x-forwarded-for": "127.0.0.1" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects unsupported roles", async () => {
    // Injecter un token Firebase de test sans permission mansa:config:read.
    // Le token de test doit être signé par l’émulateur Firebase ou un mock
    // vérifié, jamais accepté uniquement parce que son JSON est décodable.
  });

  it("does not accept a client supplied guildId", async () => {
    // Vérifier que le handler utilise la configuration serveur.
  });

  it("disables simulation in production", async () => {
    // NODE_ENV=production + token autorisé => 404 pour /webhook/simulate.
  });
});
```

## 11. Mesures complémentaires indispensables

Ce middleware doit être complété par :

1. **règles Firestore strictes** basées sur `request.auth.uid` et le tenant ;
2. **HMAC sur les vrais webhooks** avec corps brut, timestamp et anti-rejeu ;
3. **idempotence** des paiements, invitations et changements de rôle ;
4. **rate limiting distribué**, sans se baser sur `x-user-id` ou un `x-forwarded-for` arbitraire ;
5. **logs sans tokens, secrets, numéros de paiement ou payloads personnels complets** ;
6. **désactivation des routes de test en production** ;
7. **tests d’autorisation par tenant**, y compris les cas d’accès croisé ;
8. **CORS et `Origin` allowlist** si l’API est appelée depuis plusieurs origines ;
9. **limites de taille et de temps d’exécution** pour chaque route ;
10. **secrets dans un secret manager**, jamais dans `VITE_*`, `localStorage` ou le bundle frontend.

## Résumé de la règle de confiance

> Le client peut demander une action, mais seul le serveur peut décider **qui** est l’utilisateur, **quel rôle** il possède, **à quel tenant** il appartient, **quels montants** sont valides et **si l’opération externe** Discord/Telegram/paiement doit réellement être exécutée.
