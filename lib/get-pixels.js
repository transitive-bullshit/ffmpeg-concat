'use strict'

const fs = require('fs')
const getPixels = require('get-pixels')
const ndarray = require('ndarray')
const util = require('util')

const getFileExt = require('./get-file-ext')
const getPixelsP = util.promisify(getPixels)

module.exports = async (filePath, opts) => {
  const ext = getFileExt(filePath, { strict: false })

  if (ext === 'raw') {
    const data = fs.readFileSync(filePath)

    // @see https://github.com/stackgl/gl-texture2d/issues/16
    return ndarray(data, [
      opts.width,
      opts.height,
      4
    ], [
      4,
      opts.width * 4,
      1
    ])
  }

  const pixels = await getPixelsP(filePath)
  return pixels
}
