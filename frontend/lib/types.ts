export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExtractedData {
  id: number
  document_id: number
  raw_text: string | null
  confidence_score: number | null
  structured_data: Record<string, unknown> | null
  document_type: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: number
  filename: string
  original_filename: string
  file_type: string
  file_size: number | null
  status: DocumentStatus
  task_id: string | null
  created_at: string
  updated_at: string
  extracted_data: ExtractedData | null
}

export interface Port {
  code: string
  name: string
  country: string
  region: string
}

export interface DocumentRequirement {
  doc_type: string
  display_name: string
  description: string
  mandatory: boolean
}

export interface PortRequirements {
  port_code: string
  port_name: string
  requirements: DocumentRequirement[]
}

export interface MatchedDocument {
  doc_type: string
  display_name: string
  mandatory: boolean
  matched: boolean
  document: Document | null
}

export interface PortMatchResult {
  origin_port: string
  destination_port: string
  required_documents: MatchedDocument[]
  matched_count: number
  total_required: number
}

export interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

export interface ClearanceDocument {
  id: number
  package_id: number
  document_id: number | null
  doc_type: string
  display_name: string
  mandatory: boolean
  matched: boolean
  original_filename: string | null
}

export interface ClearancePackage {
  id: number
  origin_port: string
  destination_port: string
  status: string
  total_required: number
  matched_count: number
  created_at: string
  documents: ClearanceDocument[]
}
