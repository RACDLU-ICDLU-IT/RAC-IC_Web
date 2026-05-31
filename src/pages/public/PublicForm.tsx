import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForms } from '../../hooks/useForms';
import { useFormResponses } from '../../hooks/useFormResponses';
import { FullForm, FormField } from '../../types/forms';
import { PublicField } from '../../components/forms/PublicField';
import { useToast } from '../../hooks/useToast';
import { useTenant } from '../../hooks/useTenant';
import { AlertCircle, CheckCircle2, ShieldAlert, FileText, Loader2, HeartHandshake } from 'lucide-react';

export default function PublicForm() {
  const { tenant } = useTenant();
  const { slug } = useParams<{ slug: string }>();
  const { fetchFormByPermalink } = useForms();
  const { submitResponse, loading: submitting } = useFormResponses();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FullForm | null>(null);
  
  // Response Submitting state
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const loadForm = async () => {
      setLoading(true);
      const res = await fetchFormByPermalink(slug);
      setForm(res);
      setLoading(false);
    };

    loadForm();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-accent mb-3" size={36} />
        <p className="text-gray-500 font-medium text-sm">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-sm">
          <AlertCircle size={44} className="text-red-500 mx-auto mb-3" />
          <h3 className="font-heading font-extrabold text-primary text-lg">Form Not Found</h3>
          <p className="text-gray-400 text-xs mt-2">The link you requested is invalid or the form structure was removed by an administrator.</p>
          <Link to="/" className="inline-block mt-5 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-neutral-850 transition">
            Club Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Draft mode protection
  if (!form.is_published) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-sm">
          <ShieldAlert size={44} className="text-amber-500 mx-auto mb-3" />
          <h3 className="font-heading font-extrabold text-primary text-lg font-bold">Unpublished Draft</h3>
          <p className="text-gray-400 text-xs mt-2">This form is currently in draft mode and is not accepting public user submissions yet.</p>
        </div>
      </div>
    );
  }

  const handleFieldAnswer = (fieldId: string, val: any) => {
    setAnswers({
      ...answers,
      [fieldId]: val,
    });
  };

  // Completion percentage
  const calculateProgressPercent = () => {
    const fieldsToFill = form.fields.filter(f => f.type !== 'section' && f.type !== 'image');
    if (fieldsToFill.length === 0) return 100;

    const requiredFields = fieldsToFill.filter(f => f.required);
    if (requiredFields.length === 0) {
      // If there are no required fields, count filled vs total
      const filledCount = fieldsToFill.filter(f => answers[f.id] !== undefined && answers[f.id] !== '').length;
      return Math.round((filledCount / fieldsToFill.length) * 100);
    }

    // Measure required answers progress
    const filledRequired = requiredFields.filter(f => {
      const v = answers[f.id];
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (typeof v === 'object' && Object.keys(v).length === 0) return false;
      return true;
    }).length;

    return Math.round((filledRequired / requiredFields.length) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Ensure all required fields have answers
    const fieldsToFill = form.fields.filter(f => f.type !== 'section' && f.type !== 'image');
    const missingRequired = fieldsToFill.filter(f => f.required).some(f => {
      const v = answers[f.id];
      if (v === undefined || v === null || v === '') return true;
      if (Array.isArray(v) && v.length === 0) return true;
      if (typeof v === 'object' && Object.keys(v).length === 0) return true;
      return false;
    });

    if (missingRequired) {
      setSubmitError('Please fill in all required question boxes before submitting.');
      addToast('Mandatory questions have been left unfilled.', 'error');
      return;
    }

    const payload = Object.entries(answers).map(([fieldId, value]) => ({
      fieldId,
      value,
    }));

    const responseId = await submitResponse(form.id, form.collect_email ? email : undefined, payload);
    if (responseId) {
      setSubmitted(true);
      addToast('Form response submitted successfully!', 'success');
    } else {
      setSubmitError('Failed to record submission details to database.');
    }
  };

  const progress = calculateProgressPercent();

  // SUCCESS SUBMIT COMPONENT
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-100 shadow-sm max-w-lg w-full flex flex-col items-center">
          <CheckCircle2 size={56} className="text-green-500 mb-4 animate-bounce" />
          <h2 className="font-heading font-extrabold text-primary text-xl md:text-2xl tracking-tight">Submission Completed</h2>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed whitespace-pre-line">
            {form.confirmation_message || 'Thank you for your response!'}
          </p>

          <div className="flex gap-3 justify-center mt-8 w-full">
            {form.allow_multiple_responses && (
              <button
                onClick={() => {
                  setAnswers({});
                  setEmail('');
                  setSubmitted(false);
                }}
                className="flex-1 px-5 py-2.5 rounded-xl border border-gray-250 text-gray-700 font-bold hover:bg-gray-50 text-sm transition"
              >
                Submit another response
              </button>
            )}
            <Link
              to="/"
              className="flex-1 px-5 py-2.5 bg-accent text-primary font-bold rounded-xl text-sm hover:bg-neutral-850 hover:text-white transition"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-10 px-4 md:py-16">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Banner/Title Frame */}
        <div className="bg-white rounded-2xl border-t-8 border-t-accent border border-gray-100 p-6 md:p-8 shadow-sm relative overflow-hidden">
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-primary tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-500 text-xs md:text-sm mt-2.5 leading-relaxed">
              {form.description}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-gray-100 pt-4 mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>Powered by {tenant.shortName} surveys portal</span>
            <span>•</span>
            <span className="text-green-600">Secure session</span>
          </div>
        </div>

        {/* Dynamic progress bar indicator */}
        {form.show_progress_bar && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 mb-2 pl-1 uppercase tracking-wider">
              <span>Required filling progression</span>
              <span className="font-mono text-primary font-bold text-sm">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collecting email input node */}
          {form.collect_email && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 shadow-sm">
              <label className="block text-base font-medium text-gray-900 mb-1">
                Respondent Email Address <span className="text-red-500 font-bold">*</span>
              </label>
              <span className="text-xs text-gray-400 mb-3 block">Please provide a valid email to track attendance records.</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-accent focus:bg-white focus:outline-none transition-colors bg-gray-50/50"
                placeholder="your.email@example.com"
              />
            </div>
          )}

          {/* Form Fields nodes rendering */}
          {form.fields.map((field) => (
            <PublicField
              key={field.id}
              field={field}
              formId={form.id}
              value={answers[field.id]}
              onChange={(v) => handleFieldAnswer(field.id, v)}
            />
          ))}

          {/* Verification / error lines */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3 text-xs md:text-sm">
              <AlertCircle className="shrink-0 text-red-600" size={18} />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submission action buttons */}
          <div className="flex justify-end gap-3 items-center">
            <Link to="/" className="text-xs font-bold text-gray-400 hover:text-gray-600 transition tracking-wider uppercase pr-1.5">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-accent hover:bg-neutral-850 hover:text-white text-primary font-bold rounded-xl text-center text-sm shadow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin text-primary" size={16} />
                  <span>Recording submission...</span>
                </>
              ) : (
                <span>Submit Response</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
