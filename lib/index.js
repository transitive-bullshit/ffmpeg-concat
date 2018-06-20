'use strict'

const fs = require('fs')
const path = require('path')
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
    videos,
    output,
    tempFramesDir = undefined
  } = opts

  console.time(`ffmpeg-concat`)

  let dir
  if(tempFramesDir){
    try{
      let joined = path.join(tempFramesDir, 'ffmpeg-concat-temp')
      dir = path.isAbsolute(joined) ? joined : path.resolve(joined)

      console.log(`creating temp frame directory ${dir}`)
      fs.mkdirSync(dir)
    } catch(e){
      console.error(e)
      dir = undefined
    }
  }

  const tempDir = dir || tempy.directory()

  try {
    console.time(`init-frames`)
    const {
      frames,
      theme
    } = await initFrames({
      log,
      concurrency,
      videos,
      transition,
      transitions,
      outputDir: tempDir,
      frameFormat
    })
    console.timeEnd(`init-frames`)

    console.time(`render-frames`)
    const framePattern = await renderFrames({
      log,
      concurrency,
      outputDir: tempDir,
      frameFormat,
      frames,
      theme,
      onProgress: (p) => {
        log(`render ${(100 * p).toFixed()}%`)
      }
    })
    console.timeEnd(`render-frames`)

    console.time(`transcode-video`)
    await transcodeVideo({
      log,
      framePattern,
      frameFormat,
      audio,
      output,
      theme,
      onProgress: (p) => {
        log(`transcode ${(100 * p).toFixed()}%`)
      }
    })
    console.timeEnd(`transcode-video`)
  } catch (err) {
    if (cleanupFrames) {
      await rmfr(tempDir)
    }

    console.timeEnd(`ffmpeg-concat`)
    throw err
  }

  if (cleanupFrames) {
    await rmfr(tempDir)
  }

  console.timeEnd(`ffmpeg-concat`)
}
