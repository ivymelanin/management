import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, AlertTriangle, Search } from 'lucide-react'
import { STATUS_COLORS, STATUS_LABELS, formatCurrency, formatDate } from '@/lib/utils'
import { DocumentStatus } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; type?: string }>
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select('*, uploader:profiles!user_id(full_name, email)')
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.type) query = query.eq('document_type', params.type)
  if (params.search) {
    query = query.or(
      `vendor_name.ilike.%${params.search}%,invoice_number.ilike.%${params.search}%,file_name.ilike.%${params.search}%`
    )
  }

  const { data: documents } = await query

  const statuses: DocumentStatus[] = ['pending', 'under_review', 'approved_1', 'approved_2', 'approved', 'rejected']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">{documents?.length ?? 0} documents total</p>
        </div>
        <Link
          href="/upload"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Upload
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search vendor, invoice #…"
            className="h-9 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          name="status"
          defaultValue={params.status || ''}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          name="type"
          defaultValue={params.type || ''}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All types</option>
          <option value="invoice">Invoice</option>
          <option value="credit_note">Credit Note</option>
        </select>

        <button
          type="submit"
          className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Filter
        </button>
        {(params.status || params.search || params.type) && (
          <Link
            href="/documents"
            className="h-9 flex items-center rounded-lg border border-gray-300 px-4 text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <Card>
        {!documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No documents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Document</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${doc.id}`} className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="max-w-[180px] truncate font-medium text-gray-900 hover:text-indigo-600">
                          {doc.file_name}
                        </span>
                        {doc.is_duplicate && (
                          <span title="Duplicate" className="inline-flex items-center">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{doc.vendor_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {doc.invoice_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(doc.document_date)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {doc.amount ? formatCurrency(doc.amount, doc.currency) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[doc.status as DocumentStatus]}>
                        {STATUS_LABELS[doc.status as DocumentStatus]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
