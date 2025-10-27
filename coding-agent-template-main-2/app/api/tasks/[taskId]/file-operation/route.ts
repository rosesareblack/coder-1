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
    const { operation, sourceFile, targetPath } = body

    if (!operation || !sourceFile) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    // Get task from database and verify ownership
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

    // Get sandbox
    const { getSandbox } = await import('@/lib/sandbox/sandbox-registry')

    let sandbox = getSandbox(taskId)

    // Try to reconnect if not in registry
    if (!sandbox) {
      sandbox = await Sandbox.reconnect(task.sandboxId)
    }

    if (!sandbox) {
      return NextResponse.json({ success: false, error: 'Sandbox not found' }, { status: 404 })
    }

    // Determine target directory
    const targetFile = targetPath ? `${targetPath}/${sourceFile.split('/').pop()}` : sourceFile.split('/').pop()

    if (operation === 'copy') {
      // Copy file
      const copyProc = await sandbox.process.start({
        cmd: 'cp',
        args: ['-r', sourceFile, targetFile],
        cwd: PROJECT_DIR,
      })
      const copyResult = await copyProc.wait()

      if (copyResult.exitCode !== 0) {
        const stderr = copyResult.stderr
        console.error('Failed to copy file:', stderr)
        return NextResponse.json({ success: false, error: 'Failed to copy file' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'File copied successfully' })
    } else if (operation === 'cut') {
      // Move file
      const mvProc = await sandbox.process.start({
        cmd: 'mv',
        args: [sourceFile, targetFile],
        cwd: PROJECT_DIR,
      })
      const mvResult = await mvProc.wait()

      if (mvResult.exitCode !== 0) {
        const stderr = mvResult.stderr
        console.error('Failed to move file:', stderr)
        return NextResponse.json({ success: false, error: 'Failed to move file' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'File moved successfully' })
    } else {
      return NextResponse.json({ success: false, error: 'Invalid operation' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error performing file operation:', error)
    return NextResponse.json({ success: false, error: 'Failed to perform file operation' }, { status: 500 })
  }
}
