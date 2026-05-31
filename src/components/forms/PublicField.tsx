import React, { useState } from 'react';
import { FormField } from '../../types/forms';
import { Upload, Check, Loader2 } from 'lucide-react';

interface PublicFieldProps {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  formId: string;
}

export const PublicField: React.FC<PublicFieldProps> = ({
  field,
  value,
  onChange,
  formId,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const choices = field.options?.choices || [];
  const rows = field.options?.rows || [];
  const cols = field.options?.columns || [];

  // Handle choice values
  const handleOptionSelect = (choice: string) => {
    onChange(choice);
  };

  const handleCheckboxToggle = (choice: string) => {
    const current = Array.isArray(value) ? value : [];
    if (current.includes(choice)) {
      onChange(current.filter((item: string) => item !== choice));
    } else {
      onChange([...current, choice]);
    }
  };

  const handleOtherChoiceChange = (text: string) => {
    // Other values are prefix-identified or stored in an 'Other: ' format
    onChange(`Other: ${text}`);
  };

  // Grid handler - stores value as Record<row, colValue> or Record<row, colValues[]>
  const handleGridSelect = (row: string, col: string, isCheckbox = false) => {
    const currentGrid = typeof value === 'object' && value !== null ? { ...value } : {};
    
    if (isCheckbox) {
      const rowVals = Array.isArray(currentGrid[row]) ? [...currentGrid[row]] : [];
      if (rowVals.includes(col)) {
        currentGrid[row] = rowVals.filter((v: string) => v !== col);
      } else {
        currentGrid[row] = [...rowVals, col];
      }
    } else {
      currentGrid[row] = col;
    }
    onChange(currentGrid);
  };

  // Direct Cloudinary upload
  const handleRespondentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset || cloudName === 'demo') {
      alert('File upload is not configured on this platform.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `form-responses/${formId}`);

      setUploadProgress(45);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      if (!data.secure_url) {
        console.error('Cloudinary response missing secure_url:', data);
        throw new Error(data.error?.message || 'Upload succeeded but no URL returned. Check your upload preset is set to Unsigned in Cloudinary.');
      }

      setUploadProgress(100);
      onChange(data.secure_url);
    } catch (err: any) {
      console.error('File upload failed:', err);
      alert(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const formLabelClass = 'block text-base font-medium text-gray-900 mb-1.5';
  const descriptionClass = 'text-xs text-gray-400 mb-3 block';
  const genericInputClass = 'w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-accent focus:bg-white focus:outline-none transition-colors bg-gray-50/50';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 shadow-sm">
      {/* Label and description */}
      {field.type !== 'section' && field.type !== 'image' && (
        <div>
          <label className={formLabelClass}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
          {field.description && <span className={descriptionClass}>{field.description}</span>}
        </div>
      )}

      {/* Render field layout based on type */}
      <div className="mt-2 text-sm text-gray-800">
        {field.type === 'short_answer' && (
          <input
            type="text"
            required={field.required}
            placeholder={field.placeholder || 'Your answer'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={genericInputClass}
          />
        )}

        {field.type === 'paragraph' && (
          <textarea
            required={field.required}
            placeholder={field.placeholder || 'Your answer'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={genericInputClass + ' h-28 resize-none'}
          />
        )}

        {field.type === 'multiple_choice' && (
          <div className="flex flex-col gap-3">
            {choices.map((choice, i) => {
              const isSelected = value === choice;
              return (
                <label key={i} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="radio"
                    name={`field-${field.id}`}
                    checked={isSelected}
                    onChange={() => handleOptionSelect(choice)}
                    className="w-4 h-4 text-accent border-gray-300 focus:ring-accent accent-accent"
                  />
                  <span>{choice}</span>
                </label>
              );
            })}
            
            {field.options?.allowOther && (
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="radio"
                    name={`field-${field.id}`}
                    checked={typeof value === 'string' && value.startsWith('Other: ')}
                    onChange={() => handleOtherChoiceChange('')}
                    className="w-4 h-4 text-accent border-gray-300 focus:ring-accent accent-accent"
                  />
                  <span className="text-gray-500 text-sm">Other:</span>
                </label>
                {(typeof value === 'string' && value.startsWith('Other: ')) && (
                  <input
                    type="text"
                    defaultValue={value.replace('Other: ', '')}
                    onChange={(e) => handleOtherChoiceChange(e.target.value)}
                    className="flex-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-accent"
                    placeholder="Provide details..."
                  />
                )}
              </div>
            )}
          </div>
        )}

        {field.type === 'checkboxes' && (
          <div className="flex flex-col gap-3">
            {choices.map((choice, i) => {
              const isChecked = Array.isArray(value) && value.includes(choice);
              return (
                <label key={i} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxToggle(choice)}
                    className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent"
                  />
                  <span>{choice}</span>
                </label>
              );
            })}

            {field.options?.allowOther && (
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.some((v: string) => v.startsWith('Other: '))}
                    onChange={() => {
                      const current = Array.isArray(value) ? value : [];
                      const hasOther = current.some((v: string) => v.startsWith('Other: '));
                      if (hasOther) {
                        onChange(current.filter((v: string) => !v.startsWith('Other: ')));
                      } else {
                        onChange([...current, 'Other: ']);
                      }
                    }}
                    className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent"
                  />
                  <span className="text-gray-500 text-sm">Other:</span>
                </label>
                {Array.isArray(value) && value.some((v: string) => v.startsWith('Other: ')) && (
                  <input
                    type="text"
                    defaultValue={value.find((v: string) => v.startsWith('Other: '))?.replace('Other: ', '') || ''}
                    onChange={(e) => {
                      const current = Array.isArray(value) ? value : [];
                      const filtered = current.filter((v: string) => !v.startsWith('Other: '));
                      onChange([...filtered, `Other: ${e.target.value}`]);
                    }}
                    className="flex-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-accent"
                    placeholder="Provide details..."
                  />
                )}
              </div>
            )}
          </div>
        )}

        {field.type === 'dropdown' && (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={genericInputClass}
            required={field.required}
          >
            <option value="" disabled>Choose an option</option>
            {choices.map((choice, i) => (
              <option key={i} value={choice}>{choice}</option>
            ))}
          </select>
        )}

        {field.type === 'linear_scale' && (
          <div className="flex flex-col gap-3 py-2 bg-gray-50 max-w-xl mx-auto rounded-xl p-5 border border-gray-100">
            <div className="flex justify-between text-xs text-gray-400 font-medium px-2">
              <span>{field.scale_min_label || 'Low'}</span>
              <span>{field.scale_max_label || 'High'}</span>
            </div>
            <div className="flex items-center justify-between gap-1 mt-1">
              {Array.from(
                { length: (field.scale_max ?? 5) - (field.scale_min ?? 1) + 1 },
                (_, i) => (field.scale_min ?? 1) + i
              ).map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onChange(num)}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full border flex items-center justify-center font-bold text-sm md:text-base cursor-pointer transform hover:scale-105 active:scale-95 transition-all ${
                    value === num
                      ? 'bg-accent text-primary border-accent scale-105'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {(field.type === 'multiple_choice_grid' || field.type === 'checkbox_grid') && (
          <div className="overflow-x-auto border border-gray-100 rounded-xl mt-1">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  {cols.map((col, cId) => (
                    <th key={cId} className="px-4 py-3 border-b border-gray-100 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, rId) => (
                  <tr key={rId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-left font-medium text-gray-700 text-xs md:text-sm">{row}</td>
                    {cols.map((col, cId) => {
                      const isSelected = field.type === 'multiple_choice_grid'
                        ? (value?.[row] === col)
                        : (Array.isArray(value?.[row]) && value[row].includes(col));

                      return (
                        <td key={cId} className="px-4 py-3 text-center align-middle">
                          <input
                            type={field.type === 'multiple_choice_grid' ? 'radio' : 'checkbox'}
                            name={`grid-${field.id}-${row}`}
                            checked={isSelected || false}
                            onChange={() => handleGridSelect(row, col, field.type === 'checkbox_grid')}
                            className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent mx-auto"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {field.type === 'date' && (
          <input
            type="date"
            required={field.required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={genericInputClass}
          />
        )}

        {field.type === 'time' && (
          <input
            type="time"
            required={field.required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={genericInputClass}
          />
        )}

        {field.type === 'image' && (
          <div className="flex justify-center p-3">
            {field.image_url ? (
              <img
                src={field.image_url}
                alt="Form Graphic"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                className="max-w-full max-h-72 object-contain rounded-lg shadow-sm border border-gray-100"
              />
            ) : (
              <p className="text-gray-400 italic text-sm">Image content not specified.</p>
            )}
          </div>
        )}

        {field.type === 'section' && (
          <div className="border-l-4 border-accent pl-5 my-3 relative py-1">
            <h3 className="font-heading font-extrabold text-primary text-xl md:text-2xl tracking-tight">
              {field.label || 'New Section'}
            </h3>
            {field.description && (
              <p className="text-gray-500 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                {field.description}
              </p>
            )}
          </div>
        )}

        {field.type === 'file_upload' && (
          <div className="max-w-md">
            {value ? (
              <div className="flex items-center justify-between p-3.5 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <div className="flex items-center gap-2 text-sm overflow-hidden">
                  <Check size={16} className="text-green-600 shrink-0" />
                  <a href={value} target="_blank" rel="noreferrer" className="underline truncate hover:text-green-900 font-medium">
                    Upload attachment secured! View image/file
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-xs font-bold px-2 py-1 hover:bg-green-100 rounded text-green-700 transition-colors"
                >
                  Clear File
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  id={`file-${field.id}`}
                  disabled={isUploading}
                  onChange={handleRespondentUpload}
                  className="hidden"
                />
                <label
                  htmlFor={`file-${field.id}`}
                  className={`w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 py-6 px-4 rounded-xl text-gray-500 cursor-pointer hover:border-accent hover:text-accent hover:bg-accent/5 transition-all ${
                    isUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={32} className="animate-spin text-accent mb-2" />
                      <span className="text-sm font-semibold text-gray-600">Uploading File ({uploadProgress}%)</span>
                      <div className="w-1/2 bg-gray-100 rounded-full h-1 mt-2.5 overflow-hidden">
                        <div className="bg-accent h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="mb-2" />
                      <span className="text-sm font-semibold">Select and attach file</span>
                      <span className="text-xs text-gray-400 mt-1">Image, pdf, or doc (Cloudinary backend storage)</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
