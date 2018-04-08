'use strict'

// TODO: this worker pool approach was an experiment that failed to yield any
// performance advantages. we should revert back to the straightforward version
// even though dis ist prettttyyyyyyy codezzzzzz.

const fs = require('fs')
const pRace = require('p-race')
const sharp = require('sharp')
const util = require('util')

const fsOpen = util.promisify(fs.open.bind(fs))
const fsWrite = util.promisify(fs.write.bind(fs))
const fsClose = util.promisify(fs.close.bind(fs))

const supportedFormats = new Set([
  'png',
  'jpg',
  'raw'
])

module.exports = async (opts) => {
  const {
    concurrency = 16,
    frameFormat = 'raw',
    gl,
    width,
    height
  } = opts

  if (!supportedFormats.has(frameFormat)) {
    throw new Error(`frame writer unsupported format "${frameFormat}"`)
  }

  let pool = []
  let inactive = []
  let active = { }

  for (let i = 0; i < concurrency; ++i) {
    const byteArray = new Uint8Array(width * height * 4)

    const worker = {
      id: i,
      byteArray,
      promise: null
    }

    if (frameFormat === 'png') {
      const buffer = Buffer.from(byteArray.buffer)
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
      const buffer = Buffer.from(byteArray.buffer)
      worker.encoder = sharp(buffer, {
        raw: {
          width,
          height,
          channels: 4
        }
      }).jpeg()
    }

    pool.push(worker)
    inactive.push(i)
  }

  const writeFrame = async ({ filePath, worker }) => {
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, worker.byteArray)

    try {
      if (frameFormat === 'raw') {
        const { byteArray } = worker
        const fd = await fsOpen(filePath, 'w')

        // write file in one large chunk
        await fsWrite(fd, byteArray)
        await fsClose(fd)
      } else {
        await new Promise((resolve, reject) => {
          worker.encoder.toFile(filePath, (err) => {
            if (err) reject(err)
            resolve()
          })
        })
      }
    } catch (err) {
      delete active[worker.id]
      inactive.push(worker.id)
      throw err
    }

    delete active[worker.id]
    inactive.push(worker.id)

    return filePath
  }

  const reserve = async () => {
    if (inactive.length) {
      const id = inactive.pop()
      const worker = pool[id]
      active[id] = worker
      return worker
    } else {
      await pRace(Object.values(active).map(v => v.promise))
      return reserve()
    }
  }

  return {
    write: async (filePath) => {
      const worker = await reserve()
      worker.promise = writeFrame({
        filePath,
        worker
      })
    },

    flush: async () => {
      return Promise.all(Object.values(active).map(v => v.promise))
    },

    dispose: () => {
      pool = null
      active = null
      inactive = null
    }
  }
}
