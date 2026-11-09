import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

async function enforceApiProtection(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    !url.pathname.startsWith("/api/") ||
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
  )
    return null;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("cf-connecting-ip") || "unknown";
  const user =
    request.headers.get("x-user-id") || request.headers.get("authorization") || "anonymous";
  const now = Date.now();
  const bucketKey = `${url.pathname}:${ip}:${user}`;
  const bucket = requestBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 });
  } else if (bucket.count >= 30) {
    return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez plus tard." }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "60" },
    });
  } else {
    bucket.count += 1;
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const payload = (await request.clone().json()) as Record<string, unknown>;
      if (typeof payload["website"] === "string" && payload["website"].trim()) {
        return new Response(JSON.stringify({ error: "Requête rejetée." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
    } catch {
      // L’endpoint aval gère les corps qui ne sont pas du JSON valide.
    }
  }
  return null;
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (import.meta.env.PROD && request.headers.get("x-forwarded-proto") === "http") {
        const httpsUrl = new URL(request.url);
        httpsUrl.protocol = "https:";
        return Response.redirect(httpsUrl.toString(), 301);
      }
      const blockedResponse = await enforceApiProtection(request);
      if (blockedResponse) return blockedResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
