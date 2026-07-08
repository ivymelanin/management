import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_COLORS, STATUS_LABELS, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { DocumentStatus, UserRole } from '@/lib/types'
import { AlertTriangle, FileText, Sparkles, ExternalLink } from 'lucide-react'
import { ApprovalPanel } from './approval-panel'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const { data: doc } = await supabase
    .from('documents')
    .select('*, uploader:profiles!user_id(full_name, email)')
    .eq('id', id)
    .single()

  if (!doc) notFound()

  const { data: steps } = await supabase
    .from('approval_steps')
    .select('*, approver:profiles!approver_id(full_name, email)')
    .eq('document_id', id)
    .order('step', { ascending: true })

  const role = profile?.role as UserRole

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{doc.file_name}</h1>
            {doc.is_duplicate && (
              <Badge className="bg-orange-100 text-orange-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Duplicate
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Uploaded {formatDateTime(doc.created_at)} by{' '}
            {(doc.uploader as { full_name: string; email: string } | null)?.full_name || 'Unknown'}
          </p>
        </div>
        <Badge className={`text-sm ${STATUS_COLORS[doc.status as DocumentStatus]}`}>
          {STATUS_LABELS[doc.status as DocumentStatus]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Document info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Extracted Data */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <CardTitle>
                Extracted Data
                {doc.ai_extracted && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (AI confidence: {Math.round((doc.ai_confidence || 0) * 100)}%)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Document Type', value: doc.document_type.replace('_', ' ') },
                  { label: 'Vendor / Supplier', value: doc.vendor_name },
                  { label: 'Invoice Number', value: doc.invoice_number },
                  { label: 'Document Date', value: formatDate(doc.document_date) },
                  { label: 'Amount (excl. VAT)', value: doc.amount ? formatCurrency(doc.amount, doc.currency) : null },
                  { label: 'VAT Amount', value: doc.vat_amount ? formatCurrency(doc.vat_amount, doc.currency) : null },
                  {
                    label: 'Total (incl. VAT)',
                    value:
                      doc.amount && doc.vat_amount
                        ? formatCurrency(doc.amount + doc.vat_amount, doc.currency)
                        : null,
                  },
                  { label: 'Currency', value: doc.currency },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 capitalize">{value || '—'}</dd>
                  </div>
                ))}
              </dl>

              {doc.notes && (
                <div className="mt-4 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Notes</p>
                  <p className="mt-1 text-sm text-gray-700">{doc.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate warning */}
          {doc.is_duplicate && (
            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Duplicate Document Detected</p>
                <p className="mt-1 text-sm text-orange-700">
                  This document matches an existing record (same invoice number or vendor + amount combination).
                  Please review before approving.
                </p>
              </div>
            </div>
          )}

          {/* File preview link */}
          <Card>
            <CardHeader>
              <CardTitle>File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">{doc.file_type}</p>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Approval workflow */}
        <div>
          <ApprovalPanel
            documentId={doc.id}
            documentStatus={doc.status as DocumentStatus}
            steps={steps || []}
            userRole={role}
            userId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
