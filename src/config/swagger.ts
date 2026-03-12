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
        url: "https://defenseflow-api-7u97.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication and Authorization" },
      { name: "Dashboard", description: "Overview and Statistics" },
      { name: "Defenses", description: "Defense Session Management" },
      { name: "Schedule", description: "Defense Council Scheduling" },
      { name: "Availability", description: "Lecturer Availability Tracking" },
      { name: "Capacity", description: "Scheduling Capacity Calculations" },
      { name: "Lecturers", description: "Lecturer Profiles and Assignments" },
      { name: "Lecturer Defense Configs", description: "Lecturer Defense Configurations" },
      { name: "Qualifications", description: "Lecturer Qualifications and Qualification Groups" },
      { name: "Topics", description: "Thesis Topic Management" },
      { name: "TopicTypes", description: "Topic Categorization" },
      { name: "TopicDefense", description: "Topic Defense Assignments" },
      { name: "Semesters", description: "Academic Semester Management" },
      { name: "Import", description: "Data Import Utilities" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token to access protected endpoints",
        },
      },
      schemas: {
        Topic: {
          type: "object",
          required: ["id", "topicCode", "semesterId"],
          properties: {
            id: { type: "integer", example: 1 },
            topicCode: { type: "string", maxLength: 50, example: "TOPIC_001" },
            groupCode: { type: "string", maxLength: 50, nullable: true, example: "SE1701" },
            semesterId: { type: "integer", example: 1 },
            title: {
              type: "string",
              maxLength: 255,
              nullable: true,
              example: "AI Research",
            },
            vietnameseTitle: {
              type: "string",
              maxLength: 255,
              nullable: true,
              example: "Nghiên cứu AI",
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

            topicType: { $ref: "#/components/schemas/TopicType" },
          },
        },
        // ─── QualificationGroup schemas ───────────────────────────────────────
        QualificationGroup: {
          type: "object",
          required: ["id", "code", "name"],
          properties: {
            id: { type: "integer", example: 1 },
            code: {
              type: "string",
              maxLength: 50,
              example: "AI",
              description: "Mã nhóm chuyên môn (duy nhất, viết hoa, không dấu)",
            },
            name: {
              type: "string",
              maxLength: 100,
              example: "Trí tuệ Nhân tạo",
              description: "Tên đầy đủ của nhóm chuyên môn (duy nhất)",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Nhóm kỹ năng về AI, ML, Deep Learning, Computer Vision",
              description: "Mô tả chi tiết về nhóm",
            },
            qualifications: {
              type: "array",
              description: "Danh sách các kỹ năng (chuyên môn cá nhân) thuộc nhóm này",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 3 },
                  name: { type: "string", example: "Machine Learning" },
                  qualificationCode: { type: "string", example: "ML" },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-03-12T10:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-03-12T10:00:00.000Z",
            },
          },
        },
        CreateQualificationGroupInput: {
          type: "object",
          required: ["code", "name"],
          properties: {
            code: {
              type: "string",
              maxLength: 50,
              example: "AI",
              description: "Mã nhóm (viết hoa, không dấu, duy nhất trong hệ thống)",
            },
            name: {
              type: "string",
              maxLength: 100,
              example: "Trí tuệ Nhân tạo",
              description: "Tên đầy đủ của nhóm chuyên môn (duy nhất)",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Nhóm kỹ năng về AI, ML, Deep Learning, Computer Vision",
            },
          },
        },
        UpdateQualificationGroupInput: {
          type: "object",
          properties: {
            code: {
              type: "string",
              maxLength: 50,
              example: "AI",
              description: "Mã nhóm mới (duy nhất)",
            },
            name: {
              type: "string",
              maxLength: 100,
              example: "Trí tuệ Nhân tạo (Cập nhật)",
              description: "Tên nhóm mới (duy nhất)",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Mô tả được cập nhật",
            },
          },
        },
        QualificationGroupTopicType: {
          type: "object",
          description: "Liên kết giữa loại đề tài và nhóm chuyên môn, kèm trọng số ưu tiên",
          properties: {
            id: { type: "integer", example: 1 },
            qualificationGroupId: { type: "integer", example: 2 },
            topicTypeId: { type: "integer", example: 1 },
            priorityWeight: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              example: 60,
              description: "Trọng số ưu tiên của nhóm cho loại đề tài này (số nguyên 1-100). Tổng tất cả trọng số của một loại đề tài phải bằng đúng 100.",
            },
            qualificationGroup: { $ref: "#/components/schemas/QualificationGroup" },
          },
        },
        // ─── TopicType schemas ────────────────────────────────────────────────
        TopicType: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "integer", example: 1 },
            name: {
              type: "string",
              maxLength: 100,
              example: "AI Mobile App",
              description: "Tên loại đề tài",
            },
            qualificationGroupTopicTypes: {
              type: "array",
              description: "Danh sách các nhóm chuyên môn yêu cầu kèm trọng số ưu tiên. Tổng tất cả trọng số phải bằng 100.",
              items: { $ref: "#/components/schemas/QualificationGroupTopicType" },
            },
          },
        },
        CreateTopicTypeInput: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "AI Mobile App",
              description: "Tên loại đề tài mới",
            },
            groups: {
              type: "array",
              description: "Danh sách nhóm chuyên môn cần liên kết. Nếu cung cấp, tổng priorityWeight phải bằng đúng 100.",
              items: {
                type: "object",
                required: ["groupId", "priorityWeight"],
                properties: {
                  groupId: {
                    type: "integer",
                    example: 1,
                    description: "ID của nhóm chuyên môn (QualificationGroup.id)",
                  },
                  priorityWeight: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    example: 60,
                    description: "Trọng số ưu tiên (số nguyên 1-100). Tổng tất cả trọng số phải bằng 100.",
                  },
                },
              },
              example: [
                { groupId: 1, priorityWeight: 60 },
                { groupId: 2, priorityWeight: 40 },
              ],
            },
          },
        },
        UpdateTopicTypeInput: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "AI Mobile App (Cập nhật)",
              description: "Tên loại đề tài",
            },
            groups: {
              type: "array",
              description: "Danh sách nhóm chuyên môn mới (sẽ thay thế TOÀN BỘ danh sách cũ). Tổng priorityWeight phải bằng đúng 100.",
              items: {
                type: "object",
                required: ["groupId", "priorityWeight"],
                properties: {
                  groupId: {
                    type: "integer",
                    example: 2,
                    description: "ID của nhóm chuyên môn",
                  },
                  priorityWeight: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    example: 70,
                    description: "Trọng số ưu tiên (1-100). Tổng phải bằng 100.",
                  },
                },
              },
              example: [
                { groupId: 1, priorityWeight: 70 },
                { groupId: 3, priorityWeight: 30 },
              ],
            },
          },
        },
        UpdateTopicInput: {
          type: "object",
          properties: {
            topicCode: { type: "string", maxLength: 50, example: "TOPIC_001" },
            groupCode: { type: "string", maxLength: 50, example: "SE1701" },
            title: { type: "string", maxLength: 255, example: "AI Research" },
            vietnameseTitle: { type: "string", maxLength: 255, example: "Nghiên cứu AI" },
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
        Defense: {
          type: "object",
          required: ["id", "defenseCode", "semesterId"],
          properties: {
            id: { type: "integer", example: 1 },
            defenseCode: { type: "string", maxLength: 50, example: "DEF_001" },
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
            status: {
              type: "string",
              enum: ["Open", "Locked"],
              default: "Open",
              example: "Open",
              description: "Current status of the defense round",
            },
            timePerTopic: {
              type: "integer",
              nullable: true,
              example: 45,
            },
            workStartTime: {
              type: "string",
              format: "time",
              nullable: true,
              example: "08:00:00",
            },
            maxCouncilsPerDay: {
              type: "integer",
              nullable: true,
              example: 1,
            },
            isAvailabilityPublished: {
              type: "boolean",
              default: false,
              example: false,
              description: "Whether the admin has published availability days for lecturers to register",
            },
            isSchedulePublished: {
              type: "boolean",
              default: false,
              example: false,
              description: "Whether the final defense schedule has been published",
            },
            availabilityStartDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-01",
              description: "Start date of the availability registration window",
            },
            availabilityEndDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-20",
              description: "End date of the availability registration window",
            },
            defenseDays: {
              type: "array",
              items: {
                $ref: "#/components/schemas/DefenseDay",
              },
            },
          },
        },
        CreateDefenseInput: {
          type: "object",
          required: ["defenseCode", "semesterId", "name"],
          properties: {
            defenseCode: { type: "string", maxLength: 50, example: "DEF_001" },
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
            maxCouncilsPerDay: { type: "integer", example: 1 },
            status: {
              type: "string",
              enum: ["Open", "Locked"],
              default: "Open",
              example: "Open",
              description: "Current status of the defense round",
            },
            availabilityStartDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-01",
              description: "Start date of the availability registration window",
            },
            availabilityEndDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-20",
              description: "End date of the availability registration window",
            },
            defenseDays: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CreateDefenseDayInput",
              },
            },
          },
        },
        UpdateDefenseInput: {
          type: "object",
          properties: {
            defenseCode: { type: "string", maxLength: 50, example: "DEF_001" },
            name: { type: "string", maxLength: 100, example: "Round 1" },
            type: { type: "string", enum: ["Main", "Resit"] },
            timePerTopic: { type: "integer", example: 45 },
            workStartTime: {
              type: "string",
              format: "time",
              example: "08:00:00",
            },
            maxCouncilsPerDay: { type: "integer", example: 1 },
            status: {
              type: "string",
              enum: ["Open", "Locked"],
              example: "Open",
              description: "Current status of the defense round",
            },
            availabilityStartDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-01",
              description: "Start date of the availability registration window",
            },
            availabilityEndDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-20",
              description: "End date of the availability registration window",
            },
            defenseDays: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CreateDefenseDayInput",
              },
            },
          },
        },
        PublishAvailabilityInput: {
          type: "object",
          properties: {
            availabilityStartDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-01",
              description: "Start date of the availability registration window",
            },
            availabilityEndDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-20",
              description: "End date of the availability registration window",
            },
          },
        },
        DefenseDay: {
          type: "object",
          required: ["id", "defenseDayCode", "defenseId", "dayDate"],
          properties: {
            id: { type: "integer", example: 1 },
            defenseDayCode: {
              type: "string",
              maxLength: 50,
              example: "DD_001",
            },
            defenseId: { type: "integer", example: 1 },
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
        CreateDefenseDayInput: {
          type: "object",
          required: ["defenseDayCode", "dayDate"],
          properties: {
            defenseDayCode: {
              type: "string",
              maxLength: 50,
              example: "DD_001",
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
            seniorityLevel: {
              type: "string",
              enum: ["Senior", "MidLevel", "Junior", "Rookie"],
              default: "Rookie",
              description: "[Chỉ dành cho Admin] Cấp bậc kinh nghiệm của giảng viên. Không hiển thị cho giảng viên.",
              example: "MidLevel",
            },
            isLecturer: {
              type: "boolean",
              default: true,
              description: "Whether this user has the Lecturer role",
              example: true,
            },
            isAdmin: {
              type: "boolean",
              default: false,
              description: "Whether this user has the Admin role",
              example: false,
            },
            lecturerQualifications: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerQualification" },
            },
          },
        },
        CreateLecturerInput: {
          type: "object",
          required: ["lecturerCode"],
          properties: {
            lecturerCode: { type: "string", maxLength: 50, example: "LEC001" },
            fullName: { type: "string", maxLength: 100, example: "Nguyen Van A" },
            email: {
              type: "string",
              maxLength: 100,
              example: "nguyenvana@fpt.edu.vn",
            },
            seniorityLevel: {
              type: "string",
              enum: ["Senior", "MidLevel", "Junior", "Rookie"],
              description: "[Chỉ dành cho Admin] Cấp bậc kinh nghiệm của giảng viên.",
              example: "Rookie",
            },
            isLecturer: {
              type: "boolean",
              default: true,
            },
            isAdmin: {
              type: "boolean",
              default: false,
            },
          },
        },
        UpdateLecturerInput: {
          type: "object",
          properties: {
            lecturerCode: { type: "string", maxLength: 50, example: "LEC001" },
            fullName: { type: "string", maxLength: 100, example: "Nguyen Van A" },
            email: {
              type: "string",
              maxLength: 100,
              example: "nguyenvana@fpt.edu.vn",
            },
            seniorityLevel: {
              type: "string",
              enum: ["Senior", "MidLevel", "Junior", "Rookie"],
              description: "[Chỉ dành cho Admin] Cập nhật cấp bậc kinh nghiệm. Không hiển thị cho giảng viên.",
              example: "Senior",
            },
            isLecturer: {
              type: "boolean",
            },
            isAdmin: {
              type: "boolean",
            },
          },
        },
        Qualification: {
          type: "object",
          required: ["id", "qualificationCode"],
          properties: {
            id: { type: "integer", example: 1 },
            qualificationCode: {
              type: "string",
              maxLength: 50,
              example: "JAVA",
            },
            name: {
              type: "string",
              maxLength: 255,
              nullable: true,
              example: "Scope: Coverage of objectives",
            },
            component: {
              type: "string",
              enum: ["Product", "Document", "Presentation"],
              nullable: true,
              example: "Product"
            },
            descHigh: { type: "string", nullable: true },
            descGood: { type: "string", nullable: true },
            descAcceptable: { type: "string", nullable: true },
            descFail: { type: "string", nullable: true },
            evaluationGuidelines: { type: "string", nullable: true },
            qualificationTopicTypes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 1 },
                  topicTypeId: { type: "integer", example: 1 },
                  priorityWeight: { type: "number", format: "float", example: 1.0 },
                  topicType: { $ref: "#/components/schemas/TopicType" },
                }
              }
            },
          },
        },
        CreateQualificationInput: {
          type: "object",
          required: ["qualificationCode", "name"],
          properties: {
            qualificationCode: { type: "string", maxLength: 50, example: "P1" },
            name: {
              type: "string",
              maxLength: 255,
              example: "Scope: Coverage of objectives",
            },
            component: {
              type: "string",
              enum: ["Product", "Document", "Presentation"],
              example: "Product"
            },
            descHigh: { type: "string" },
            descGood: { type: "string" },
            descAcceptable: { type: "string" },
            descFail: { type: "string" },
            evaluationGuidelines: { type: "string" },
          },
        },
        UpdateQualificationInput: {
          type: "object",
          properties: {
            qualificationCode: { type: "string", maxLength: 50, example: "P1" },
            name: {
              type: "string",
              maxLength: 255,
              example: "Scope: Coverage of objectives",
            },
            component: {
              type: "string",
              enum: ["Product", "Document", "Presentation"],
              example: "Product"
            },
            descHigh: { type: "string" },
            descGood: { type: "string" },
            descAcceptable: { type: "string" },
            descFail: { type: "string" },
            evaluationGuidelines: { type: "string" },
          },
        },
        LecturerQualification: {
          type: "object",
          required: ["id", "lecturerId", "qualificationId"],
          properties: {
            id: { type: "integer", example: 1 },
            lecturerId: { type: "integer", example: 1 },
            qualificationId: { type: "integer", example: 1 },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 10,
              nullable: true,
              default: 0,
              example: 8,
              description: "Điểm đánh giá năng lực (0-10)",
            },
            qualification: { $ref: "#/components/schemas/Qualification" },
          },
        },
        LecturerDefenseConfig: {
          type: "object",
          required: ["id", "lecturerId", "defenseId"],
          properties: {
            id: { type: "integer", example: 1 },
            lecturerId: { type: "integer", example: 1 },
            defenseId: { type: "integer", example: 1 },
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

        LecturerQualificationInput: {
          type: "object",
          required: ["qualificationId", "score"],
          properties: {
            qualificationId: {
              type: "integer",
              example: 1,
              description: "ID của năng lực chuyên môn",
            },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 5,
              example: 4,
              description: "Điểm đánh giá năng lực (0-5)",
            },
          },
        },


        UpdateLecturerQualificationsInput: {
          type: "object",
          required: ["qualifications"],
          properties: {
            qualifications: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerQualificationInput" },
              example: [
                { qualificationId: 1, score: 5 },
                { qualificationId: 2, score: 3 },
              ],
            },
          },
        },
        TopicDefense: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            topicDefenseCode: { type: "string", example: "DEF_TOPIC_001" },
            topicId: { type: "integer", example: 10 },
            defenseId: { type: "integer", example: 5 },
            finalResult: {
              type: "string",
              enum: ["Pending", "Passed", "Failed"],
              example: "Passed",
            },
            topic: { $ref: "#/components/schemas/Topic" },
          },
        },
        CreateTopicDefenseInput: {
          type: "object",
          required: ["topicIds", "defenseId"],
          properties: {
            topicIds: {
              type: "array",
              items: { type: "integer" },
              example: [5, 6, 7],
              description: "Array of topic IDs being registered",
            },
            defenseId: {
              type: "integer",
              example: 2,
              description: "ID of the defense registering into",
            },
          },
        },
        AvailabilityStatus: {
          type: "string",
          enum: ["Available", "Busy"],
          example: "Busy",
        },
        Availability: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            lecturerId: { type: "integer", example: 5 },
            defenseDayId: { type: "integer", example: 10 },
            status: { $ref: "#/components/schemas/AvailabilityStatus" },
          },
        },
        LecturerStatusResult: {
          type: "object",
          properties: {
            isRegistered: { type: "boolean", example: true },
            hasAvailability: { type: "boolean", example: true },
            availabilityCount: { type: "integer", example: 3 },
            defenseDaysCount: { type: "integer", example: 5 },
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
        CouncilBoardMember: {
          type: "object",
          required: ["id", "councilBoardId", "lecturerId", "role"],
          properties: {
            id: { type: "integer", example: 1 },
            councilBoardId: { type: "integer", example: 10 },
            lecturerId: { type: "integer", example: 5 },
            role: { $ref: "#/components/schemas/CouncilRole" },
            lecturer: { $ref: "#/components/schemas/Lecturer" },
          },
        },
        CouncilBoard: {
          type: "object",
          required: ["id", "boardCode", "defenseDayId", "semesterId"],
          properties: {
            id: { type: "integer", example: 10 },
            boardCode: { type: "string", example: "CB-20250101-123" },
            name: { type: "string", example: "Defense Council Board 1" },
            defenseDayId: { type: "integer", example: 2 },
            semesterId: { type: "integer", example: 1 },
            councilBoardMembers: {
              type: "array",
              items: { $ref: "#/components/schemas/CouncilBoardMember" },
            },
            defenseCouncils: {
              type: "array",
              items: { $ref: "#/components/schemas/DefenseCouncil" },
            },
          },
        },
        DefenseCouncil: {
          type: "object",
          required: ["id", "defenseCouncilCode", "topicDefenseId", "councilBoardId"],
          properties: {
            id: { type: "integer", example: 50 },
            defenseCouncilCode: { type: "string", example: "DC-TOPIC001-123" },
            topicDefenseId: { type: "integer", example: 5 },
            councilBoardId: { type: "integer", example: 10 },
            startTime: { type: "string", format: "time", example: "08:00:00" },
            endTime: { type: "string", format: "time", example: "08:45:00" },
            councilBoard: { $ref: "#/components/schemas/CouncilBoard" },
            topicDefense: {
              $ref: "#/components/schemas/TopicDefense",
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
            warnings: {
              type: "array",
              items: { type: "string" },
              description: "Councils that did not meet seniority requirements",
              example: ["CouncilBoard CB-001: No Senior or MidLevel lecturer available. Scheduled with best available."],
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
        DefenseResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Defense retrieved successfully",
            },
            data: { $ref: "#/components/schemas/Defense" },
          },
        },
        DefenseDaysResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Defense days retrieved successfully" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/DefenseDay" },
            },
          },
        },
        DefenseDaysWithAvailabilityResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Defense days with availability retrieved successfully" },
            data: {
              type: "array",
              items: {
                allOf: [
                  { $ref: "#/components/schemas/DefenseDay" },
                  {
                    type: "object",
                    properties: {
                      availabilityStatus: { $ref: "#/components/schemas/AvailabilityStatus" },
                      isRegistered: { type: "boolean", example: true },
                    },
                  },
                ],
              },
            },
          },
        },
        LecturerStatusResultResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Lecturer status retrieved successfully" },
            data: { $ref: "#/components/schemas/LecturerStatusResult" },
          },
        },
        AvailabilityResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Availability updated successfully" },
            data: { $ref: "#/components/schemas/Availability" },
          },
        },
        AvailabilityListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Availability updated successfully" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Availability" },
            },
          },
        },
        DefenseListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Defenses retrieved successfully",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Defense" },
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
              example: "Lấy thông tin giảng viên thành công",
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
              example: "Lấy danh sách giảng viên thành công",
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
        LecturerSimpleListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Lấy danh sách giảng viên thành công" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Lecturer" },
            },
          },
        },
        QualificationResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Lấy thông tin năng lực thành công",
            },
            data: { $ref: "#/components/schemas/Qualification" },
          },
        },
        QualificationListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Lấy danh sách năng lực thành công",
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Qualification" },
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
        TopicTypeResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Lấy thông tin loại đề tài thành công" },
            data: { $ref: "#/components/schemas/TopicType" },
          },
        },
        TopicTypeListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Lấy danh sách loại đề tài thành công" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/TopicType" },
            },
            meta: {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", example: 1 },
                    pageSize: { type: "integer", example: 10 },
                    totalItems: { type: "integer", example: 10 },
                    totalPages: { type: "integer", example: 1 },
                    hasNextPage: { type: "boolean", example: false },
                    hasPreviousPage: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
        },
        DashboardStats: {
          type: "object",
          properties: {
            totalSemesters: { type: "integer", example: 5 },
            totalLecturers: { type: "integer", example: 50 },
            totalTopics: { type: "integer", example: 100 },
            totalDefenses: { type: "integer", example: 10 },
            totalCouncilBoards: { type: "integer", example: 20 },
            topicsByResult: {
              type: "object",
              properties: {
                pending: { type: "integer", example: 70 },
                passed: { type: "integer", example: 25 },
                failed: { type: "integer", example: 5 },
              },
            },
            upcomingDefenses: {
              type: "array",
              items: {
                allOf: [
                  { $ref: "#/components/schemas/Defense" },
                  {
                    type: "object",
                    properties: {
                      semester: {
                        type: "object",
                        properties: {
                          name: { type: "string", example: "Spring 2025" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        ScheduleResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Schedule retrieved successfully" },
            data: {
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CouncilBoard" },
                },
                total: { type: "integer", example: 10 },
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 10 },
              },
            },
          },
        },
        CouncilBoardResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Council board retrieved successfully" },
            data: { $ref: "#/components/schemas/CouncilBoard" },
          },
        },
        DefenseCouncilResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Defense council retrieved successfully" },
            data: { $ref: "#/components/schemas/DefenseCouncil" },
          },
        },
        LecturerDefenseConfigResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Configuration retrieved successfully" },
            data: { $ref: "#/components/schemas/LecturerDefenseConfig" },
          },
        },
        LecturerDefenseConfigListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Configurations retrieved successfully" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/LecturerDefenseConfig" },
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
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis:
    process.env.NODE_ENV === "production"
      ? ["./dist/src/routes/*.js", "./dist/src/controllers/*.js"]
      : ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
