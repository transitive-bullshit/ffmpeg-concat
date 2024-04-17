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

  if (verbose)
      console.time('ffmpeg-concat')

  try {
    if (verbose)
        console.time('init-frames')
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
    if (verbose)
        console.timeEnd('init-frames')

    if (verbose)
        console.time('render-frames')
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
    if (verbose)
        console.timeEnd('render-frames')

    if (verbose)
        console.time('render-audio')
    let concatAudioFile = audio
    if (!audio && scenes.filter(s => s.sourceAudioPath).length === scenes.length) {
      concatAudioFile = await renderAudio({
        log,
        scenes,
        outputDir: temp,
        fileName: 'audioConcat.mp3'
      })
    }
    if (verbose)
        console.timeEnd('render-audio')

    if (verbose)
        console.time('transcode-video')
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
    if (verbose)
        console.timeEnd('transcode-video')
  } catch (err) {
    if (cleanupFrames) {
      await rmfr(temp)
    }

    if (verbose)
        console.timeEnd('ffmpeg-concat')
    throw err
  }

  if (cleanupFrames && !tempDir) {
    await rmfr(temp)
  }

  if (verbose)
      console.timeEnd('ffmpeg-concat')
}
