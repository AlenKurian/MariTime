'use client'

import { useState } from 'react'
import {
  FileText, Image, FileSpreadsheet, File, Download, Trash2,
  CheckCircle, Clock, AlertCircle, Loader2, BarChart2, Eye
} from 'lucide-react'
import { Document } from '@/lib/types'
import { api } from '@/lib/api'
import { formatFileSize, formatDate, getDocTypeLabel } from '@/lib/utils'
import ExtractedDataModal from './ExtractedDataModal'

interface DocumentCardProps {
  doc: Document
  onDelete: (id: number) => void
  view?: 'grid' | 'table'
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:  <FileText className="w-5 h-5 text-red-400" />,
  jpg:  <Image className="w-5 h-5 text-blue-400" />,
  png:  <Image className="w-5 h-5 text-blue-400" />,
  docx: <FileText className="w-5 h-5 text-indigo-400" />,
  odt:  <FileText className="w-5 h-5 text-indigo-400" />,
  csv:  <FileSpreadsheet className="w-5 h-5 text-green-400" />,
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  pending:    { icon: <Clock className="w-3.5 h-3.5" />,              label: 'Pending',    cls: 'bg-yellow-100 text-yellow-700' },
  processing: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: 'Processing', cls: 'bg-blue-100 text-blue-700'   },
  completed:  { icon: <CheckCircle className="w-3.5 h-3.5" />,        label: 'Completed',  cls: 'bg-green-100 text-green-700'   },
  failed:     { icon: <AlertCircle className="w-3.5 h-3.5" />,        label: 'Failed',     cls: 'bg-red-100 text-red-700'       },
}

export default function DocumentCard({ doc, onDelete, view = 'grid' }: DocumentCardProps) {
  const [deleting, setDeleting]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
  const icon   = FILE_ICONS[doc.file_type] || <File className="w-5 h-5 text-gray-400" />
  const hasData = !!(doc.extracted_data?.structured_data || doc.extracted_data?.raw_text)

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.original_filename}"?`)) return
    setDeleting(true)
    try {
      await api.deleteDocument(doc.id)
      onDelete(doc.id)
    } catch {
      alert('Failed to delete document')
      setDeleting(false)
    }
  }

  /* ── Table row ── */
  if (view === 'table') {
    return (
      <>
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={doc.original_filename}>
                {doc.original_filename}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
            <span className="text-xs font-medium uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {doc.file_type}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>
              {status.icon} {status.label}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-500">
            {doc.extracted_data?.document_type
              ? getDocTypeLabel(doc.extracted_data.document_type)
              : <span className="text-gray-300">—</span>}
          </td>
          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {hasData && (
                <button
                  onClick={() => setShowModal(true)}
                  className="p-1.5 rounded hover:bg-violet-50 text-violet-400 hover:text-violet-600 transition-colors"
                  title="View extracted data"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <a
                href={api.getPreviewUrl(doc.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                title="View document"
              >
                <Eye className="w-4 h-4" />
              </a>
              <a
                href={api.getDownloadUrl(doc.id)}
                className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </td>
        </tr>

        {showModal && doc.extracted_data && (
          <ExtractedDataModal
            filename={doc.original_filename}
            data={doc.extracted_data}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    )
  }

  /* ── Grid card ── */
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate" title={doc.original_filename}>
                  {doc.original_filename}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                </p>
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>
              {status.icon} {status.label}
            </span>
          </div>

          {/* Doc type badge */}
          {doc.extracted_data?.document_type && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-medium border border-violet-100">
                {getDocTypeLabel(doc.extracted_data.document_type)}
              </span>
              {doc.extracted_data.confidence_score !== null && (
                <span className="text-xs text-gray-400">
                  {Math.round((doc.extracted_data.confidence_score ?? 0) * 100)}% OCR confidence
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
            {hasData && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors text-xs font-medium"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                View Extracted Data
              </button>
            )}
            <div className="flex items-center gap-2">
              <a
                href={api.getPreviewUrl(doc.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </a>
              <a
                href={api.getDownloadUrl(doc.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium disabled:opacity-50"
                title="Delete"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && doc.extracted_data && (
        <ExtractedDataModal
          filename={doc.original_filename}
          data={doc.extracted_data}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
