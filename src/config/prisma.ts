/**
 * Prisma Client Configuration (TypeScript)
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

// Use pooler connection for production, direct connection for development
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
