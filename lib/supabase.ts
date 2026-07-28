import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("[Supabase Config] supabaseUrl:", supabaseUrl);
console.log("[Supabase Config] supabaseAnonKey:", supabaseAnonKey ? "設定あり" : "未設定");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log("[Supabase Config] isSupabaseConfigured:", isSupabaseConfigured);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
