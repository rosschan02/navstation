'use client';

import React from 'react';
import { SUPPORTED_LOCALES, getLocaleDisplayName, type Locale } from '@/lib/i18n/config';

type FieldValue = string | string[];

interface TranslationFieldDefinition {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  tags?: boolean;
}

interface TranslationEditorProps<T extends object> {
  title: string;
  description?: string;
  translations: Partial<Record<Locale, Partial<T>>>;
  fields: TranslationFieldDefinition[];
  onChange: <K extends keyof T>(locale: Locale, key: K, value: T[K]) => void;
}

function getFieldValue<T extends object>(
  translations: Partial<Record<Locale, Partial<T>>>,
  locale: Locale,
  key: keyof T
): FieldValue {
  return (translations[locale]?.[key] as FieldValue | undefined) ?? '';
}

export function TranslationEditor<T extends object>({
  title,
  description,
  translations,
  fields,
  onChange,
}: TranslationEditorProps<T>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>

      <div className="grid gap-4">
        {SUPPORTED_LOCALES.map((locale) => (
          <div key={locale} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{getLocaleDisplayName(locale)}</p>
              {locale === 'en' && <span className="text-xs text-slate-400">Default</span>}
            </div>

            <div className="grid gap-3">
              {fields.map((field) => {
                const value = getFieldValue(translations, locale, field.key as keyof T);
                const renderedValue = Array.isArray(value) ? value.join(', ') : String(value || '');

                if (field.multiline) {
                  return (
                    <div key={`${locale}-${field.key}`}>
                      <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
                      <textarea
                        value={renderedValue}
                        rows={3}
                        onChange={(event) => onChange(locale, field.key as keyof T, event.target.value as T[keyof T])}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  );
                }

                return (
                  <div key={`${locale}-${field.key}`}>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
                    <input
                      type="text"
                      value={renderedValue}
                      onChange={(event) => {
                        const nextValue = field.tags
                          ? event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                          : event.target.value;
                        onChange(locale, field.key as keyof T, nextValue as T[keyof T]);
                      }}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
