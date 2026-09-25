import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp({ corsOrigins: ['http://localhost:5173'] });

const validLead = {
  name: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '+91 98765 43210',
};

async function createLead(overrides: Partial<Record<string, string>> = {}) {
  const res = await request(app)
    .post('/api/leads')
    .send({ ...validLead, ...overrides });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; status: string; email: string };
}

describe('GET /api/health', () => {
  it('reports the service as healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/leads', () => {
  it('creates a lead with default status NEW and normalised email', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ ...validLead, name: '  Priya Sharma ', email: ' Priya@Example.COM ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+91 98765 43210',
      status: 'NEW',
    });
    expect(res.body.data.id).toMatch(/^[a-f\d]{24}$/);
    expect(new Date(res.body.data.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('accepts an explicit initial status', async () => {
    const lead = await createLead({ status: 'CONTACTED' });
    expect(lead.status).toBe('CONTACTED');
  });

  it('returns field-level errors for invalid input', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'P', email: 'not-an-email', phone: 'abc', status: 'WON' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'phone', 'status']));
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/leads').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveLength(3);
  });

  it('rejects phone numbers with too few digits', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ ...validLead, phone: '12-34-56' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('phone');
  });

  it('returns 409 when the email already exists (case-insensitive)', async () => {
    await createLead();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...validLead, email: 'PRIYA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual([
      { path: 'email', message: 'A lead with this email already exists' },
    ]);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON in request body');
  });
});

describe('GET /api/leads', () => {
  it('returns an empty page when there are no leads', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  });

  it('lists leads newest first', async () => {
    await createLead({ name: 'First Lead', email: 'first@example.com' });
    await createLead({ name: 'Second Lead', email: 'second@example.com' });

    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { name: string }) => l.name)).toEqual(['Second Lead', 'First Lead']);
  });

  it('searches by name, email or phone, case-insensitively', async () => {
    await createLead({ name: 'Rahul Verma', email: 'rahul@acme.io', phone: '9000000001' });
    await createLead({ name: 'Anita Rao', email: 'anita@globex.com', phone: '9000000002' });

    const byName = await request(app).get('/api/leads').query({ search: 'RAHUL' });
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0].name).toBe('Rahul Verma');

    const byEmail = await request(app).get('/api/leads').query({ search: 'globex' });
    expect(byEmail.body.data[0].name).toBe('Anita Rao');

    const byPhone = await request(app).get('/api/leads').query({ search: '0002' });
    expect(byPhone.body.data[0].name).toBe('Anita Rao');
  });

  it('treats regex characters in search literally', async () => {
    await createLead({ name: 'Plain Name', email: 'plain@example.com' });
    const res = await request(app).get('/api/leads').query({ search: '.*' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters by status and combines with search', async () => {
    const a = await createLead({ name: 'Alpha One', email: 'a1@example.com' });
    await createLead({ name: 'Alpha Two', email: 'a2@example.com' });
    await createLead({ name: 'Beta', email: 'b@example.com', status: 'QUALIFIED' });
    await request(app).patch(`/api/leads/${a.id}/status`).send({ status: 'QUALIFIED' });

    const qualified = await request(app).get('/api/leads').query({ status: 'QUALIFIED' });
    expect(qualified.body.pagination.total).toBe(2);

    const combined = await request(app).get('/api/leads').query({ status: 'QUALIFIED', search: 'alpha' });
    expect(combined.body.data.map((l: { name: string }) => l.name)).toEqual(['Alpha One']);
  });

  it('paginates results', async () => {
    for (let i = 1; i <= 5; i++) {
      await createLead({ name: `Lead ${i}`, email: `lead${i}@example.com` });
    }

    const res = await request(app).get('/api/leads').query({ page: 2, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.data.map((l: { name: string }) => l.name)).toEqual(['Lead 3', 'Lead 2']);
  });

  it('ignores an empty status filter', async () => {
    await createLead();
    const res = await request(app).get('/api/leads?status=&search=');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects invalid query parameters', async () => {
    const res = await request(app).get('/api/leads').query({ status: 'WON', page: 0, limit: 500 });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['status', 'page', 'limit']));
  });
});

describe('PATCH /api/leads/:id/status', () => {
  it('updates the status of a lead', async () => {
    const lead = await createLead();

    const res = await request(app).patch(`/api/leads/${lead.id}/status`).send({ status: 'CONVERTED' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: lead.id, status: 'CONVERTED', email: lead.email });

    const list = await request(app).get('/api/leads');
    expect(list.body.data[0].status).toBe('CONVERTED');
  });

  it('only changes the status, ignoring other fields', async () => {
    const lead = await createLead();
    const res = await request(app)
      .patch(`/api/leads/${lead.id}/status`)
      .send({ status: 'LOST', email: 'hacker@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('priya@example.com');
  });

  it('rejects an invalid status', async () => {
    const lead = await createLead();
    const res = await request(app).patch(`/api/leads/${lead.id}/status`).send({ status: 'WON' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('status');
  });

  it('rejects a malformed id', async () => {
    const res = await request(app).patch('/api/leads/not-an-id/status').send({ status: 'LOST' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toEqual({ path: 'id', message: 'Invalid lead id' });
  });

  it('returns 404 for a lead that does not exist', async () => {
    const res = await request(app)
      .patch('/api/leads/507f1f77bcf86cd799439011/status')
      .send({ status: 'LOST' });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Lead not found');
  });
});

describe('unknown routes', () => {
  it('return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Route GET /api/nope not found');
  });
});
