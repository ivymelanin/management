'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, AlertCircle } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-xl ring-1 ring-gray-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>
        </div>

        {state?.error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={action} className="space-y-4">
          <Input
            id="password"
            name="password"
            type="password"
            label="New password"
            placeholder="Min. 8 characters"
            required
          />
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            label="Confirm new password"
            placeholder="Repeat your password"
            required
          />
          <Button type="submit" loading={pending} className="w-full" size="lg">
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
