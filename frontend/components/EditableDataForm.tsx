'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, RotateCcw, Loader2, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { ExtractedData } from '@/lib/types'
import { getDocTypeLabel, DOC_TYPE_LABELS } from '@/lib/utils'

interface EditableDataFormProps {
  documentId: number
  extractedData: ExtractedData
  onSaved: (updated: ExtractedData) => void
}

type FieldMap = Record<string, string>

export default function EditableDataForm({ documentId, extractedData, onSaved }: EditableDataFormProps) {
  const [fields, setFields] = useState<FieldMap>(
    (extractedData.structured_data as FieldMap) || {}
  )
  const [docType, setDocType] = useState(extractedData.document_type || 'generic')
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleRemoveField = (key: string) => {
    setFields((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSaved(false)
  }

  const handleAddField = () => {
    const trimmed = newKey.trim()
    if (!trimmed || trimmed in fields) return
    setFields((prev) => ({ ...prev, [trimmed]: '' }))
    setNewKey('')
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateExtractedData(documentId, {
        structured_data: fields as Record<string, unknown>,
        document_type: docType,
      })
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFields((extractedData.structured_data as FieldMap) || {})
    setDocType(extractedData.document_type || 'generic')
    setSaved(false)
    setError(null)
  }

  const entries = Object.entries(fields)

  return (
    <div className="space-y-4">
      {/* Document Type Selector */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Document Type
        </label>
        <select
          value={docType}
          onChange={(e) => { setDocType(e.target.value); setSaved(false) }}
          className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-maritime-400 focus:border-transparent"
        >
          {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Fields */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Extracted Fields ({entries.length})
        </label>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.length === 0 && (
            <p className="text-xs text-gray-400 italic py-3 text-center">No fields extracted yet</p>
          )}
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 group">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="text-xs px-2.5 py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 font-mono cursor-default"
                />
                <input
                  type="text"
                  value={String(value ?? '')}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="(empty)"
                  className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-maritime-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => handleRemoveField(key)}
                className="mt-1.5 p-1.5 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove field"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
          placeholder="New field name…"
          className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-dashed border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-maritime-400 focus:border-solid placeholder-gray-300"
        />
        <button
          onClick={handleAddField}
          disabled={!newKey.trim()}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Confidence Score */}
      {extractedData.confidence_score !== null && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">OCR Confidence:</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                (extractedData.confidence_score || 0) > 0.8
                  ? 'bg-green-400'
                  : (extractedData.confidence_score || 0) > 0.5
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`}
              style={{ width: `${(extractedData.confidence_score || 0) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500">
            {Math.round((extractedData.confidence_score || 0) * 100)}%
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-maritime-700 text-white hover:bg-maritime-800 disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle className="w-3.5 h-3.5" /> Saved!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Save Changes</>
          )}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  )
}
