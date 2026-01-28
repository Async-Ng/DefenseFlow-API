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

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN pnpm exec prisma generate

# Copy source code
COPY . .

# Build TypeScript code
RUN pnpm run build

# Expose port (thay đổi nếu cần)
EXPOSE 3000

# Chạy ứng dụng
CMD ["pnpm", "start"]
