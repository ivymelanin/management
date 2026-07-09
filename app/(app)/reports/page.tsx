import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { ReportCharts } from './report-charts'
import { AiInsightsPanel } from './ai-insights-panel'
import { ExportButtons } from './export-buttons'
import { generateAiInsights } from '@/lib/ai/extractor'
import { TrendingUp, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    date_from?: string
    date_to?: string
    vendor?: string
    status?: string
    type?: string
  }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select('id, vendor_name, invoice_number, status, document_type, amount, vat_amount, currency, document_date, is_duplicate, created_at')

  if (params.date_from) query = query.gte('document_date', params.date_from)
  if (params.date_to) query = query.lte('document_date', params.date_to)
  if (params.vendor) query = query.ilike('vendor_name', `%${params.vendor}%`)
  if (params.status) query = query.eq('status', params.status)
  if (params.type) query = query.eq('document_type', params.type)

  const { data: docs } = await query.order('document_date', { ascending: true })

  // Build summary stats
  const totalAmount = docs?.reduce((s, d) => s + (d.amount || 0), 0) ?? 0
  const totalVat = docs?.reduce((s, d) => s + (d.vat_amount || 0), 0) ?? 0
  const total = docs?.length ?? 0
  const approved = docs?.filter((d) => d.status === 'approved').length ?? 0
  const rejected = docs?.filter((d) => d.status === 'rejected').length ?? 0
  const pending = docs?.filter((d) => !['approved', 'rejected'].includes(d.status)).length ?? 0
  const duplicates = docs?.filter((d) => d.is_duplicate).length ?? 0

  // By vendor
  const vendorMap = new Map<string, { count: number; total_amount: number; total_vat: number }>()
  docs?.forEach((d) => {
    const name = d.vendor_name || 'Unknown'
    const v = vendorMap.get(name) || { count: 0, total_amount: 0, total_vat: 0 }
    v.count++
    v.total_amount += d.amount || 0
    v.total_vat += d.vat_amount || 0
    vendorMap.set(name, v)
  })
  const byVendor = Array.from(vendorMap.entries())
    .map(([vendor_name, v]) => ({ vendor_name, ...v }))
    .sort((a, b) => b.total_amount - a.total_amount)

  // By month
  const monthMap = new Map<string, { count: number; total_amount: number }>()
  docs?.forEach((d) => {
    const date = d.document_date || d.created_at?.split('T')[0]
    if (!date) return
    const month = date.slice(0, 7) // YYYY-MM
    const m = monthMap.get(month) || { count: 0, total_amount: 0 }
    m.count++
    m.total_amount += d.amount || 0
    monthMap.set(month, m)
  })
  const byMonth = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // By status
  const statusMap = new Map<string, { count: number; total_amount: number }>()
  docs?.forEach((d) => {
    const s = statusMap.get(d.status) || { count: 0, total_amount: 0 }
    s.count++
    s.total_amount += d.amount || 0
    statusMap.set(d.status, s)
  })
  const byStatus = Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v }))

  // AI insights
  const insights = await generateAiInsights({
    total_amount: totalAmount,
    total_documents: total,
    by_vendor: byVendor,
    by_month: byMonth,
    duplicates_count: duplicates,
    pending_count: pending,
  })

  const reportData = { docs: docs || [], byVendor, byMonth, byStatus }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Financial overview and document insights</p>
        </div>
        <ExportButtons reportData={reportData} filters={params} />
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">From date</label>
          <input
            type="date"
            name="date_from"
            defaultValue={params.date_from}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">To date</label>
          <input
            type="date"
            name="date_to"
            defaultValue={params.date_to}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Vendor</label>
          <input
            type="text"
            name="vendor"
            defaultValue={params.vendor}
            placeholder="Search vendor…"
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select
            name="status"
            defaultValue={params.status || ''}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved_1">Approved (Step 1)</option>
            <option value="approved_2">Approved (Step 2)</option>
            <option value="approved">Fully Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Type</label>
          <select
            name="type"
            defaultValue={params.type || ''}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="invoice">Invoice</option>
            <option value="credit_note">Credit Note</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      </form>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Total Documents', value: total, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Spend', value: formatCurrency(totalAmount), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total VAT', value: formatCurrency(totalVat), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending', value: pending, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Duplicates', value: duplicates, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`mb-3 inline-flex rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <AiInsightsPanel insights={insights} />

      {/* Charts */}
      <ReportCharts byVendor={byVendor} byMonth={byMonth} byStatus={byStatus} />

      {/* Vendor table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vendor</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Documents</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total VAT</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Incl. VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byVendor.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No data available
                    </td>
                  </tr>
                ) : (
                  byVendor.map((row) => (
                    <tr key={row.vendor_name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.vendor_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{row.count}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(row.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(row.total_vat)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(row.total_amount + row.total_vat)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
