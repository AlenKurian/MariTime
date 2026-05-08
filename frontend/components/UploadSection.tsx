'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileText, Image, FileSpreadsheet, File, X, CheckCircle,
  AlertCircle, Loader2, CloudUpload
} from 'lucide-react'
import { api } from '@/lib/api'
import { Document, UploadingFile } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'

interface UploadSectionProps {
  onUploaded: (docs: Document[]) => void
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'text/csv': ['.csv'],
}

const FILE_ICON_MAP: Record<string, React.ReactNode> = {
  'application/pdf': <FileText className="w-5 h-5 text-red-400" />,
  'image/jpeg': <Image className="w-5 h-5 text-blue-400" />,
  'image/png': <Image className="w-5 h-5 text-blue-400" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileText className="w-5 h-5 text-indigo-400" />,
  'application/vnd.oasis.opendocument.text': <FileText className="w-5 h-5 text-indigo-400" />,
  'text/csv': <FileSpreadsheet className="w-5 h-5 text-green-400" />,
}

export default function UploadSection({ onUploaded }: UploadSectionProps) {
  const [queue, setQueue] = useState<UploadingFile[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: UploadingFile[] = accepted.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }))
    setQueue((prev) => [...prev, ...newItems])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  })

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    const pendingFiles = queue.filter((q) => q.status === 'uploading').map((q) => q.file)
    if (!pendingFiles.length) return

    setUploading(true)

    const simulateProgress = () => {
      let pct = 0
      const interval = setInterval(() => {
        pct = Math.min(pct + Math.random() * 15, 85)
        setQueue((prev) =>
          prev.map((q) =>
            q.status === 'uploading' ? { ...q, progress: pct } : q
          )
        )
        if (pct >= 85) clearInterval(interval)
      }, 200)
      return interval
    }

    const interval = simulateProgress()

    try {
      const uploaded = await api.uploadDocuments(pendingFiles)
      clearInterval(interval)
      setQueue((prev) =>
        prev.map((q) =>
          q.status === 'uploading' ? { ...q, progress: 100, status: 'done' } : q
        )
      )
      onUploaded(uploaded)
      setTimeout(() => setQueue((prev) => prev.filter((q) => q.status !== 'done')), 2000)
    } catch (err) {
      clearInterval(interval)
      setQueue((prev) =>
        prev.map((q) =>
          q.status === 'uploading'
            ? { ...q, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
            : q
        )
      )
    } finally {
      setUploading(false)
    }
  }

  const pendingCount = queue.filter((q) => q.status === 'uploading').length

  return (
    <section id="upload" className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
        <p className="text-gray-500 mt-1">
          Upload maritime documents for AI-powered OCR extraction and classification
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200 group
          ${isDragActive
            ? 'border-ocean-500 bg-ocean-50 scale-[1.01]'
            : 'border-gray-200 bg-gray-50 hover:border-ocean-400 hover:bg-ocean-50/30'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
            ${isDragActive ? 'bg-ocean-100' : 'bg-white border border-gray-100 shadow-sm group-hover:bg-ocean-50'}
          `}>
            <CloudUpload className={`w-8 h-8 transition-colors ${isDragActive ? 'text-ocean-500' : 'text-gray-300 group-hover:text-ocean-400'}`} />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700">
              {isDragActive ? 'Drop files here…' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              or <span className="text-ocean-600 font-medium">browse files</span> from your computer
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {['PDF', 'JPG / PNG', 'DOCX', 'ODT', 'CSV'].map((fmt) => (
              <span key={fmt} className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-500 font-medium shadow-sm">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{queue.length} file(s) queued</h3>
            <button
              onClick={() => setQueue([])}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          </div>

          {queue.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {FILE_ICON_MAP[item.file.type] || <File className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{formatFileSize(item.file.size)}</span>
                      {item.status === 'uploading' && !uploading && (
                        <button
                          onClick={() => removeFromQueue(idx)}
                          className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ocean-500 to-maritime-600 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-500">{item.error}</p>
                  )}
                  {item.status === 'done' && (
                    <p className="text-xs text-green-600">Uploaded — AI processing started</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {pendingCount > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-maritime-700 to-ocean-600 text-white font-semibold rounded-xl
                hover:from-maritime-800 hover:to-ocean-700 transition-all duration-200 shadow-md
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {pendingCount} file(s)…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload {pendingCount} file(s)</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '📄', title: 'OCR Extraction', desc: 'PaddleOCR reads text from images and PDFs with confidence scoring' },
          { icon: '🤖', title: 'AI Classification', desc: 'Ollama LLM classifies document type and extracts structured fields' },
          { icon: '🗄️', title: 'Stored Securely', desc: 'Extracted data is stored in PostgreSQL and ready for port matching' },
        ].map((tip) => (
          <div key={tip.title} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl mb-2">{tip.icon}</div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{tip.title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">{tip.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
