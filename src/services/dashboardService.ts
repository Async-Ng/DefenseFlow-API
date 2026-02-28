/**
 * Dashboard Service
 * Business logic layer for Dashboard operations (Functional)
 */

import * as dashboardRepository from "../repositories/dashboardRepository.js";
import { DashboardStats } from "../types/index.js";

/**
 * Get overall dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return await dashboardRepository.getDashboardStats();
};
