'use strict'

const createBuffer = require('gl-buffer')
const createTexture = require('gl-texture2d')
const createTransition = require('gl-transition').default
const getPixels = require('./get-pixels')
const transitions = require('gl-transitions')

module.exports = async (opts) => {
  const {
    name = 'directionalwarp',
    resizeMode = 'stretch',
    gl
  } = opts

  const buffer = createBuffer(gl,
    [ -1, -1, -1, 4, 4, -1 ],
    gl.ARRAY_BUFFER,
    gl.STATIC_DRAW
  )

  const transitionName = name.toLowerCase()
  const source = transitions.find(t => t.name.toLowerCase() === transitionName) ||
    transitions.find(t => t.name.toLowerCase() === 'fade')

  const transition = createTransition(gl, source, {
    resizeMode
  })

  return {
    draw: async ({
      imagePathFrom,
      imagePathTo,
      progress
    }) => {
      gl.clear(gl.COLOR_BUFFER_BIT)

      const dataFrom = await getPixels(imagePathFrom, {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight
      })

      const textureFrom = createTexture(gl, dataFrom)
      textureFrom.minFilter = gl.LINEAR
      textureFrom.magFilter = gl.LINEAR

      const dataTo = await getPixels(imagePathTo, {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight
      })
      const textureTo = createTexture(gl, dataTo)
      textureTo.minFilter = gl.LINEAR
      textureTo.magFilter = gl.LINEAR

      buffer.bind()
      transition.draw(progress, textureFrom, textureTo)

      textureFrom.dispose()
      textureTo.dispose()
    },

    dispose: () => {
      buffer.dispose()
      transition.dispose()
    }
  }
}
