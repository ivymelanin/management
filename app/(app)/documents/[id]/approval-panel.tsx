'use client'

import { useState, useTransition } from 'react'
import { processApproval } from '@/app/actions/documents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentStatus, UserRole } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'

interface Step {
  id: string
  step: number
  status: string
  comments: string | null
  actioned_at: string | null
  approver: { full_name: string; email: string } | null
}

interface ApprovalPanelProps {
  documentId: string
  documentStatus: DocumentStatus
  steps: Step[]
  userRole: UserRole
  userId: string
}

const STEP_LABELS = ['', 'Reviewer', 'Manager', 'Finance / Admin']

export function ApprovalPanel({
  documentId,
  documentStatus,
  steps,
  userRole,
}: ApprovalPanelProps) {
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  const canAct = ['admin', 'approver'].includes(userRole)

  // Determine which step is currently active
  function getActiveStep(): number | null {
    if (documentStatus === 'under_review') return 1
    if (documentStatus === 'approved_1') return 2
    if (documentStatus === 'approved_2') return 3
    return null
  }

  const activeStep = getActiveStep()

  function handleAction(step: 1 | 2 | 3, action: 'approved' | 'rejected') {
    setError('')
    setSuccess('')
    startTransition(async () => {
      const result = await processApproval(documentId, step, action, comments)
      if (result?.error) setError(result.error)
      if (result?.success) {
        setSuccess(result.success)
        setComments('')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {[1, 2, 3].map((stepNum) => {
            const step = steps.find((s) => s.step === stepNum)
            const isActive = activeStep === stepNum
            const isCompleted = step?.status === 'approved'
            const isRejected = step?.status === 'rejected'

            return (
              <div
                key={stepNum}
                className={`rounded-lg border p-3 ${
                  isActive
                    ? 'border-indigo-300 bg-indigo-50'
                    : isCompleted
                    ? 'border-green-200 bg-green-50'
                    : isRejected
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : isRejected ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : isActive ? (
                      <Clock className="h-4 w-4 text-indigo-600 animate-pulse" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      Step {stepNum}: {STEP_LABELS[stepNum]}
                    </span>
                  </div>
                  <Badge
                    className={
                      isCompleted
                        ? 'bg-green-100 text-green-700'
                        : isRejected
                        ? 'bg-red-100 text-red-700'
                        : isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-500'
                    }
                  >
                    {step?.status || 'waiting'}
                  </Badge>
                </div>

                {step?.approver && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>{(step.approver as { full_name: string }).full_name}</span>
                    {step.actioned_at && (
                      <span className="ml-1">· {formatDateTime(step.actioned_at)}</span>
                    )}
                  </div>
                )}

                {step?.comments && (
                  <p className="mt-2 text-xs text-gray-600 italic">&ldquo;{step.comments}&rdquo;</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Action area */}
        {canAct && activeStep && documentStatus !== 'approved' && documentStatus !== 'rejected' && (
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700">
              Action Step {activeStep} ({STEP_LABELS[activeStep]})
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Comments (optional)…"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                loading={isPending}
                onClick={() => handleAction(activeStep as 1 | 2 | 3, 'approved')}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                loading={isPending}
                onClick={() => handleAction(activeStep as 1 | 2 | 3, 'rejected')}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {documentStatus === 'approved' && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Fully approved through all 3 stages
          </div>
        )}
        {documentStatus === 'rejected' && (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            Document was rejected
          </div>
        )}
      </CardContent>
    </Card>
  )
}
