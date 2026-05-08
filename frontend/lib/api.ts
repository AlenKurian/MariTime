import { Document, Port, PortMatchResult, PortRequirements, ExtractedData, ClearancePackage } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const err = await res.json()
      message = err.detail || JSON.stringify(err)
    } catch {}
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Documents
  async uploadDocuments(files: File[]): Promise<Document[]> {
    const form = new FormData()
    for (const file of files) {
      form.append('files', file)
    }
    const res = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: form,
    })
    return handleResponse<Document[]>(res)
  },

  async listDocuments(): Promise<Document[]> {
    const res = await fetch(`${BASE_URL}/api/documents`)
    return handleResponse<Document[]>(res)
  },

  async getDocument(id: number): Promise<Document> {
    const res = await fetch(`${BASE_URL}/api/documents/${id}`)
    return handleResponse<Document>(res)
  },

  async deleteDocument(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/documents/${id}`, { method: 'DELETE' })
    return handleResponse<void>(res)
  },

  getDownloadUrl(id: number): string {
    return `${BASE_URL}/api/documents/${id}/download`
  },

  getPreviewUrl(id: number): string {
    return `${BASE_URL}/api/documents/${id}/preview`
  },

  async getExtractedData(id: number): Promise<ExtractedData> {
    const res = await fetch(`${BASE_URL}/api/documents/${id}/extracted-data`)
    return handleResponse<ExtractedData>(res)
  },

  async updateExtractedData(
    id: number,
    data: { structured_data?: Record<string, unknown>; document_type?: string }
  ): Promise<ExtractedData> {
    const res = await fetch(`${BASE_URL}/api/documents/${id}/extracted-data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<ExtractedData>(res)
  },

  async getDocumentStatus(id: number): Promise<{ task_id: string; status: string }> {
    const res = await fetch(`${BASE_URL}/api/documents/${id}/status`)
    return handleResponse<{ task_id: string; status: string }>(res)
  },

  // Ports
  async listPorts(): Promise<Port[]> {
    const res = await fetch(`${BASE_URL}/api/ports`)
    return handleResponse<Port[]>(res)
  },

  async getPortRequirements(portCode: string): Promise<PortRequirements> {
    const res = await fetch(`${BASE_URL}/api/ports/${portCode}/requirements`)
    return handleResponse<PortRequirements>(res)
  },

  async matchDocuments(origin: string, destination: string): Promise<PortMatchResult> {
    const params = new URLSearchParams({ origin, destination })
    const res = await fetch(`${BASE_URL}/api/ports/match?${params}`)
    return handleResponse<PortMatchResult>(res)
  },

  // Clearance
  async confirmPackage(payload: {
    origin_port: string
    destination_port: string
    total_required: number
    matched_count: number
    documents: {
      document_id: number | null
      doc_type: string
      display_name: string
      mandatory: boolean
      matched: boolean
      original_filename: string | null
    }[]
  }): Promise<ClearancePackage> {
    const res = await fetch(`${BASE_URL}/api/clearance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleResponse<ClearancePackage>(res)
  },

  async listPackages(): Promise<ClearancePackage[]> {
    const res = await fetch(`${BASE_URL}/api/clearance`)
    return handleResponse<ClearancePackage[]>(res)
  },
}
