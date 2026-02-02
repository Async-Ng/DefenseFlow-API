# Sử dụng Node.js LTS image
FROM node:20-alpine

# Cài đặt pnpm
RUN npm install -g pnpm

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Cài đặt dependencies
RUN pnpm install

# Copy prisma schema và config files
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Set a dummy database URL for prisma generate (not actually used during generation)
ARG DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL=${DIRECT_URL}

# Generate Prisma Client
RUN pnpm prisma generate

# Build TypeScript code
RUN pnpm run build

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Expose port
EXPOSE 3000

# Environment variables will be provided at runtime
ENV NODE_ENV=production

# Chạy ứng dụng
CMD ["node", "dist/src/server.js"]
