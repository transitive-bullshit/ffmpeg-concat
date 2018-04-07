'use strict'

const GL = require('gl')

const createFrameWriter = require('./frame-writer')
const createTransition = require('./transition')

module.exports = async (opts) => {
  const {
    frameFormat,
    theme
  } = opts

  const {
    width,
    height
  } = theme

  const gl = GL(width, height)

  if (!gl) {
    throw new Error('failed to create OpenGL context')
  }

  const frameWriter = await createFrameWriter({
    gl,
    width,
    height,
    frameFormat
  })

  const ctx = {
    gl,
    width,
    height,
    frameWriter,
    transition: null
  }

  ctx.setTransition = ({ name, resizeMode }) => {
    if (ctx.transition) {
      if (ctx.transition.name === name) {
        return
      }

      ctx.transition.dispose()
      ctx.transition = null
    }

    ctx.transition = createTransition({
      gl,
      name,
      resizeMode
    })
  }

  ctx.capture = ctx.frameWriter.write.bind(ctx.frameWriter)

  ctx.render = async (...args) => {
    if (ctx.transition) {
      return ctx.transition.draw(...args)
    }
  }

  ctx.flush = async () => {
    return ctx.frameWriter.flush()
  }

  ctx.dispose = async () => {
    if (ctx.transition) {
      ctx.transition.dispose()
      ctx.transition = null
    }

    gl.destroy()
  }

  return ctx
}
