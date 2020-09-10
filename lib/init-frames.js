'use strict'

const ffmpegProbe = require('ffmpeg-probe')
const leftPad = require('left-pad')
const path = require('path')
const pMap = require('p-map')

const extractVideoFrames = require('./extract-video-frames')

module.exports = async (opts) => {
  const {
    concurrency,
    log,
    videos,
    transition,
    transitions,
    frameFormat,
    outputDir
  } = opts

  if (transitions && videos.length - 1 !== transitions.length) {
    throw new Error('number of transitions must equal number of videos minus one')
  }

  const scenes = await pMap(videos, (video, index) => {
    return module.exports.initScene({
      index,
      videos,
      transition,
      transitions
    })
  }, {
    concurrency
  })

  // first video dictates dimensions and fps
  const {
    width,
    height,
    fps
  } = scenes[0]

  const renders = []

  for (let i = 0; i < scenes.length; ++i) {
    const prev = scenes[i - 1]
    const scene = scenes[i]
    const next = scenes[i + 1]

    scene.trimStart = (prev ? prev.transition.duration : 0) + scene.start

    // sanitize transition durations to never be longer than scene durations
    scene.transition.duration = Math.max(0, Math.min(scene.transition.duration, scene.duration - (prev ? prev.transition.duration : 0)))

    if (next) {
      scene.transition.duration = Math.min(scene.transition.duration, next.duration)
    }

    scene.trimEnd = scene.start + scene.duration - (next ? scene.transition.duration : 0)
    scene.trimDuration = scene.trimEnd - scene.trimStart

    if (next) {
      const sceneGetFrame = await module.exports.initFrames({
        log,
        prefix: `post-${i}`,
        frameFormat,
        outputDir,
        videoPath: scene.video,
        seek: scene.trimEnd,
        duration: scene.transition.duration,
        fps
      })

      const nextGetFrame = await module.exports.initFrames({
        log,
        prefix: `pre-${i}`,
        frameFormat,
        outputDir,
        videoPath: next.video,
        seek: next.start || 0,
        duration: scene.transition.duration,
        fps
      })

      const numFrames = Math.floor(scene.transition.duration * fps / 1000)

      renders.push({
        scene,
        next,
        numFrames,
        sceneGetFrame,
        nextGetFrame
      })
    }
  }

  const duration = scenes.reduce((sum, scene, index) => (
    scene.duration + sum - scene.transition.duration
  ), 0)

  return {
    renders,
    scenes,
    theme: {
      duration,
      width,
      height,
      fps
    }
  }
}

module.exports.initScene = async (opts) => {
  const {
    index,
    videos,
    transition,
    transitions
  } = opts

  const video = videos[index]
  const probe = await ffmpegProbe(video.video)

  const scene = {
    video: video.video,
    index,
    width: probe.width,
    height: probe.height,
    start: video.start || 0,
    duration: video.duration == null
      ? probe.duration - (video.start == null ? 0 : video.start)
      : video.duration,
    fps: probe.fps
  }

  const t = (transitions ? transitions[index] : transition)
  scene.transition = {
    name: 'fade',
    duration: 500,
    params: { },
    ...t
  }

  if (index >= videos.length - 1) {
    scene.transition.duration = 0
  }

  return scene
}

module.exports.initFrames = async (opts) => {
  const {
    log,
    prefix,
    frameFormat,
    outputDir,
    videoPath,
    seek,
    duration,
    fps
  } = opts

  const fileNamePattern = `scene-${prefix}-%012d.${frameFormat}`
  const framePattern = path.join(outputDir, fileNamePattern)
  await extractVideoFrames({
    log,
    videoPath,
    framePattern,
    seek,
    duration,
    fps
  })

  return (frame) => {
    return framePattern.replace('%012d', leftPad(frame, 12, '0'))
  }
}
