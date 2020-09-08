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
    const prevScene = scenes[i - 1]
    const thisScene = scenes[i]
    const nextScene = scenes[i + 1]

    thisScene.trimStart = (prevScene ? prevScene.transition.duration : 0) + thisScene.start

    // sanitize transition durations to never be longer than scene durations
    thisScene.transition.duration = Math.max(0, Math.min(thisScene.transition.duration, thisScene.duration - thisScene.trimStart))

    if (nextScene) {
      thisScene.transition.duration = Math.min(thisScene.transition.duration, nextScene.duration)
    }

    thisScene.trimEnd = thisScene.start + thisScene.duration - (nextScene ? thisScene.transition.duration : 0)
    thisScene.trimDuration = thisScene.trimEnd - thisScene.trimStart

    if (nextScene) {
      const sceneGetFrame = await module.exports.initFrames({
        log,
        prefix: `post-${i}`,
        frameFormat,
        outputDir,
        videoPath: thisScene.video,
        seek: thisScene.trimEnd,
        duration: thisScene.transition.duration,
        fps
      })

      const nextGetFrame = await module.exports.initFrames({
        log,
        prefix: `pre-${i}`,
        frameFormat,
        outputDir,
        videoPath: nextScene.video,
        seek: nextScene.start || 0,
        duration: thisScene.transition.duration,
        fps
      })

      const numFrames = Math.floor(thisScene.transition.duration * fps / 1000)

      renders.push({
        scene: thisScene,
        next: nextScene,
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
