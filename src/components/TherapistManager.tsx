import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_THERAPIST_PHOTO, useTherapists } from '../lib/useTherapists';

export const TherapistManager: React.FC = () => {
  const { therapists, reload } = useTherapists();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState('');
  const [experience, setExperience] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [logins, setLogins] = useState<Record<string, string>>({});
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

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
    setMessage('');
    const { data, error } = await supabase.functions.invoke('create-therapist-login', {
      body: { therapist_id: therapistId, email: loginEmail, password: loginPass },
    });
    if (error || data?.error) {
      setMessage(data?.error || error?.message || 'Could not create login.');
      return;
    }
    setMessage('Login saved. Share the email and password with the therapist (they sign in at /#therapist).');
    setLoginFor(null);
    setLoginEmail('');
    setLoginPass('');
    loadLogins();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.from('therapists').insert({
      name: name.trim(),
      gender,
      age: age ? Number(age) : null,
      experience: experience.trim() || null,
      specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
      photo: photo.trim() || DEFAULT_THERAPIST_PHOTO,
      bio: bio.trim() || null,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setName('');
    setAge('');
    setExperience('');
    setSpecialties('');
    setBio('');
    setPhoto('');
    setMessage('Therapist added.');
    reload();
  };

  const deleteLogin = async (id: string, tName: string) => {
    if (!window.confirm(`Delete the login for ${tName}? They will no longer be able to sign in or chat.`)) return;
    setMessage('');
    const { data, error } = await supabase.functions.invoke('create-therapist-login', {
      body: { action: 'delete', therapist_id: id },
    });
    if (error || data?.error) {
      setMessage(data?.error || error?.message || 'Could not delete login.');
      return;
    }
    setMessage(`Login for ${tName} deleted.`);
    setLoginFor(null);
    loadLogins();
  };

  const remove = async (id: string, tName: string) => {
    const hasLogin = Boolean(logins[id]);
    if (!window.confirm(`Remove ${tName}${hasLogin ? ' and delete their login' : ''}? Existing bookings keep the name.`)) return;
    if (hasLogin) {
      const { data, error: e } = await supabase.functions.invoke('create-therapist-login', {
        body: { action: 'delete', therapist_id: id },
      });
      if (e || data?.error) {
        setMessage(data?.error || e?.message || 'Could not delete login.');
        return;
      }
    }
    const { error } = await supabase.from('therapists').delete().eq('id', id);
    if (error) setMessage(error.message);
    else {
      setMessage(`${tName} removed.`);
      reload();
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-6 px-4">
      <h4 className="text-2xl font-bold text-[#840000] mb-4">Admin - Therapists</h4>

      <form onSubmit={add} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 mb-6 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-bold text-[#840000]">Name *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="form-control" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#840000]">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-control">
            <option>Female</option>
            <option>Male</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#840000]">Age</label>
          <input type="number" min={18} value={age} onChange={(e) => setAge(e.target.value)} className="form-control" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#840000]">Experience</label>
          <input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 4+ Years" className="form-control" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-[#840000]">Specialties (comma separated)</label>
          <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Swedish, Deep Tissue, Aroma" className="form-control" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-[#840000]">Photo URL (optional)</label>
          <input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." className="form-control" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-[#840000]">Short bio (optional)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="form-control" />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn btn-action px-6 py-2 disabled:opacity-60">
            {busy ? 'Adding…' : 'Add Therapist'}
          </button>
          {message && <span className="text-sm font-bold text-[#228b22]">{message}</span>}
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {therapists.map((t) => (
          <React.Fragment key={t.id}>
          <div className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-3 flex items-center gap-3">
            <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-full object-cover border border-[#a28321]" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#840000]">{t.name}</div>
              <div className="text-xs text-gray-600 truncate">
                {t.gender}{t.age ? `, ${t.age}` : ''}{t.experience ? ` • ${t.experience}` : ''}
              </div>
              <div className="text-xs text-gray-600 truncate">{t.specialties.join(', ')}</div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <button
                type="button"
                onClick={() => remove(t.id, t.name)}
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
      </div>
    </div>
  );
};
