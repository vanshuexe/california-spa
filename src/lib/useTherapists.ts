import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { THERAPISTS_DATA } from '../data/siteData';
import { TherapistProfile } from '../types';

interface TherapistRow {
  id: string;
  name: string;
  gender: string;
  age: number | null;
  experience: string | null;
  specialties: string[] | null;
  photo: string | null;
  rating: number | null;
  reviews_count: number | null;
  bio: string | null;
}

export const DEFAULT_THERAPIST_PHOTO = '/assets/slider/images/female-massage-bangalore.png';

const fromRow = (r: TherapistRow): TherapistProfile => ({
  id: r.id,
  name: r.name,
  gender: r.gender === 'Male' ? 'Male' : 'Female',
  age: r.age ?? 0,
  experience: r.experience ?? '',
  specialties: r.specialties ?? [],
  photo: r.photo || DEFAULT_THERAPIST_PHOTO,
  rating: Number(r.rating ?? 5),
  reviewsCount: r.reviews_count ?? 0,
  bio: r.bio ?? '',
});

// Therapists come from the database (managed in the admin panel). The built-in list is only
// used while loading or if Supabase is unreachable / not configured.
export function useTherapists() {
  const [therapists, setTherapists] = useState<TherapistProfile[]>(THERAPISTS_DATA);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setTherapists((data as TherapistRow[]).map(fromRow));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { therapists, reload };
}
