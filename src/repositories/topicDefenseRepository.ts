import { prisma } from "../config/prisma.js";
import { CreateTopicDefenseInput, TopicDefenseFilters } from "../types/index.js";

const generateCode = (topicId: number, defenseId: number): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `TD-${topicId}-${defenseId}-${timestamp}`;
};

/**
 * Create a TopicDefense registration (supports bulk)
 */
export const create = async (data: CreateTopicDefenseInput) => {
  const topicDefenseData = data.topicIds.map(topicId => ({
    topicDefenseCode: generateCode(topicId, data.defenseId),
    topicId,
    defenseId: data.defenseId,
  }));

  // Perform bulk insert
  await prisma.topicDefense.createMany({
    data: topicDefenseData,
    skipDuplicates: true, // Optional: skip if already exists based on unique constraints (if any)
  });
  
  // Return the newly created records
  return await prisma.topicDefense.findMany({
    where: {
      defenseId: data.defenseId,
      topicId: { in: data.topicIds }
    },
    include: {
      topic: true,
      defense: true,
    },
    orderBy: { id: "asc" }
  });
};

/**
 * Find all TopicDefense records with optional filters and pagination
 */
export const findAndCountAll = async (
  filters: TopicDefenseFilters = {},
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    ...(filters.defenseId !== undefined && { defenseId: filters.defenseId }),
    ...(filters.topicId !== undefined && { topicId: filters.topicId }),
    ...(filters.finalResult && { finalResult: filters.finalResult }),
    ...(filters.isScheduled !== undefined && {
      defenseCouncils: filters.isScheduled ? { some: {} } : { none: {} },
    }),
  };

  // Apply search
  if (filters.search) {
    whereClause.OR = [
      { topicDefenseCode: { contains: filters.search, mode: "insensitive" } },
      { topic: { is: { topicCode: { contains: filters.search, mode: "insensitive" } } } },
      { topic: { is: { title: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  // If topicCode search is provided, map it through the relation
  if (filters.topicCode) {
    whereClause.topic = {
      is: {
        topicCode: {
          contains: filters.topicCode,
        }
      }
    };
  }

  const [data, total] = await Promise.all([
    prisma.topicDefense.findMany({
      where: whereClause,
      include: {
        topic: {
          include: {
            topicSupervisors: {
              include: { lecturer: true },
              orderBy: { lecturer: { fullName: "asc" } }
            }
          }
        },
        defense: true,
        defenseCouncils: true,
      },
      skip,
      take: limit,
      orderBy: [
        { defenseId: "desc" },
        { topicId: "asc" }
      ],
    }),
    prisma.topicDefense.count({ where: whereClause }),
  ]);

  return { data, total };
};

/**
 * Find a TopicDefense by ID
 */
export const findById = async (id: number) => {
  return await prisma.topicDefense.findUnique({
    where: { id },
    include: {
      topic: { include: { topicSupervisors: { include: { lecturer: true } } } },
      defense: true,
      defenseCouncils: true,
    },
  });
};

/**
 * Check if a topic is already registered in a defense
 */
export const findByTopicAndDefense = async (topicId: number, defenseId: number) => {
  return await prisma.topicDefense.findFirst({
    where: { topicId, defenseId },
  });
};

/**
 * Delete a TopicDefense by ID
 */
export const remove = async (id: number) => {
  return await prisma.topicDefense.delete({ where: { id } });
};
