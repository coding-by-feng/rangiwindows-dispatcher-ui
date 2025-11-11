#!/usr/bin/env bash
# Re-deploy the rangi-windows-ui container in one go.
# - Removes any existing container (ignoring errors if it doesn't exist)
# - Builds the Docker image
# - Runs the container with the desired settings

set -euo pipefail

IMAGE_NAME="rangi-windows-ui"
CONTAINER_NAME="rangi-windows-ui"
HOST_PORT=168
CONTAINER_PORT=168

echo "[1/3] Removing existing container if present: ${CONTAINER_NAME}"
# Remove the container if it exists; ignore errors if it doesn't
sudo docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "[2/3] Building image: ${IMAGE_NAME}"
sudo docker build -t "${IMAGE_NAME}" .

echo "[3/3] Running container: ${CONTAINER_NAME}"
sudo docker run -d \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  --name "${CONTAINER_NAME}" \
  --restart=unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  "${IMAGE_NAME}"

echo "✅ Deploy complete: ${CONTAINER_NAME} listening on ${HOST_PORT}"

