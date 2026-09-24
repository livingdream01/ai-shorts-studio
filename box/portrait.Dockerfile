# One-off image used only to generate the character portrait (SD-Turbo).
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages --no-cache-dir \
      --extra-index-url https://download.pytorch.org/whl/cpu \
      torch diffusers transformers accelerate safetensors pillow
WORKDIR /studio
COPY scripts/lib/gen_portrait.py /studio/gen_portrait.py
ENTRYPOINT ["python3", "/studio/gen_portrait.py"]
