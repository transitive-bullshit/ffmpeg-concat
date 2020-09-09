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

    // https://trac.ffmpeg.org/wiki/Seeking
    //  input seek has been frame-accurate since 2.1.0 (Released 2013-10-28)
    if (seek) cmd.seekInput(seek / 1000)
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
