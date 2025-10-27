'use client'

import { PageHeader } from '@/components/page-header'
import { useTasks } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { GitHubStarsButton } from '@/components/github-stars-button'

export default function TaskLoading() {
  const { toggleSidebar } = useTasks()

  // Placeholder actions for loading state - no user avatar to prevent flash
  const loadingActions = (
    <div className="flex items-center gap-2 h-8">
      <GitHubStarsButton />
      {/* Empty spacer to reserve space for user avatar */}
      <div className="w-8" />
    </div>
  )

  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="p-3">
        <PageHeader showMobileMenu={true} onToggleMobileMenu={toggleSidebar} actions={loadingActions} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading task...</p>
        </div>
      </div>
    </div>
  )
}