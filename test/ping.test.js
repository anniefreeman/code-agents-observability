const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('GET /ping returns 200 and { message: "pong" }', async () => {
  const response = await request(app).get('/ping');

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(response.body, { message: 'pong' });
});
