import React, { useState, useEffect } from 'react';
import { FormField } from '../../types/forms';
import { Plus, Trash2, Sliders, List } from 'lucide-react';
import { CloudinaryUpload } from '../CloudinaryUpload';

function GridInSettings() {
  return Plus; // Temporary placeholder helper
}

interface FieldSettingsProps {
  field: FormField | null;
  onUpdate: (field: FormField) => void;
}

export const FieldSettings: React.FC<FieldSettingsProps> = ({ field, onUpdate }) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  // Choice choices options
  const [choices, setChoices] = useState<string[]>([]);
  const [allowOther, setAllowOther] = useState(false);

  // Scale Config
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(5);
  const [scaleMinLabel, setScaleMinLabel] = useState('');
  const [scaleMaxLabel, setScaleMaxLabel] = useState('');

  // Grid Config
  const [rows, setRows] = useState<string[]>([]);
  const [cols, setCols] = useState<string[]>([]);

  useEffect(() => {
    if (field) {
      setLabel(field.label || '');
      setDescription(field.description || '');
      setPlaceholder(field.placeholder || '');
      setRequired(field.required || false);
      setImageUrl(field.image_url || '');

      setChoices(field.options?.choices || []);
      setAllowOther(field.options?.allowOther || false);

      setScaleMin(field.scale_min ?? 1);
      setScaleMax(field.scale_max ?? 5);
      setScaleMinLabel(field.scale_min_label || '');
      setScaleMaxLabel(field.scale_max_label || '');

      setRows(field.options?.rows || []);
      setCols(field.options?.columns || []);
    }
  }, [field]);

  if (!field) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center text-gray-400 sticky top-5">
        <p className="text-sm font-medium py-12">Click an element on the canvas to configure its settings here.</p>
      </div>
    );
  }

  const triggerUpdate = (updatedFields: Partial<FormField>) => {
    onUpdate({
      ...field,
      ...updatedFields,
    });
  };

  const handleChoiceChange = (index: number, val: string) => {
    const updatedChoices = [...choices];
    updatedChoices[index] = val;
    setChoices(updatedChoices);
    triggerUpdate({
      options: {
        ...(field.options || {}),
        choices: updatedChoices,
      },
    });
  };

  const handleAddChoice = () => {
    const updatedChoices = [...choices, `Option ${choices.length + 1}`];
    setChoices(updatedChoices);
    triggerUpdate({
      options: {
        ...(field.options || {}),
        choices: updatedChoices,
      },
    });
  };

  const handleRemoveChoice = (index: number) => {
    const updatedChoices = choices.filter((_, idx) => idx !== index);
    setChoices(updatedChoices);
    triggerUpdate({
      options: {
        ...(field.options || {}),
        choices: updatedChoices,
      },
    });
  };

  const handleOtherToggle = () => {
    const nextVal = !allowOther;
    setAllowOther(nextVal);
    triggerUpdate({
      options: {
        ...(field.options || {}),
        allowOther: nextVal,
      },
    });
  };

  // Grid rows/columns config
  const handleGridParamChange = (index: number, val: string, type: 'rows' | 'columns') => {
    const updatedList = type === 'rows' ? [...rows] : [...cols];
    updatedList[index] = val;
    if (type === 'rows') {
      setRows(updatedList);
      triggerUpdate({
        options: {
          ...(field.options || {}),
          rows: updatedList,
        },
      });
    } else {
      setCols(updatedList);
      triggerUpdate({
        options: {
          ...(field.options || {}),
          columns: updatedList,
        },
      });
    }
  };

  const handleAddGridParam = (type: 'rows' | 'columns') => {
    const list = type === 'rows' ? rows : cols;
    const word = type === 'rows' ? 'Row' : 'Column';
    const updatedList = [...list, `${word} ${list.length + 1}`];
    if (type === 'rows') {
      setRows(updatedList);
      triggerUpdate({
        options: {
          ...(field.options || {}),
          rows: updatedList,
        },
      });
    } else {
      setCols(updatedList);
      triggerUpdate({
        options: {
          ...(field.options || {}),
          columns: updatedList,
        },
      });
    }
  };

  const handleRemoveGridParam = (index: number, type: 'rows' | 'columns') => {
    const list = type === 'rows' ? rows : cols;
    const updatedList = list.filter((_, idx) => idx !== index);
    if (type === 'rows') {
      setRows(updatedList);
      triggerUpdate({
        options: {
          ...(field.options || {}),
          rows: updatedList,
        },
      });
    } else {
      setCols(updatedList);
      triggerUpdate({
        options: {
          ...(field.options || {}),
          columns: updatedList,
        },
      });
    }
  };

  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1';
  const inputClass = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-accent focus:bg-white focus:outline-none transition-colors';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-5 sticky top-5 max-h-[85vh] overflow-y-auto hide-scrollbar">
      <div>
        <h3 className="font-heading font-bold text-gray-900 text-sm uppercase tracking-wider mb-1">
          Field Settings
        </h3>
        <p className="text-xs text-gray-400 capitalize">Configuring: {field.type.replace(/_/g, ' ')}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Label */}
        <div>
          <label className={labelClass}>Field Label / Question</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              triggerUpdate({ label: e.target.value });
            }}
            className={inputClass}
            placeholder="Type your question..."
          />
        </div>

        {/* Description */}
        {field.type !== 'section' && (
          <div>
            <label className={labelClass}>Description / Hint text</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                triggerUpdate({ description: e.target.value });
              }}
              className={inputClass + ' h-16'}
              placeholder="Give respondents some directions..."
            />
          </div>
        )}

        {/* Placeholders */}
        {(field.type === 'short_answer' || field.type === 'paragraph') && (
          <div>
            <label className={labelClass}>Placeholder Text</label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => {
                setPlaceholder(e.target.value);
                triggerUpdate({ placeholder: e.target.value });
              }}
              className={inputClass}
              placeholder="Placeholder on input..."
            />
          </div>
        )}

        {/* Required Toggle */}
        {field.type !== 'section' && field.type !== 'image' && (
          <div className="flex items-center justify-between py-2 border-t border-b border-gray-50 mt-1">
            <span className="text-sm font-medium text-gray-700">Response is Mandatory</span>
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => {
                setRequired(e.target.checked);
                triggerUpdate({ required: e.target.checked });
              }}
              className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
            />
          </div>
        )}

        {/* Image upload widget inside field settings */}
        {field.type === 'image' && (
          <div className="flex flex-col gap-3">
            <label className={labelClass}>Select Image File</label>
            <CloudinaryUpload
              onUpload={(url) => {
                setImageUrl(url);
                triggerUpdate({ image_url: url });
              }}
              currentUrl={imageUrl}
              label="Upload form design graphic"
              aspectRatio="landscape"
            />
            <div className="mt-2 text-xs text-gray-400">
              Alternatively, paste an external URL below:
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  triggerUpdate({ image_url: e.target.value });
                }}
                className={inputClass + ' mt-1'}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        )}

        {/* Multiple Choice / Checkboxes Options */}
        {(field.type === 'multiple_choice' || field.type === 'checkboxes' || field.type === 'dropdown') && (
          <div className="border-t border-gray-50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Option choices</label>
              <button
                type="button"
                onClick={handleAddChoice}
                className="text-xs text-accent font-bold hover:underline"
              >
                + Add Option
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {choices.map((choice, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono w-4">{i + 1}.</span>
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => handleChoiceChange(i, e.target.value)}
                    className={inputClass + ' flex-1 py-1 px-2.5'}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveChoice(i)}
                    className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {field.type !== 'dropdown' && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-600 font-medium">Include &quot;Other&quot; option input</span>
                <input
                  type="checkbox"
                  checked={allowOther}
                  onChange={handleOtherToggle}
                  className="w-3.5 h-3.5 text-accent border-gray-300 rounded focus:ring-accent"
                />
              </div>
            )}
          </div>
        )}

        {/* Linear Scale Config */}
        {field.type === 'linear_scale' && (
          <div className="border-t border-gray-50 pt-3 flex flex-col gap-3">
            <label className={labelClass}>Scale Ranges</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 font-bold block">MINIMUM</label>
                <select
                  value={scaleMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setScaleMin(val);
                    triggerUpdate({ scale_min: val });
                  }}
                  className={inputClass}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold block">MAXIMUM</label>
                <select
                  value={scaleMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setScaleMax(val);
                    triggerUpdate({ scale_max: val });
                  }}
                  className={inputClass}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">Label for Min ({scaleMin})</label>
                <input
                  type="text"
                  value={scaleMinLabel}
                  onChange={(e) => {
                    setScaleMinLabel(e.target.value);
                    triggerUpdate({ scale_min_label: e.target.value });
                  }}
                  className={inputClass}
                  placeholder="e.g. Not Satisfied"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">Label for Max ({scaleMax})</label>
                <input
                  type="text"
                  value={scaleMaxLabel}
                  onChange={(e) => {
                    setScaleMaxLabel(e.target.value);
                    triggerUpdate({ scale_max_label: e.target.value });
                  }}
                  className={inputClass}
                  placeholder="e.g. Extremely Satisfied"
                />
              </div>
            </div>
          </div>
        )}

        {/* Grids Config */}
        {(field.type === 'multiple_choice_grid' || field.type === 'checkbox_grid') && (
          <div className="border-t border-gray-50 pt-3 flex flex-col gap-4">
            {/* Rows Config */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Rows (Questions)</label>
                <button
                  type="button"
                  onClick={() => handleAddGridParam('rows')}
                  className="text-xs text-accent font-bold hover:underline"
                >
                  + Add Row
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row}
                      onChange={(e) => handleGridParamChange(i, e.target.value, 'rows')}
                      className={inputClass + ' py-1 px-2.5 flex-1'}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGridParam(i, 'rows')}
                      className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Columns Config */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Columns (Choices)</label>
                <button
                  type="button"
                  onClick={() => handleAddGridParam('columns')}
                  className="text-xs text-accent font-bold hover:underline"
                >
                  + Add Column
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {cols.map((col, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => handleGridParamChange(i, e.target.value, 'columns')}
                      className={inputClass + ' py-1 px-2.5 flex-1'}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGridParam(i, 'columns')}
                      className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
