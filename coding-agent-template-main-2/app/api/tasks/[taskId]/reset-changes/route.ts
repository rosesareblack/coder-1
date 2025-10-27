import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { tasks } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getServerSession } from '@/lib/session/get-server-session'
import { PROJECT_DIR } from '@/lib/sandbox/commands'
import { Sandbox } from '@e2b/sdk'

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params
    const body = await request.json()
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

    // Step 1: Check if there are local changes
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

    // Step 2: If there are changes, commit them first (before resetting)
    if (hasChanges) {
      // Add all changes
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

      // Commit changes
      const message = commitMessage || 'Checkpoint before reset'
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
    }

    // Step 3: Check if remote branch exists
    const lsRemoteProc = await sandbox.process.start({
      cmd: 'git',
      args: ['ls-remote', '--heads', 'origin', task.branchName],
      cwd: PROJECT_DIR,
    })
    const lsRemoteResult = await lsRemoteProc.wait()

    let resetTarget: string
    if (lsRemoteResult.exitCode === 0) {
      const lsRemoteOutput = lsRemoteResult.stdout
      const remoteBranchExists = lsRemoteOutput.trim().length > 0

      if (remoteBranchExists) {
        // Remote branch exists, fetch and reset to it
        const fetchProc = await sandbox.process.start({
          cmd: 'git',
          args: ['fetch', 'origin', task.branchName],
          cwd: PROJECT_DIR,
        })
        const fetchResult = await fetchProc.wait()

        if (fetchResult.exitCode !== 0) {
          const stderr = fetchResult.stderr
          console.error('Failed to fetch from remote:', stderr)
          return NextResponse.json({ success: false, error: 'Failed to fetch from remote' }, { status: 500 })
        }

        // Use FETCH_HEAD which contains the just-fetched branch
        resetTarget = 'FETCH_HEAD'
      } else {
        // Remote branch doesn't exist yet, reset to local branch's last commit
        resetTarget = 'HEAD'
      }
    } else {
      // If ls-remote fails, try to reset to local HEAD as fallback
      resetTarget = 'HEAD'
    }

    // Step 4: Reset to determined target (hard reset)
    const resetProc = await sandbox.process.start({
      cmd: 'git',
      args: ['reset', '--hard', resetTarget],
      cwd: PROJECT_DIR,
    })
    const resetResult = await resetProc.wait()

    if (resetResult.exitCode !== 0) {
      const stderr = resetResult.stderr
      console.error('Failed to reset:', stderr)
      return NextResponse.json({ success: false, error: 'Failed to reset changes' }, { status: 500 })
    }

    // Step 5: Clean untracked files
    const cleanProc = await sandbox.process.start({
      cmd: 'git',
      args: ['clean', '-fd'],
      cwd: PROJECT_DIR,
    })
    const cleanResult = await cleanProc.wait()

    if (cleanResult.exitCode !== 0) {
      const stderr = cleanResult.stderr
      console.error('Failed to clean:', stderr)
      // Don't fail the operation if clean fails
    }

    return NextResponse.json({
      success: true,
      message: 'Changes reset successfully to match remote branch',
      hadLocalChanges: hasChanges,
    })
  } catch (error) {
    console.error('Error resetting changes:', error)

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
        error: 'An error occurred while resetting changes',
      },
      { status: 500 },
    )
  }
}
