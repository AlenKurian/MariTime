'use client'

import { useState } from 'react'
import {
  X, CheckCircle, XCircle, AlertTriangle, Anchor,
  ArrowRight, Loader2, Package, ClipboardCheck, Eye, Trash2
} from 'lucide-react'
import { PortMatchResult, ClearancePackage } from '@/lib/types'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface ClearanceConfirmModalProps {
  matchResult: PortMatchResult
  originName: string
  destinationName: string
  onClose: () => void
  onConfirmed: (pkg: ClearancePackage) => void
}

export default function ClearanceConfirmModal({
  matchResult,
  originName,
  destinationName,
  onClose,
  onConfirmed,
}: ClearanceConfirmModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState<ClearancePackage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const removeDoc = (docType: string) =>
    setExcluded((prev) => new Set([...prev, docType]))

  const restoreDoc = (docType: string) =>
    setExcluded((prev) => { const next = new Set(prev); next.delete(docType); return next })

  const activeDocs = matchResult.required_documents.filter(
    (d) => d.matched && !excluded.has(d.doc_type)
  )
  const removedDocs = matchResult.required_documents.filter(
    (d) => d.matched && excluded.has(d.doc_type)
  )
  const mandatoryMissing = matchResult.required_documents.filter(
    (d) => d.mandatory && (!d.matched || excluded.has(d.doc_type))
  )
  const optionalMissing = matchResult.required_documents.filter(
    (d) => !d.mandatory && (!d.matched || excluded.has(d.doc_type))
  )

  const effectiveTotal   = matchResult.total_required
  const effectiveMatched = activeDocs.filter((d) => d.mandatory).length +
                           activeDocs.filter((d) => !d.mandatory).length
  const coveragePct = effectiveTotal > 0
    ? Math.round((activeDocs.length / effectiveTotal) * 100)
    : 0

  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)
    try {
      const pkg = await api.confirmPackage({
        origin_port:      matchResult.origin_port,
        destination_port: matchResult.destination_port,
        total_required:   effectiveTotal,
        matched_count:    activeDocs.length,
        documents: matchResult.required_documents
          .filter((d) => !excluded.has(d.doc_type))
          .map((d) => ({
            document_id:       d.document?.id ?? null,
            doc_type:          d.doc_type,
            display_name:      d.display_name,
            mandatory:         d.mandatory,
            matched:           d.matched,
            original_filename: d.document?.original_filename ?? null,
          })),
      })
      setConfirmed(pkg)
      onConfirmed(pkg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation failed')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-maritime-50 rounded-xl flex items-center justify-center">
              <Anchor className="w-4 h-4 text-maritime-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Confirm Clearance Package</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                {originName || matchResult.origin_port}
                <ArrowRight className="w-3 h-3" />
                {destinationName || matchResult.destination_port}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {confirmed ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Package Confirmed</h3>
              <p className="text-sm text-gray-500 mt-1">
                Clearance package <span className="font-semibold text-gray-700">#{confirmed.id}</span> has been saved
              </p>
              <div className="mt-5 w-full bg-gray-50 rounded-xl border border-gray-100 p-4 text-left space-y-2">
                <Row label="Route"             value={`${confirmed.origin_port} → ${confirmed.destination_port}`} />
                <Row label="Documents matched" value={`${confirmed.matched_count} / ${confirmed.total_required}`} />
                <Row label="Coverage"          value={`${coveragePct}%`} />
                <Row label="Status"            value="Confirmed" highlight />
                <Row label="Created"           value={formatDate(confirmed.created_at)} />
              </div>
            </div>
          ) : (
            <>
              {/* Coverage bar */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Document Coverage</span>
                  <span className={`text-sm font-bold ${
                    coveragePct === 100 ? 'text-green-600' : coveragePct >= 60 ? 'text-yellow-600' : 'text-red-500'
                  }`}>{coveragePct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      coveragePct === 100 ? 'bg-green-500' : coveragePct >= 60 ? 'bg-yellow-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {activeDocs.length} of {effectiveTotal} required documents included in package
                </p>
              </div>

              {/* Mandatory missing warning */}
              {mandatoryMissing.length > 0 && (
                <div className="flex gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Missing required documents</p>
                    <ul className="mt-1 space-y-0.5">
                      {mandatoryMissing.map((d) => (
                        <li key={d.doc_type} className="text-xs text-red-600">• {d.display_name}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-400 mt-1.5">
                      You can still confirm but the package will be incomplete.
                    </p>
                  </div>
                </div>
              )}

              {/* Matched documents */}
              {activeDocs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Matched Documents
                  </p>
                  <div className="space-y-1.5">
                    {activeDocs.map((d) => (
                      <div
                        key={d.doc_type}
                        className="flex items-center gap-3 px-3 py-2.5 bg-green-50 rounded-lg border border-green-100"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{d.display_name}</p>
                          {d.document && (
                            <p className="text-xs text-gray-400 truncate">{d.document.original_filename}</p>
                          )}
                        </div>
                        {d.mandatory && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium shrink-0">
                            Required
                          </span>
                        )}
                        {/* View document */}
                        {d.document && (
                          <button
                            title="View document"
                            onClick={() => window.open(api.getPreviewUrl(d.document!.id), '_blank')}
                            className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Remove from package */}
                        <button
                          title="Remove from package"
                          onClick={() => removeDoc(d.doc_type)}
                          className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed documents (can be restored) */}
              {removedDocs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Removed from Package
                  </p>
                  <div className="space-y-1.5">
                    {removedDocs.map((d) => (
                      <div
                        key={d.doc_type}
                        className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 opacity-60"
                      >
                        <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 line-through">{d.display_name}</p>
                          {d.document && (
                            <p className="text-xs text-gray-300 truncate">{d.document.original_filename}</p>
                          )}
                        </div>
                        <button
                          onClick={() => restoreDoc(d.doc_type)}
                          className="text-xs text-maritime-600 hover:underline shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional missing */}
              {optionalMissing.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Optional — Not Included
                  </p>
                  <div className="space-y-1.5">
                    {optionalMissing.map((d) => (
                      <div key={d.doc_type} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
                        <p className="text-xs text-gray-500">{d.display_name}</p>
                        <span className="ml-auto text-xs text-gray-300 font-medium shrink-0">Optional</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {confirmed ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-maritime-700 text-white text-sm font-semibold hover:bg-maritime-800 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-maritime-700 text-white text-sm font-semibold hover:bg-maritime-800 transition-colors disabled:opacity-60"
              >
                {confirming
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
                  : <><Package className="w-4 h-4" /> Confirm & Finalise Package</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-green-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}
