FROM docker.io/library/node:22.23.2-bookworm-slim@sha256:43aeff40f4afc22e83f7589a2f37e111cff5ca84529571f1c8415bcc5fcc21b2
WORKDIR /app
ENV NODE_ENV=production PORT=8080 KYOTO_COLLISION_PACK=/app/runtime/station.collision.bin KYOTO_VERIFIER_RELEASE=/app/release.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY server.mjs release.json ./
COPY starter-challenges.json ./web/starter-challenges.json
COPY station.collision.bin ./runtime/station.collision.bin
COPY LICENSE credits.html ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
