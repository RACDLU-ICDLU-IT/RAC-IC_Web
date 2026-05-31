import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForms } from '../../hooks/useForms';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { FormField, FormSection, FieldType, Form } from '../../types/forms';
import { FieldPalette } from '../../components/forms/FieldPalette';
import { FormCanvas } from '../../components/forms/FormCanvas';
import { FieldSettings } from '../../components/forms/FieldSettings';
import { useToast } from '../../hooks/useToast';
import {
  ChevronLeft, Eye, Settings, AlertCircle, Sparkles, Check, Loader2, Link as LinkIcon, Globe, CloudLightning
} from 'lucide-react';

export default function AdminFormBuilder() {
  const { adminTenant: tenant } = useAdminTenant();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchFullForm, updateFormMetadata, saveFormStructure, verifyPermalinkUnique } = useForms();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);

  // Form Configurations
  const [formConfig, setFormConfig] = useState<Partial<Form>>({
    title: 'Untitled Form',
    description: '',
    permalink: '',
    is_published: false,
    collect_email: true,
    allow_multiple_responses: false,
    show_progress_bar: true,
    confirmation_message: 'Thank you for your response!',
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  // Modals / Settings config
  const [isOpenSettingsModal, setIsOpenSettingsModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Slug editable validation
  const [slug, setSlug] = useState('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugUnique, setSlugUnique] = useState<boolean | null>(true);

  useEffect(() => {
    if (!id) return;

    const loadForm = async () => {
      setLoading(true);
      const res = await fetchFullForm(id);
      if (res) {
        setFormConfig({
          id: res.id,
          title: res.title,
          description: res.description,
          permalink: res.permalink,
          is_published: res.is_published,
          collect_email: res.collect_email,
          allow_multiple_responses: res.allow_multiple_responses,
          show_progress_bar: res.show_progress_bar,
          confirmation_message: res.confirmation_message,
        });
        setFields(res.fields || []);
        setSections(res.sections || []);
        setSlug(res.permalink);
      } else {
        navigate('/admin/forms');
      }
      setLoading(false);
    };

    loadForm();
  }, [id, fetchFullForm, navigate]);

  // Debounced Auto-save action
  useEffect(() => {
    if (loading || !id) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');
    const delayDebounce = setTimeout(async () => {
      setSaveStatus('saving');
      
      const successMeta = await updateFormMetadata(id, formConfig);
      const successStruct = await saveFormStructure(id, sections, fields);

      if (successMeta && successStruct) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('dirty');
        addToast('Failed to auto-save adjustments.', 'error');
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [fields, sections, formConfig, id, loading, updateFormMetadata, saveFormStructure, addToast]);

  const handleAddField = (type: FieldType) => {
    if (!id) return;
    const newField: FormField = {
      id: crypto.randomUUID(),
      form_id: id,
      section_id: null,
      type,
      label: `New ${type.replace(/_/g, ' ')}`,
      description: '',
      required: false,
      position: fields.length,
      placeholder: '',
      options: type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown'
        ? { choices: ['Option 1', 'Option 2'], allowOther: false }
        : type === 'multiple_choice_grid' || type === 'checkbox_grid'
        ? { rows: ['Row 1', 'Row 2'], columns: ['Column 1', 'Column 2'] }
        : null,
      image_url: '',
      scale_min: 1,
      scale_max: 5,
      scale_min_label: 'Low',
      scale_max_label: 'High',
    };

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setSelectedFieldId(newField.id);
  };

  const handleAddSection = (index: number) => {
    if (!id) return;

    // Create a new visual section divider item in fields list
    const newSectionId = crypto.randomUUID();
    const newSectionField: FormField = {
      id: newSectionId,
      form_id: id,
      section_id: null,
      type: 'section',
      label: 'New Section Break',
      description: 'Fill in details if required...',
      required: false,
      position: index,
    };

    // Make associated database form_section Row
    const newDbSection: FormSection = {
      id: newSectionId,
      form_id: id,
      title: 'New Section',
      description: '',
      position: sections.length,
    };

    const updatedFields = [...fields];
    updatedFields.splice(index, 0, newSectionField);
    
    // Readjust positions
    const repositioned = updatedFields.map((f, pos) => ({ ...f, position: pos }));

    setFields(repositioned);
    setSections([...sections, newDbSection]);
    setSelectedFieldId(newSectionField.id);
    addToast('Section divider inserted inside form.', 'success');
  };

  const handleUpdateField = (updated: FormField) => {
    setFields(fields.map(f => f.id === updated.id ? updated : f));
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleDuplicateField = (fieldId: string) => {
    const src = fields.find(f => f.id === fieldId);
    if (!src) return;

    const dup: FormField = {
      ...src,
      id: crypto.randomUUID(),
      label: `${src.label} (Copy)`,
      position: fields.length,
    };

    setFields([...fields, dup]);
    setSelectedFieldId(dup.id);
    addToast('Field cloned successfully.', 'success');
  };

  const handleReorderFields = (startIndex: number, endIndex: number) => {
    const updated = [...fields];
    const [removed] = updated.splice(startIndex, 1);
    updated.splice(endIndex, 0, removed);

    // Readjust indices positions
    const reordered = updated.map((f, idx) => ({
      ...f,
      position: idx,
    }));

    setFields(reordered);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSlugChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const slugVal = slugify(e.target.value);
    setSlug(slugVal);
    
    if (!slugVal) {
      setSlugUnique(null);
      return;
    }

    setIsCheckingSlug(true);
    const unique = await verifyPermalinkUnique(slugVal, id);
    setSlugUnique(unique);
    setIsCheckingSlug(false);

    if (unique) {
      setFormConfig({ ...formConfig, permalink: slugVal });
    }
  };

  const selectedField = fields.find(f => f.id === selectedFieldId) || null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 min-h-[50vh]">
        <Loader2 className="animate-spin text-accent mb-4" size={40} />
        <p className="text-gray-500 font-medium">Booting custom Form Builder session...</p>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/forms/${formConfig.permalink}`;

  return (
    <div className="space-y-6">
      {/* Top action bar config */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/forms" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formConfig.title || ''}
                onChange={(e) => setFormConfig({ ...formConfig, title: e.target.value })}
                className="text-lg font-bold text-gray-950 focus:outline-none focus:border-b border-accent border-b-transparent bg-transparent"
                placeholder="Form Name"
              />
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
                saveStatus === 'saving' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
              }`}>
                {saveStatus === 'saved' && <Check size={10} />}
                {saveStatus === 'saving' && <Loader2 className="animate-spin" size={10} />}
                {saveStatus === 'dirty' && <AlertCircle size={10} />}
                {saveStatus === 'saved' ? 'Autosaved' : saveStatus === 'saving' ? 'Autosaving...' : 'Unsaved Changes'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <LinkIcon size={12} />
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                className="font-mono text-gray-500 bg-transparent focus:outline-none border-b border-b-transparent focus:border-accent"
                placeholder="slug"
              />
              {isCheckingSlug ? (
                <span className="text-[10px] text-gray-400">...</span>
              ) : slugUnique === false ? (
                <span className="text-[10px] text-red-500 font-bold">URI Conflict!</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings trigger */}
          <button
            onClick={() => setIsOpenSettingsModal(true)}
            className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
            title="Form Settings"
          >
            <Settings size={18} />
          </button>

          {/* Public Preview */}
          <a
            href={`/forms/${formConfig.permalink}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 text-sm font-bold inline-flex items-center gap-1.5 transition"
          >
            <Eye size={16} />
            <span>Preview</span>
          </a>

          {/* Toggle publishing */}
          <button
            onClick={() => {
              const newPublished = !formConfig.is_published;
              setFormConfig({ ...formConfig, is_published: newPublished });
              addToast(
                newPublished
                  ? 'Form published! Respondents can now access and submit.'
                  : 'Form status reverted to draft.',
                'success'
              );
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition ${
              formConfig.is_published
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
            }`}
          >
            <Globe size={16} />
            <span>{formConfig.is_published ? 'Unpublish' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Primary form panels stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Field palette selection (takes 3 cols) */}
        <div className="lg:col-span-3">
          <FieldPalette onAddField={handleAddField} />
        </div>

        {/* Center: Interactive Form Canvas layout (takes 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <textarea
              value={formConfig.description || ''}
              onChange={(e) => setFormConfig({ ...formConfig, description: e.target.value })}
              className="w-full text-sm text-gray-500 focus:outline-none focus:border-b border-accent border-b-transparent resize-none h-16 bg-transparent"
              placeholder="Short Description of form goals..."
            />
          </div>

          <FormCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onDuplicateField={handleDuplicateField}
            onReorderFields={handleReorderFields}
            onAddSection={handleAddSection}
          />
        </div>

        {/* Right Side: Visual configurations settings parameters (takes 4 cols) */}
        <div className="lg:col-span-4">
          <FieldSettings field={selectedField} onUpdate={handleUpdateField} />
        </div>
      </div>

      {/* METADATA SETTINGS MODAL */}
      {isOpenSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full flex flex-col p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-heading font-extrabold text-gray-900 text-lg">Form Preferences</h3>
                <p className="text-xs text-gray-400">Alter accessibility and progress meters for submitters.</p>
              </div>
              <button
                onClick={() => setIsOpenSettingsModal(false)}
                className="p-1 px-1.5 bg-gray-55 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">Collect Respondent Email</span>
                  <span className="text-xs text-gray-400">Email inputs are gathered and validated automatically.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formConfig.collect_email ?? true}
                  onChange={(e) => setFormConfig({ ...formConfig, collect_email: e.target.checked })}
                  className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">Allow Multi-submissions</span>
                  <span className="text-xs text-gray-400">Respondents can fill and submit responses again.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formConfig.allow_multiple_responses ?? false}
                  onChange={(e) => setFormConfig({ ...formConfig, allow_multiple_responses: e.target.checked })}
                  className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">Display Progress Bar</span>
                  <span className="text-xs text-gray-400">Shows relative filling progress indicators.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formConfig.show_progress_bar ?? true}
                  onChange={(e) => setFormConfig({ ...formConfig, show_progress_bar: e.target.checked })}
                  className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5 py-1">
                <span className="text-sm font-semibold text-gray-800 block">Confirmation Message</span>
                <textarea
                  value={formConfig.confirmation_message || ''}
                  onChange={(e) => setFormConfig({ ...formConfig, confirmation_message: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent focus:bg-white focus:outline-none text-sm transition-all h-20 resize-none"
                  placeholder="Thank you for your response!"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenSettingsModal(false)}
                  className="px-5 py-2.5 bg-accent text-primary font-bold rounded-xl text-sm hover:bg-neutral-800 hover:text-white transition"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
