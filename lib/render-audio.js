'use strict'

const fs = require('fs-extra')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

module.exports = async (opts) => {
  const {
    log,
    scenes,
    outputDir,
    fileName
  } = opts

  return new Promise((resolve, reject) => {
    const concatListPath = path.join(outputDir, 'audioConcat.txt')
    const toConcat = scenes.filter(scene => scene.sourceAudioPath).map(scene => `file '${scene.sourceAudioPath}'`)
    const outputFileName = path.join(outputDir, fileName)
    fs.outputFile(concatListPath, toConcat.join('\n')).then(() => {
      log(`created ${concatListPath}`)
      const cmd = ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .on('start', cmd => log(cmd))
        .on('end', () => resolve(outputFileName))
        .on('error', (err, stdout, stderr) => {
          if (err) {
            console.error('failed to concat audio', err, stdout, stderr)
          }
          reject(err)
        })
      cmd.save(outputFileName)
    }).catch(err => {
      console.error(`failed to concat audio ${err}`)
      reject(err)
    })
  })
}
