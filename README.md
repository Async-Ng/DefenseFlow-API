# Defense Scheduling System - Backend API

![Node Version](https://img.shields.io/badge/node-v18%2B-green)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)

## Introduction

The **Defense Scheduling System Backend** serves as the central "Brain" of the Capstone Project. It is a standalone RESTful API designed to handle complex business logic, manage data integrity, and execute constraint-based logic for thesis defense sessions.

Unlike traditional CRUD applications, this backend is architected to support an intelligent engine that processes strict academic constraints and balances lecturer workloads without reliance on external microservices.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL (via **Prisma ORM**)
- **Key Libraries:**
  - `exceljs`: High-performance Excel file processing
  - `multer`: File upload handling
  - `cors` & `helmet`: Security headers and CORS management
  - `dotenv`: Environment configuration

## Folder Structure

The project follows a **Controller-Service-Repository** architecture to separate concerns, ensuring maintainability and scalability.

```
src/
├── controllers/      # Handle HTTP requests, input validation, and response formatting
├── services/         # Core business logic (Session mgmt, Availability rules)
├── repositories/     # Data access layer (Prisma client usage)
├── routes/           # API route definitions
├── domain/           # Business domain rules and validators
├── config/           # Configuration (Prisma, Env)
├── middleware/       # Express middlewares (Error Handling)
├── utils/            # Shared utilities (Response formatting)
├── types/            # TypeScript type definitions and interfaces
└── app.ts            # App entry point
```

## Backend Modules

1.  **Import Module:** Handles bulk data import via Excel.
    - Processes `Topics` and `Lecturers` templates.
    - Parses raw data and performs validation on format and required fields.
2.  **Session & Semester Management:**
    - Manages the lifecycle of defense sessions.
    - Validates session dates against semester boundaries.
3.  **Lecturer Availability Tracking:**
    - Allows lecturers to register their availability or "Busy" status for specific session days.
    - Enforces rules (e.g., checking if registration is open/locked).
4.  **Lecturer Management:**
    - Manages lecturer profiles and skills/competencies.
5.  **Scheduling Engine (Core Logic):**
    - *Designed* to automate the assignment of councils to topics using a constraint-based approach.

## Scheduling Algorithm (Design Strategy)

The Core Scheduling Engine is designed to utilize a **Greedy Approach with Constraint Propagation**:

The algorithm iterates through the list of defense topics and attempts to find the first available council slot that satisfies all strict constraints:
1.  **Filtering:** For each topic, it filters out invalid lecturers (e.g., the topic's own supervisor).
2.  **Slot Matching:** It checks for time slot conflicts where lecturers are marked as "Busy" in the **Availability Module**.
3.  **Load Balancing:** Among the valid candidates, it prioritizes lecturers with the current lowest assigned workload to ensure fairness.
4.  **Backtracking:** If a valid slot cannot be formed, the topic is flagged for manual review.

## Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: Running instance (Local or Cloud/Supabase)
- **Prisma CLI**: Global installation or via `npx`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# Database Configuration (Prisma)
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"

# Other potential variables (CORS, etc.)
```

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Ensure your PostgreSQL database is running, then deploy the schema:
```bash
npx prisma generate
npx prisma db push
```

### 3. Development Mode
Run the server in development mode with `tsx`:
```bash
npm run dev
```

### 4. Build & Production
Compile TypeScript and run the production build:
```bash
npm run build
npm start
```

## API Documentation

Below are the primary endpoints implemented in the system:

### Import Data
- **POST** `/api/import/topics`: Import topics from Excel.
- **POST** `/api/import/lecturers`: Import lecturers from Excel.

### Session Management
- **GET** `/api/sessions`: List all sessions.
- **POST** `/api/sessions`: Create a new session.
- **GET** `/api/sessions/:id`: Get session details.

### Availability Management
- **GET** `/api/availability/sessions/:sessionId/days`: Get days for a session.
- **GET** `/api/availability/lecturers/:lecturerId/status`: Get lecturer status for a session.
- **PUT** `/api/availability/lecturers/:lecturerId/availability`: Update "Busy" status for a specific day.
- **PUT** `/api/availability/lecturers/:lecturerId/availability/batch`: Batch update availability.

---
*Defense Scheduling System © 2024*
