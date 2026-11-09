# Tests unitaires Jest du middleware d’authentification et RBAC Mansa

Cette suite cible les modules de l’exemple :

- `mansaAuth.ts` : vérification Firebase, permissions et tenant ;
- `mansaSchemas.ts` : validation des corps JSON ;
- `mansaRoutes.ts` : protection des routes `/api/mansa/*`.

Les tests sont conçus pour rester **unitaires** : Firebase Admin, Firestore et les intégrations Discord/Telegram sont simulés par Jest.

> Dans le dépôt actuel, les tests existants utilisent Vitest. Le présent fichier fournit explicitement la variante Jest demandée. Il ne faut pas mélanger les globals `jest` et `vi` dans un même fichier.

## Installation de test

```bash
pnpm add -D jest ts-jest @types/jest
```

## Configuration Jest

### `jest.config.cjs`

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.jest.test.ts"],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  collectCoverageFrom: [
    "src/server/security/**/*.ts",
    "src/server/routes/mansaRoutes.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          target: "ES2022",
          esModuleInterop: true,
        },
      },
    ],
  },
};
```

### `package.json`

```json
{
  "scripts": {
    "test:jest": "jest --runInBand",
    "test:jest:coverage": "jest --runInBand --coverage"
  }
}
```

## 1. Utilitaires de test

### `src/server/security/__tests__/fixtures.ts`

```ts
import type { DecodedIdToken } from "firebase-admin/auth";

export const ADMIN_UID = "uid-admin-001";
export const SUPPORT_UID = "uid-support-001";
export const CREATOR_UID = "uid-creator-001";
export const OTHER_UID = "uid-other-001";
export const TENANT_ID = "tenant-mansa-001";
export const OTHER_TENANT_ID = "tenant-other-001";

export function decodedToken(
  overrides: Partial<DecodedIdToken> = {},
): DecodedIdToken {
  return {
    uid: CREATOR_UID,
    aud: "mansa-test",
    auth_time: 1_700_000_000,
    exp: 1_900_000_000,
    iat: 1_700_000_000,
    iss: "https://securetoken.google.com/mansa-test",
    sub: CREATOR_UID,
    firebase: {
      identities: {},
      sign_in_provider: "password",
    },
    ...overrides,
  } as DecodedIdToken;
}

export function request(
  path: string,
  init: RequestInit = {},
): Request {
  return new Request(`https://mansa.test${path}`, init);
}

export function jsonRequest(
  path: string,
  body: unknown,
  init: RequestInit = {},
): Request {
  return request(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

export async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
```

## 2. Tests du middleware d’authentification et de RBAC

### `src/server/security/__tests__/mansaAuth.jest.test.ts`

```ts
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "../firebaseAdmin";
import { requireMansaAccess } from "../mansaAuth";
import type { MansaRoutePolicy } from "../types";
import {
  CREATOR_UID,
  OTHER_TENANT_ID,
  TENANT_ID,
  decodedToken,
  request,
  responseJson,
} from "./fixtures";

jest.mock("../firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
  adminDb: {
    doc: jest.fn(),
  },
}));

const verifyIdTokenMock = jest.mocked(adminAuth.verifyIdToken);
const docMock = jest.mocked(adminDb.doc);

const readSubscriptionsPolicy: MansaRoutePolicy = {
  permissions: ["mansa:subscriptions:read"],
};

const deleteLogsPolicy: MansaRoutePolicy = {
  permissions: ["mansa:logs:delete"],
};

