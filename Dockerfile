# Base stage
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Install dependencies (using --force to ignore lockfile issues if any, consistent with previous success)
RUN pnpm install

# Build stage
FROM base AS builder
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy database URL for prisma generate
ARG DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL=${DIRECT_URL}

# Generate Prisma Client
RUN pnpm prisma generate

# Build TypeScript code
RUN pnpm run build

# Prune dev dependencies to keep only production 
# (We run this in builder after build is done)
RUN pnpm prune --prod

# Runner stage
FROM base AS runner

# Copy necessary files from builder
# Copy node_modules (now pruned)
COPY --from=builder /app/node_modules ./node_modules
# Copy built artifacts
COPY --from=builder /app/dist ./dist
# Copy package.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/src/server.js"]
