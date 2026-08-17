import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase env variables are missing. Copy .env.example to .env.local.");
}

export const supabase = createClient(url || "", anonKey || "", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const PHOTO_BUCKET = "beneficiary-photos";