describe("requireMansaAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
    docMock.mockReturnValue({
      get: jest.fn().mockResolvedValue({ exists: false }),
    } as never);
  });

  it("refuse une requête sans header Authorization", async () => {
    const result = await requireMansaAccess(
      request("/api/mansa/subscriptions"),
      readSubscriptionsPolicy,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("refuse un schéma Authorization qui n’est pas Bearer", async () => {
    const result = await requireMansaAccess(
      request("/api/mansa/subscriptions", {
        headers: { authorization: "Basic abc123" },
      }),
      readSubscriptionsPolicy,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("vérifie le token avec Firebase Admin et accepte un créateur autorisé", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
        tenantIds: [TENANT_ID],
      } as Partial<DecodedIdToken>),
    );

    const result = await requireMansaAccess(
      request("/api/mansa/subscriptions", {
        headers: { authorization: "Bearer valid-token" },
      }),
      readSubscriptionsPolicy,
    );

    expect(result).not.toBeInstanceOf(Response);
    expect(verifyIdTokenMock).toHaveBeenCalledWith("valid-token", true);
    expect((result as any).principal.uid).toBe(CREATOR_UID);
    expect((result as any).principal.roles).toEqual(["creator"]);
  });

  it("refuse un token invalide ou révoqué", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("auth/id-token-revoked"));

    const result = await requireMansaAccess(
      request("/api/mansa/subscriptions", {
        headers: { authorization: "Bearer revoked-token" },
      }),
      readSubscriptionsPolicy,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("refuse un utilisateur authentifié sans la permission demandée", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
      } as Partial<DecodedIdToken>),
    );

    const result = await requireMansaAccess(
      request("/api/mansa/logs", {
        headers: { authorization: "Bearer creator-token" },
      }),
      deleteLogsPolicy,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("accorde à un administrateur la permission de supprimer les logs", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: "uid-admin-001",
        roles: ["mansa_admin"],
      } as Partial<DecodedIdToken>),
    );

    const result = await requireMansaAccess(
      request("/api/mansa/logs", {
        headers: { authorization: "Bearer admin-token" },
      }),
      deleteLogsPolicy,
    );

    expect(result).not.toBeInstanceOf(Response);
    expect((result as any).principal.roles).toContain("mansa_admin");
  });

  it("ignore x-user-id et x-forwarded-for pour l’identité", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
      } as Partial<DecodedIdToken>),
    );

    const result = await requireMansaAccess(
      request("/api/mansa/subscriptions", {
        headers: {
          authorization: "Bearer creator-token",
          "x-user-id": "uid-admin-001",
          "x-forwarded-for": "127.0.0.1",
        },
      }),
      readSubscriptionsPolicy,
    );

    expect(result).not.toBeInstanceOf(Response);
    expect((result as any).principal.uid).toBe(CREATOR_UID);
    expect((result as any).principal.uid).not.toBe("uid-admin-001");
  });

  it("refuse l’accès à un tenant auquel l’utilisateur n’appartient pas", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
        tenantIds: [OTHER_TENANT_ID],
      } as Partial<DecodedIdToken>),
    );

    const policy: MansaRoutePolicy = {
      permissions: ["mansa:subscriptions:read"],
      resolveTenantId: async () => TENANT_ID,
    };

    const result = await requireMansaAccess(
      request("/api/mansa/subscriptions"),
      policy,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(docMock).toHaveBeenCalledWith(`tenants/${TENANT_ID}/members/${CREATOR_UID}`);
  });

  it("accepte un tenant validé par custom claim", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
        tenantIds: [TENANT_ID],
      } as Partial<DecodedIdToken>),
    );

    const policy: MansaRoutePolicy = {
      permissions: ["mansa:subscriptions:read"],
      resolveTenantId: async () => TENANT_ID,
    };

    const result = await requireMansaAccess(request("/api/mansa/subscriptions"), policy);

    expect(result).not.toBeInstanceOf(Response);
    expect(docMock).not.toHaveBeenCalled();
  });

  it("accepte un tenant via une appartenance Firestore active", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
        tenantIds: [],
      } as Partial<DecodedIdToken>),
    );

    docMock.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ active: true }),
      }),
    } as never);

    const policy: MansaRoutePolicy = {
      permissions: ["mansa:subscriptions:read"],
      resolveTenantId: async () => TENANT_ID,
    };

    const result = await requireMansaAccess(request("/api/mansa/subscriptions"), policy);

    expect(result).not.toBeInstanceOf(Response);
  });

  it("refuse un tenant dont l’appartenance Firestore est inactive", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
      } as Partial<DecodedIdToken>),
    );

    docMock.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ active: false }),
      }),
    } as never);

    const policy: MansaRoutePolicy = {
      permissions: ["mansa:subscriptions:read"],
      resolveTenantId: async () => TENANT_ID,
    };

    const result = await requireMansaAccess(request("/api/mansa/subscriptions"), policy);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("désactive une politique interdite en production", async () => {
    process.env.NODE_ENV = "production";
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: "uid-admin-001",
        roles: ["mansa_admin"],
      } as Partial<DecodedIdToken>),
    );

    const result = await requireMansaAccess(request("/api/mansa/webhook/simulate"), {
      permissions: ["mansa:automation:test"],
      allowInProduction: false,
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
  });

  it("retourne une erreur générique si la vérification tenant échoue", async () => {
    verifyIdTokenMock.mockResolvedValue(
      decodedToken({
        uid: CREATOR_UID,
        roles: ["creator"],
      } as Partial<DecodedIdToken>),
    );
    docMock.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error("Firestore unavailable")),
    } as never);

    const result = await requireMansaAccess(request("/api/mansa/subscriptions"), {
      permissions: ["mansa:subscriptions:read"],
      resolveTenantId: async () => TENANT_ID,
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    const body = await responseJson<{ error: string }>(result as Response);
    expect(body.error).toBe("Forbidden");
    expect(body.error).not.toContain("Firestore");
  });
});
```

## 3. Tests de validation Zod

### `src/server/security/__tests__/mansaSchemas.jest.test.ts`

```ts
import {
  discordTestSchema,
  readJson,
  simulateWebhookSchema,
  telegramInviteSchema,
  telegramRevokeSchema,
} from "../mansaSchemas";
import { jsonRequest, request } from "./fixtures";

