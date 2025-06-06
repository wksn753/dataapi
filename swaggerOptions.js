const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Express API',
      version: '1.0.0',
      description: 'A simple Express API',
    },
    servers: [
      {
        url: 'http://localhost:3000', // update based on your environment
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to your route files with JSDoc comments
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
