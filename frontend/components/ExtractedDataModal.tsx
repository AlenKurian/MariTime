'use client'

import { useState } from 'react'
import { X, FileText, Copy, Check } from 'lucide-react'
import { ExtractedData } from '@/lib/types'
import { getDocTypeLabel } from '@/lib/utils'

interface ExtractedDataModalProps {
  filename: string
  data: ExtractedData
  onClose: () => void
}

type Tab = 'fields' | 'json' | 'ocr'

export default function ExtractedDataModal({ filename, data, onClose }: ExtractedDataModalProps) {
  const [tab, setTab] = useState<Tab>('fields')
  const [copied, setCopied] = useState(false)

  const fields = data.structured_data
    ? Object.entries(data.structured_data as Record<string, unknown>).filter(
        ([, v]) => v !== '' && v !== null && v !== undefined
      )
    : []

  const jsonString = JSON.stringify(data.structured_data ?? {}, null, 2)

  const confidence = Math.round((data.confidence_score ?? 0) * 100)
  const confidenceColor =
    confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'fields', label: 'Fields' },
    { id: 'json',   label: 'JSON Output' },
    { id: 'ocr',    label: 'OCR Text' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm" title={filename}>{filename}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.document_type ? getDocTypeLabel(data.document_type) : 'Extracted Data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Doc type + Confidence summary */}
        <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Document Type</p>
            <p className="text-sm font-semibold text-gray-800">
              {data.document_type ? getDocTypeLabel(data.document_type) : '—'}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-medium">
              OCR Confidence — {confidence}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${confidenceColor}`} style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-violet-600 text-violet-700 bg-violet-50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* ── Fields tab ── */}
          {tab === 'fields' && (
            fields.length > 0 ? (
              <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                {fields.map(([key, value]) => (
                  <div key={key} className="flex gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span
                      className="text-xs font-medium text-gray-400 w-44 shrink-0 truncate capitalize"
                      title={key}
                    >
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-800 break-words min-w-0">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-gray-400">No structured fields extracted</div>
            )
          )}

          {/* ── JSON tab ── */}
          {tab === 'json' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                  Ollama Structured JSON Output
                </p>
                <button
                  onClick={() => handleCopy(jsonString)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs font-mono overflow-auto max-h-[50vh] whitespace-pre leading-relaxed">
                {jsonString}
              </pre>
            </div>
          )}

          {/* ── OCR Text tab ── */}
          {tab === 'ocr' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                  Raw OCR Text (Tesseract)
                </p>
                {data.raw_text && (
                  <button
                    onClick={() => handleCopy(data.raw_text ?? '')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              {data.raw_text ? (
                <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono overflow-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed">
                  {data.raw_text}
                </pre>
              ) : (
                <div className="text-center py-10 text-sm text-gray-400">No OCR text available</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
