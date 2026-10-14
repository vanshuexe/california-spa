import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_THERAPIST_PHOTO, useTherapists } from '../lib/useTherapists';
import {
  PHOTO_ACCEPT,
  PreparedPhoto,
  deleteStoredPhoto,
  preparePhoto,
  uploadTherapistPhoto,
} from '../lib/therapistPhoto';
import { TherapistPhoto } from './TherapistPhoto';
import { TherapistProfile } from '../types';

interface FormValues {
  name: string;
  gender: string;
  age: string;
  experience: string;
  specialties: string;
  bio: string;
}

const emptyValues: FormValues = { name: '', gender: 'Female', age: '', experience: '', specialties: '', bio: '' };

const valuesFrom = (t: TherapistProfile): FormValues => ({
  name: t.name,
  gender: t.gender,
  age: t.age ? String(t.age) : '',
  experience: t.experience,
  specialties: t.specialties.join(', '),
  bio: t.bio,
});

// ---- photo picker: choose a file, validate it, show a preview before anything is saved ----
interface PickerProps {
  currentUrl?: string | null; // photo already saved for this therapist
  prepared: PreparedPhoto | null;
  removed: boolean;
  onPrepared: (p: PreparedPhoto | null) => void;
  onRemoved: (v: boolean) => void;
}

const PhotoPicker: React.FC<PickerProps> = ({ currentUrl, prepared, removed, onPrepared, onRemoved }) => {
  const input = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!prepared) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(prepared.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [prepared]);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again
    if (!file) return;
    setError('');
    setWorking(true);
    try {
      onPrepared(await preparePhoto(file));
      onRemoved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use this photo.');
    } finally {
      setWorking(false);
    }
  };

  const hasSaved = Boolean(currentUrl) && currentUrl !== DEFAULT_THERAPIST_PHOTO;
  const shown = previewUrl ?? (removed ? null : currentUrl);
  const hasAnyPhoto = Boolean(previewUrl) || (hasSaved && !removed);

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <div className="relative">
        <TherapistPhoto
          src={shown}
          alt="Therapist photo preview"
          width={112}
          height={112}
          eager
          className="w-28 h-28 object-cover rounded-md border-2 border-[#a28321] bg-white"
        />
        {previewUrl && (
          <span className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#228b22] text-white shadow">
            NEW
          </span>
        )}
      </div>
      <div className="flex-1 min-w-[200px]">
        <input ref={input} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={choose} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={working}
            onClick={() => input.current?.click()}
            className="btn btn-action px-4 py-2 text-sm disabled:opacity-60"
          >
            {working ? 'Processing…' : hasAnyPhoto ? '📷 Change Photo' : '📷 Upload Photo'}
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={() => {
                onPrepared(null);
                setError('');
              }}
              className="px-3 py-2 text-sm font-bold rounded border border-[#a28321] text-[#840000] bg-white"
            >
              Undo
            </button>
          )}
          {!previewUrl && hasSaved && !removed && (
            <button
              type="button"
              onClick={() => onRemoved(true)}
              className="px-3 py-2 text-sm font-bold rounded border border-red-700 text-red-700 bg-white"
            >
              Remove photo
            </button>
          )}
          {removed && !previewUrl && (
            <button
              type="button"
              onClick={() => onRemoved(false)}
              className="px-3 py-2 text-sm font-bold rounded border border-[#a28321] text-[#840000] bg-white"
            >
              Keep current photo
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1.5 mb-0">
          JPG, PNG or WebP, up to 5 MB. Works from your phone, tablet or computer.
          {previewUrl && prepared && ` Ready to save (${Math.round(prepared.blob.size / 1024)} KB).`}
          {removed && !previewUrl && ' The default picture will be shown after you save.'}
        </p>
        {error && <p className="text-xs font-bold text-red-700 mt-1 mb-0">{error}</p>}
      </div>
    </div>
  );
};

// ---- shared fields for Add and Edit ----
interface FormProps {
  initial: FormValues;
  currentPhoto?: string | null;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: FormValues, photo: { prepared: PreparedPhoto | null; removed: boolean }) => Promise<void> | void;
  onCancel?: () => void;
}

