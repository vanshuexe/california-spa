import { supabase, isSupabaseConfigured } from './supabase';

export type InquiryType = 'contact' | 'job' | 'chat';

interface NewInquiry {
  type: InquiryType;
  name: string;
  mobile: string;
  email?: string;
  message?: string;
  details?: Record<string, string>;
}

// Returns an error message, or null on success.
export async function submitInquiry(i: NewInquiry): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Supabase is not configured.';
  const { error } = await supabase.from('inquiries').insert({
    type: i.type,
    name: i.name.trim(),
    mobile: i.mobile.trim(),
    email: i.email?.trim() || null,
    message: i.message?.trim() || null,
    details: i.details ?? {},
  });
  return error ? error.message : null;
}
