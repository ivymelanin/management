import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { formatCurrency, formatDateTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'
import { DocumentStatus } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user!.id)
    .single()

  // Fetch document stats
  const { data: docs } = await supabase
    .from('documents')
    .select('id, status, amount, is_duplicate, created_at, vendor_name, file_name, document_type')
    .order('created_at', { ascending: false })

  const total = docs?.length ?? 0
  const pending = docs?.filter((d) => ['pending', 'under_review', 'approved_1', 'approved_2'].includes(d.status)).length ?? 0
  const approved = docs?.filter((d) => d.status === 'approved').length ?? 0
  const rejected = docs?.filter((d) => d.status === 'rejected').length ?? 0
  const duplicates = docs?.filter((d) => d.is_duplicate).length ?? 0
  const totalAmount = docs?.reduce((sum, d) => sum + (d.amount || 0), 0) ?? 0

  const recentDocs = docs?.slice(0, 6) ?? []

  const stats = [
    { label: 'Total Documents', value: total, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Approval', value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rejected', value: rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Duplicates', value: duplicates, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Value', value: formatCurrency(totalAmount), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name || user?.email}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your document management system.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className={`mb-3 inline-flex rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Documents</CardTitle>
          <Link href="/documents" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">No documents yet.</p>
              <Link
                href="/upload"
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Upload your first document
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{doc.file_name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {doc.vendor_name || 'Unknown vendor'} · {formatDateTime(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    {doc.is_duplicate && (
                      <Badge className="bg-orange-100 text-orange-700">Duplicate</Badge>
                    )}
                    <Badge className={STATUS_COLORS[doc.status as DocumentStatus]}>
                      {STATUS_LABELS[doc.status as DocumentStatus]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      {(profile?.role === 'admin' || profile?.role === 'approver' || profile?.role === 'uploader') && (
        <div className="flex gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <TrendingUp className="h-4 w-4" />
            View Reports
          </Link>
        </div>
      )}
    </div>
  )
}
