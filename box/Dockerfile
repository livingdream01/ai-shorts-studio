# The studio box — an isolated Linux machine that owns the pipeline.
# Debian's ffmpeg ships with libass + freetype (captions burn in), and Piper
# gives it a local neural voice — so it renders a real episode with no API keys.
FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ffmpeg \
      fonts-dejavu-core \
      ca-certificates \
      tini \
      python3 \
      python3-pip \
      curl \
 && rm -rf /var/lib/apt/lists/*

# Local text-to-speech (no key, runs on CPU).
RUN pip3 install --break-system-packages --no-cache-dir piper-tts \
 && mkdir -p /voices \
 && curl -sSL -o /voices/en_US-lessac-medium.onnx \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
 && curl -sSL -o /voices/en_US-lessac-medium.onnx.json \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

WORKDIR /studio

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production \
    RUN_HOUR=14 \
    PIPER_MODEL=/voices/en_US-lessac-medium.onnx

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "scripts/schedule.mjs"]
