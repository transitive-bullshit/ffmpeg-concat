'use strict'

const test = require('ava')
const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const rmfr = require('rmfr')
const tempy = require('tempy')

const concat = require('.')

const fixturesPath = path.join(__dirname, '..', 'media')
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

async function ffprobeAsync(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

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

  const probe = await ffprobeAsync(output)
  console.log(probe);
  const videoStream = probe.streams.find(stream => stream.codec_type === 'video')
  t.is(videoStream.width, 640)
  t.is(videoStream.height, 360)
  t.truthy(probe.format.duration >= 10.5)
  t.truthy(probe.format.duration <= 11.5)

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

  const probe = await ffprobeAsync(output)
  console.log(probe);
  const videoStream = probe.streams.find(stream => stream.codec_type === 'video')
  t.is(videoStream.width, 640)
  t.is(videoStream.height, 360)
  t.truthy(probe.format.duration >= 27)
  t.truthy(probe.format.duration <= 28)

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

const probe = await ffprobeAsync(output)
console.log(probe);
const videoStream = probe.streams.find(stream => stream.codec_type === 'video')
const audioStream = probe.streams.find(stream => stream.codec_type === 'audio')
t.is(videoStream.width, 1280)
t.is(videoStream.height, 720)
t.is(probe.streams.length, 2)
t.truthy(probe.format.duration >= 11)
t.truthy(probe.format.duration <= 15)

await rmfr(output)
})