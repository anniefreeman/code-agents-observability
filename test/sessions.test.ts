import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app';

test('POST /sessions creates a session and returns 201 with id', async () => {
  const response = await request(app)
    .post('/sessions')
    .send({ name: 'Tennis night' });

  assert.strictEqual(response.status, 201);
  assert.ok(response.body.id, 'response should include an id');
  assert.strictEqual(response.body.name, 'Tennis night');
});

test('GET /sessions returns 200 and an array', async () => {
  await request(app).post('/sessions').send({ name: 'Pilates' });

  const response = await request(app).get('/sessions');

  assert.strictEqual(response.status, 200);
  assert.ok(Array.isArray(response.body), 'response body should be an array');
  assert.ok(response.body.length >= 1);
});

test('GET /sessions/:id returns 200 and the session', async () => {
  const created = await request(app)
    .post('/sessions')
    .send({ name: 'Group hike' });

  const response = await request(app).get(`/sessions/${created.body.id}`);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.id, created.body.id);
  assert.strictEqual(response.body.name, 'Group hike');
});

test('PUT /sessions/:id updates a session and returns 200', async () => {
  const created = await request(app)
    .post('/sessions')
    .send({ name: 'Salsa class' });

  const response = await request(app)
    .put(`/sessions/${created.body.id}`)
    .send({ name: 'Bachata class' });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.id, created.body.id);
  assert.strictEqual(response.body.name, 'Bachata class');
});

test('DELETE /sessions/:id removes a session and returns 204', async () => {
  const created = await request(app)
    .post('/sessions')
    .send({ name: 'Pottery workshop' });

  const response = await request(app).delete(`/sessions/${created.body.id}`);

  assert.strictEqual(response.status, 204);

  const followup = await request(app).get(`/sessions/${created.body.id}`);
  assert.strictEqual(followup.status, 404);
});
