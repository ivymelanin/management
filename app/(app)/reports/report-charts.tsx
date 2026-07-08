'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReportChartsProps {
  byVendor: Array<{ vendor_name: string; count: number; total_amount: number; total_vat: number }>
  byMonth: Array<{ month: string; count: number; total_amount: number }>
  byStatus: Array<{ status: string; count: number; total_amount: number }>
}

const STATUS_PIE_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  under_review: '#3B82F6',
  approved_1: '#06B6D4',
  approved_2: '#0D9488',
  approved: '#10B981',
  rejected: '#EF4444',
}

const STATUS_DISPLAY: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved_1: 'Step 1',
  approved_2: 'Step 2',
  approved: 'Approved',
  rejected: 'Rejected',
}

function formatAmount(value: number) {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}K`
  return `R${value.toFixed(0)}`
}

export function ReportCharts({ byVendor, byMonth, byStatus }: ReportChartsProps) {
  const topVendors = byVendor.slice(0, 8)
  const statusData = byStatus.map((s) => ({
    ...s,
    name: STATUS_DISPLAY[s.status] || s.status,
    fill: STATUS_PIE_COLORS[s.status] || '#94A3B8',
  }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Monthly trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {byMonth.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number) => [`R${val.toLocaleString()}`, 'Amount']}
                />
                <Line
                  type="monotone"
                  dataKey="total_amount"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ fill: '#6366F1', r: 4 }}
                  name="Total Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top vendors bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vendors by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {topVendors.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topVendors} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tickFormatter={formatAmount} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="vendor_name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip formatter={(val: number) => [`R${val.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="total_amount" fill="#6366F1" radius={[0, 4, 4, 0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Status pie chart */}
      <Card>
        <CardHeader>
          <CardTitle>Document Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number, name: string) => [val, name]} />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* VAT vs Amount */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Monthly Document Count</CardTitle>
        </CardHeader>
        <CardContent>
          {byMonth.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#A78BFA" radius={[4, 4, 0, 0]} name="Documents" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
