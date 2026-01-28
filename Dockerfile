# Sử dụng Node.js LTS image
FROM node:20-alpine

# Cài đặt pnpm
RUN npm install -g pnpm

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Cài đặt dependencies
RUN pnpm install --frozen-lockfile

# Copy prisma files và config
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./


# Copy source code
COPY . .

# Set a dummy database URL for prisma generate (not actually used during generation)
ARG DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL=${DIRECT_URL}

# Generate Prisma Client
RUN pnpm prisma generate

# Build TypeScript code
RUN pnpm run build

# Expose port (thay đổi nếu cần)
EXPOSE 3000

# Chạy ứng dụng
CMD ["node", "dist/src/server.js"]
