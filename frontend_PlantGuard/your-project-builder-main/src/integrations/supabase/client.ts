// src/integrations/supabase/client.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  // Use the real supabase client when env vars are provided
  supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
} else {
  // Fallback mock client so app doesn't crash during development
  // Only implements the small subset of methods your app uses (auth and functions.invoke)
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — using mock supabase client for development."
  );

  const mockAuth = {
    // returns a shape like { data: { session: null } }
    getSession: async () => ({ data: { session: null } }),
    // returns object { data: { subscription } } where subscription.unsubscribe() is callable
    onAuthStateChange: (_callback: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    // some code may call signIn/signOut; return harmless shapes
    signIn: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
  };

  const mockFunctions = {
    // keep signature similar to supabase functions.invoke
    invoke: async (_fnName: string, _opts?: any) => {
      // return neutral result — front-end will handle absence of data
      return { data: null, error: null };
    },
  };

  // build a partial object and cast to SupabaseClient to satisfy TypeScript
  // Note: this mock is intentionally minimal and safe for dev when Supabase isn't used.
  supabase = {
    auth: mockAuth,
    functions: mockFunctions,
  } as unknown as SupabaseClient;
}

export { supabase };
