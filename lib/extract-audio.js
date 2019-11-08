'use strict'

const ffmpeg = require('fluent-ffmpeg')

module.exports = (opts) => {
  const {
    log,
    videoPath,
    outputFileName,
    start,
    duration
  } = opts

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('start', cmd => log({ cmd }))
      .on('end', () => resolve(outputFileName))
      .on('error', (err) => reject(err))
    if (start) {
      cmd.seekInput(start)
    }
    if (duration) {
      cmd.duration(duration)
    }
    cmd.save(outputFileName)
  })
}
