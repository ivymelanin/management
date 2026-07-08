import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DocumentStatus, UserRole } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved_1: 'Approved (Step 1)',
  approved_2: 'Approved (Step 2)',
  approved: 'Fully Approved',
  rejected: 'Rejected',
}

export const STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved_1: 'bg-cyan-100 text-cyan-800',
  approved_2: 'bg-teal-100 text-teal-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  approver: 'Approver',
  viewer: 'Viewer',
  uploader: 'Uploader',
}

export function getStepForStatus(status: DocumentStatus): number {
  switch (status) {
    case 'pending': return 0
    case 'under_review': return 1
    case 'approved_1': return 1
    case 'approved_2': return 2
    case 'approved': return 3
    case 'rejected': return -1
    default: return 0
  }
}

export function canApproveStep(role: UserRole, step: number): boolean {
  if (role === 'admin') return true
  if (role === 'approver') return step <= 3
  return false
}

export function isAllowedFileType(fileType: string, fileName: string): boolean {
  const allowedMimeTypes = [
    'application/pdf',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/tiff',
  ]
  const allowedExtensions = ['.pdf', '.csv', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff']
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  return allowedMimeTypes.includes(fileType) || allowedExtensions.includes(ext)
}
