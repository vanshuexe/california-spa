import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key'
);

// Supabase phone auth needs an SMS provider, so the 10-digit mobile number is
// mapped to a synthetic email used only as the auth identifier. The user's real
// email is stored in user metadata and the profiles table.
export const phoneToAuthEmail = (phone: string) =>
  `${phone.replace(/\D/g, '')}@phone.doorstep-royale.app`;
