import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Code Agents Observability API',
      version: '0.1.0',
      description:
        'Hobby-trial booking platform — discover and book sessions across heterogeneous activities (tennis, pilates, dance, hiking, and more).',
    },
    components: {
      schemas: {
        Session: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', example: '1' },
            name: { type: 'string', example: 'Tennis night' },
          },
          additionalProperties: true,
        },
        NewSession: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Tennis night' },
          },
          additionalProperties: true,
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Not found' },
          },
        },
      },
    },
  },
  apis: ['./src/features/**/routes.ts'],
};

export const spec = swaggerJsdoc(options);

export const middleware = [swaggerUi.serve, swaggerUi.setup(spec)];