describe("Mansa request schemas", () => {
  it("accepte un webhook de simulation bien formé", () => {
    const result = simulateWebhookSchema.safeParse({
      user_id: "489123456789012345",
      platform: "discord",
      status: "active",
      plan_name: "VIP Mansa",
      customer_name: "Seydou Koné",
      customer_phone: "+2250788990011",
      amount_xof: 25000,
      payment_method: "Wave",
      transaction_id: "kpay_tx_12345678",
    });

    expect(result.success).toBe(true);
  });

  it("refuse les champs inconnus", () => {
    const result = simulateWebhookSchema.safeParse({
      user_id: "489123456789012345",
      platform: "discord",
      status: "active",
      plan_name: "VIP Mansa",
      customer_name: "Seydou Koné",
      customer_phone: "+2250788990011",
      amount_xof: 25000,
      payment_method: "Wave",
      transaction_id: "kpay_tx_12345678",
      creatorId: "victim-uid",
    });

    expect(result.success).toBe(false);
  });

  it("refuse un montant négatif, fractionnaire ou excessif", () => {
    const base = {
      user_id: "489123456789012345",
      platform: "discord" as const,
      status: "active" as const,
      plan_name: "VIP Mansa",
      customer_name: "Seydou Koné",
      customer_phone: "+2250788990011",
      payment_method: "Wave",
      transaction_id: "kpay_tx_12345678",
    };

    expect(simulateWebhookSchema.safeParse({ ...base, amount_xof: -1 }).success).toBe(false);
    expect(simulateWebhookSchema.safeParse({ ...base, amount_xof: 1.5 }).success).toBe(false);
    expect(simulateWebhookSchema.safeParse({ ...base, amount_xof: 100_000_001 }).success).toBe(false);
  });

  it("valide les identifiants Discord selon une allowlist de format", () => {
    expect(
      discordTestSchema.safeParse({
        userId: "489123456789012345",
        roleName: "Membre VIP Mansa",
      }).success,
    ).toBe(true);

    expect(
      discordTestSchema.safeParse({
        userId: "not-a-discord-id",
        roleName: "Membre VIP Mansa",
      }).success,
    ).toBe(false);
  });

  it("valide la fenêtre d’expiration Telegram", () => {
    expect(telegramInviteSchema.safeParse({ expireHours: 24 }).success).toBe(true);
    expect(telegramInviteSchema.safeParse({ expireHours: 0 }).success).toBe(false);
    expect(telegramInviteSchema.safeParse({ expireHours: 169 }).success).toBe(false);
  });

  it("valide et convertit l’identifiant Telegram", () => {
    const result = telegramRevokeSchema.safeParse({ userId: "789456123" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.userId).toBe(789456123);
  });

  it("refuse une requête non JSON", async () => {
    const result = await readJson(
      request("/api/mansa/test", {
        method: "POST",
        body: "{}",
      }),
      telegramInviteSchema,
    );

    expect(result.ok).toBe(false);
  });

  it("refuse un corps JSON invalide", async () => {
    const result = await readJson(
      jsonRequest("/api/mansa/test", { expireHours: "24" }),
      telegramInviteSchema,
    );

    expect(result.ok).toBe(false);
  });

  it("refuse un corps trop volumineux", async () => {
    const hugeValue = "x".repeat(40_000);
    const result = await readJson(
      jsonRequest("/api/mansa/test", { expireHours: 24, padding: hugeValue }),
      telegramInviteSchema,
    );

    expect(result.ok).toBe(false);
  });
});
```

## 4. Tests des routes Mansa

### `src/server/routes/mansaRoutes.jest.test.ts`

```ts
import { adminAuth } from "../security/firebaseAdmin";
import { handleMansaRoutes } from "./mansaRoutes";
import {
  ADMIN_UID,
  CREATOR_UID,
  decodedToken,
  jsonRequest,
  request,
  responseJson,
} from "../security/__tests__/fixtures";

jest.mock("../security/firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
  adminDb: {
    doc: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ exists: false }),
    })),
  },
}));

const verifyIdTokenMock = jest.mocked(adminAuth.verifyIdToken);

