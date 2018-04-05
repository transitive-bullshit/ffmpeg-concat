'use strict'

const ffmpegProbe = require('ffmpeg-probe')

module.exports = async (opts) => {
  const {
    videos,
    transition,
    transitions
  } = opts

  if (transitions && videos.length - 1 !== transitions.length) {
    throw new Error('number of transitions must equal number of videos minus one')
  }

  const scenes = videos.map((video) => ({ video }))

  for (let i = 0; i < scenes.length; ++i) {
    const scene = scenes[i]
    const probe = await ffmpegProbe(scene.video)

    scene.width = probe.width
    scene.height = probe.height
    scene.duration = probe.duration
    scene.numFrames = probe.streams[0].nb_frames

    const fps = probe.streams[0].avg_frame_rate
    scene.fps = parseInt(fps.substring(0, fps.indexOf('/')))

    const t = (transitions ? transitions[i] : transition)
    scene.transition = {
      name: 'fade',
      duration: 500,
      ...t
    }
  }

  const duration = scenes.reduce((sum, scene, index) => {
    const d = scene.duration + sum
    if (index < scenes.length - 1) {
      return d - scene.transition.duration
    } else {
      return d
    }
  }, 0)

  // first video dictates dimensions and fps
  const {
    width,
    height,
    fps
  } = scenes[0]

  return {
    scenes,
    theme: {
      duration,
      width,
      height,
      fps
    }
  }
}
