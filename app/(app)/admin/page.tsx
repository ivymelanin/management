import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/utils'
import { UserRole } from '@/lib/types'
import { RoleChanger } from './role-changer'
import { Users } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700',
    approver: 'bg-blue-100 text-blue-700',
    viewer: 'bg-gray-100 text-gray-700',
    uploader: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage user accounts and role assignments.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {(['admin', 'approver', 'uploader', 'viewer'] as UserRole[]).map((role) => {
          const count = users?.filter((u) => u.role === role).length ?? 0
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className={`mb-2 inline-flex rounded-lg px-2 py-1 text-xs font-medium ${roleColors[role]}`}>
                  {ROLE_LABELS[role]}
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">user{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" />
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Current Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                          {(u.full_name || u.email)?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.full_name || '—'}</span>
                        {u.id === user.id && (
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">You</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleColors[u.role as UserRole]}>
                        {ROLE_LABELS[u.role as UserRole]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== user.id ? (
                        <RoleChanger userId={u.id} currentRole={u.role as UserRole} />
                      ) : (
                        <span className="text-xs text-gray-400">Cannot change own role</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role permissions legend */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                role: 'admin',
                perms: ['Full access', 'User management', 'Upload documents', 'Approve all steps', 'View reports', 'Delete documents'],
              },
              {
                role: 'approver',
                perms: ['Upload documents', 'Approve/Reject (all 3 steps)', 'View all documents', 'View reports'],
              },
              {
                role: 'uploader',
                perms: ['Upload documents', 'View own documents', 'View all documents'],
              },
              {
                role: 'viewer',
                perms: ['View all documents', 'View reports', 'Read-only access'],
              },
            ].map(({ role, perms }) => (
              <div key={role} className="rounded-lg bg-gray-50 p-4">
                <div className={`mb-3 inline-flex rounded-lg px-2 py-1 text-xs font-medium ${roleColors[role as UserRole]}`}>
                  {ROLE_LABELS[role as UserRole]}
                </div>
                <ul className="space-y-1">
                  {perms.map((p) => (
                    <li key={p} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="mt-0.5 text-green-500">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