function authorizeAsCreator() {
  verifyIdTokenMock.mockResolvedValue(
    decodedToken({
      uid: CREATOR_UID,
      roles: ["creator"],
    } as any),
  );
}

function authorizeAsAdmin() {
  verifyIdTokenMock.mockResolvedValue(
    decodedToken({
      uid: ADMIN_UID,
      roles: ["mansa_admin"],
    } as any),
  );
}

describe("/api/mansa routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("retourne 401 pour /subscriptions sans authentification", async () => {
    const response = await handleMansaRoutes(
      request("/api/mansa/subscriptions", { method: "GET" }),
    );

    expect(response.status).toBe(401);
  });

  it("autorise les abonnements pour un créateur authentifié", async () => {
    authorizeAsCreator();

    const response = await handleMansaRoutes(
      request("/api/mansa/subscriptions", {
        method: "GET",
        headers: { authorization: "Bearer creator-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(verifyIdTokenMock).toHaveBeenCalledWith("creator-token", true);
  });

  it("refuse la suppression des logs à un créateur", async () => {
    authorizeAsCreator();

    const response = await handleMansaRoutes(
      request("/api/mansa/logs", {
        method: "DELETE",
        headers: { authorization: "Bearer creator-token" },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("autorise la suppression des logs à un administrateur", async () => {
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      request("/api/mansa/logs", {
        method: "DELETE",
        headers: { authorization: "Bearer admin-token" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  it("n’expose pas les secrets via /config", async () => {
    authorizeAsAdmin();
    process.env.DISCORD_BOT_TOKEN = "discord-secret-for-test";
    process.env.TELEGRAM_BOT_TOKEN = "telegram-secret-for-test";
    process.env.KPAY_WEBHOOK_SECRET = "kpay-secret-for-test";

    const response = await handleMansaRoutes(
      request("/api/mansa/config", {
        method: "GET",
        headers: { authorization: "Bearer admin-token" },
      }),
    );
    const body = await responseJson<Record<string, unknown>>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      hasDiscordToken: true,
      hasTelegramToken: true,
      hasKpayWebhookSecret: true,
    });
    expect(JSON.stringify(body)).not.toContain("discord-secret-for-test");
    expect(JSON.stringify(body)).not.toContain("telegram-secret-for-test");
    expect(JSON.stringify(body)).not.toContain("kpay-secret-for-test");
  });

  it("refuse les simulations en production", async () => {
    process.env.NODE_ENV = "production";
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      jsonRequest(
        "/api/mansa/webhook/simulate",
        {
          user_id: "489123456789012345",
          platform: "discord",
          status: "active",
          plan_name: "VIP Mansa",
          customer_name: "Seydou Koné",
          customer_phone: "+2250788990011",
          amount_xof: 25000,
          payment_method: "Wave",
          transaction_id: "kpay_tx_12345678",
        },
        {
          method: "POST",
          headers: { authorization: "Bearer admin-token" },
        },
      ),
    );

    expect(response.status).toBe(404);
  });

  it("autorise une simulation uniquement hors production et pour un admin", async () => {
    process.env.NODE_ENV = "test";
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      jsonRequest(
        "/api/mansa/webhook/simulate",
        {
          user_id: "489123456789012345",
          platform: "discord",
          status: "active",
          plan_name: "VIP Mansa",
          customer_name: "Seydou Koné",
          customer_phone: "+2250788990011",
          amount_xof: 25000,
          payment_method: "Wave",
          transaction_id: "kpay_tx_12345678",
        },
        {
          method: "POST",
          headers: { authorization: "Bearer admin-token" },
        },
      ),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ simulated: true });
  });

  it("refuse un rôle Discord non autorisé", async () => {
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      jsonRequest(
        "/api/mansa/discord/test-grant",
        { userId: "489123456789012345", roleName: "Administrator" },
        {
          method: "POST",
          headers: { authorization: "Bearer admin-token" },
        },
      ),
    );

    expect(response.status).toBe(403);
  });

  it("refuse les méthodes HTTP non prévues", async () => {
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      request("/api/mansa/cron/run", {
        method: "GET",
        headers: { authorization: "Bearer admin-token" },
      }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("refuse un corps de simulation invalide", async () => {
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      jsonRequest(
        "/api/mansa/webhook/simulate",
        {
          user_id: "not-valid",
          platform: "discord",
          status: "active",
          plan_name: "VIP Mansa",
          customer_name: "Seydou Koné",
          customer_phone: "+2250788990011",
          amount_xof: -100,
          payment_method: "Wave",
          transaction_id: "short",
        },
        {
          method: "POST",
          headers: { authorization: "Bearer admin-token" },
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("ne route pas une URL inconnue", async () => {
    authorizeAsAdmin();

    const response = await handleMansaRoutes(
      request("/api/mansa/unknown", {
        method: "GET",
        headers: { authorization: "Bearer admin-token" },
      }),
    );

    expect(response.status).toBe(404);
  });

  it("ne fait pas confiance à creatorId fourni dans le JSON", async () => {
    authorizeAsCreator();

    const response = await handleMansaRoutes(
      jsonRequest(
        "/api/mansa/webhook/simulate",
        {
          user_id: "489123456789012345",
          creatorId: ADMIN_UID,
          platform: "discord",
          status: "active",
          plan_name: "VIP Mansa",
          customer_name: "Seydou Koné",
          customer_phone: "+2250788990011",
          amount_xof: 25000,
          payment_method: "Wave",
          transaction_id: "kpay_tx_12345678",
        },
        {
          method: "POST",
          headers: { authorization: "Bearer creator-token" },
        },
      ),
    );

    // Le schéma .strict() rejette ce champ ajouté par le client.
    expect(response.status).toBe(400);
  });
});
```

## 5. Tests spécifiques aux protections contre les secrets

### `src/server/security/__tests__/securityHeaders.jest.test.ts`

```ts
import { json } from "../http";

describe("security response headers", () => {
  it("ajoute les en-têtes de base sur les réponses JSON", () => {
    const response = json({ ok: true });

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
```

## 6. Tests de non-régression pour les en-têtes falsifiables

Ces tests vérifient qu’un attaquant ne peut pas devenir administrateur en envoyant seulement des en-têtes arbitraires :

```ts
import { adminAuth } from "../firebaseAdmin";
import { handleMansaRoutes } from "../../routes/mansaRoutes";
import { request } from "./fixtures";

jest.mock("../firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: jest.fn() },
  adminDb: { doc: jest.fn() },
}));

test("x-user-id ne contourne pas l’authentification", async () => {
  const response = await handleMansaRoutes(
    request("/api/mansa/logs", {
      method: "DELETE",
      headers: {
        "x-user-id": "uid-admin-001",
        "x-forwarded-for": "127.0.0.1",
        authorization: "Bearer forged-looking-token",
      },
    }),
  );

  expect(response.status).toBe(401);
  expect(jest.mocked(adminAuth.verifyIdToken)).toHaveBeenCalledWith(
    "forged-looking-token",
    true,
  );
});
```

## 7. Commandes de vérification

```bash
# Exécuter uniquement la suite Jest
pnpm test:jest

# Couverture
pnpm test:jest:coverage

# Cibler le middleware
pnpm exec jest src/server/security/__tests__/mansaAuth.jest.test.ts --runInBand
```

## 8. Points à adapter avant intégration

1. Remplacer les stubs d’intégration Discord/Telegram par les clients serveur réels.
2. Ajouter un mock Firebase Admin signé par l’émulateur Firebase ou un double contrôlé ; ne jamais tester l’authentification en décodant simplement un JWT sans vérifier sa signature.
3. Ajouter des tests avec plusieurs tenants et plusieurs rôles.
4. Ajouter des tests d’idempotence pour les événements de paiement et les opérations de rôle.
5. Ajouter des tests de limite de taille, de rate limiting et de rejeu HMAC.
6. Ajouter des tests de règles Firestore séparés avec Firebase Emulator Suite.
7. Réinitialiser les variables `process.env` après chaque test si la suite manipule des secrets de configuration.

## Matrice de couverture attendue

| Scénario | Résultat attendu |
|---|---:|
| Aucun token | `401` |
| Schéma Authorization invalide | `401` |
| Token Firebase invalide/révoqué | `401` |
| Rôle insuffisant | `403` |
| Tenant différent | `403` |
| Tenant présent dans les claims | accès autorisé |
| Tenant Firestore actif | accès autorisé |
| Tenant Firestore inactif | `403` |
| Simulation en production | `404` |
| Simulation hors production + admin | `202` |
| Suppression de logs par creator | `403` |
| Suppression de logs par admin | `200` |
| Secret dans `/config` | jamais exposé |
| Champ JSON inconnu | `400` |
| Montant invalide | `400` |
| Rôle Discord hors allowlist | `403` |
| Méthode HTTP incorrecte | `405` |
| URL Mansa inconnue | `404` |

> La propriété essentielle à conserver est la suivante : **un test ne doit jamais considérer un utilisateur comme authentifié parce que son `uid`, son rôle ou son tenant est présent dans une donnée contrôlée par le navigateur**.
