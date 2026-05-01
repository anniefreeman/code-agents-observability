import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import {
  SessionInputSchema,
  SessionResponseSchema,
} from './features/sessions/schemas';

// Register zod schemas under the names the route JSDoc references via $ref.
// Adding a new feature: import its schemas and register them here.
const registry = new OpenAPIRegistry();
registry.register('NewSession', SessionInputSchema);
registry.register('Session', SessionResponseSchema);

const zodComponents = new OpenApiGeneratorV3(
  registry.definitions
).generateComponents();

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
        ...(zodComponents.components?.schemas ?? {}),
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Not found' },
            issues: {
              type: 'array',
              items: { type: 'object' },
              description: 'Present on validation errors; zod issue objects.',
            },
          },
        },
      },
    },
  },
  apis: ['./src/features/**/routes.ts'],
};

export const spec = swaggerJsdoc(options);

export const middleware = [swaggerUi.serve, swaggerUi.setup(spec)];
