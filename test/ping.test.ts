import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app';

test('GET /ping returns 200 and { message: "pong" }', async () => {
  const response = await request(app).get('/ping');

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(response.body, { message: 'pong' });
});
