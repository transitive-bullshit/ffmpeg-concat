'use strict'

const leftPad = require('left-pad')
const path = require('path')
const pMap = require('p-map')

const createContext = require('./context')

module.exports = async (opts) => {
  const {
    frameFormat,
    renders,
    // onProgress,
    outputDir,
    theme
  } = opts

  // how many transitions to render concurrently
  let concurrency = 4
  let contexts = []

  for (let i = 0; i < concurrency; ++i) {
    const ctx = await createContext({
      frameFormat,
      theme
    })

    contexts.push(ctx)
  }

  const framePatterns = await pMap(renders, async (render, index) => {
    const ctx = contexts.pop()
    const framePattern = await module.exports.renderTransition({
      ctx,
      render,
      frameFormat,
      index,
      outputDir
    })

    contexts.push(ctx)
    return framePattern
  }, {
    concurrency
  })

  for (let i = 0; i < contexts.length; ++i) {
    const ctx = contexts[i]
    await ctx.flush()
    await ctx.dispose()
  }

  return framePatterns
}

module.exports.renderTransition = async (opts) => {
  const {
    ctx,
    render,
    frameFormat,
    index,
    onProgress,
    outputDir
  } = opts

  const {
    scene,
    numFrames,
    sceneGetFrame,
    nextGetFrame
  } = render

  ctx.setTransition(scene.transition)

  for (let frame = 0; frame < numFrames; ++frame) {
    const fileName = `render-${index}-${leftPad(frame, 12, '0')}.${frameFormat}`
    const filePath = path.join(outputDir, fileName)

    const progress = frame / numFrames

    try {
      await ctx.render({
        imagePathFrom: sceneGetFrame(frame),
        imagePathTo: nextGetFrame(frame),
        progress: progress,
        params: scene.transition.params
      })
    } catch (err) {
      // stop at the first missing frame
      // TODO: output info in debug mode
      break
    }

    await ctx.capture(filePath)

    if (onProgress && frame % 8 === 0) {
      // TODO: re-add onProgress
      onProgress(progress)
    }
  }

  return path.join(outputDir, `render-${index}-%012d.${frameFormat}`)
}
