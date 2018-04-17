'use strict'

const fs = require('fs-extra')
const sharp = require('sharp')

const supportedFormats = new Set([
  'png',
  'jpg',
  'raw'
])

module.exports = async (opts) => {
  const {
    frameFormat = 'raw',
    gl,
    width,
    height
  } = opts

  if (!supportedFormats.has(frameFormat)) {
    throw new Error(`frame writer unsupported format "${frameFormat}"`)
  }

  let worker = {
    byteArray: new Uint8Array(width * height * 4),
    encoder: null
  }

  if (frameFormat === 'png') {
    const buffer = Buffer.from(worker.byteArray.buffer)
    worker.encoder = sharp(buffer, {
      raw: {
        width,
        height,
        channels: 4
      }
    }).png({
      compressionLevel: 0,
      adaptiveFiltering: false
    })
  } else if (frameFormat === 'jpg') {
    const buffer = Buffer.from(worker.byteArray.buffer)
    worker.encoder = sharp(buffer, {
      raw: {
        width,
        height,
        channels: 4
      }
    }).jpeg()
  }

  return {
    write: async (filePath) => {
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, worker.byteArray)

      if (frameFormat === 'raw') {
        fs.writeFileSync(filePath, worker.byteArray)
      } else {
        await new Promise((resolve, reject) => {
          worker.encoder.toFile(filePath, (err) => {
            if (err) reject(err)
            resolve()
          })
        })
      }
    },

    flush: async () => {
      return Promise.resolve()
    },

    dispose: () => {
      worker = null
    }
  }
}
