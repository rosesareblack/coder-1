import { Sandbox } from '@e2b/sdk'
import { validateEnvironmentVariables, createAuthenticatedRepoUrl } from './config'
import { runCommandInSandbox, runInProject, PROJECT_DIR } from './commands'
import { generateId } from '@/lib/utils/id'
import { SandboxConfig, SandboxResult } from './types'
import { redactSensitiveInfo } from '@/lib/utils/logging'
import { TaskLogger } from '@/lib/utils/task-logger'
import { detectPackageManager, installDependencies } from './package-manager'
import { registerSandbox } from './sandbox-registry'

// Helper function to run command and log it
async function runAndLogCommand(sandbox: Sandbox, command: string, args: string[], logger: TaskLogger, cwd?: string) {
  // Properly escape arguments for shell execution
  const escapeArg = (arg: string) => {
    // Escape single quotes by replacing ' with '\''
    return `'${arg.replace(/'/g, "'\\''")}'`
  }

  const fullCommand = args.length > 0 ? `${command} ${args.map(escapeArg).join(' ')}` : command
  const redactedCommand = redactSensitiveInfo(fullCommand)

  await logger.command(redactedCommand)

  let result
  if (cwd) {
    result = await runCommandInSandbox(sandbox, command, args, cwd)
  } else {
    result = await runCommandInSandbox(sandbox, command, args)
  }

  if (result && result.output && result.output.trim()) {
    const redactedOutput = redactSensitiveInfo(result.output.trim())
    await logger.info(redactedOutput)
  }

  if (result && !result.success && result.error) {
    const redactedError = redactSensitiveInfo(result.error)
    await logger.error(redactedError)
  }

  return result
}

