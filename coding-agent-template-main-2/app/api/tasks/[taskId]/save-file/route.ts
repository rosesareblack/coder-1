import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { tasks } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getServerSession } from '@/lib/session/get-server-session'
import { getSandbox } from '@/lib/sandbox/sandbox-registry'
import { Sandbox } from '@e2b/sdk'
import { PROJECT_DIR } from '@/lib/sandbox/commands'
// @ts-ignore
import { Buffer } from 'buffer'

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params
    const body = await request.json()
    const { filename, content } = body

    if (!filename || content === undefined) {
      return NextResponse.json({ error: 'Missing filename or content' }, { status: 400 })
    }

    // Get task from database and verify ownership (exclude soft-deleted)
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id), isNull(tasks.deletedAt)))
      .limit(1)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check if task has a sandbox
    if (!task.sandboxId) {
      return NextResponse.json({ error: 'Task does not have an active sandbox' }, { status: 400 })
    }

    // Try to get sandbox from registry first (keyed by taskId, not sandboxId)
    let sandbox = getSandbox(taskId)

    // If not in registry, try to reconnect using sandboxId from database
    if (!sandbox) {
      try {
        sandbox = await Sandbox.reconnect(task.sandboxId)
      } catch (error) {
        console.error('Failed to reconnect to sandbox:', error)
        return NextResponse.json({ error: 'Failed to connect to sandbox' }, { status: 500 })
      }
    }

    if (!sandbox) {
      return NextResponse.json({ error: 'Sandbox not available' }, { status: 400 })
    }

    try {
      // Escape filename for safe shell interpolation
      // This prevents shell injection attacks when filename contains special characters
      const escapedFilename = "'" + filename.replace(/'/g, "'\\''") + "'"

      // Encode content as base64 to safely handle arbitrary content including special characters
      // This prevents shell injection attacks when content contains sequences like 'EOF'
      const encodedContent = Buffer.from(content).toString('base64')

      // Write file using base64 decoding to avoid heredoc injection vulnerabilities
      // The base64-encoded content cannot contain shell metacharacters or newlines that would break the command
      const writeCommand = `echo '${encodedContent}' | base64 -d > ${escapedFilename}`

      const proc = await sandbox.process.start({
        cmd: 'sh',
        args: ['-c', writeCommand],
        cwd: PROJECT_DIR,
      })
      const result = await proc.wait()

      if (result.exitCode !== 0) {
        let stderr = result.stderr
        console.error('Failed to write file, stderr:', stderr)
        return NextResponse.json({ error: 'Failed to write file to sandbox' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'File saved successfully',
      })
    } catch (error) {
      console.error('Error writing file to sandbox:', error)
      return NextResponse.json({ error: 'Failed to write file to sandbox' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in save-file API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
