'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, undefined)

  return (
    <div className="rounded-2xl bg-white px-8 py-10 shadow-xl ring-1 ring-gray-200">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join DocManager to manage your documents</p>
      </div>

      {state?.error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <form action={action} className="space-y-4">
        <Input
          id="full_name"
          name="full_name"
          type="text"
          label="Full name"
          placeholder="John Smith"
          autoComplete="name"
          required
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          required
        />

        <Button type="submit" loading={pending} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}
