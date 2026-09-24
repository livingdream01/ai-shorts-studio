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
      espeak-ng \
 && rm -rf /var/lib/apt/lists/*

# Voice + caption alignment, all local and key-free:
#   Kokoro  — natural neural TTS (primary)
#   Piper   — lighter neural TTS (fallback)
#   Whisper — align captions to the voiceover
RUN pip3 install --break-system-packages --no-cache-dir \
      kokoro \
      soundfile \
      faster-whisper \
      piper-tts \
 && mkdir -p /voices \
 && curl -sSL -o /voices/en_US-lessac-medium.onnx \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
 && curl -sSL -o /voices/en_US-lessac-medium.onnx.json \
      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

ENV KOKORO_VOICE=af_heart

# Avatar: Wav2Lip — turns the character portrait into a talking head.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/* \
 && git clone --depth 1 https://github.com/Rudrabha/Wav2Lip /opt/wav2lip \
 && sed -i 's|temp/result\.avi|temp/result.mp4|g' /opt/wav2lip/inference.py \
 && sed -i "s|cv2.VideoWriter_fourcc(\*'DIVX')|cv2.VideoWriter_fourcc(*'mp4v')|" /opt/wav2lip/inference.py \
 && mkdir -p /opt/wav2lip/checkpoints /opt/wav2lip/face_detection/detection/sfd \
 && curl -sSL -o /opt/wav2lip/checkpoints/wav2lip_gan.pth \
      https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth \
 && curl -sSL -o /opt/wav2lip/face_detection/detection/sfd/s3fd.pth \
      https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth \
 && pip3 install --break-system-packages --no-cache-dir \
      opencv-python-headless librosa scipy tqdm numba

WORKDIR /studio

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production \
    RUN_HOUR=14 \
    PIPER_MODEL=/voices/en_US-lessac-medium.onnx

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "scripts/schedule.mjs"]
