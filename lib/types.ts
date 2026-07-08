export type UserRole = 'admin' | 'approver' | 'viewer' | 'uploader'

export type DocumentType = 'invoice' | 'credit_note'

export type DocumentStatus =
  | 'pending'
  | 'under_review'
  | 'approved_1'
  | 'approved_2'
  | 'approved'
  | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  file_name: string
  file_url: string
  file_type: string
  document_type: DocumentType
  status: DocumentStatus
  vendor_name: string | null
  invoice_number: string | null
  document_date: string | null
  amount: number | null
  vat_amount: number | null
  currency: string
  is_duplicate: boolean
  duplicate_of: string | null
  ai_extracted: boolean
  ai_confidence: number | null
  notes: string | null
  created_at: string
  updated_at: string
  uploader?: Profile
}

export interface ApprovalStep {
  id: string
  document_id: string
  step: 1 | 2 | 3
  status: 'pending' | 'approved' | 'rejected'
  approver_id: string | null
  approver?: Profile
  comments: string | null
  actioned_at: string | null
  created_at: string
}

export interface Report {
  total_documents: number
  total_amount: number
  total_vat: number
  approved_count: number
  rejected_count: number
  pending_count: number
  by_vendor: VendorSummary[]
  by_status: StatusSummary[]
  by_month: MonthSummary[]
  duplicates_count: number
}

export interface VendorSummary {
  vendor_name: string
  count: number
  total_amount: number
  total_vat: number
}

export interface StatusSummary {
  status: DocumentStatus
  count: number
  total_amount: number
}

export interface MonthSummary {
  month: string
  count: number
  total_amount: number
}

export interface ReportFilters {
  date_from?: string
  date_to?: string
  vendor_name?: string
  status?: DocumentStatus | ''
  document_type?: DocumentType | ''
  amount_min?: number
  amount_max?: number
}

export interface AiInsight {
  type: 'anomaly' | 'trend' | 'spending' | 'duplicate_risk'
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  value?: string | number
}
