'use strict'

const fs = require('fs')
const { test } = require('ava')
const ffmpegProbe = require('ffmpeg-probe')
const path = require('path')
const rmfr = require('rmfr')
const tempy = require('tempy')

const concat = require('.')

const fixturesPath = path.join(__dirname, '..', `media`)
const videos = [
  path.join(fixturesPath, '0.mp4'),
  path.join(fixturesPath, '1.mp4'),
  path.join(fixturesPath, '2.mp4')
]

test('concat 3 mp4s with using constant 500ms transitions and custom tempDir', async (t) => {
  const output = tempy.file({ extension: 'mp4' })
  const tempDir = path.join(__dirname, '..', 'ffmpeg-concat-temp')

  var checkDirectory = function () {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          t.truthy(fs.existsSync(tempDir))
          t.truthy(fs.readdirSync(tempDir).length > 0)
          return resolve()
        } catch (e) {
          return reject(e)
        }
      }, 2000)
    })
  }

  var runConcat = function () {
    return concat({
      log: console.log,
      output,
      videos,
      transition: {
        name: 'directionalwipe',
        duration: 500
      },
      tempFramesDir: path.join(__dirname, '..')
    })
  }

  await Promise.all([
    runConcat(),
    checkDirectory()
  ])

  const probe = await ffmpegProbe(output)
  t.is(probe.width, 640)
  t.is(probe.height, 360)
  t.truthy(probe.duration >= 10500)
  t.truthy(probe.duration <= 11500)

  await rmfr(output)
})

test('concat 3 mp4s with using constant 500ms transitions', async (t) => {
  const output = tempy.file({ extension: 'mp4' })
  await concat({
    log: console.log,
    output,
    videos,
    transition: {
      name: 'directionalwipe',
      duration: 500
    }
  })

  const probe = await ffmpegProbe(output)
  t.is(probe.width, 640)
  t.is(probe.height, 360)
  t.truthy(probe.duration >= 10500)
  t.truthy(probe.duration <= 11500)

  await rmfr(output)
})

test('concat 9 mp4s with unique transitions', async (t) => {
  const output = tempy.file({ extension: 'mp4' })
  await concat({
    log: console.log,
    output,
    videos: videos.concat(videos).concat(videos),
    transitions: [
      {
        name: 'directionalWarp',
        duration: 1000
      },
      {
        name: 'circleOpen',
        duration: 1000
      },
      {
        name: 'crossWarp',
        duration: 1000
      },
      {
        name: 'crossZoom',
        duration: 1000
      },
      {
        name: 'directionalWipe',
        duration: 1000
      },
      {
        name: 'squaresWire',
        duration: 1000
      },
      {
        name: 'radial',
        duration: 1000
      },
      {
        name: 'swap',
        duration: 1000
      }
    ]
  })

  const probe = await ffmpegProbe(output)
  t.is(probe.width, 640)
  t.is(probe.height, 360)
  t.truthy(probe.duration >= 27000)
  t.truthy(probe.duration <= 28000)

  await rmfr(output)
})
