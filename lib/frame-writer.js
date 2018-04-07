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

module.exports = async (opts) => {
  const {
    concurrency = 16,
    frameFormat = 'raw',
    gl,
    width,
    height
  } = opts

  if (frameFormat !== 'png' && frameFormat !== 'raw') {
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
    }

    pool.push(worker)
    inactive.push(i)
  }

  const writeFrame = async ({ filePath, worker }) => {
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, worker.byteArray)

    try {
      if (frameFormat === 'png') {
        await new Promise((resolve, reject) => {
          worker.encoder.toFile(filePath, (err) => {
            if (err) reject(err)
            resolve()
          })
        })
      } else {
        const { byteArray } = worker
        const fd = await fsOpen(filePath, 'w')

        /*
        // write file in 64k chunks
        const chunkSize = 2 ** 17
        let offset = 0

        while (offset < byteArray.byteLength) {
          const length = Math.min(chunkSize, byteArray.length - offset)

          await fsWrite(fd, byteArray, offset, length)
          offset += length
        }
        */

        // write file in one large chunk
        await fsWrite(fd, byteArray)
        await fsClose(fd)
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
