'use strict'

const rmfr = require('rmfr')
const tempy = require('tempy')

const initFrames = require('./init-frames')
const renderFrames = require('./render-frames')
const transcodeVideo = require('./transcode-video')

const noop = () => { }

module.exports = async (opts) => {
  const {
    log = noop,
    concurrency = 4,
    frameFormat = 'raw',
    cleanupFrames = true,
    transition = undefined,
    transitions = undefined,
    audio = undefined,
    output,
    tempDir
  } = opts

  const videos = opts.videos.map(v => typeof v === 'string' ? { video: v } : v)

  const temp = tempDir || tempy.directory()

  console.time(`ffmpeg-concat`)

  try {
    console.time(`init-frames`)
    const {
      renders,
      scenes,
      theme
    } = await initFrames({
      log,
      concurrency,
      videos,
      transition,
      transitions,
      outputDir: temp,
      frameFormat
    })
    console.timeEnd(`init-frames`)

    console.time(`render-frames`)
    const framePatterns = await renderFrames({
      log,
      concurrency,
      outputDir: temp,
      frameFormat,
      renders,
      theme,
      onProgress: (p) => {
        log(`render ${(100 * p).toFixed()}%`)
      }
    })
    console.timeEnd(`render-frames`)

    console.time(`transcode-video`)
    await transcodeVideo({
      log,
      framePatterns,
      frameFormat,
      audio,
      output,
      scenes,
      theme,
      onProgress: (p) => {
        log(`transcode ${(100 * p).toFixed()}%`)
      }
    })
    console.timeEnd(`transcode-video`)
  } catch (err) {
    if (cleanupFrames) {
      await rmfr(temp)
    }

    console.timeEnd(`ffmpeg-concat`)
    throw err
  }

  if (cleanupFrames && !tempDir) {
    await rmfr(temp)
  }

  console.timeEnd(`ffmpeg-concat`)
}
