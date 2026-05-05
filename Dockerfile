# Build stage — compiles native modules (sqlite3) for the host arch (ARM on Pi)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage — slim image without build toolchain
FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/app/data/database.db

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN mkdir -p /app/data /app/uploads

EXPOSE 3001

CMD ["node", "server.js"]
