import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForms } from '../../hooks/useForms';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useFormResponses } from '../../hooks/useFormResponses';
import { Form, FormField, FormResponse, FormAnswer } from '../../types/forms';
import { exportResponsesToExcel } from '../../utils/formExport';
import {
  ChevronLeft, BarChart2, Calendar, Mail, FileSpreadsheet, Eye,
  X, Filter, Loader2, ArrowUpDown, ChevronDown, RefreshCw
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { useToast } from '../../hooks/useToast';

export default function AdminFormResponses() {
  const { adminTenant: tenant } = useAdminTenant();
  const { id } = useParams<{ id: string }>();
  const { fetchFullForm } = useForms();
  const { fetchResponsesForForm, loading: responsesLoading } = useFormResponses();
  const { addToast } = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [answers, setAnswers] = useState<FormAnswer[]>([]);
  
  // Filtering & detail records
  const [filteredResponses, setFilteredResponses] = useState<FormResponse[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);

  const loadData = async () => {
    if (!id) return;
    const fullForm = await fetchFullForm(id);
    if (fullForm) {
      setForm(fullForm);
      setFields(fullForm.fields || []);
    }

    const { responses: respData, answers: ansData } = await fetchResponsesForForm(id);
    setResponses(respData);
    setAnswers(ansData);
    setFilteredResponses(respData);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Apply filters
  useEffect(() => {
    if (responses.length === 0) {
      setFilteredResponses([]);
      return;
    }

    let result = [...responses];

    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(r => new Date(r.submitted_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      // To include the entire end day, we adjust to end of day
      end.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.submitted_at) <= end);
    }

    setFilteredResponses(result);
  }, [startDate, endDate, responses]);

  const handleExport = () => {
    if (!form) return;
    if (responses.length === 0) {
      addToast('No responses available to export.', 'error');
      return;
    }
    exportResponsesToExcel(form, fields, filteredResponses, answers);
    addToast('Excel sheets generated and downloaded successfully!', 'success');
  };

  const getAnswerForField = (responseId: string, fieldId: string) => {
    const answer = answers.find(a => a.response_id === responseId && a.field_id === fieldId);
    if (!answer || answer.value === undefined || answer.value === null) return '-';

    if (Array.isArray(answer.value)) {
      return answer.value.join(', ');
    }

    if (typeof answer.value === 'object') {
      return Object.entries(answer.value)
        .map(([r, c]) => `${r}: ${c}`)
        .join(', ');
    }

    return String(answer.value);
  };

  const getAnswerForFieldRaw = (responseId: string, fieldId: string) => {
    return answers.find(a => a.response_id === responseId && a.field_id === fieldId)?.value;
  };

  // Stats calculation
  const totalSubmits = responses.length;
  const lastSubmitDate = responses.length > 0
    ? format(new Date(responses[0].submitted_at), 'yyyy-MM-dd HH:mm')
    : 'No submissions yet';

  const visibleFields = fields.filter(f => f.type !== 'section' && f.type !== 'image');

  return (
    <div className="space-y-6">
      {/* Header bar back-controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/forms" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-primary tracking-tight">Form Responses</h1>
            <p className="text-gray-400 text-xs mt-0.5">Form: <strong className="text-gray-600">{form?.title || 'Loading'}</strong></p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={responsesLoading}
            className="p-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
            title="Refresh submission list"
          >
            <RefreshCw size={18} className={responsesLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={responses.length === 0}
            className="px-5 py-2.5 bg-accent text-primary font-bold rounded-xl text-sm shadow hover:bg-neutral-800 hover:text-white transition inline-flex items-center gap-2 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Metrics bento grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Submissions</div>
          <div className="text-3xl font-heading font-extrabold text-primary">{totalSubmits}</div>
          <p className="text-[10px] text-gray-400 mt-1">Sum of completed response operations.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Completion Rate</div>
          <div className="text-3xl font-heading font-extrabold text-emerald-600">100%</div>
          <p className="text-[10px] text-gray-400 mt-1">Submitted forms are fully validated.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Last Submission Action</div>
          <div className="text-lg font-bold text-gray-950 mt-1.5 truncate">{lastSubmitDate}</div>
          <p className="text-[10px] text-gray-400 mt-1">Most recent database response activity.</p>
        </div>
      </div>

      {/* Date Filter Layout Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-gray-500 font-medium text-xs uppercase pl-1">
          <Filter size={14} />
          <span>Filter Submissions</span>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1 md:max-w-md">
          <div className="flex items-center bg-gray-50 border border-gray-250 rounded-xl px-2.5">
            <span className="text-[10px] font-bold text-gray-400 mr-2">START</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-gray-700 py-2 w-full"
            />
          </div>
          <div className="flex items-center bg-gray-50 border border-gray-250 rounded-xl px-2.5">
            <span className="text-[10px] font-bold text-gray-400 mr-2">END</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-gray-700 py-2 w-full"
            />
          </div>
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs text-accent font-bold hover:underline py-2 pr-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Primary submissions listing table */}
      {responsesLoading && filteredResponses.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Loader2 className="animate-spin mx-auto mb-2" />
          <span>Filing submisson logs...</span>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="font-medium">No response rows match your specified filter range.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-55 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Respondent</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  {visibleFields.slice(0, 3).map(field => (
                    <th key={field.id} className="px-6 py-4 max-w-[160px] truncate">{field.label}</th>
                  ))}
                  <th className="px-6 py-4 text-right">Expansion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-55 text-gray-700">
                {filteredResponses.map((resp) => (
                  <tr
                    key={resp.id}
                    onClick={() => setSelectedResponse(resp)}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-950">
                      {resp.respondent_email || 'Anonymous responder'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {format(new Date(resp.submitted_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    {visibleFields.slice(0, 3).map(field => (
                      <td key={field.id} className="px-6 py-4 max-w-[160px] truncate">
                        {getAnswerForField(resp.id, field.id)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResponse(resp);
                        }}
                        className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-accent rounded-lg"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / SUBMISSION MODAL POPUP */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full max-w-xl w-full p-6 flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-300">
            {/* Modal Title bar */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">Submission Details</span>
                <h3 className="font-heading font-extrabold text-primary text-lg truncate mt-0.5">
                  {selectedResponse.respondent_email || 'Anonymous Participant'}
                </h3>
                <span className="text-[10px] font-mono text-gray-400">
                  ID: {selectedResponse.id} • {format(new Date(selectedResponse.submitted_at), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                className="p-1.5 hover:bg-gray-55 rounded text-gray-400 hover:text-gray-700 transition"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* Vertical QA pair scrolls */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
              {visibleFields.map((field) => {
                const answerValue = getAnswerForFieldRaw(selectedResponse.id, field.id);
                return (
                  <div key={field.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide leading-tight">
                      Q: {field.label}
                    </span>
                    <div className="text-sm text-gray-900 font-medium">
                      {answerValue === undefined || answerValue === null ? (
                        <span className="text-gray-400 italic">No response submitted</span>
                      ) : field.type === 'file_upload' && typeof answerValue === 'string' && answerValue.startsWith('http') ? (
                        <a
                          href={answerValue}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline hover:text-neutral-900 font-bold inline-flex items-center gap-1"
                        >
                          View response attachment link →
                        </a>
                      ) : Array.isArray(answerValue) ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {answerValue.map((val, idx) => (
                            <span key={idx} className="bg-white border border-gray-200 px-2.5 py-0.5 rounded text-xs">
                              {val}
                            </span>
                          ))}
                        </div>
                      ) : typeof answerValue === 'object' ? (
                        <div className="space-y-1 mt-1 font-mono text-xs text-gray-700">
                          {Object.entries(answerValue).map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-dashed border-gray-100 py-0.5">
                              <span className="font-semibold">{k}:</span>
                              <span>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="whitespace-pre-line">{String(answerValue)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail action footer */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedResponse(null)}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-neutral-800 transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