const TherapistForm: React.FC<FormProps> = ({ initial, currentPhoto, submitLabel, busy, onSubmit, onCancel }) => {
  const [v, setV] = useState<FormValues>(initial);
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [removed, setRemoved] = useState(false);
  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(v, { prepared, removed });
        if (!onCancel) {
          // "Add" form: clear it after a successful save
          setV(emptyValues);
          setPrepared(null);
          setRemoved(false);
        }
      }}
      className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 grid gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <label className="block text-sm font-bold text-[#840000] mb-1">Photo</label>
        <PhotoPicker currentUrl={currentPhoto} prepared={prepared} removed={removed} onPrepared={setPrepared} onRemoved={setRemoved} />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#840000]">Name *</label>
        <input required value={v.name} onChange={set('name')} className="form-control" />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#840000]">Gender</label>
        <select value={v.gender} onChange={set('gender')} className="form-control">
          <option>Female</option>
          <option>Male</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-[#840000]">Age</label>
        <input type="number" min={18} value={v.age} onChange={set('age')} className="form-control" />
      </div>
      <div>
        <label className="block text-sm font-bold text-[#840000]">Experience</label>
        <input value={v.experience} onChange={set('experience')} placeholder="e.g. 4+ Years" className="form-control" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-bold text-[#840000]">Specialties (comma separated)</label>
        <input value={v.specialties} onChange={set('specialties')} placeholder="Swedish, Deep Tissue, Aroma" className="form-control" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-bold text-[#840000]">Short bio (optional)</label>
        <textarea value={v.bio} onChange={set('bio')} rows={2} className="form-control" />
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-action px-6 py-2 disabled:opacity-60">
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-sm font-bold rounded border border-[#a28321] text-[#840000] bg-white">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export const TherapistManager: React.FC = () => {
  const { therapists, reload } = useTherapists();
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logins, setLogins] = useState<Record<string, string>>({});
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const say = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadLogins = async () => {
    const { data } = await supabase.from('therapist_accounts').select('therapist_id, email');
    const map: Record<string, string> = {};
    for (const r of (data as { therapist_id: string; email: string }[]) || []) map[r.therapist_id] = r.email;
    setLogins(map);
  };
  useEffect(() => {
    loadLogins();
  }, []);

  const saveLogin = async (therapistId: string) => {
    say('');
    const { data, error } = await supabase.functions.invoke('create-therapist-login', {
      body: { therapist_id: therapistId, email: loginEmail, password: loginPass },
    });
    if (error || data?.error) {
      say(data?.error || error?.message || 'Could not create login.', true);
      return;
    }
    say('Login saved. Share the email and password with the therapist (they sign in at /therapist/).');
    setLoginFor(null);
    setLoginEmail('');
    setLoginPass('');
    loadLogins();
  };

  const fields = (v: FormValues) => ({
    gender: v.gender,
    age: v.age ? Number(v.age) : null,
    experience: v.experience.trim() || null,
    specialties: v.specialties.split(',').map((s) => s.trim()).filter(Boolean),
    bio: v.bio.trim() || null,
  });

  // ---- add ----
  const add = async (v: FormValues, photo: { prepared: PreparedPhoto | null }) => {
    if (!v.name.trim()) return;
    setBusy(true);
    say('');
    const id = crypto.randomUUID();
    let uploaded: string | null = null;
    try {
      let url: string | null = null;
      if (photo.prepared) {
        const up = await uploadTherapistPhoto(id, photo.prepared);
        uploaded = up.path;
        url = up.url;
      }
      const { error } = await supabase.from('therapists').insert({ id, name: v.name.trim(), photo: url, ...fields(v) });
      if (error) throw new Error(error.message);
      say(`${v.name.trim()} added.`);
      reload();
    } catch (err) {
      if (uploaded) await deleteStoredPhoto(uploaded); // don't leave an unused file behind
      say(err instanceof Error ? err.message : 'Could not add therapist.', true);
      throw err; // keeps the form filled so nothing typed is lost
    } finally {
      setBusy(false);
    }
  };

  // ---- edit ----
  const update = async (t: TherapistProfile, v: FormValues, photo: { prepared: PreparedPhoto | null; removed: boolean }) => {
    if (!v.name.trim()) return;
    setBusy(true);
    say('');
    let uploaded: string | null = null;
    try {
      const oldPhoto = t.photo !== DEFAULT_THERAPIST_PHOTO ? t.photo : null;
      const patch: Record<string, unknown> = { ...fields(v) };

      if (photo.prepared) {
        const up = await uploadTherapistPhoto(t.id, photo.prepared);
        uploaded = up.path;
        patch.photo = up.url;
      } else if (photo.removed) {
        patch.photo = null;
      }

      if (v.name.trim() !== t.name) {
        // also updates the name saved on this therapist's bookings
        const { error: renameErr } = await supabase.rpc('admin_rename_therapist', { p_id: t.id, p_name: v.name.trim() });
        if (renameErr) throw new Error(renameErr.message);
      }

      const { data, error } = await supabase.from('therapists').update(patch).eq('id', t.id).select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Nothing was saved. Please sign in again as admin and retry.');

      if ((photo.prepared || photo.removed) && oldPhoto) await deleteStoredPhoto(oldPhoto); // free the old file
      say(`${v.name.trim()} updated.`);
      setEditingId(null);
      reload();
    } catch (err) {
      if (uploaded) await deleteStoredPhoto(uploaded);
      say(err instanceof Error ? err.message : 'Could not save changes.', true);
    } finally {
      setBusy(false);
    }
  };

  const deleteLogin = async (id: string, tName: string) => {
    if (!window.confirm(`Delete the login for ${tName}? They will no longer be able to sign in or chat.`)) return;
    say('');
    const { data, error } = await supabase.functions.invoke('create-therapist-login', {
      body: { action: 'delete', therapist_id: id },
    });
    if (error || data?.error) {
      say(data?.error || error?.message || 'Could not delete login.', true);
      return;
    }
    say(`Login for ${tName} deleted.`);
    setLoginFor(null);
    loadLogins();
  };

  const remove = async (t: TherapistProfile) => {
    const hasLogin = Boolean(logins[t.id]);
    if (!window.confirm(`Remove ${t.name}${hasLogin ? ' and delete their login' : ''}? Existing bookings keep the name.`)) return;
    if (hasLogin) {
      const { data, error: e } = await supabase.functions.invoke('create-therapist-login', {
        body: { action: 'delete', therapist_id: t.id },
      });
      if (e || data?.error) {
        say(data?.error || e?.message || 'Could not delete login.', true);
        return;
      }
    }
    const { error } = await supabase.from('therapists').delete().eq('id', t.id);
    if (error) say(error.message, true);
    else {
      if (t.photo !== DEFAULT_THERAPIST_PHOTO) await deleteStoredPhoto(t.photo);
      say(`${t.name} removed.`);
      reload();
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-6 px-4">
      <h4 className="text-2xl font-bold text-[#840000] mb-4">Admin - Therapists</h4>

      <h5 className="text-lg font-bold text-[#5a0101] mb-2">Add a therapist</h5>
      <div className="mb-6">
        <TherapistForm initial={emptyValues} submitLabel="Add Therapist" busy={busy} onSubmit={(v, p) => add(v, p).catch(() => undefined)} />
      </div>

      {message && (
        <p className={`text-sm font-bold mb-3 ${isError ? 'text-red-700' : 'text-[#228b22]'}`} role="status">
          {message}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {therapists.map((t) => (
          <React.Fragment key={t.id}>
            <div className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-3 flex items-center gap-3">
              <TherapistPhoto
                src={t.photo}
                alt={t.name}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border border-[#a28321] bg-white shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#840000]">{t.name}</div>
                <div className="text-xs text-gray-600 truncate">
                  {t.gender}{t.age ? `, ${t.age}` : ''}{t.experience ? ` • ${t.experience}` : ''}
                </div>
                <div className="text-xs text-gray-600 truncate">{t.specialties.join(', ')}</div>
                {t.photo === DEFAULT_THERAPIST_PHOTO && <div className="text-[11px] text-amber-700 font-bold">No photo yet</div>}
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                  className="px-3 py-1.5 text-sm font-bold rounded bg-[#840000] text-white"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  className="px-3 py-1.5 text-sm font-bold rounded border border-red-700 text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginFor(loginFor === t.id ? null : t.id);
                    setLoginEmail(logins[t.id] || '');
                    setLoginPass('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-[#5a0101] text-[#81d742]"
                >
                  {logins[t.id] ? '🔑 Reset login' : '🔑 Create login'}
                </button>
                {logins[t.id] && (
                  <button
                    type="button"
                    onClick={() => deleteLogin(t.id, t.name)}
                    className="px-3 py-1.5 text-xs font-bold rounded border border-red-700 text-red-700 hover:bg-red-50"
                  >
                    🗑 Delete login
                  </button>
                )}
              </div>
            </div>
            {logins[t.id] && <div className="text-xs text-[#228b22] -mt-2 mb-1 px-1 md:col-span-2">Login: {logins[t.id]}</div>}

            {editingId === t.id && (
              <div className="md:col-span-2">
                <h5 className="text-sm font-bold text-[#5a0101] mb-1">Edit {t.name}</h5>
                <TherapistForm
                  initial={valuesFrom(t)}
                  currentPhoto={t.photo}
                  submitLabel="Save Changes"
                  busy={busy}
                  onSubmit={(v, p) => update(t, v, p)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}

            {loginFor === t.id && (
              <div className="md:col-span-2 bg-white/70 border border-[#a28321] rounded-lg p-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#840000]">Email</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="form-control" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#840000]">Password (8+ chars)</label>
                  <input type="text" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="form-control" />
                </div>
                <button type="button" onClick={() => saveLogin(t.id)} className="btn btn-action px-4 py-2 text-sm">
                  Save login
                </button>
              </div>
            )}
          </React.Fragment>
        ))}
        {therapists.length === 0 && <p className="text-sm text-gray-600">No therapists yet. Add the first one above.</p>}
      </div>
    </div>
  );
};
