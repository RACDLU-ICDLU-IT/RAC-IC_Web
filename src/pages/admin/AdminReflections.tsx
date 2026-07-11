import React, { useCallback, useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../../supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, Trash2, Pencil, Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Admin page for the "Reflection" card shown on DashboardHome.tsx.
 * Backs the previously-hardcoded REFLECTIONS array with a real table.
 *
 * Scope decisions (confirmed in conversation, not guessed):
 * - SHARED pool across both tenants — no tenant_id column. Every admin,
 *   RACDLU or ICDLU, sees and manages the same quote list.
 * - Active/inactive toggle — inactive rows are kept (not deleted) but
 *   excluded from DashboardHome's rotation.
 * - Bulk upload is CSV, not JSON — parsed client-side with papaparse
 *   (npm install papaparse @types/papaparse — not yet a project
 *   dependency, needs adding).
 *
 * Expected Supabase table `reflections`:
 *   id          uuid primary key default gen_random_uuid()
 *   tag         text not null        -- e.g. "Quote", "Quran · 2:263"
 *   text        text not null        -- the quote/fact body
 *   attr        text                 -- attribution / citation, optional
 *   is_active   boolean not null default true
 *   sort_order  integer not null default 0
 *   created_at  timestamptz not null default now()
 *
 * DashboardHome.tsx's own follow-up: once this table exists, swap its
 * hardcoded REFLECTIONS array for a query against this table filtered
 * to is_active = true, ordered by sort_order. Not done as part of this
 * page — this page only manages the data; wiring the display side is
 * a separate, small change to DashboardHome.tsx.
 */

type ReflectionRow = {
  id: string;
  tag: string;
  text: string;
  attr: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type DraftRow = { tag: string; text: string; attr: string };

const EMPTY_DRAFT: DraftRow = { tag: '', text: '', attr: '' };

/** Row shape expected in an uploaded CSV. Headers are case-insensitive
 * and matched loosely (trimmed, lowercased) so "Tag", "tag ", "TAG" all
 * work — admins hand-editing a spreadsheet won't always match case exactly. */
type CsvRow = { tag: string; text: string; attr?: string };

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

/** Parses + validates a CSV file into clean rows, returning both the
 * good rows and per-row problems so the admin can see exactly what
 * will and won't import before committing anything. Never silently
 * drops a bad row — every row is accounted for in either `valid` or
 * `errors`. */
function parseReflectionsCsv(fileText: string): { valid: CsvRow[]; errors: { line: number; reason: string }[] } {
  const result = Papa.parse<Record<string, string>>(fileText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  const valid: CsvRow[] = [];
  const errors: { line: number; reason: string }[] = [];

  result.data.forEach((row, i) => {
    const lineNum = i + 2; // +1 for header row, +1 for 1-indexing
    const tag = (row.tag || '').trim();
    const text = (row.text || '').trim();
    const attr = (row.attr || '').trim();

    if (!tag && !text) return; // fully blank row, ignore silently
    if (!tag) {
      errors.push({ line: lineNum, reason: 'Missing "tag" column' });
      return;
    }
    if (!text) {
      errors.push({ line: lineNum, reason: 'Missing "text" column' });
      return;
    }
    valid.push({ tag, text, attr: attr || undefined });
  });

  if (result.errors.length > 0) {
    result.errors.forEach((e) => errors.push({ line: (e.row ?? 0) + 2, reason: e.message }));
  }

  return { valid, errors };
}

async function loadReflections(): Promise<ReflectionRow[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ReflectionRow[]) || [];
}

export default function AdminReflections() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  // Neutral admin-surface palette — this page is a standard CRUD admin
  // screen, not part of DashboardHome's tenant-colored identity, so it
  // intentionally does NOT import theme/racPalette.ts. It sits inside
  // DashboardLayout same as every other /admin/* page and inherits that
  // shell's chrome; only this page's own content area is styled here.
  const s = {
    text: dark ? '#f2eff0' : '#161616',
    sub: dark ? 'rgba(255,255,255,0.55)' : '#6b7280',
    border: dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    card: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    inputBg: dark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    rowHover: dark ? 'rgba(255,255,255,0.03)' : '#fafafa',
    accent: '#6d5ef0',
    danger: '#e5484d',
    success: '#2fae5f',
  };

  const [rows, setRows] = useState<ReflectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [showAddForm, setShowAddForm] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ valid: CsvRow[]; errors: { line: number; reason: string }[] } | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await loadReflections());
    } catch (err) {
      console.error(err);
      setError("Couldn't load reflections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---------------- single-row create/edit/delete ---------------- */

  const startEdit = (row: ReflectionRow) => {
    setEditingId(row.id);
    setDraft({ tag: row.tag, text: row.text, attr: row.attr || '' });
    setShowAddForm(false);
  };

  const startAdd = () => {
    setShowAddForm(true);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setDraft(EMPTY_DRAFT);
  };

  const saveDraft = async () => {
    const tag = draft.tag.trim();
    const text = draft.text.trim();
    const attr = draft.attr.trim();
    if (!tag || !text) {
      setError('Both "Tag" and "Text" are required.');
      return;
    }
    setSavingId(editingId || 'new');
    setError(null);
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('reflections')
          .update({ tag, text, attr: attr || null })
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
        const { error: err } = await supabase
          .from('reflections')
          .insert({ tag, text, attr: attr || null, is_active: true, sort_order: maxSort + 1 });
        if (err) throw err;
      }
      cancelEdit();
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (row: ReflectionRow) => {
    setSavingId(row.id);
    try {
      const { error: err } = await supabase.from('reflections').update({ is_active: !row.is_active }).eq('id', row.id);
      if (err) throw err;
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
    } catch (err) {
      console.error(err);
      setError("Couldn't update. Try again.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (row: ReflectionRow) => {
    if (!window.confirm(`Delete this reflection? "${row.text.slice(0, 60)}${row.text.length > 60 ? '…' : ''}" This can't be undone.`)) return;
    setSavingId(row.id);
    try {
      const { error: err } = await supabase.from('reflections').delete().eq('id', row.id);
      if (err) throw err;
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error(err);
      setError("Couldn't delete. Try again.");
    } finally {
      setSavingId(null);
    }
  };

  /* ---------------- CSV bulk upload ---------------- */

  const handleFileSelect = (file: File) => {
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setUploadPreview(parseReflectionsCsv(text));
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmUpload = async () => {
    if (!uploadPreview || uploadPreview.valid.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const payload = uploadPreview.valid.map((r, i) => ({
        tag: r.tag,
        text: r.text,
        attr: r.attr || null,
        is_active: true,
        sort_order: maxSort + i + 1,
      }));
      const { error: err } = await supabase.from('reflections').insert(payload);
      if (err) throw err;
      setUploadOpen(false);
      setUploadPreview(null);
      setUploadFileName('');
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError("Couldn't import the CSV. Nothing was saved — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse({
      fields: ['tag', 'text', 'attr'],
      data: [
        ['Quote', 'Manners maketh man.', '— William of Wykeham (attributed)'],
        ['Quran · 2:263', 'Kind words and forgiveness are better than charity followed by injury.', 'Surah Al-Baqarah'],
      ],
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reflections-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- render ---------------- */

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: s.text }}>Reflections</h1>
          <p className="text-sm mt-1" style={{ color: s.sub }}>
            Manage the quotes and facts shown in the Reflection card on the dashboard. Shared across both tenants.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: s.border, color: s.text, background: s.card }}
          >
            <Upload size={15} /> Bulk upload
          </button>
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: s.accent }}
          >
            <Plus size={15} /> Add reflection
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-4 text-sm"
          style={{ background: dark ? 'rgba(229,72,77,0.12)' : '#fef2f2', color: s.danger }}
        >
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          <button type="button" onClick={() => setError(null)} className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- add/edit inline form --- */}
      {(showAddForm || editingId) && (
        <div className="rounded-xl p-4 mb-5 border" style={{ borderColor: s.border, background: s.card }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium mb-1" style={{ color: s.sub }}>Tag</label>
              <input
                value={draft.tag}
                onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))}
                placeholder="e.g. Quote, Quran · 2:263, Did you know?"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: s.border, background: s.inputBg, color: s.text }}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium mb-1" style={{ color: s.sub }}>Attribution (optional)</label>
              <input
                value={draft.attr}
                onChange={(e) => setDraft((d) => ({ ...d, attr: e.target.value }))}
                placeholder="e.g. — William of Wykeham"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: s.border, background: s.inputBg, color: s.text }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: s.sub }}>Text</label>
              <textarea
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                rows={3}
                placeholder="The quote or fact itself"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
                style={{ borderColor: s.border, background: s.inputBg, color: s.text }}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={savingId !== null}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: s.accent }}
            >
              {savingId !== null ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? 'Save changes' : 'Add reflection'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3.5 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: s.border, color: s.text }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- list --- */}
      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm" style={{ color: s.sub }}>
          <Loader2 size={16} className="animate-spin" /> Loading reflections…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 rounded-xl border border-dashed" style={{ borderColor: s.border, color: s.sub }}>
          <p className="text-sm">No reflections yet.</p>
          <p className="text-xs mt-1">Add one, or bulk upload a CSV to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: s.border }}>
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="flex items-start gap-3 px-4 py-3"
              style={{
                borderTop: i === 0 ? 'none' : `1px solid ${s.border}`,
                background: s.card,
                opacity: row.is_active ? 1 : 0.5,
              }}
            >
              <button
                type="button"
                onClick={() => toggleActive(row)}
                disabled={savingId === row.id}
                title={row.is_active ? 'Active — click to hide from rotation' : 'Inactive — click to show in rotation'}
                className="mt-0.5 shrink-0 w-9 h-5 rounded-full relative transition-colors disabled:opacity-60"
                style={{ background: row.is_active ? s.success : s.border }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: row.is_active ? 18 : 2 }}
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: s.accent }}>
                  {row.tag}
                </div>
                <div className="text-sm" style={{ color: s.text }}>{row.text}</div>
                {row.attr && <div className="text-xs mt-1" style={{ color: s.sub }}>{row.attr}</div>}
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="p-2 rounded-lg hover:bg-black/5"
                  style={{ color: s.sub }}
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteRow(row)}
                  disabled={savingId === row.id}
                  className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-60"
                  style={{ color: s.danger }}
                  title="Delete"
                >
                  {savingId === row.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- bulk upload modal --- */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: dark ? '#1c1c1e' : '#ffffff' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: s.text }}>Bulk upload reflections</h2>
              <button
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  setUploadPreview(null);
                  setUploadFileName('');
                }}
                style={{ color: s.sub }}
              >
                <X size={18} />
              </button>
            </div>

            {!uploadPreview && (
              <>
                <p className="text-sm mb-3" style={{ color: s.sub }}>
                  Upload a CSV with columns <code>tag</code>, <code>text</code>, and optionally <code>attr</code>.
                  Column names aren't case-sensitive.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="text-sm font-medium underline mb-4"
                  style={{ color: s.accent }}
                >
                  Download a template CSV
                </button>
                <div
                  className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer"
                  style={{ borderColor: s.border }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  <Upload size={24} className="mx-auto mb-2" style={{ color: s.sub }} />
                  <p className="text-sm" style={{ color: s.text }}>Click to choose a file, or drag one here</p>
                  <p className="text-xs mt-1" style={{ color: s.sub }}>.csv files only</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              </>
            )}

            {uploadPreview && (
              <>
                <p className="text-sm mb-3" style={{ color: s.text }}>
                  <b>{uploadFileName}</b> — {uploadPreview.valid.length} row{uploadPreview.valid.length === 1 ? '' : 's'} ready to import
                  {uploadPreview.errors.length > 0 ? `, ${uploadPreview.errors.length} skipped` : ''}.
                </p>

                {uploadPreview.errors.length > 0 && (
                  <div className="rounded-lg p-3 mb-3 text-xs" style={{ background: dark ? 'rgba(229,72,77,0.12)' : '#fef2f2', color: s.danger }}>
                    <p className="font-semibold mb-1">Rows that will be skipped:</p>
                    <ul className="space-y-0.5">
                      {uploadPreview.errors.slice(0, 8).map((e, i) => (
                        <li key={i}>Line {e.line}: {e.reason}</li>
                      ))}
                      {uploadPreview.errors.length > 8 && <li>…and {uploadPreview.errors.length - 8} more</li>}
                    </ul>
                  </div>
                )}

                {uploadPreview.valid.length > 0 && (
                  <div className="rounded-lg border max-h-56 overflow-y-auto mb-4" style={{ borderColor: s.border }}>
                    {uploadPreview.valid.slice(0, 20).map((r, i) => (
                      <div key={i} className="px-3 py-2 text-xs" style={{ borderTop: i === 0 ? 'none' : `1px solid ${s.border}` }}>
                        <span className="font-semibold" style={{ color: s.accent }}>{r.tag}</span>
                        <span style={{ color: s.text }}> — {r.text.slice(0, 80)}{r.text.length > 80 ? '…' : ''}</span>
                      </div>
                    ))}
                    {uploadPreview.valid.length > 20 && (
                      <div className="px-3 py-2 text-xs" style={{ color: s.sub, borderTop: `1px solid ${s.border}` }}>
                        …and {uploadPreview.valid.length - 20} more rows
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmUpload}
                    disabled={uploadPreview.valid.length === 0 || uploading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: s.accent }}
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Import {uploadPreview.valid.length} row{uploadPreview.valid.length === 1 ? '' : 's'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadPreview(null);
                      setUploadFileName('');
                    }}
                    className="px-3.5 py-2 rounded-lg text-sm font-medium border"
                    style={{ borderColor: s.border, color: s.text }}
                  >
                    Choose a different file
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
