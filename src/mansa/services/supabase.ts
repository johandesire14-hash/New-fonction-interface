import { createClient } from "@supabase/supabase-js";

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
