import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Inquiry {
  id: string;
  type: 'contact' | 'job' | 'chat';
  name: string;
  mobile: string;
  email: string | null;
  message: string | null;
  details: Record<string, string>;
  status: 'new' | 'read' | 'done';
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  contact: '📩 Booking Inquiry',
  job: '💼 Job Application',
  chat: '💬 Guest Chat',
};

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-red-100 text-red-800',
  read: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
};

type Filter = 'all' | 'contact' | 'job' | 'chat';

interface Props {
  onCountChange?: (newCount: number) => void;
}

export const InquiriesManager: React.FC<Props> = ({ onCountChange }) => {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [onlyNew, setOnlyNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) setError(err.message);
    else {
      const list = (data as Inquiry[]) || [];
      setRows(list);
      onCountChange?.(list.filter((r) => r.status === 'new').length);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: Inquiry['status']) => {
    const { error: err } = await supabase.from('inquiries').update({ status }).eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    const next = rows.map((r) => (r.id === id ? { ...r, status } : r));
    setRows(next);
    onCountChange?.(next.filter((r) => r.status === 'new').length);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this message permanently?')) return;
    const { error: err } = await supabase.from('inquiries').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    onCountChange?.(next.filter((r) => r.status === 'new').length);
  };

  const shown = rows.filter(
    (r) => (filter === 'all' || r.type === filter) && (!onlyNew || r.status === 'new')
  );

  return (
    <div className="max-w-5xl mx-auto my-6 px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h4 className="text-2xl font-bold text-[#840000] m-0">Admin - Inquiries & Applications</h4>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {(['all', 'contact', 'job', 'chat'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded ${filter === f ? 'bg-[#5a0101] text-[#81d742]' : 'bg-white/60 text-[#840000]'}`}
            >
              {f === 'all' ? 'All' : f === 'contact' ? 'Inquiries' : f === 'job' ? 'Jobs' : 'Chat'}
            </button>
          ))}
          <label className="flex items-center gap-1 text-[#840000]">
            <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> New only
          </label>
          <button type="button" onClick={load} className="px-3 py-1 rounded bg-white/60 text-[#840000]">
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!loading && shown.length === 0 && <p className="text-sm text-gray-600">Nothing here yet.</p>}

      <div className="space-y-3">
        {shown.map((r) => (
          <div key={r.id} className="bg-[#f5f0e8] border border-[#a28321] rounded-lg p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-[#840000]">
                {TYPE_LABEL[r.type]} <span className="text-gray-700 font-normal">- {r.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                <span className={`px-2 py-1 rounded font-bold ${STATUS_STYLE[r.status]}`}>{r.status.toUpperCase()}</span>
              </div>
            </div>

            <div className="text-sm mt-2">
              📞 <a href={`tel:${r.mobile}`} className="text-[#840000] underline">{r.mobile}</a>
              {r.email && <> • ✉️ <a href={`mailto:${r.email}`} className="text-[#840000] underline">{r.email}</a></>}
              <a
                href={`https://wa.me/91${r.mobile.replace(/\D/g, '').slice(-10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[#128c7e] underline"
              >
                WhatsApp
              </a>
            </div>

            {Object.keys(r.details || {}).length > 0 && (
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-0.5 text-sm mt-2 mb-0">
                {Object.entries(r.details).map(([k, v]) =>
                  v ? (
                    <React.Fragment key={k}>
                      <dt className="font-bold text-[#5a0101]">{k}</dt>
                      <dd className="m-0">{v}</dd>
                    </React.Fragment>
                  ) : null
                )}
              </dl>
            )}
            {r.message && <p className="text-sm mt-2 mb-0 whitespace-pre-wrap bg-white/60 rounded p-2">{r.message}</p>}

            <div className="flex flex-wrap gap-2 mt-3 text-sm">
              {r.status !== 'read' && (
                <button type="button" onClick={() => setStatus(r.id, 'read')} className="px-3 py-1 rounded bg-white border border-[#a28321] text-[#840000]">
                  Mark Read
                </button>
              )}
              {r.status !== 'done' && (
                <button type="button" onClick={() => setStatus(r.id, 'done')} className="px-3 py-1 rounded bg-[#228b22] text-white">
                  Mark Done
                </button>
              )}
              {r.status !== 'new' && (
                <button type="button" onClick={() => setStatus(r.id, 'new')} className="px-3 py-1 rounded bg-white border border-[#a28321] text-[#840000]">
                  Mark New
                </button>
              )}
              <button type="button" onClick={() => remove(r.id)} className="px-3 py-1 rounded border border-red-700 text-red-700 hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
