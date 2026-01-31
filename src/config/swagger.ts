/**
 * Swagger Configuration (TypeScript)
 */

import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DefenseFlow API",
      version: "1.0.0",
      description: "API documentation for DefenseFlow application",
      contact: {
        name: "DefenseFlow Team",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://defenseflow-api.onrender.com",
        description: "Production server",
      },
    ],
    components: {
      schemas: {
        Semester: {
          type: "object",
          required: ["id", "semesterCode", "name"],
          properties: {
            id: { type: "integer", example: 1 },
            semesterCode: { type: "string", maxLength: 50, example: "SP2025" },
            name: { type: "string", maxLength: 100, example: "Spring 2025" },
            startDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2025-01-01",
            },
            endDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2025-04-30",
            },
          },
        },
        CreateSemesterInput: {
          type: "object",
          required: ["semesterCode", "name"],
          properties: {
            semesterCode: { type: "string", maxLength: 50, example: "SP2025" },
            name: { type: "string", maxLength: 100, example: "Spring 2025" },
            startDate: {
              type: "string",
              format: "date",
              example: "2025-01-01",
            },
            endDate: { type: "string", format: "date", example: "2025-04-30" },
          },
        },
        UpdateSemesterInput: {
          type: "object",
          properties: {
            semesterCode: { type: "string", maxLength: 50, example: "SP2025" },
            name: { type: "string", maxLength: 100, example: "Spring 2025" },
            startDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2025-01-01",
            },
            endDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2025-04-30",
            },
          },
        },
        Session: {
          type: "object",
          required: ["id", "sessionCode", "semesterId"],
          properties: {
            id: { type: "integer", example: 1 },
            sessionCode: { type: "string", maxLength: 50, example: "SESS_001" },
            semesterId: { type: "integer", example: 1 },
            name: {
              type: "string",
              maxLength: 100,
              nullable: true,
              example: "Round 1",
            },
            type: {
              type: "string",
              enum: ["Main", "Resit"],
              default: "Main",
              nullable: true,
              example: "Main",
            },
            timePerTopic: {
              type: "integer",
              nullable: true,
              example: 45,
            },
            workStartTime: {
              type: "string",
              format: "time", // Prisma @db.Time maps to string in JSON usually, representing time
              nullable: true,
              example: "08:00:00",
            },
          },
        },
        CreateSessionInput: {
          type: "object",
          required: ["sessionCode", "semesterId", "name"],
          properties: {
            sessionCode: { type: "string", maxLength: 50, example: "SESS_001" },
            semesterId: { type: "integer", example: 1 },
            name: { type: "string", maxLength: 100, example: "Round 1" },
            type: {
              type: "string",
              enum: ["Main", "Resit"],
              default: "Main",
            },
            timePerTopic: { type: "integer", example: 45 },
            workStartTime: {
              type: "string",
              format: "time",
              example: "08:00:00",
            },
            sessionDays: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CreateSessionDayInput",
              },
            },
          },
        },
        UpdateSessionInput: {
          type: "object",
          properties: {
            sessionCode: { type: "string", maxLength: 50, example: "SESS_001" },
            name: { type: "string", maxLength: 100, example: "Round 1" },
            type: { type: "string", enum: ["Main", "Resit"] },
            timePerTopic: { type: "integer", example: 45 },
            workStartTime: {
              type: "string",
              format: "time",
              example: "08:00:00",
            },
          },
        },
        SessionDay: {
          type: "object",
          required: ["id", "sessionDayCode", "sessionId", "dayDate"],
          properties: {
            id: { type: "integer", example: 1 },
            sessionDayCode: {
              type: "string",
              maxLength: 50,
              example: "SD_001",
            },
            sessionId: { type: "integer", example: 1 },
            dayDate: {
              type: "string",
              format: "date",
              example: "2025-01-15",
            },
            note: {
              type: "string",
              maxLength: 255,
              nullable: true,
              example: "Morning session",
            },
          },
        },
        CreateSessionDayInput: {
          type: "object",
          required: ["sessionDayCode", "dayDate"],
          properties: {
            sessionDayCode: {
              type: "string",
              maxLength: 50,
              example: "SD_001",
            },
            dayDate: { type: "string", format: "date", example: "2025-01-15" },
            note: {
              type: "string",
              maxLength: 255,
              example: "Morning session",
            },
          },
        },
        Lecturer: {
          type: "object",
          required: ["id", "lecturerCode"],
          properties: {
            id: { type: "integer", example: 1 },
            lecturerCode: {
              type: "string",
              maxLength: 50,
              example: "LEC001",
            },
            fullName: {
              type: "string",
              maxLength: 100,
              nullable: true,
              example: "Nguyen Van A",
            },
            email: {
              type: "string",
              maxLength: 100,
              nullable: true,
              example: "nguyenvana@fpt.edu.vn",
            },
            isPresidentQualified: {
              type: "boolean",
              example: true,
              description:
                "Whether lecturer is qualified to be council president",
            },
            isSecretaryQualified: {
              type: "boolean",
              example: false,
              description:
                "Whether lecturer is qualified to be council secretary",
            },
            lecturerSkills: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerSkill" },
            },
          },
        },
        Skill: {
          type: "object",
          required: ["id", "skillCode"],
          properties: {
            id: { type: "integer", example: 1 },
            skillCode: {
              type: "string",
              maxLength: 50,
              example: "JAVA",
            },
            name: {
              type: "string",
              maxLength: 100,
              nullable: true,
              example: "Java Programming",
            },
          },
        },
        CreateSkillInput: {
          type: "object",
          required: ["skillCode", "name"],
          properties: {
            skillCode: { type: "string", maxLength: 50, example: "JAVA" },
            name: { type: "string", maxLength: 100, example: "Java Programming" },
          },
        },
        UpdateSkillInput: {
          type: "object",
          properties: {
            skillCode: { type: "string", maxLength: 50, example: "JAVA" },
            name: { type: "string", maxLength: 100, example: "Java Programming" },
          },
        },
        LecturerSkill: {
          type: "object",
          required: ["id", "lecturerId", "skillId"],
          properties: {
            id: { type: "integer", example: 1 },
            lecturerId: { type: "integer", example: 1 },
            skillId: { type: "integer", example: 1 },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 5,
              nullable: true,
              default: 0,
              example: 4,
              description: "Skill proficiency score (0-5)",
            },
            skill: { $ref: "#/components/schemas/Skill" },
          },
        },
        UpdateLecturerRolesInput: {
          type: "object",
          properties: {
            isPresidentQualified: {
              type: "boolean",
              example: true,
              description: "Set lecturer as qualified for president role",
            },
            isSecretaryQualified: {
              type: "boolean",
              example: false,
              description: "Set lecturer as qualified for secretary role",
            },
          },
        },
        LecturerSkillInput: {
          type: "object",
          required: ["skillId", "score"],
          properties: {
            skillId: {
              type: "integer",
              example: 1,
              description: "ID of the skill",
            },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 5,
              example: 4,
              description: "Skill proficiency score (0-5)",
            },
          },
        },
        UpdateLecturerSkillsInput: {
          type: "object",
          required: ["skills"],
          properties: {
            skills: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerSkillInput" },
              example: [
                { skillId: 1, score: 5 },
                { skillId: 2, score: 3 },
              ],
            },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
              description: "Indicates if the request was successful",
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
              description: "Human-readable message describing the result",
            },
            data: {
              type: "object",
              description: "The response data (structure varies by endpoint)",
            },
            meta: {
              type: "object",
              description: "Additional metadata (e.g., pagination info)",
            },
          },
          required: ["success", "message"],
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Data retrieved successfully",
            },
            data: {
              type: "array",
              items: { type: "object" },
              description: "Array of items for current page",
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: {
                      type: "integer",
                      example: 1,
                      description: "Current page number",
                    },
                    pageSize: {
                      type: "integer",
                      example: 10,
                      description: "Number of items per page",
                    },
                    totalItems: {
                      type: "integer",
                      example: 100,
                      description: "Total number of items across all pages",
                    },
                    totalPages: {
                      type: "integer",
                      example: 10,
                      description: "Total number of pages",
                    },
                    hasNextPage: {
                      type: "boolean",
                      example: true,
                      description: "Whether there is a next page",
                    },
                    hasPreviousPage: {
                      type: "boolean",
                      example: false,
                      description: "Whether there is a previous page",
                    },
                  },
                  required: [
                    "currentPage",
                    "pageSize",
                    "totalItems",
                    "totalPages",
                    "hasNextPage",
                    "hasPreviousPage",
                  ],
                },
              },
            },
          },
          required: ["success", "message", "data", "meta"],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
              description: "Always false for error responses",
            },
            message: {
              type: "string",
              example: "An error occurred",
              description: "Error message describing what went wrong",
            },
            errors: {
              type: "object",
              description: "Detailed error information (optional)",
            },
          },
          required: ["success", "message"],
        },
        ValidationErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Validation failed",
            },
            errors: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
              example: {
                email: ["Email is required", "Email must be valid"],
                score: ["Score must be between 0 and 5"],
              },
              description: "Field-specific validation errors",
            },
          },
          required: ["success", "message"],
        },
      },
    },
  },
  apis:
    process.env.NODE_ENV === "production"
      ? ["./dist/routes/*.js", "./dist/controllers/*.js"]
      : ["./src/routes/*.ts", "./src/controllers/*.ts"], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
