import React, { useEffect, useState } from 'react';
import { useForms } from '../../hooks/useForms';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { Form } from '../../types/forms';
import {
  FileText, Plus, Edit3, HeartHandshake, Eye, BarChart2, Trash2,
  ExternalLink, Copy, AlertCircle, Link as LinkIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

export default function AdminForms() {
  const { adminTenant: tenant } = useAdminTenant();
  const { getFormWithResponsesCount, deleteForm, createForm, verifyPermalinkUnique, loading } = useForms();
  const [forms, setForms] = useState<(Form & { response_count: number })[]>([]);
  const [isOpenNewModal, setIsOpenNewModal] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugUnique, setSlugUnique] = useState<boolean | null>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Create Form Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [permalink, setPermalink] = useState('');

  const loadAllForms = async () => {
    const list = await getFormWithResponsesCount();
    setForms(list as any[]);
  };

  useEffect(() => {
    loadAllForms();
  }, [getFormWithResponsesCount]);

  // Slugify helper
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Auto slugify
    const slug = slugify(newTitle);
    setPermalink(slug);
    checkSlugUniqueness(slug);
  };

  const checkSlugUniqueness = async (slug: string) => {
    if (!slug) {
      setSlugUnique(null);
      return;
    }
    setIsCheckingSlug(true);
    const isUnique = await verifyPermalinkUnique(slug);
    setSlugUnique(isUnique);
    setIsCheckingSlug(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !permalink.trim()) return;

    if (slugUnique === false) {
      addToast('The form URL identifier is already in use.', 'error');
      return;
    }

    const created = await createForm({
      title,
      description,
      permalink,
      collect_email: true,
      allow_multiple_responses: false,
      show_progress_bar: true,
      confirmation_message: 'Thank you for your response!'
    });

    if (created) {
      setIsOpenNewModal(false);
      navigate(`/admin/forms/${created.id}/edit`);
    }
  };

  const handleDelete = async (id: string, formTitle: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${formTitle}"? This cannot be undone and will delete all responses.`)) {
      const ok = await deleteForm(id);
      if (ok) {
        await loadAllForms();
      }
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/forms/${slug}`;
    navigator.clipboard.writeText(url);
    addToast('Public form link copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Header section with Stats counts */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-primary tracking-tight">Form Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Design registration portals, feedback inquiries, and custom club forms.</p>
        </div>
        <button
          onClick={() => {
            setTitle('');
            setDescription('');
            setPermalink('');
            setSlugUnique(null);
            setIsOpenNewModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-primary rounded-xl font-bold text-sm shadow hover:bg-neutral-800 hover:text-white transition-all transform hover:scale-102"
        >
          <Plus size={16} />
          <span>New Form</span>
        </button>
      </div>

      {loading && forms.length === 0 ? (
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-full" />
          <div className="h-28 bg-gray-100 rounded-lg animate-pulse w-full" />
          <div className="h-28 bg-gray-100 rounded-lg animate-pulse w-full" />
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-heading font-bold text-gray-900 text-lg">No custom forms found</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">Create surveys, member feedback portals, or signup forms to display here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-55 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Title & Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">URL Identifier</th>
                  <th className="px-6 py-4 text-center">Responses</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5 max-w-md">
                      <div className="font-semibold text-gray-950 text-base">{form.title}</div>
                      {form.description && (
                        <div className="text-gray-400 text-xs truncate mt-0.5">{form.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        form.is_published
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {form.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <LinkIcon size={12} />
                        <span className="font-mono text-gray-600">/forms/{form.permalink}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(form.permalink)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors"
                          title="Copy Link URL"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center font-bold font-mono h-6 px-2.5 rounded-full bg-accent/15 text-primary text-xs">
                        {form.response_count}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <Link
                          to={`/admin/forms/${form.id}/edit`}
                          className="p-2 hover:bg-gray-100 hover:text-primary rounded-lg text-gray-400 transition-colors"
                          title="Edit form structure"
                        >
                          <Edit3 size={16} />
                        </Link>
                        <Link
                          to={`/admin/forms/${form.id}/responses`}
                          className="p-2 hover:bg-gray-100 hover:text-accent rounded-lg text-gray-400 transition-colors"
                          title="View submission responses"
                        >
                          <BarChart2 size={16} />
                        </Link>
                        <a
                          href={`/forms/${form.permalink}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 hover:bg-gray-100 hover:text-blue-600 rounded-lg text-gray-400 transition-colors"
                          title="Open public form"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          onClick={() => handleDelete(form.id, form.title)}
                          className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW FORM MODAL */}
      {isOpenNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full flex flex-col p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-heading font-extrabold text-gray-900 text-lg">Create New Form</h3>
                <p className="text-xs text-gray-400">Initialize form settings before adding field items.</p>
              </div>
              <button
                onClick={() => setIsOpenNewModal(false)}
                className="p-1 px-1.5 bg-gray-55 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Form Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent focus:bg-white focus:outline-none text-sm font-medium transition-all"
                  placeholder="e.g. Autumn Membership Drive 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">URL Identifier (permalink)</label>
                <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden border border-gray-200 focus-within:border-accent focus-within:bg-white transition-all">
                  <span className="pl-3.5 pr-1.5 text-xs text-gray-400 font-mono select-none">/forms/</span>
                  <input
                    type="text"
                    required
                    value={permalink}
                    onChange={(e) => {
                      const slug = slugify(e.target.value);
                      setPermalink(slug);
                      checkSlugUniqueness(slug);
                    }}
                    className="flex-1 py-2.5 pr-3.5 bg-transparent focus:outline-none text-sm font-mono text-gray-700"
                    placeholder="membership-2026"
                  />
                </div>
                {permalink && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {isCheckingSlug ? (
                      <span className="text-gray-400">Checking availability...</span>
                    ) : slugUnique === true ? (
                      <span className="text-green-600 font-medium">✓ Identifier available</span>
                    ) : slugUnique === false ? (
                      <span className="text-red-500 font-semibold flex items-center gap-1">
                        <AlertCircle size={12} /> Already taken or invalid
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Short Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent focus:bg-white focus:outline-none text-sm transition-all h-24 resize-none"
                  placeholder="Summarize the core goal of this form for submitters..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpenNewModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCheckingSlug || slugUnique === false || !title.trim()}
                  className="px-5 py-2 bg-accent text-primary font-bold rounded-xl text-sm shadow hover:bg-neutral-800 hover:text-white transition disabled:opacity-50"
                >
                  Build Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
