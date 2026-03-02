# DefenseFlow API - Hệ thống Quản lý Lịch Bảo vệ Đồ án

![Node Version](https://img.shields.io/badge/node-v18%2B-green)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748)
![Express](https://img.shields.io/badge/Framework-Express%205-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## 📝 Giới thiệu (Vietnamese Overview)

**DefenseFlow API** là hệ thống backend trung tâm cho việc quản lý và tự động hóa quy trình sắp xếp lịch bảo vệ đồ án tốt nghiệp. Hệ thống giải quyết các bài toán phức tạp về ràng buộc học thuật, tối ưu hóa nguồn lực giảng viên và đảm bảo tính minh bạch trong việc phân bổ hội đồng.

Các tính năng chính bao gồm:
- **Quản lý học kỳ & đợt bảo vệ:** Phân mảnh dữ liệu theo thời gian thực.
- **Tính toán tải trọng (Capacity):** Tự động xác định khả năng đáp ứng của giảng viên dựa trên cấu hình tùy chỉnh.
- **Bảng điều khiển (Dashboard):** Cung cấp số liệu thống kê trực quan cho cả Quản trị viên và Giảng viên.
- **Công cụ nhập liệu thông minh:** Hỗ trợ nhập liệu hàng loạt từ Excel với quy trình tiền kiểm tra chặt chẽ.

---

## 🚀 Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js 5 (Next Generation)
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL
- **ORM:** Prisma 7+ (với hỗ trợ giao dịch nâng cao)
- **Validation:** Zod (Type-safe schema validation)
- **Processing:** `exceljs` cho xử lý file Excel hiệu năng cao.

## 📂 Project Structure

Project tuân thủ kiến trúc **Controller-Service-Repository** để đảm bảo tính dễ bảo trì và mở rộng:

```text
src/
├── controllers/      # Xử lý HTTP requests, validate đầu vào & định dạng phản hồi
├── services/         # Logic nghiệp vụ cốt lõi (Xử lý lịch, quy tắc ràng buộc)
├── repositories/     # Tầng truy xuất dữ liệu (Tương tác trực tiếp với Prisma)
├── routes/           # Định nghĩa các routes API
├── domain/           # Chứa các quy tắc nghiệp vụ (Business Rules) & Validators
├── config/           # Cấu hình hệ thống (Swagger, DB, Environment)
├── middleware/       # Middlewares trung gian (Error handling, Auth)
├── utils/            # Tiện ích dùng chung (API Response, Formatters)
├── types/            # Định nghĩa Interface & Type của TypeScript
└── server.ts         # Điểm khởi đầu của ứng dụng
```

## 🛠 Modules & Features

### 1. Dashboard & Analytics
- **Admin Dashboard:** Thống kê tổng quan về giảng viên, đồ án, đợt bảo vệ và trạng thái phân bổ.
- **Lecturer Dashboard:** Xem danh sách đồ án hướng dẫn, lịch hội đồng đã phân và cấu hình cá nhân.

### 2. Capacity Calculator
- Động cơ tính toán khả năng chịu tải của giảng viên cho mỗi đợt bảo vệ.
- Hỗ trợ ràng buộc về số lượng đồ án tối thiểu/tối đa cho mỗi giảng viên.

### 3. Import & Validation
- Xử lý import hàng loạt `Lecturers` và `Topics` từ file Excel.
- Tự động kiểm tra tính hợp lệ của dữ liệu, định dạng code và ràng buộc duy nhất.

### 4. Scheduling Engine (Core)
- Thuật toán sắp xếp dựa trên ràng buộc (Constraint-based scheduling).
- Đảm bảo giảng viên hướng dẫn không nằm trong hội đồng chấm đồ án của mình.
- Ưu tiên phân bổ dựa trên kỹ năng/chuyên môn (Qualifications) và tải trọng hiện tại.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+
- PostgreSQL (Local hoặc Supabase)
- pnpm (Khuyến nghị)

### Quick Start
1. **Clone & Install:**
   ```bash
   pnpm install
   ```

2. **Environment Setup:**
   Tạo file `.env` từ `.env.example`:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
   ```

3. **Database Migration:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run Development:**
   ```bash
   pnpm dev
   ```

## 📖 API Documentation

Tài liệu API đầy đủ được cung cấp qua Swagger UI tại: `http://localhost:3000/api-docs`

**Một số Endpoints quan trọng:**
- `GET /api/health`: Kiểm tra trạng thái hệ thống.
- `GET /api/dashboard`: Lấy thông số thống kê tổng quát.
- `POST /api/capacity/calculate`: Chạy động cơ tính toán tải trọng.
- `POST /api/import/topics`: Import danh sách đồ án.

---
*DefenseFlow © 2026 - Phát triển bởi Đội ngũ SWD392*
