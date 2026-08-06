FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npm install -g prisma

COPY . .

RUN npm run build

# ── Production stage ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p exports logs

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
