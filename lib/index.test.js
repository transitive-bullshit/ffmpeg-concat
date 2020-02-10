'use strict'

const test = require('ava')
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
const videosWithAudio = [
  path.join(fixturesPath, '0a.mp4'),
  path.join(fixturesPath, '0a.mp4'),
  path.join(fixturesPath, '0a.mp4')
]

test.serial('concat 3 mp4s with using constant 500ms transitions', async (t) => {
  const output = tempy.file({ extension: 'mp4' })
  await concat({
    log: console.log,
    verbose: true,
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

test.serial('concat 9 mp4s with unique transitions', async (t) => {
  const output = tempy.file({ extension: 'mp4' })
  await concat({
    log: console.log,
    verbose: true,
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

test.serial('concat 3 mp4s with source audio and unique transitions', async (t) => {
  const output = tempy.file({ extension: 'mp4' })
  await concat({
    log: console.log,
    verbose: true,
    output,
    videos: videosWithAudio,
    transitions: [
      {
        name: 'circleOpen',
        duration: 1000
      },
      {
        name: 'crossWarp',
        duration: 1000
      }
    ]
  })

  const probe = await ffmpegProbe(output)
  t.is(probe.width, 1280)
  t.is(probe.height, 720)
  t.is(probe.streams.length, 2)
  t.truthy(probe.duration >= 11000)
  t.truthy(probe.duration <= 15000)

  await rmfr(output)
})
