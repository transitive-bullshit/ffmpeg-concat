
# ffmpeg-concat

> 拼接 一组视频.,通过使用 ffmpeg和 性感的 OpenGL 过渡 (动画效果)

[![NPM](https://img.shields.io/npm/v/ffmpeg-concat.svg)](https://www.npmjs.com/package/ffmpeg-concat) [![Build Status](https://travis-ci.com/transitive-bullshit/ffmpeg-concat.svg?branch=master)](https://travis-ci.com/transitive-bullshit/ffmpeg-concat) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

![](https://raw.githubusercontent.com/transitive-bullshit/ffmpeg-concat/master/media/example.gif)

*9个视频 与 独特过渡 连接在一起的示例*

*请注意,由于GIF预览,质量和fps很差;[这个](https://raw.githubusercontent.com/transitive-bullshit/ffmpeg-concat/master/media/example.mp4)是源文件*

## 介绍

[FFmpeg](http://ffmpeg.org/)是命令行视频编辑中的事实标准,但使用 非平凡过渡 将视频连接在一起真的很困难. 这里有一些[错综复杂](https://superuser.com/questions/778762/crossfade-between-2-videos-using-ffmpeg) [的例子](https://video.stackexchange.com/questions/17502/concate-two-video-file-with-fade-effect-with-ffmpeg-in-linux)两个视频之间的简单交叉淡入淡出. FFmpeg过滤图非常强大,但是为了实现过渡动画,它们太复杂且容易出错.

另一方面,[GL Transitions](https://gl-transitions.com/),是一个伟大的开源由[Gaëtan Renaudeau](https://github.com/gre)倡议,旨在使用 GLSL 建立一个普遍的过渡[集合](https://gl-transitions.com/gallery),它非常简单的规范使得定制现有过渡或编写自己的过渡非常容易,而不是使用复杂的ffmpeg过滤图.

**使用 gl-transitions 这个模块和CLI轻松地将视频连接在一起.**

## 安装

这个模块需要[ffmpeg](http://ffmpeg.org/)要安装.

```bash
npm install --save ffmpeg-concat

# 或者 想使用 cli
npm install -g ffmpeg-concat
```

## CLI

```sh
  Usage: ffmpeg-concat [options] <videos...>

  Options:

    -V, --version                         输出版本号
    -o, --output <output>                 要写入的mp4文件的路径（默认值：out.mp4）
    -t, --transition-name <name>          要使用的gl-transition名称（默认值：淡入淡出）
    -d, --transition-duration <duration>  转换持续时间以毫秒为单位（默认值：500）
    -T, --transitions <file>              json文件加载转换
    -f, --frame-format <format>           用于临时帧图像的格式（默认值：raw）
    -c, --concurrency <number>            要并行处理的视频数量（默认值：4）
    -C, --no-cleanup-frames               禁用清除临时帧图像
    -O, --temp-dir <dir>                  用于存储帧数据的临时工作目录
    -h, --help                            输出使用信息

  Example:

    ffmpeg-concat -t circleopen -d 750 -o huzzah.mp4 0.mp4 1.mp4 2.mp4
```

## 用法

```js
const concat = require('ffmpeg-concat')

// 拼接 3 个 mp4s 使用 2  个 500ms directionalWipe 过渡
await concat({
  output: 'test.mp4',
  videos: [
    'media/0.mp4',
    'media/1.mp4',
    'media/2.mp4'
  ],
  transition: {
    name: 'directionalWipe',
    duration: 500
  }
})
```

```js
// 拼接 5 个 mp4 使用 4种不同的过渡
await concat({
  output: 'test.mp4',
  videos: [
    'media/0.mp4',
    'media/1.mp4',
    'media/2.mp4',
    'media/0.mp4',
    'media/1.mp4'
  ],
  transitions: [
    {
      name: 'circleOpen',
      duration: 1000
    },
    {
      name: 'crossWarp',
      duration: 800
    },
    {
      name: 'directionalWarp',
      duration: 500,
      // 将自定义参数传递给转换
      params: { direction: [ 1, -1 ] }
    },
    {
      name: 'squaresWire',
      duration: 2000
    }
  ]
})
```

## API

### concat(options)

将 视频文件 与 OpenGL过渡 连接在一起. 返回一个`Promise`用于输出视频的时间.

请注意,您必须指定`videos`,`output`,或者`transition`要么`transitions`.

请注意,输出视频的大小 和 fps 由 第一个输入视频决定.

#### options

##### videos

类型: `Array<String>`
**必需**

要连接的视频数组,其中每个 item 都是视频文件的路径或URL.

##### output

类型: `String`
**必需**

输出的`mp4`视频文件路径.

注意: 我们目前只支持输出到mp4;如果您希望获得更多格式的支持,请打开一个问题.

##### transition

类型: `Object`

指定在每个视频之间使用的默认过渡.

请注意,您必须指定其中一个`transition`要么`transitions`,取决于您对每次过渡的控制程度. 如果同时指定,`transitions`优先.

```js
// 例
const transition = {
  duration: 1000, // ms
  name: 'directionalwipe', // 要使用的 gl-transition名称（小写匹配）
  params: { direction: [1, -1] } // 可选地覆盖默认参数
}
```

##### transitions

类型: `Array<Object>`

指定每个视频之间的 (可能唯一的) 过渡. 如果有N个视频,则应该有N-1个过渡.

请注意,您必须指定其中一个`transition`要么`transitions`,取决于您对每次过渡的控制程度. 如果同时指定,`transitions`优先.

```js
// 例
const transitions = [
  {
    duration: 1000,
    name: 'fade'
  },
  {
    duration: 500,
    name: 'swap'
  }
]
```

##### audio

类型: `String`
**必需**

音频文件的路径或URL,用作 输出视频 的音轨.

##### frameFormat

类型: `string`默认: `raw`

临时帧图像的格式. 例如,您可以使用`png`要么`jpg`.

注意: 出于性能原因默认为`raw`,写入和读取 原始二进制像素数据 比 编码和解码`png`帧快得多. 原始格式很难预览和调试,在另一种情况下,您可能想要更改`frameFormat`至`png`.

##### concurrency

类型: `Number`默认: `4`

要并行处理的最大视频数量.

##### log

类型: `Function`默认: `noop`

用于记录进度和底层ffmpeg命令的可选功能. 例如,您可以使用`console.log`

##### cleanupFrames

类型: `boolean`默认: `true`

默认情况下,我们清理临时帧图像. 如果你需要调试中间结果,将此设置为`false`.

##### tempDir

类型: `string`默认值: `/tmp`下的随机目录

用于存储中间帧数据的临时工作目录. 这是`cleanupFrames`时,帧被保存的位置.

## 过渡

这里有一些[gl-transitions](https://gl-transitions.com/)我发现对高质量的视频过渡 特别有用:

-   [fade](https://gl-transitions.com/editor/fade)
-   [fadegrayscale](https://gl-transitions.com/editor/fadegrayscale)
-   [circleopen](https://gl-transitions.com/editor/circleopen)
-   [directionalwarp](https://gl-transitions.com/editor/directionalwarp)
-   [directionalwipe](https://gl-transitions.com/editor/directionalwipe)
-   [crosswarp](https://gl-transitions.com/editor/crosswarp)
-   [crosszoom](https://gl-transitions.com/editor/CrossZoom)
-   [dreamy](https://gl-transitions.com/editor/Dreamy)
-   [squareswire](https://gl-transitions.com/editor/squareswire)
-   [angular](https://gl-transitions.com/editor/angular)
-   [radial](https://gl-transitions.com/editor/Radial)
-   [cube](https://gl-transitions.com/editor/cube)
-   [swap](https://gl-transitions.com/editor/swap)

## 有关

-   [ffmpeg-gl-transition](https://github.com/transitive-bullshit/ffmpeg-gl-transition)- 用于在视频流之间 应用GLSL过渡 的 低级ffmpeg过滤器 ([gl-transitions](https://gl-transitions.com/)) . 它允许使用更高级和可自定义的过滤器图形,但它需要您构建自定义版本的ffmpeg.
-   [gl-transitions](https://gl-transitions.com/)-  GLSL过渡的集合.
-   [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)- 底层ffmpeg包装库.
-   [awesome-ffmpeg](https://github.com/transitive-bullshit/awesome-ffmpeg)- ffmpeg资源的精选列表,重点关注JavaScript.

## 执照

麻省理工学院©[Travis Fischer](https://github.com/transitive-bullshit)
