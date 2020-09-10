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
const cleanupFrames = process.env.CLEANUP_FRAMES !== '0'

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

  if (cleanupFrames) {
    await rmfr(output)
  }
})

test('concat 3 trimmed mp4s with using constant 500ms transitions', async (t) => {
  const output = tempy.file({ extension: '.trimmed.mp4' })
  await concat({
    log: console.log,
    output,
    videos: [
      videos[0],
      {
        video: videos[1],
        start: 1000,
        duration: 2000
      },
      videos[2]
    ],
    transition: {
      name: 'directionalwipe',
      duration: 500
    }
  })

  // expected duration = 4 + 2 + 4 (=10) - 500 - 500 = 9

  const probe = await ffmpegProbe(output)
  t.is(probe.width, 640)
  t.is(probe.height, 360)
  assertBetween(t, probe.duration, 8900, 9100)

  if (cleanupFrames) {
    await rmfr(output)
  }
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

  if (cleanupFrames) {
    await rmfr(output)
  }
})

function assertBetween (t, actualValue, expectedMinimum, expectedMaximum) {
  t.truthy(actualValue >= expectedMinimum, `expected '${actualValue}' to be between '${expectedMinimum}' and '${expectedMaximum}'`)
  t.truthy(actualValue <= expectedMaximum, `expected '${actualValue}' to be between '${expectedMinimum}' and '${expectedMaximum}'`)
}
