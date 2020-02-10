'use strict'

const ffmpegProbe = require('ffmpeg-probe')
const fs = require('fs-extra')
const leftPad = require('left-pad')
const path = require('path')
const pMap = require('p-map')

const extractVideoFrames = require('./extract-video-frames')
const extractAudio = require('./extract-audio')

module.exports = async (opts) => {
  const {
    concurrency,
    log,
    videos,
    transition,
    transitions,
    frameFormat,
    outputDir,
    renderAudio = false,
    verbose
  } = opts

  if (transitions && videos.length - 1 !== transitions.length) {
    throw new Error(
      'number of transitions must equal number of videos minus one'
    )
  }

  const scenes = await pMap(
    videos,
    (video, index) => {
      return module.exports.initScene({
        log,
        index,
        videos,
        transition,
        transitions,
        frameFormat,
        outputDir,
        renderAudio,
        verbose
      })
    },
    {
      concurrency
    }
  )

  // first video dictates dimensions and fps
  const { width, height, fps } = scenes[0]

  const frames = []
  let numFrames = 0

  scenes.forEach((scene, index) => {
    scene.frameStart = numFrames

    scene.numFramesTransition = Math.floor(
      (scene.transition.duration * fps) / 1000
    )
    scene.numFramesPreTransition = Math.max(
      0,
      scene.numFrames - scene.numFramesTransition
    )

    numFrames += scene.numFramesPreTransition

    for (let frame = 0; frame < scene.numFrames; ++frame) {
      const cFrame = scene.frameStart + frame

      if (!frames[cFrame]) {
        const next =
          frame < scene.numFramesPreTransition ? undefined : scenes[index + 1]

        frames[cFrame] = {
          current: scene,
          next
        }
      }
    }
  })

  const duration = scenes.reduce(
    (sum, scene, index) => scene.duration + sum - scene.transition.duration,
    0
  )

  return {
    frames,
    scenes,
    theme: {
      numFrames,
      duration,
      width,
      height,
      fps
    }
  }
}

module.exports.initScene = async (opts) => {
  const {
    log,
    index,
    videos,
    transition,
    transitions,
    frameFormat,
    outputDir,
    renderAudio,
    verbose
  } = opts

  const video = videos[index]
  const probe = await ffmpegProbe(video)
  const format = (probe.format && probe.format.format_name) || 'unknown'

  if (!probe.streams || !probe.streams[0]) {
    throw new Error(`Unsupported input video format "${format}": ${video}`)
  }

  const scene = {
    video,
    index,
    width: probe.width,
    height: probe.height,
    duration: probe.duration,
    numFrames: parseInt(probe.streams[0].nb_frames),
    fps: probe.fps
  }

  if (isNaN(scene.numFrames) || isNaN(scene.duration)) {
    throw new Error(`Unsupported input video format "${format}": ${video}`)
  }

  if (verbose) {
    console.error(scene)
  }

  const t = transitions ? transitions[index] : transition
  scene.transition = {
    name: 'fade',
    duration: 500,
    params: {},
    ...t
  }

  if (index >= videos.length - 1) {
    scene.transition.duration = 0
  }

  const fileNamePattern = `scene-${index}-%012d.${frameFormat}`
  const audioFileName = `scene-${index}.mp3`
  const framePattern = path.join(outputDir, fileNamePattern)
  const audioPath = path.join(outputDir, audioFileName)
  await extractVideoFrames({
    log,
    videoPath: scene.video,
    framePattern,
    verbose
  })

  scene.getFrame = (frame) => {
    return framePattern.replace('%012d', leftPad(frame, 12, '0'))
  }

  // guard to ensure we only use frames that exist
  while (scene.numFrames > 0) {
    const frame = scene.getFrame(scene.numFrames - 1)
    const exists = await fs.pathExists(frame)

    if (exists) {
      break
    } else {
      scene.numFrames--
    }
  }

  if (
    renderAudio &&
    probe.streams &&
    probe.streams.filter((s) => s.codec_type === 'audio').length
  ) {
    const previousTransition =
      index > 0 && transitions ? transitions[index - 1] : transition
    const previousTransitionDuration =
      index === 0 ? 0 : previousTransition.duration || 500

    await extractAudio({
      log,
      videoPath: scene.video,
      outputFileName: audioPath,
      start: previousTransitionDuration / 2000,
      duration:
        scene.duration / 1000 -
        previousTransitionDuration / 2000 -
        scene.transition.duration / 2000
    })
    scene.sourceAudioPath = audioPath
  }

  return scene
}