export async function createSandbox(config: SandboxConfig, logger: TaskLogger): Promise<SandboxResult> {
  try {
    await logger.info('Processing repository URL')

    // Check for cancellation before starting
    if (config.onCancellationCheck && (await config.onCancellationCheck())) {
      await logger.info('Task was cancelled before sandbox creation')
      return { success: false, cancelled: true }
    }

    // Call progress callback if provided
    if (config.onProgress) {
      await config.onProgress(20, 'Validating environment variables...')
    }

    // Validate required environment variables
    const envValidation = validateEnvironmentVariables(config.selectedAgent, config.githubToken, config.apiKeys)
    if (!envValidation.valid) {
      throw new Error(envValidation.error!)
    }
    await logger.info('Environment variables validated')

    // Handle private repository authentication
    const authenticatedRepoUrl = createAuthenticatedRepoUrl(config.repoUrl, config.githubToken)
    await logger.info('Added GitHub authentication to repository URL')

    const timeoutMinutes = config.timeout ? parseInt(config.timeout.replace(/\D/g, '')) : 60
    const timeoutSeconds = timeoutMinutes * 60

    // Call progress callback before sandbox creation
    if (config.onProgress) {
      await config.onProgress(25, 'Validating configuration...')
    }

    let sandbox: Sandbox
    try {
      sandbox = await new Sandbox({
        template: 'base',
        apiKey: process.env.E2B_API_KEY,
        timeout: timeoutSeconds,
      })
      await logger.info('Sandbox created successfully')

      // Register the sandbox immediately for potential killing
      registerSandbox(config.taskId, sandbox, config.keepAlive || false)

      // Check for cancellation after sandbox creation
      if (config.onCancellationCheck && (await config.onCancellationCheck())) {
        await logger.info('Task was cancelled after sandbox creation')
        await sandbox.close()
        return { success: false, cancelled: true }
      }

      // Clone repository to /home/user/project
      await logger.info('Cloning repository to project directory...')

      // Create project directory
      const mkdirResult = await runCommandInSandbox(sandbox, 'mkdir', ['-p', PROJECT_DIR])
      if (mkdirResult.exitCode !== 0) {
        throw new Error('Failed to create project directory')
      }

      // Clone the repository with shallow clone
      const cloneResult = await runCommandInSandbox(sandbox, 'git', [
        'clone',
        '--depth',
        '1',
        authenticatedRepoUrl,
        PROJECT_DIR,
      ])

      if (cloneResult.exitCode !== 0) {
        await logger.error('Failed to clone repository')
        throw new Error('Failed to clone repository to project directory')
      }

      await logger.info('Repository cloned successfully')

      // Call progress callback after sandbox creation
      if (config.onProgress) {
        await config.onProgress(30, 'Repository cloned, installing dependencies...')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorName = error instanceof Error ? error.name : 'UnknownError'
      const errorCode =
        error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined

      // Check if this is a timeout error
      if (errorMessage?.includes('timeout') || errorCode === 'ETIMEDOUT' || errorName === 'TimeoutError') {
        await logger.error(`Sandbox creation timed out after 5 minutes`)
        await logger.error(`This usually happens when the repository is large or has many dependencies`)
        throw new Error('Sandbox creation timed out. Try with a smaller repository or fewer dependencies.')
      }

      await logger.error('Sandbox creation failed')
      throw error
    }

    // Install project dependencies (based on user preference)
    if (config.installDependencies !== false) {
      await logger.info('Detecting project type and installing dependencies...')
    } else {
      await logger.info('Skipping dependency installation as requested by user')
    }

    // Check for project type and install dependencies accordingly
    const packageJsonCheck = await runInProject(sandbox, 'test', ['-f', 'package.json'])
    const requirementsTxtCheck = await runInProject(sandbox, 'test', ['-f', 'requirements.txt'])

    if (config.installDependencies !== false) {
      if (packageJsonCheck.success) {
        // JavaScript/Node.js project
        await logger.info('package.json found, installing Node.js dependencies...')

        // Detect which package manager to use
        const packageManager = await detectPackageManager(sandbox, logger)

        // Install required package manager globally if needed
        if (packageManager === 'pnpm') {
          const pnpmCheck = await runInProject(sandbox, 'which', ['pnpm'])
          if (!pnpmCheck.success) {
            await logger.info('Installing pnpm globally...')
            const pnpmGlobalInstall = await runCommandInSandbox(sandbox, 'npm', ['install', '-g', 'pnpm'])
            if (!pnpmGlobalInstall.success) {
              await logger.error('Failed to install pnpm globally, falling back to npm')
              const npmResult = await installDependencies(sandbox, 'npm', logger)
              if (!npmResult.success) {
                await logger.info('Warning: Failed to install Node.js dependencies, but continuing with sandbox setup')
              }
            } else {
              await logger.info('pnpm installed globally')
            }
          }
        } else if (packageManager === 'yarn') {
          const yarnCheck = await runInProject(sandbox, 'which', ['yarn'])
          if (!yarnCheck.success) {
            await logger.info('Installing yarn globally...')
            const yarnGlobalInstall = await runCommandInSandbox(sandbox, 'npm', ['install', '-g', 'yarn'])
            if (!yarnGlobalInstall.success) {
              await logger.error('Failed to install yarn globally, falling back to npm')
              const npmResult = await installDependencies(sandbox, 'npm', logger)
              if (!npmResult.success) {
                await logger.info('Warning: Failed to install Node.js dependencies, but continuing with sandbox setup')
              }
            } else {
              await logger.info('yarn installed globally')
            }
          }
        }

        if (config.onProgress) {
          await config.onProgress(35, 'Installing Node.js dependencies...')
        }

        const installResult = await installDependencies(sandbox, packageManager, logger)

        if (config.onCancellationCheck && (await config.onCancellationCheck())) {
          await logger.info('Task was cancelled after dependency installation')
          return { success: false, cancelled: true }
        }

        if (!installResult.success && packageManager !== 'npm') {
          await logger.info('Package manager failed, trying npm as fallback')

          if (config.onProgress) {
            await config.onProgress(37, `${packageManager} failed, trying npm fallback...`)
          }

          const npmFallbackResult = await installDependencies(sandbox, 'npm', logger)
          if (!npmFallbackResult.success) {
            await logger.info('Warning: Failed to install Node.js dependencies, but continuing with sandbox setup')
          }
        } else if (!installResult.success) {
          await logger.info('Warning: Failed to install Node.js dependencies, but continuing with sandbox setup')
        }
      } else if (requirementsTxtCheck.success) {
        await logger.info('requirements.txt found, installing Python dependencies...')

        if (config.onProgress) {
          await config.onProgress(35, 'Installing Python dependencies...')
        }

        const pipCheck = await runInProject(sandbox, 'python3', ['-m', 'pip', '--version'])

        if (!pipCheck.success) {
          await logger.info('pip not found, installing pip...')
          const getPipResult = await runCommandInSandbox(sandbox, 'sh', [
            '-c',
            'cd /tmp && curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py && rm -f get-pip.py',
          ])

          if (!getPipResult.success) {
            await logger.info('Warning: Could not install pip, skipping Python dependencies')
          } else {
            await logger.info('pip installed successfully')
          }
        }

        const pipInstall = await runInProject(sandbox, 'python3', ['-m', 'pip', 'install', '-r', 'requirements.txt'])

        if (!pipInstall.success) {
          await logger.info('Warning: Failed to install Python dependencies, but continuing with sandbox setup')
        } else {
          await logger.info('Python dependencies installed successfully')
        }
      } else {
        await logger.info('No package.json or requirements.txt found, skipping dependency installation')
      }
    }

    let domain: string | undefined
    let devPort = config.ports?.[0] || 3000

    if (packageJsonCheck.success && config.installDependencies) {
      const packageJsonRead = await runInProject(sandbox, 'cat', ['package.json'])
      if (packageJsonRead.success && packageJsonRead.output) {
        try {
          const packageJson = JSON.parse(packageJsonRead.output)
          const hasDevScript = packageJson?.scripts?.dev

          if (hasDevScript) {
            await logger.info('Dev script detected, starting development server...')

            const packageManager = await detectPackageManager(sandbox, logger)
            let devCommand = packageManager === 'npm' ? 'npm' : packageManager
            let devArgs = packageManager === 'npm' ? ['run', 'dev'] : ['dev']

            await sandbox.process.start({
              cmd: 'sh',
              args: ['-c', `cd ${PROJECT_DIR} && ${devCommand} ${devArgs.join(' ')}`],
              onStdout: (data) => logger.info(`[SERVER] ${data.line}`),
              onStderr: (data) => logger.info(`[SERVER] ${data.line}`),
            })

            await logger.info('Development server started')
            await new Promise((resolve) => setTimeout(resolve, 5000))
            domain = sandbox.getHostname(devPort)
            await logger.info('Development server is running')
          }
        } catch (parseError) {
          await logger.info('Could not parse package.json, skipping auto-start of dev server')
        }
      }
    }

    if (!domain) {
      domain = sandbox.getHostname(devPort)
    }

    if (config.onCancellationCheck && (await config.onCancellationCheck())) {
      await logger.info('Task was cancelled before Git configuration')
      return { success: false, cancelled: true }
    }

    const gitName = config.gitAuthorName || 'Coding Agent'
    const gitEmail = config.gitAuthorEmail || 'agent@example.com'
    await runInProject(sandbox, 'git', ['config', 'user.name', gitName])
    await runInProject(sandbox, 'git', ['config', 'user.email', gitEmail])

    const hasCommits = await runInProject(sandbox, 'git', ['rev-parse', 'HEAD'])
    if (!hasCommits.success) {
      await logger.info('Empty repository detected, creating initial main branch')
      const repoNameMatch = config.repoUrl.match(/\/([^\/]+?)(\.git)?$/)
      const repoName = repoNameMatch ? repoNameMatch[1] : 'repository'
      const readmeContent = `# ${repoName}\n`
      await sandbox.filesystem.write(`${PROJECT_DIR}/README.md`, readmeContent)
      await runInProject(sandbox, 'git', ['checkout', '-b', 'main'])
      await runInProject(sandbox, 'git', ['add', 'README.md'])
      await runInProject(sandbox, 'git', ['commit', '-m', 'Initial commit'])
      await logger.info('Created initial commit on main branch')
      const gitPush = await runInProject(sandbox, 'git', ['push', '-u', 'origin', 'main'])
      if (gitPush.success) await logger.info('Pushed main branch to origin')
    }

    let branchName: string
    if (config.preDeterminedBranchName) {
      await logger.info('Using pre-determined branch name')
      branchName = config.preDeterminedBranchName
      const branchExistsRemote = await runInProject(sandbox, 'git', [
        'ls-remote',
        '--heads',
        'origin',
        branchName,
      ])

      if (branchExistsRemote.success && branchExistsRemote.output?.trim()) {
        await logger.info('Branch exists on remote, checking it out')
        await runAndLogCommand(sandbox, 'git', ['checkout', branchName], logger, PROJECT_DIR)
      } else {
        await logger.info('Creating new branch')
        await runAndLogCommand(sandbox, 'git', ['checkout', '-b', branchName], logger, PROJECT_DIR)
      }
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const suffix = generateId()
      branchName = `agent/${timestamp}-${suffix}`
      await logger.info('No predetermined branch name, using timestamp-based branch')
      await runAndLogCommand(sandbox, 'git', ['checkout', '-b', branchName], logger, PROJECT_DIR)
    }

    return {
      success: true,
      sandbox,
      domain,
      branchName,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Sandbox creation error:', error)
    await logger.error('Error occurred during sandbox creation')

    return {
      success: false,
      error: errorMessage || 'Failed to create sandbox',
    }
  }
}