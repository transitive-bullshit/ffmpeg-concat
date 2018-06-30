'use strict'

const ffmpeg = require('fluent-ffmpeg')

module.exports = (opts) => {
  const {
    videoPath,
    framePattern,
    seek,
    duration,
    fps
  } = opts

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath)

    if (seek) cmd.seek(seek / 1000)
    if (duration) cmd.setDuration(duration / 1000)

    cmd
      .outputOptions([
        '-pix_fmt', 'rgba',
        '-start_number', '0',
        '-r', fps
      ])
      .output(framePattern)
      .on('start', (cmd) => console.log({ cmd }))
      .on('end', () => resolve(framePattern))
      .on('error', (err) => reject(err))
      .run()
  })
}
