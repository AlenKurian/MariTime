'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin, ArrowRight, Search, CheckCircle, XCircle, AlertCircle,
  Loader2, ChevronDown, ChevronUp, FileText, Info, Package
} from 'lucide-react'
import { api } from '@/lib/api'
import { Port, PortMatchResult, MatchedDocument, ExtractedData, ClearancePackage } from '@/lib/types'
import { getDocTypeLabel } from '@/lib/utils'
import EditableDataForm from './EditableDataForm'
import ClearanceConfirmModal from './ClearanceConfirmModal'

export default function PortSelectionSection() {
  const [ports, setPorts] = useState<Port[]>([])
  const [portsLoading, setPortsLoading] = useState(true)
  const [portsError, setPortsError] = useState<string | null>(null)

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<PortMatchResult | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)

  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [extractedDataMap, setExtractedDataMap] = useState<Record<number, ExtractedData>>({})
  const [loadingDataFor, setLoadingDataFor] = useState<number | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmedPackage, setConfirmedPackage] = useState<ClearancePackage | null>(null)

  useEffect(() => {
    api.listPorts()
      .then(setPorts)
      .catch((e) => setPortsError(e.message))
      .finally(() => setPortsLoading(false))
  }, [])

  const handleMatch = useCallback(async (orig: string, dest: string) => {
    if (!dest) return
    setMatching(true)
    setMatchError(null)
    setMatchResult(null)
    setExpandedDoc(null)
    setConfirmedPackage(null)
    try {
      const result = await api.matchDocuments(orig, dest)
      setMatchResult(result)
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : 'Matching failed')
    } finally {
      setMatching(false)
    }
  }, [])

  useEffect(() => {
    if (destination) handleMatch(origin, destination)
  }, [origin, destination, handleMatch])

  const toggleExpand = async (matched: MatchedDocument) => {
    const key = matched.doc_type
    if (expandedDoc === key) {
      setExpandedDoc(null)
      return
    }
    setExpandedDoc(key)
    if (matched.document && !(matched.document.id in extractedDataMap)) {
      setLoadingDataFor(matched.document.id)
      try {
        const data = await api.getExtractedData(matched.document.id)
        setExtractedDataMap((prev) => ({ ...prev, [matched.document!.id]: data }))
      } catch {
        // Data may not be ready yet — ignore
      } finally {
        setLoadingDataFor(null)
      }
    }
  }

  const handleDataSaved = (docId: number, updated: ExtractedData) => {
    setExtractedDataMap((prev) => ({ ...prev, [docId]: updated }))
  }

  const matchedCount = matchResult?.matched_count ?? 0
  const totalRequired = matchResult?.total_required ?? 0
  const coveragePct = totalRequired > 0 ? Math.round((matchedCount / totalRequired) * 100) : 0

  return (
    <section id="ports" className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Port Selection & Document Matching</h2>
        <p className="text-gray-500 mt-1">
          Select a destination port to instantly see required documents and match them against your vault
        </p>
      </div>

      {/* Port Selector Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        {portsError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Knowledge graph unavailable: {portsError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          {/* Origin */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <MapPin className="inline w-3.5 h-3.5 mr-1 text-green-500" />
              Origin Port
            </label>
            {portsLoading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-maritime-400 focus:border-transparent"
              >
                <option value="">Select origin port…</option>
                {ports.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Arrow */}
          <div className="flex justify-center pb-2.5">
            <div className="w-8 h-8 rounded-full bg-maritime-50 border border-maritime-100 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-maritime-600" />
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <MapPin className="inline w-3.5 h-3.5 mr-1 text-red-500" />
              Destination Port
            </label>
            {portsLoading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-maritime-400 focus:border-transparent"
              >
                <option value="">Select destination port…</option>
                {ports
                  .filter((p) => p.code !== origin)
                  .map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>

        <button
          onClick={() => handleMatch(origin, destination)}
          disabled={!destination || matching || portsLoading}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            bg-gradient-to-r from-maritime-700 to-ocean-600 text-white font-semibold text-sm
            hover:from-maritime-800 hover:to-ocean-700 transition-all shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {matching ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Fetching requirements…</>
          ) : (
            <><Search className="w-4 h-4" /> Refresh</>
          )}
        </button>
      </div>

      {matchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{matchError}</p>
        </div>
      )}

      {/* Match Results */}
      {matchResult && (
        <div className="animate-fade-in">
          {/* Coverage Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {matchResult.origin_port} → {matchResult.destination_port}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {matchedCount} of {totalRequired} required documents matched
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-maritime-700">{coveragePct}%</p>
                  <p className="text-xs text-gray-400">Coverage</p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    coveragePct === 100
                      ? 'bg-green-100 text-green-700'
                      : coveragePct >= 60
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {coveragePct === 100 ? '✓ Complete' : coveragePct >= 60 ? '⚠ Partial' : '✗ Incomplete'}
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  coveragePct === 100 ? 'bg-green-500' : coveragePct >= 60 ? 'bg-yellow-500' : 'bg-red-400'
                }`}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>

          {/* Document Cards */}
          <div className="space-y-3">
            {matchResult.required_documents.map((matched) => {
              const isExpanded = expandedDoc === matched.doc_type
              const docId = matched.document?.id
              const extractedData = docId ? extractedDataMap[docId] : null
              const isLoadingData = docId === loadingDataFor

              return (
                <div
                  key={matched.doc_type}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${
                    matched.matched
                      ? 'border-green-100 hover:border-green-200'
                      : matched.mandatory
                      ? 'border-red-100 hover:border-red-200'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => matched.matched && toggleExpand(matched)}
                  >
                    {/* Status Icon */}
                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                      matched.matched
                        ? 'bg-green-100'
                        : matched.mandatory
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      {matched.matched ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className={`w-5 h-5 ${matched.mandatory ? 'text-red-400' : 'text-gray-300'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {matched.display_name}
                        </span>
                        {matched.mandatory ? (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-100">
                            Optional
                          </span>
                        )}
                        {matched.matched && matched.document && (
                          <span className="text-xs text-green-600 truncate max-w-[200px]" title={matched.document.original_filename}>
                            ↳ {matched.document.original_filename}
                          </span>
                        )}
                      </div>
                      {!matched.matched && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {matched.mandatory
                            ? 'Missing — upload this document to complete your package'
                            : 'Not uploaded (optional for this route)'}
                        </p>
                      )}
                    </div>

                    {matched.matched && (
                      <div className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    )}
                  </div>

                  {/* Expanded Data Form */}
                  {isExpanded && matched.matched && matched.document && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-4 h-4 text-maritime-500" />
                        <h4 className="text-sm font-semibold text-gray-700">Extracted Document Data</h4>
                        <span className="text-xs text-gray-400 ml-auto">{matched.document.original_filename}</span>
                      </div>

                      {isLoadingData && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading extracted data…
                        </div>
                      )}

                      {!isLoadingData && !extractedData && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 bg-white rounded-lg p-3 border border-gray-100">
                          <Info className="w-4 h-4 text-gray-300" />
                          No extracted data available yet — document may still be processing
                        </div>
                      )}

                      {!isLoadingData && extractedData && (
                        <EditableDataForm
                          documentId={matched.document.id}
                          extractedData={extractedData}
                          onSaved={(updated) => handleDataSaved(matched.document!.id, updated)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Matched document found
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" /> Required — not uploaded
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-gray-300" /> Optional — not uploaded
            </span>
          </div>

          {/* Confirm Package */}
          <div className="mt-5">
            {confirmedPackage ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Package #{confirmedPackage.id} confirmed
                  </p>
                  <p className="text-xs text-green-600">
                    {confirmedPackage.matched_count}/{confirmedPackage.total_required} documents · {confirmedPackage.origin_port} → {confirmedPackage.destination_port}
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="ml-auto text-xs text-green-700 underline hover:no-underline"
                >
                  View
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                  border-2 border-maritime-200 text-maritime-700 font-semibold text-sm
                  hover:bg-maritime-50 hover:border-maritime-400 transition-all"
              >
                <Package className="w-4 h-4" />
                Confirm &amp; Finalise Document Package
              </button>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && matchResult && (
        <ClearanceConfirmModal
          matchResult={matchResult}
          originName={ports.find((p) => p.code === origin)?.name ?? origin}
          destinationName={ports.find((p) => p.code === destination)?.name ?? destination}
          onClose={() => setShowConfirmModal(false)}
          onConfirmed={(pkg) => { setConfirmedPackage(pkg); setShowConfirmModal(false) }}
        />
      )}
    </section>
  )
}
