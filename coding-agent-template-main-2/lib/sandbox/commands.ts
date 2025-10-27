import { Sandbox, Process } from '@e2b/sdk'

// Project directory where repo is cloned
export const PROJECT_DIR = '/home/user/project'

export interface CommandResult {
  success: boolean
  exitCode?: number
  output?: string
  error?: string
  streamingLogs?: unknown[]
  command?: string
}

export interface StreamingCommandOptions {
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  onJsonLine?: (jsonData: unknown) => void
}

export async function runCommandInSandbox(
  sandbox: Sandbox,
  command: string,
  args: string[] = [],
  cwd: string = '/',
): Promise<CommandResult> {
  try {
    const proc = await sandbox.process.start({ cmd: command, args, cwd })
    const out = await proc.wait()

    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    return {
      success: out.exitCode === 0,
      exitCode: out.exitCode,
      output: out.stdout,
      error: out.stderr,
      command: fullCommand,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Command execution failed'
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
    return {
      success: false,
      error: errorMessage,
      command: fullCommand,
    }
  }
}

// Helper function to run command in project directory
export async function runInProject(sandbox: Sandbox, command: string, args: string[] = []): Promise<CommandResult> {
  return await runCommandInSandbox(sandbox, command, args, PROJECT_DIR)
}

export async function runStreamingCommandInSandbox(
  sandbox: Sandbox,
  command: string,
  args: string[] = [],
  options: StreamingCommandOptions = {},
): Promise<CommandResult> {
  try {
    const output: string[] = []
    const errorOutput: string[] = []

    const proc = await sandbox.process.start({
      cmd: command,
      args,
      cwd: PROJECT_DIR,
      onStdout: (data) => {
        output.push(data.line)
        if (options.onStdout) options.onStdout(data.line)
        if (options.onJsonLine) {
          try {
            const jsonData = JSON.parse(data.line)
            options.onJsonLine(jsonData)
          } catch (e) {
            // not a json line, ignore
          }
        }
      },
      onStderr: (data) => {
        errorOutput.push(data.line)
        if (options.onStderr) options.onStderr(data.line)
      },
    })

    const out = await proc.wait()

    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    return {
      success: out.exitCode === 0,
      exitCode: out.exitCode,
      output: output.join('\n'),
      error: errorOutput.join('\n'),
      command: fullCommand,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to run streaming command in sandbox'
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
    return {
      success: false,
      error: errorMessage,
      command: fullCommand,
    }
  }
}