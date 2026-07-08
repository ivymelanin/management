'use client'

import { useTransition, useState } from 'react'
import { updateUserRole } from '@/app/actions/documents'
import { UserRole } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/utils'

export function RoleChanger({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value
    setSaved(false)
    startTransition(async () => {
      await updateUserRole(userId, newRole)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const roles: UserRole[] = ['admin', 'approver', 'uploader', 'viewer']

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={isPending}
        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs focus:border-indigo-500 focus:outline-none disabled:opacity-50"
      >
        {roles.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
      {isPending && <span className="text-xs text-gray-400">Saving…</span>}
      {saved && <span className="text-xs text-green-600">✓ Saved</span>}
    </div>
  )
}
