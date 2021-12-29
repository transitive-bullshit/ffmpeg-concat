#!/bin/bash

CMD_PREPEND="ffmpeg-concat"
PATTERN="^\s*(npm|npx|node|ffmpeg|sh|bash).*$"
if [[ $# == 0 ]]; then
    CMD_PREPEND="ffmpeg-concat --help"
elif [[ "$1" =~ $PATTERN ]]; then
    CMD_PREPEND=""
fi

echo Running: exec xvfb-run -s "-ac -screen 0 1280x1024x24" \
    $CMD_PREPEND "$@"
exec xvfb-run -s "-ac -screen 0 1280x1024x24" \
    $CMD_PREPEND "$@"