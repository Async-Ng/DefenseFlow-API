import swaggerJsdoc from "swagger-jsdoc";

const options = {
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
    ],
    components: {
      schemas: {},
    },
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
