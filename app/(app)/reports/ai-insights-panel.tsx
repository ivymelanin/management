'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, AlertTriangle, TrendingUp, DollarSign, Copy } from 'lucide-react'

interface Insight {
  type: string
  title: string
  description: string
  severity: string
}

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
  critical: 'bg-red-50 border-red-200',
}

const SEVERITY_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  anomaly: AlertTriangle,
  trend: TrendingUp,
  spending: DollarSign,
  duplicate_risk: Copy,
}

export function AiInsightsPanel({ insights }: { insights: Insight[] }) {
  if (!insights || insights.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <CardTitle>AI-Powered Insights</CardTitle>
        <Badge className="bg-indigo-100 text-indigo-700 ml-auto">Powered by AI</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight, i) => {
            const Icon = TYPE_ICONS[insight.type] || Sparkles
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 ${SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                      <Badge className={`shrink-0 text-xs ${SEVERITY_BADGE[insight.severity] || SEVERITY_BADGE.info}`}>
                        {insight.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
