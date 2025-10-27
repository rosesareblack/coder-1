import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { tasks } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getServerSession } from '@/lib/session/get-server-session'
import { PROJECT_DIR } from '@/lib/sandbox/commands'
import { Sandbox } from '@e2b/sdk'

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params
    const body = await request.json().catch(() => ({}))
    const { commitMessage } = body

    // Get task from database and verify ownership (exclude soft-deleted)
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id), isNull(tasks.deletedAt)))
      .limit(1)

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    if (!task.sandboxId) {
      return NextResponse.json({ success: false, error: 'Sandbox not available' }, { status: 400 })
    }

    if (!task.branchName) {
      return NextResponse.json({ success: false, error: 'Branch not available' }, { status: 400 })
    }

    // Get sandbox
    const { getSandbox } = await import('@/lib/sandbox/sandbox-registry')

    let sandbox = getSandbox(taskId)

    // Try to reconnect if not in registry
    if (!sandbox) {
      sandbox = await Sandbox.reconnect(task.sandboxId)
    }

    if (!sandbox) {
      return NextResponse.json({ success: false, error: 'Sandbox not found or inactive' }, { status: 400 })
    }

    // Step 1: Add all changes
    const addProc = await sandbox.process.start({
      cmd: 'git',
      args: ['add', '.'],
      cwd: PROJECT_DIR,
    })
    const addResult = await addProc.wait()

    if (addResult.exitCode !== 0) {
      const stderr = addResult.stderr
      console.error('Failed to add changes:', stderr)
      return NextResponse.json({ success: false, error: 'Failed to add changes' }, { status: 500 })
    }

    // Step 2: Check if there are changes to commit
    const statusProc = await sandbox.process.start({
      cmd: 'git',
      args: ['status', '--porcelain'],
      cwd: PROJECT_DIR,
    })
    const statusResult = await statusProc.wait()

    if (statusResult.exitCode !== 0) {
      const stderr = statusResult.stderr
      console.error('Failed to check status:', stderr)
      return NextResponse.json({ success: false, error: 'Failed to check status' }, { status: 500 })
    }

    const statusOutput = statusResult.stdout
    const hasChanges = statusOutput.trim().length > 0

    if (!hasChanges) {
      return NextResponse.json({
        success: true,
        message: 'No changes to sync',
        committed: false,
        pushed: false,
      })
    }

    // Step 3: Commit changes
    const message = commitMessage || 'Sync local changes'
    const commitProc = await sandbox.process.start({
      cmd: 'git',
      args: ['commit', '-m', message],
      cwd: PROJECT_DIR,
    })
    const commitResult = await commitProc.wait()

    if (commitResult.exitCode !== 0) {
      const stderr = commitResult.stderr
      console.error('Failed to commit changes:', stderr)
      return NextResponse.json({ success: false, error: 'Failed to commit changes' }, { status: 500 })
    }

    // Step 4: Push changes
    const pushProc = await sandbox.process.start({
      cmd: 'git',
      args: ['push', 'origin', task.branchName],
      cwd: PROJECT_DIR,
    })
    const pushResult = await pushProc.wait()

    if (pushResult.exitCode !== 0) {
      const stderr = pushResult.stderr
      console.error('Failed to push changes:', stderr)
      return NextResponse.json({ success: false, error: 'Failed to push changes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Changes synced successfully',
      committed: true,
      pushed: true,
    })
  } catch (error) {
    console.error('Error syncing changes:', error)

    // Check if it's a 410 error (sandbox not running)
    if (error && typeof error === 'object' && 'status' in error && error.status === 410) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sandbox is not running',
        },
        { status: 410 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while syncing changes',
      },
      { status: 500 },
    )
  }
}
