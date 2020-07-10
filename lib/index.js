'use strict'

const fs = require('fs-extra')
const rmfr = require('rmfr')
const tempy = require('tempy')

const initFrames = require('./init-frames')
const renderFrames = require('./render-frames')
const renderAudio = require('./render-audio')
const transcodeVideo = require('./transcode-video')

const noop = () => { }

module.exports = async (opts) => {
  const {
    args,
    log = noop,
    concurrency = 4,
    frameFormat = 'raw',
    cleanupFrames = true,
    transition = undefined,
    transitions = undefined,
    audio = undefined,
    videos,
    output,
    tempDir,
    verbose = false
  } = opts

  if (tempDir) {
    fs.ensureDirSync(tempDir)
  }

  const temp = tempDir || tempy.directory()

  console.time(`ffmpeg-concat`)

  try {
    console.time(`init-frames`)
    const {
      frames,
      scenes,
      theme
    } = await initFrames({
      log,
      concurrency,
      videos,
      transition,
      transitions,
      outputDir: temp,
      frameFormat,
      renderAudio: !audio,
      verbose
    })
    console.timeEnd(`init-frames`)

    console.time(`render-frames`)
    const framePattern = await renderFrames({
      log,
      concurrency,
      outputDir: temp,
      frameFormat,
      frames,
      theme,
      onProgress: (p) => {
        log(`render ${(100 * p).toFixed()}%`)
      }
    })
    console.timeEnd(`render-frames`)

    console.time(`render-audio`)
    let concatAudioFile = audio
    if (!audio && scenes.filter(s => s.sourceAudioPath).length === scenes.length) {
      concatAudioFile = await renderAudio({
        log,
        scenes,
        outputDir: temp,
        fileName: 'audioConcat.mp3'
      })
    }
    console.timeEnd(`render-audio`)

    console.time(`transcode-video`)
    await transcodeVideo({
      args,
      log,
      framePattern,
      frameFormat,
      audio: concatAudioFile,
      output,
      theme,
      verbose,
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
