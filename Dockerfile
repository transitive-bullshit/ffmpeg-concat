FROM ubuntu:18.04

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get -y install tzdata
RUN apt-get install build-essential wget pkg-config xvfb libxi-dev libglu1-mesa-dev libglew-dev libvips-dev -y --no-install-recommends

# install ffmpeg
RUN wget --no-check-certificate -O /tmp/ffmpeg.tar.xz \
  "https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-$( \
    [ $(arch) = aarch64 ] && echo arm64 || arch)-static.tar.xz" \
  && mkdir /usr/local/ffmpeg \
  && cd /usr/local/ffmpeg \
  && tar xvf /tmp/ffmpeg.tar.xz --strip-components=1
ENV PATH=/usr/local/ffmpeg:$PATH

# upgrade vips
ARG VIPS_VERSION="8.12.1"
RUN cd /tmp && wget --no-check-certificate \
  "https://github.com/libvips/libvips/releases/download/v$VIPS_VERSION/vips-$VIPS_VERSION.tar.gz" && \
  tar zxvf vips* && cd vips-$VIPS_VERSION && ./configure && make && make install && ldconfig
ENV LD_LIBRARY_PATH=/usr/local/lib
ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
ENV GI_TYPELIB_PATH=/usr/lib/$(arch)-linux-gnu/girepository-1.0:/usr/lib/girepository-1.0

# install nodejs
WORKDIR /app
ADD .nvmrc /app/.nvmrc
RUN wget --no-check-certificate \
  "https://nodejs.org/dist/v$(cat .nvmrc)/node-v$(cat .nvmrc)-linux-$( \
    [ $(arch) = aarch64 ] && echo arm64 || arch).tar.gz" \
  -O /tmp/node.tar.gz \
  && tar -xf /tmp/node.tar.gz -C /usr/local --strip-components=1 \
  && rm /tmp/node.tar.gz

ADD package*.json /app
RUN npm install

RUN mkdir /app/lib
ADD *.js *.sh /app
ADD lib /app/lib
ADD media /app/media

RUN ln -s /app/lib/cli.js /usr/local/bin/ffmpeg-concat

ENTRYPOINT ["/app/docker-entrypoint.sh"]
