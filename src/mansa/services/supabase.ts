import { createClient, type Session } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://frbxlfqaovyrflqzpqsg.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_3WFUmj8Obd4Ep2d4Htzx6Q_opXCLv5W";

const getSupabaseUrl = (): string => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) {
      return String(import.meta.env.VITE_SUPABASE_URL);
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process?.env?.VITE_SUPABASE_URL) {
      return String(process.env.VITE_SUPABASE_URL);
    }
  } catch {}
  return DEFAULT_SUPABASE_URL;
};

const getSupabaseKey = (): string => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) {
      return String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process?.env?.VITE_SUPABASE_PUBLISHABLE_KEY) {
      return String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    }
  } catch {}
  return DEFAULT_SUPABASE_KEY;
};

const supabaseUrl = getSupabaseUrl().trim() || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getSupabaseKey().trim() || DEFAULT_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SESSION_REQUIRED_MESSAGE =
  "Votre session Supabase est absente. Connectez-vous pour continuer.";
export const SESSION_EXPIRED_MESSAGE =
  "Votre session Supabase a expiré. Reconnectez-vous pour continuer.";

export const isActiveSupabaseSession = (session: Session | null): session is Session =>
  Boolean(
    session?.user?.id &&
      session.access_token &&
      (!session.expires_at || session.expires_at > Math.floor(Date.now() / 1000)),
  );

export async function requireActiveSupabaseSession(): Promise<Session> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    throw new Error(`Impossible de vérifier votre session Supabase : ${error.message}`);
  }

  if (!session?.user?.id || !session.access_token) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    throw new Error(SESSION_REQUIRED_MESSAGE);
  }

  if (!isActiveSupabaseSession(session)) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  return session;
}
