'use strict'

const ffmpeg = require('fluent-ffmpeg')
const onTranscodeProgress = require('ffmpeg-on-progress')

module.exports = async (opts) => {
  const {
    log,
    audio,
    frameFormat,
    framePattern,
    onProgress,
    output,
    theme
  } = opts

  return new Promise((resolve, reject) => {
    const inputOptions = [
      '-framerate', theme.fps
    ]

    if (frameFormat === 'raw') {
      Array.prototype.push.apply(inputOptions, [
        '-vcodec', 'rawvideo',
        '-pixel_format', 'rgba',
        '-video_size', `${theme.width}x${theme.height}`
      ])
    }

    const cmd = ffmpeg(framePattern)
      .inputOptions(inputOptions)

    if (audio) {
      cmd.addInput(audio)
    }

    const outputOptions = []
      // misc
      .concat([
        '-hide_banner',
        '-map_metadata', '-1',
        '-map_chapters', '-1'
      ])

      // video
      .concat([
        '-c:v', 'libx264',
        '-profile:v', 'main',
        '-preset', 'medium',
        '-crf', '20',
        '-movflags', 'faststart',
        '-pix_fmt', 'yuv420p',
        '-r', theme.fps
      ])

      // audio
      .concat(!audio ? [ ] : [
        '-c:a', 'copy',
        '-shortest'
      ])

    if (onProgress) {
      cmd.on('progress', onTranscodeProgress(onProgress, theme.duration))
    }

    cmd
      .outputOptions(outputOptions)
      .output(output)
      .on('start', (cmd) => log({ cmd }))
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}
