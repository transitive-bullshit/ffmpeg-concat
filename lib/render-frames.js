'use strict'

const fs = require('fs')
const leftPad = require('left-pad')
const path = require('path')

const createContext = require('./context')
const extractVideoFrames = require('./extract-video-frames')

module.exports = async (opts) => {
  const {
    outputDir,
    onProgress,
    frameFormat,
    theme
  } = opts

  const numFrames = Math.floor(theme.duration * theme.fps / 1000)

  console.time(`render-frames ${numFrames}`)

  const ctx = await createContext({
    frameFormat,
    theme
  })

  let current = await module.exports.initScene({
    ...opts,
    index: 0
  })

  let next = null

  for (let frame = 0; frame < numFrames; ++frame) {
    const fileName = `${leftPad(frame, 12, '0')}.${frameFormat}`
    const filePath = path.join(outputDir, fileName)

    let cFrame = frame - current.frameStart

    if (cFrame >= current.numFrames) {
      if (!next) {
        next = await module.exports.initScene({
          ...opts,
          index: current.index + 1,
          frameStart: frame
        })
      }

      current = next
      next = null
      if (!current) break

      cFrame = frame - current.frameStart
    }

    if (!current) break

    const cFramePath = current.getFrame(cFrame)

    if (cFrame < current.numFramesPreTransition) {
      fs.copyFileSync(cFramePath, filePath)
    } else {
      if (!next) {
        next = await module.exports.initScene({
          ...opts,
          index: current.index + 1,
          frameStart: frame
        })

        if (!next) {
          break
        }

        // TODO: support different transitions per-scene
        await ctx.setTransition(current.scene.transition)
      }

      const nFrame = frame - next.frameStart
      const nFramePath = next.getFrame(nFrame)
      const cProgress = (cFrame - current.numFramesPreTransition) / current.numFramesTransition

      await ctx.render({
        imagePathFrom: cFramePath,
        imagePathTo: nFramePath,
        progress: cProgress
      })

      await ctx.capture(filePath)
      await ctx.flush()
    }

    if (onProgress && frame % 5 === 0) {
      onProgress(frame / numFrames)
    }
  }

  await ctx.flush()
  await ctx.dispose()
  console.timeEnd(`render-frames ${numFrames}`)

  const framePattern = path.join(outputDir, `%012d.${frameFormat}`)
  return framePattern
}

module.exports.initScene = async (opts) => {
  const {
    frameStart = 0,
    frameFormat,
    outputDir,
    scenes,
    theme,
    index
  } = opts

  const scene = scenes[index]
  if (!scene) return

  const fileNamePattern = `scene-${index}-%012d.${frameFormat}`
  const framePattern = path.join(outputDir, fileNamePattern)
  await extractVideoFrames({
    videoPath: scene.video,
    framePattern
  })

  const getFrame = (frame) => {
    return framePattern.replace('%012d', leftPad(frame, 12, '0'))
  }

  let numFrames = Math.floor(scene.duration * theme.fps / 1000)

  // guard to ensure we only use frames that exist
  while (numFrames > 0) {
    if (fs.existsSync(getFrame(numFrames - 1))) {
      break
    } else {
      numFrames--
    }
  }

  const numFramesTransition = Math.floor(scene.transition.duration * theme.fps / 1000)
  const numFramesPreTransition = Math.max(0, numFrames - numFramesTransition)

  return {
    index,
    scene,
    frame: 0,
    frameStart,
    numFrames,
    numFramesTransition,
    numFramesPreTransition,
    getFrame
  }
}
