import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  bill_of_lading: 'Bill of Lading',
  commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  certificate_of_origin: 'Certificate of Origin',
  phytosanitary_certificate: 'Phytosanitary Certificate',
  health_certificate: 'Health Certificate',
  dangerous_goods_declaration: 'Dangerous Goods Declaration',
  customs_declaration: 'Customs Declaration',
  generic: 'Generic Document',
}

export function getDocTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] || docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
