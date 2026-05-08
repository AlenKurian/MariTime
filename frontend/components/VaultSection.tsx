'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Grid, List, RefreshCw, AlertCircle, FileX, Loader2,
  Upload, ScanText, Braces, Copy, Check, Database
} from 'lucide-react'
import { api } from '@/lib/api'
import { Document } from '@/lib/types'
import DocumentCard from './DocumentCard'
import { formatDate, formatFileSize, getDocTypeLabel } from '@/lib/utils'

interface VaultSectionProps {
  refreshTrigger?: number
}

type MainTab = 'documents' | 'ocr' | 'json'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function VaultSection({ refreshTrigger }: VaultSectionProps) {
  const [docs, setDocs]       = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<MainTab>('documents')
  const [view, setView]       = useState<'grid' | 'table'>('grid')

  const fetchDocs = useCallback(async () => {
    setLoading(true); setError(null)
    try { setDocs(await api.listDocuments()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs, refreshTrigger])

  useEffect(() => {
    const hasProcessing = docs.some((d) => d.status === 'processing' || d.status === 'pending')
    if (!hasProcessing) return
    const t = setTimeout(fetchDocs, 4000)
    return () => clearTimeout(t)
  }, [docs, fetchDocs])

  const handleDelete = (id: number) => setDocs((prev) => prev.filter((d) => d.id !== id))

  const stats = {
    total:      docs.length,
    completed:  docs.filter((d) => d.status === 'completed').length,
    processing: docs.filter((d) => d.status === 'processing' || d.status === 'pending').length,
    failed:     docs.filter((d) => d.status === 'failed').length,
  }

  const completedDocs = docs.filter((d) => d.extracted_data)

  const TABS: { id: MainTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'documents', label: 'Uploaded Documents', icon: <Upload className="w-4 h-4" />,  count: docs.length },
    { id: 'ocr',       label: 'OCR Results',        icon: <ScanText className="w-4 h-4" />, count: completedDocs.length },
    { id: 'json',      label: 'JSON Data',           icon: <Braces className="w-4 h-4" />,  count: completedDocs.length },
  ]

  const isEmpty = !loading && !error && docs.length === 0

  return (
    <section className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-violet-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Document Vault</h2>
            <p className="text-xs text-gray-400 mt-0.5">maritime_db · {docs.length} record{docs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={fetchDocs} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {docs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total',      value: stats.total,      cls: 'text-gray-700',  bg: 'bg-gray-50 border-gray-200' },
            { label: 'Completed',  value: stats.completed,  cls: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            { label: 'Processing', value: stats.processing, cls: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200' },
            { label: 'Failed',     value: stats.failed,     cls: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-violet-600 text-violet-700 bg-violet-50'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.id ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'
            }`}>{t.count}</span>
          </button>
        ))}

        {/* Grid / Table toggle — only for Documents tab */}
        {tab === 'documents' && (
          <div className="ml-auto flex items-center bg-gray-100 rounded-lg p-1 self-center">
            <button onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white shadow-sm text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Loading / Error / Empty */}
      {loading && docs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" /><p className="text-sm">Loading…</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchDocs} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
            <FileX className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-medium text-gray-500">No documents yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload maritime documents to see them here</p>
        </div>
      )}

      {/* ── Tab: Uploaded Documents ── */}
      {!loading && !error && docs.length > 0 && tab === 'documents' && (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {docs.map((doc) => <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} view="grid" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['File', 'Type', 'Size', 'Status', 'Document Type', 'Uploaded', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {docs.map((doc) => <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} view="table" />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: OCR Results ── */}
      {!loading && !error && tab === 'ocr' && (
        completedDocs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No OCR results yet — upload and process a document first</div>
        ) : (
          <div className="space-y-4">
            {completedDocs.map((doc) => {
              const ext = doc.extracted_data!
              const conf = Math.round((ext.confidence_score ?? 0) * 100)
              const confColor = conf >= 80 ? 'bg-green-500' : conf >= 50 ? 'bg-yellow-500' : 'bg-red-400'
              return (
                <div key={doc.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  {/* Row header */}
                  <div className="flex items-center justify-between gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <ScanText className="w-4 h-4 text-violet-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800 truncate">{doc.original_filename}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium uppercase shrink-0">{doc.file_type}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${confColor}`} style={{ width: `${conf}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{conf}%</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
                      {ext.raw_text && <CopyButton text={ext.raw_text} />}
                    </div>
                  </div>
                  {/* OCR text */}
                  <pre className="px-5 py-4 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed bg-white max-h-64 overflow-y-auto">
                    {ext.raw_text || <span className="text-gray-300 italic">No OCR text extracted</span>}
                  </pre>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Tab: JSON Data ── */}
      {!loading && !error && tab === 'json' && (
        completedDocs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No JSON data yet — upload and process a document first</div>
        ) : (
          <div className="space-y-4">
            {completedDocs.map((doc) => {
              const ext = doc.extracted_data!
              const jsonStr = JSON.stringify(ext.structured_data ?? {}, null, 2)
              const fields = ext.structured_data
                ? Object.entries(ext.structured_data as Record<string, unknown>).filter(([, v]) => v !== '' && v !== null)
                : []
              return (
                <div key={doc.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  {/* Row header */}
                  <div className="flex items-center justify-between gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <Braces className="w-4 h-4 text-violet-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800 truncate">{doc.original_filename}</span>
                      {ext.document_type && (
                        <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded font-medium shrink-0">
                          {getDocTypeLabel(ext.document_type)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">{fields.length} fields · {formatFileSize(doc.file_size)}</span>
                      <CopyButton text={jsonStr} />
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                    {/* Fields panel */}
                    <div className="lg:w-1/2 max-h-72 overflow-y-auto">
                      {fields.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {fields.map(([k, v]) => (
                            <div key={k} className="flex gap-3 px-5 py-2 hover:bg-gray-50">
                              <span className="text-xs font-medium text-gray-400 w-40 shrink-0 truncate capitalize">{k.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-gray-800 break-words min-w-0">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 px-5 py-4 italic">No fields extracted</p>
                      )}
                    </div>

                    {/* JSON panel */}
                    <pre className="lg:w-1/2 px-5 py-4 text-xs font-mono text-green-700 bg-gray-950 whitespace-pre leading-relaxed max-h-72 overflow-auto">
                      {jsonStr}
                    </pre>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {stats.processing > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {stats.processing} document(s) being processed — auto-refreshing every 4 s
        </div>
      )}
    </section>
  )
}
