'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/types'
import {
  LayoutDashboard,
  Upload,
  FileText,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/app/actions/auth'

interface SidebarProps {
  role: UserRole
  userEmail: string
  fullName: string
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'approver', 'viewer', 'uploader'] },
  { href: '/upload', label: 'Upload', icon: Upload, roles: ['admin', 'approver', 'uploader'] },
  { href: '/documents', label: 'Documents', icon: FileText, roles: ['admin', 'approver', 'viewer', 'uploader'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'approver', 'viewer'] },
  { href: '/admin', label: 'User Management', icon: Users, roles: ['admin'] },
]

export function Sidebar({ role, userEmail, fullName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 border-b border-gray-200 px-4 py-5', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">DocManager</p>
            <p className="truncate text-xs text-gray-500">Document System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + Sign out */}
      <div className="border-t border-gray-200 p-2">
        {!collapsed && (
          <div className="mb-2 rounded-lg bg-gray-50 px-3 py-2">
            <p className="truncate text-xs font-medium text-gray-900">{fullName || userEmail}</p>
            <p className="truncate text-xs text-gray-500">{role}</p>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
