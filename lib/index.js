'use strict'

const rmfr = require('rmfr')
const tempy = require('tempy')

const initScenes = require('./init-scenes')
const renderFrames = require('./render-frames')
const transcodeVideo = require('./transcode-video')

const noop = () => { }

module.exports = async (opts) => {
  const {
    log = noop,
    frameFormat = 'raw',
    cleanupFrames = true,
    transition = undefined,
    transitions = undefined,
    videos,
    output
  } = opts

  const tempDir = tempy.directory()
  const {
    scenes,
    theme
  } = await initScenes({
    videos,
    transition,
    transitions
  })

  const framePattern = await renderFrames({
    log,
    outputDir: tempDir,
    frameFormat,
    scenes,
    theme,
    onProgress: (p) => {
      log(`render ${(100 * p).toFixed()}%`)
    }
  })

  await transcodeVideo({
    log,
    framePattern,
    frameFormat,
    output,
    theme,
    onProgress: (p) => {
      log(`transcode ${(100 * p).toFixed()}%`)
    }
  })

  if (cleanupFrames) {
    await rmfr(tempDir)
  }
}
