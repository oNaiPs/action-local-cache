import { setFailed } from '@actions/core'
import { mkdirP, mv, cp } from '@actions/io'
import { exists } from '@actions/io/lib/io-util'
import { spawn } from 'child_process'
import { promisify } from 'util'

import { getVars } from './lib/getVars'
import { isErrorLike } from './lib/isErrorLike'
import log from './lib/log'

const rsync = promisify(spawn)

async function post(): Promise<void> {
  try {
    const { cacheDir, targetPath, cachePath, options } = getVars()

    if (! await exists(targetPath)) {
      log.info(`Skipping cache target folder does not exist`)
      return
    } else if (options.cacheOnce && (await exists(cacheDir))) {
      log.info(`Skipping cache for already existing cache (cache-once=true)`)
      return
    }

    await mkdirP(cacheDir)
    if (options.copyStrategy === 'move') {
      await mv(targetPath, cachePath, { force: true })
    } else if (options.copyStrategy === 'copy') {
      await cp(targetPath, cachePath, { copySourceDirectory: true, force: true, recursive: true })
    } else if (options.copyStrategy === 'rsync') {
      await rsync('rsync', ['-avqR', targetPath, cacheDir], { stdio: 'inherit' })
    } else {
      setFailed(`Unknown copy strategy ${options.copyStrategy}`)
      return
    }

    log.info(`Cache saved to ${cachePath} with ${options.copyStrategy} strategy`)
  } catch (error: unknown) {
    log.trace(error)
    setFailed(isErrorLike(error) ? error.message : `unknown error: ${error}`)
  }
}

void post()
