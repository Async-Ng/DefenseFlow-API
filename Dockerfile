# -------- Base --------
FROM node:20-alpine AS base
WORKDIR /app

# -------- Dependencies --------
FROM base AS deps
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -------- Build --------
FROM base AS builder
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL=${DIRECT_URL}
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

RUN pnpm prisma generate
RUN pnpm run build
RUN pnpm prune --prod

# -------- Runner --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/src/server.js"]
