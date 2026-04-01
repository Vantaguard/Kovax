'use client';

import { useState, useTransition } from 'react';

interface DynamicField {
  id: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  order_index: number;
  placeholder?: string;
  value: string | null;
  field_value_id: string | null;
}

interface DynamicProfileFormProps {
  fields: DynamicField[];
  profileId: string;
  onSave: (profileId: string, values: Record<string, string | null>) => Promise<{ success: boolean; error?: string }>;
  readOnly?: boolean;
}

export default function DynamicProfileForm({
  fields,
  profileId,
  onSave,
  readOnly = false,
}: DynamicProfileFormProps) {
  const [values, setValues] = useState<Record<string, string | null>>(
    fields.reduce((acc, f) => ({ ...acc, [f.id]: f.value ?? '' }), {} as Record<string, string | null>)
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value || null }));
    // Clear error when user types
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
    setSaveSuccess(false);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await onSave(profileId, values);
      if (result.success) {
        setSaveSuccess(true);
        setErrors({});
      } else {
        setSaveSuccess(false);
        if (result.error) {
          try {
            const parsed = JSON.parse(result.error);
            setErrors(parsed);
          } catch {
            setErrors({ _general: [result.error] });
          }
        }
      }
    });
  };

  const renderField = (field: DynamicField) => {
    const fieldValue = values[field.id] ?? '';
    const fieldErrors = errors[field.id] || [];
    const hasError = fieldErrors.length > 0;

    const baseClass = `w-full px-4 py-3 rounded-xl bg-slate-900/50 border transition-all duration-200 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
      hasError ? 'border-red-500/50' : 'border-slate-700/50 focus:border-amber-500/50'
    } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`;

    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            id={`field-${field.id}`}
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
            className={`${baseClass} min-h-[100px] resize-y`}
            disabled={readOnly}
          />
        );

      case 'dropdown':
        return (
          <select
            id={`field-${field.id}`}
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className={baseClass}
            disabled={readOnly}
          >
            <option value="">Select {field.field_name}</option>
            {/* Options would be loaded from field.options in a real implementation */}
          </select>
        );

      case 'date':
        return (
          <input
            id={`field-${field.id}`}
            type="date"
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className={baseClass}
            disabled={readOnly}
          />
        );

      case 'number':
        return (
          <input
            id={`field-${field.id}`}
            type="number"
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
            className={baseClass}
            disabled={readOnly}
          />
        );

      case 'email':
        return (
          <input
            id={`field-${field.id}`}
            type="email"
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'email@example.com'}
            className={baseClass}
            disabled={readOnly}
          />
        );

      case 'phone':
        return (
          <input
            id={`field-${field.id}`}
            type="tel"
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder || '+1 (555) 000-0000'}
            className={baseClass}
            disabled={readOnly}
          />
        );

      case 'url':
        return (
          <input
            id={`field-${field.id}`}
            type="url"
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'https://'}
            className={baseClass}
            disabled={readOnly}
          />
        );

      default: // text
        return (
          <input
            id={`field-${field.id}`}
            type="text"
            value={fieldValue}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
            className={baseClass}
            disabled={readOnly}
          />
        );
    }
  };

  if (fields.length === 0) {
    return (
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">📋</span>
          <p className="text-slate-400">No profile fields configured for this organization.</p>
          <p className="text-slate-500 text-sm mt-2">
            An administrator can add fields in the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">📝</span>
        Profile Information
      </h3>

      <div className="space-y-5">
        {fields.filter((f) => f.is_active).map((field) => (
          <div key={field.id}>
            <label
              htmlFor={`field-${field.id}`}
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              {field.field_name}
              {field.is_required && (
                <span className="text-amber-400 ml-1">*</span>
              )}
            </label>
            {renderField(field)}
            {errors[field.id] && (
              <div className="mt-1.5">
                {errors[field.id].map((err, idx) => (
                  <p key={idx} className="text-red-400 text-xs">{err}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* General errors */}
      {errors._general && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          {errors._general.map((err, idx) => (
            <p key={idx} className="text-red-300 text-sm">{err}</p>
          ))}
        </div>
      )}

      {/* Save success */}
      {saveSuccess && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <p className="text-green-300 text-sm">✓ Profile fields saved successfully</p>
        </div>
      )}

      {!readOnly && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isPending
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20'
            }`}
          >
            {isPending ? 'Saving...' : 'Save Profile Fields'}
          </button>
        </div>
      )}
    </div>
  );
}
