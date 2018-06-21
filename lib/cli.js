#!/usr/bin/env node
'use strict'

const concat = require('.')
const fs = require('fs')
const program = require('commander')
const { version } = require('../package')

module.exports = async (argv) => {
  program
    .version(version)
    .usage('[options] <videos...>')
    .option('-o, --output <output>', 'path to mp4 file to write', (s) => s, 'out.mp4')
    .option('-t, --transition-name <name>', 'name of gl-transition to use', (s) => s, 'fade')
    .option('-d, --transition-duration <duration>', 'duration of transition to use in ms', (v) => parseInt(v), 500)
    .option('-T, --transitions <file>', 'json file to load transitions from')
    .option('-f, --frame-format <format>', 'format to use for temp frame images', /^(raw|png|jpg)$/i, 'raw')
    .option('-c, --concurrency <number>', 'number of videos to process in parallel', (v) => parseInt(v), 4)
    .option('-C, --no-cleanup-frames', 'disables cleaning up temp frame images')
    .option('-O, --temp-dir <dir>', 'temporary working directory to store frame data')
    .parse(argv)

  let transitions

  if (program.transitions) {
    try {
      transitions = JSON.parse(fs.readFileSync(program.transitions, 'utf8'))
    } catch (err) {
      console.error(`error parsing transitions file "${program.transitions}"`, err)
      throw err
    }
  }

  try {
    const videos = program.args.filter((v) => typeof v === 'string')

    await concat({
      log: console.log,
      concurrency: program.concurrency,

      videos,
      output: program.output,

      transition: {
        name: program.transitionName,
        duration: program.transitionDuration
      },
      transitions,

      frameFormat: program.frameFormat,
      cleanupFrames: program.cleanupFrames,
      tempDir: program.tempDir
    })

    console.log(program.output)
  } catch (err) {
    console.error('concat error', err)
    throw err
  }
}
