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
        url: "https://defenseflow-api.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Topic: {
          type: "object",
          required: ["id", "topicCode", "semesterId"],
          properties: {
            id: { type: "integer", example: 1 },
            topicCode: { type: "string", maxLength: 50, example: "TOPIC_001" },
            semesterId: { type: "integer", example: 1 },
            title: {
              type: "string",
              maxLength: 255,
              nullable: true,
              example: "AI Research",
            },
            semester: { $ref: "#/components/schemas/Semester" },
            topicSupervisors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  lecturer: { $ref: "#/components/schemas/Lecturer" },
                },
              },
            },
          },
        },
        UpdateTopicInput: {
          type: "object",
          properties: {
            topicCode: { type: "string", maxLength: 50, example: "TOPIC_001" },
            title: { type: "string", maxLength: 255, example: "AI Research" },
            supervisorIds: {
              type: "array",
              items: { type: "integer" },
              example: [5, 7],
            },
          },
        },
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
            sessionDays: {
              type: "array",
              items: {
                $ref: "#/components/schemas/SessionDay",
              },
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
            sessionDays: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CreateSessionDayInput",
              },
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
            name: {
              type: "string",
              maxLength: 100,
              example: "Java Programming",
            },
          },
        },
        UpdateSkillInput: {
          type: "object",
          properties: {
            skillCode: { type: "string", maxLength: 50, example: "JAVA" },
            name: {
              type: "string",
              maxLength: 100,
              example: "Java Programming",
            },
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
        LecturerSessionConfig: {
          type: "object",
          required: ["id", "lecturerId", "sessionId"],
          properties: {
            id: { type: "integer", example: 1 },
            lecturerId: { type: "integer", example: 1 },
            sessionId: { type: "integer", example: 1 },
            minTopics: {
              type: "integer",
              example: 5,
              description:
                "Minimum number of topics lecturer is willing to evaluate",
            },
            maxTopics: {
              type: "integer",
              example: 10,
              description:
                "Maximum number of topics lecturer is willing to evaluate",
            },
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
        TopicSessionRegistration: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            registrationCode: { type: "string", example: "REG_001" },
            topicId: { type: "integer", example: 10 },
            sessionId: { type: "integer", example: 5 },
            finalResult: {
              type: "string",
              enum: ["Pending", "Passed", "Failed"],
              example: "Passed",
            },
            topic: { $ref: "#/components/schemas/Topic" },
          },
        },
        UpdateTopicResultInput: {
          type: "object",
          required: ["result"],
          properties: {
            result: {
              type: "string",
              enum: ["Pending", "Passed", "Failed"],
              example: "Passed",
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
        CouncilRole: {
          type: "string",
          enum: ["President", "Secretary", "Member"],
          example: "President",
        },
        CouncilMember: {
          type: "object",
          required: ["id", "councilId", "lecturerId", "role"],
          properties: {
            id: { type: "integer", example: 1 },
            councilId: { type: "integer", example: 10 },
            lecturerId: { type: "integer", example: 5 },
            role: { $ref: "#/components/schemas/CouncilRole" },
            lecturer: { $ref: "#/components/schemas/Lecturer" },
          },
        },
        Council: {
          type: "object",
          required: ["id", "councilCode", "sessionDayId", "semesterId"],
          properties: {
            id: { type: "integer", example: 10 },
            councilCode: { type: "string", example: "CNCL-20250101-123" },
            name: { type: "string", example: "Defense Council 1" },
            sessionDayId: { type: "integer", example: 2 },
            semesterId: { type: "integer", example: 1 },
            councilMembers: {
              type: "array",
              items: { $ref: "#/components/schemas/CouncilMember" },
            },
            defenseMatches: {
              type: "array",
              items: { $ref: "#/components/schemas/DefenseMatch" },
            },
          },
        },
        DefenseMatch: {
          type: "object",
          required: ["id", "matchCode", "registrationId", "councilId"],
          properties: {
            id: { type: "integer", example: 50 },
            matchCode: { type: "string", example: "MTCH-TOPIC001-123" },
            registrationId: { type: "integer", example: 5 },
            councilId: { type: "integer", example: 10 },
            startTime: { type: "string", format: "time", example: "08:00:00" },
            endTime: { type: "string", format: "time", example: "08:45:00" },
            council: { $ref: "#/components/schemas/Council" },
            registration: {
              $ref: "#/components/schemas/TopicSessionRegistration",
            },
          },
        },

        ScheduleGenerationResult: {
          type: "object",
          properties: {
            status: { type: "string", example: "success" },
            metrics: {
              type: "object",
              properties: {
                totalTopics: { type: "integer", example: 10 },
                scheduled: { type: "integer", example: 10 },
                unscheduled: { type: "integer", example: 0 },
              },
            },
            unscheduledTopics: {
              type: "array",
              items: { type: "string" },
              example: [],
            },
          },
        },
        // Response Wrappers for specific endpoints
        TopicResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Topic retrieved successfully",
            },
            data: { $ref: "#/components/schemas/Topic" },
          },
        },
        TopicListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Topics retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Topic" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 50 },
                    totalPages: { type: "integer", example: 5 },
                    hasNextPage: { type: "boolean", example: true },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        SemesterResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Semester retrieved successfully",
            },
            data: { $ref: "#/components/schemas/Semester" },
          },
        },
        SemesterListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Semesters retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Semester" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 20 },
                    totalPages: { type: "integer", example: 2 },
                    hasNextPage: { type: "boolean", example: true },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        SessionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Session retrieved successfully",
            },
            data: { $ref: "#/components/schemas/Session" },
          },
        },
        SessionListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Sessions retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Session" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 15 },
                    totalPages: { type: "integer", example: 2 },
                    hasNextPage: { type: "boolean", example: true },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        LecturerResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Lecturer retrieved successfully",
            },
            data: { $ref: "#/components/schemas/Lecturer" },
          },
        },
        LecturerListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Lecturers retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Lecturer" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 30 },
                    totalPages: { type: "integer", example: 3 },
                    hasNextPage: { type: "boolean", example: true },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        SkillResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Skill retrieved successfully",
            },
            data: { $ref: "#/components/schemas/Skill" },
          },
        },
        SkillListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Skills retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Skill" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 25 },
                    totalPages: { type: "integer", example: 3 },
                    hasNextPage: { type: "boolean", example: true },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        ImportResultResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Import completed" },
            data: {
              type: "object",
              properties: {
                successCount: { type: "integer", example: 45 },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      row: { type: "integer", example: 5 },
                      message: {
                        type: "string",
                        example: "Supervisor not found",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ScheduleResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Schedule generated successfully",
            },
            data: { $ref: "#/components/schemas/ScheduleGenerationResult" },
          },
        },
        // Capacity Calculator Schemas
        CapacityCalculationRequest: {
          type: "object",
          required: ["semesterId"],
          properties: {
            semesterId: {
              type: "integer",
              example: 1,
              description: "ID of the semester to calculate capacity for",
            },
            sessionId: {
              type: "integer",
              example: 1,
              description:
                "Optional: Specific session ID. If not provided, system will auto-select first session from semester (if exists)",
            },
            timePerTopic: {
              type: "integer",
              example: 90,
              description:
                "Optional: Time per topic in minutes. If not provided, will use session data or default to 90 minutes",
            },
            workHoursPerDay: {
              type: "integer",
              example: 480,
              description: "Optional: Work hours per day in minutes. Default: 480 minutes (8 hours)",
            },
            councilSize: {
              type: "integer",
              example: 5,
              description:
                "Optional: Number of council members. Default: 5 (1 President + 1 Secretary + 3 Members)",
            },
            plannedDays: {
              type: "integer",
              example: 4,
              description: "Optional: Planned number of days if no session exists",
            },
          },
        },
        SessionDayAdjustment: {
          type: "object",
          properties: {
            shouldAdjust: {
              type: "boolean",
              example: true,
              description: "Whether session days should be adjusted",
            },
            suggestedChange: {
              type: "integer",
              example: 2,
              description:
                "Number of days to add (+) or remove (-), e.g., +2 means add 2 days",
            },
            reason: {
              type: "string",
              example:
                "Số ngày hiện tại (2) không đủ để chấm 120 đề tài. Cần tăng thêm 2 ngày để đảm bảo workload hợp lý.",
              description: "Explanation for the adjustment recommendation",
            },
          },
        },
        TopicsPerCouncilPerDay: {
          type: "object",
          properties: {
            minimum: {
              type: "integer",
              example: 10,
              description: "Minimum topics a council can evaluate per day",
            },
            maximum: {
              type: "integer",
              example: 12,
              description: "Maximum topics a council can evaluate per day",
            },
            average: {
              type: "integer",
              example: 11,
              description: "Average topics a council should evaluate per day",
            },
          },
        },
        LecturerWorkload: {
          type: "object",
          properties: {
            recommendedMin: {
              type: "integer",
              example: 18,
              description: "Recommended minimum topics per lecturer",
            },
            recommendedMax: {
              type: "integer",
              example: 30,
              description: "Recommended maximum topics per lecturer",
            },
            idealAverage: {
              type: "integer",
              example: 24,
              description: "Ideal average topics per lecturer",
            },
          },
        },
        CapacityRecommendations: {
          type: "object",
          properties: {
            minimumDaysRequired: {
              type: "integer",
              example: 3,
              description: "Absolute minimum days needed",
            },
            recommendedDays: {
              type: "integer",
              example: 4,
              description: "Recommended number of days with buffer",
            },
            currentSessionDays: {
              type: "integer",
              nullable: true,
              example: 2,
              description: "Current number of days if sessionId provided",
            },
            sessionDayAdjustment: {
              allOf: [{ $ref: "#/components/schemas/SessionDayAdjustment" }],
              nullable: true,
              description: "Adjustment recommendation if sessionId provided",
            },
            minLecturersRequired: {
              type: "integer",
              example: 20,
              description: "Minimum lecturers needed",
            },
            recommendedLecturers: {
              type: "integer",
              example: 30,
              description: "Recommended number of lecturers for balanced workload",
            },
            maxLecturersNeeded: {
              type: "integer",
              example: 40,
              description: "Maximum lecturers that could be utilized",
            },
            topicsPerCouncilPerDay: {
              $ref: "#/components/schemas/TopicsPerCouncilPerDay",
            },
            councilsPerDay: {
              type: "integer",
              example: 4,
              description: "Number of councils needed per day",
            },
            lecturerWorkload: {
              $ref: "#/components/schemas/LecturerWorkload",
            },
          },
        },
        CapacityAnalysis: {
          type: "object",
          properties: {
            totalTopics: {
              type: "integer",
              example: 120,
              description: "Total number of topics in the semester",
            },
            timePerTopic: {
              type: "integer",
              example: 30,
              description: "Time allocated per topic in minutes",
            },
            workHoursPerDay: {
              type: "integer",
              example: 480,
              description: "Work hours per day in minutes",
            },
            councilSize: {
              type: "integer",
              example: 5,
              description: "Number of members in each council",
            },
          },
        },
        CapacityCalculationResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Capacity calculated successfully",
            },
            data: {
              type: "object",
              properties: {
                semesterId: {
                  type: "integer",
                  example: 1,
                },
                sessionId: {
                  type: "integer",
                  nullable: true,
                  example: 1,
                },
                analysis: {
                  $ref: "#/components/schemas/CapacityAnalysis",
                },
                recommendations: {
                  $ref: "#/components/schemas/CapacityRecommendations",
                },
                warnings: {
                  type: "array",
                  items: { type: "string" },
                  example: [
                    "Session hiện tại chỉ có 2 ngày, không đủ để chấm 120 đề tài với councilSize = 5",
                  ],
                },
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  example: [
                    "Nên có ít nhất 30 giảng viên tham gia để cân bằng workload",
                    "Đề xuất tăng số ngày từ 2 lên 4 ngày để giảm áp lực",
                  ],
                },
              },
            },
          },
        },
        LecturerSessionConfigResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Configuration retrieved successfully",
            },
            data: { $ref: "#/components/schemas/LecturerSessionConfig" },
          },
        },
        LecturerSessionConfigListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Configurations retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerSessionConfig" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 50 },
                    totalPages: { type: "integer", example: 5 },
                    hasNextPage: { type: "boolean", example: true },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        LecturerDayAvailability: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            lecturerId: { type: "integer", example: 1 },
            sessionDayId: { type: "integer", example: 1 },
            status: {
              type: "string",
              enum: ["Available", "Busy"],
              example: "Busy",
            },
          },
        },
        SessionDayWithAvailability: {
          allOf: [
            { $ref: "#/components/schemas/SessionDay" },
            {
              type: "object",
              properties: {
                lecturerDayAvailability: {
                  type: "array",
                  items: { $ref: "#/components/schemas/LecturerDayAvailability" },
                },
              },
            },
          ],
        },
        LecturerStatusResponseData: {
          type: "object",
          properties: {
            lecturerId: { type: "integer", example: 1 },
            sessionId: { type: "integer", example: 1 },
            isRegistrationOpen: { type: "boolean", example: true },
            sessionConfig: { $ref: "#/components/schemas/LecturerSessionConfig" },
            availabilities: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerDayAvailability" },
            },
          },
        },
        SessionDaysResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Session days retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/SessionDay" },
            },
          },
        },
        SessionDaysWithAvailabilityResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Session days with availability retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/SessionDayWithAvailability" },
            },
          },
        },
        LecturerStatusResultResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Lecturer status retrieved successfully",
            },
            data: { $ref: "#/components/schemas/LecturerStatusResponseData" },
          },
        },
        AvailabilityResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Availability updated successfully",
            },
            data: { $ref: "#/components/schemas/LecturerDayAvailability" },
          },
        },
        AvailabilityListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Availability updated successfully for all days",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerDayAvailability" },
            },
          },
        },
      },
    },
  },
  apis:
    process.env.NODE_ENV === "production"
      ? ["./dist/src/routes/*.js", "./dist/src/controllers/*.js"]
      : ["./src/routes/*.ts", "./src/controllers/*.ts"], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
