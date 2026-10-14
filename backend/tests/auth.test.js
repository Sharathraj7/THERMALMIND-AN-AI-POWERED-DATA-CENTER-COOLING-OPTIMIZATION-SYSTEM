/**
 * Authentication and Role-Based Authorization Integration Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

describe('Authentication & Authorization Suite', () => {
  beforeAll(async () => {
    await connectDB();
    // Ensure test users exist
    await User.deleteMany();
    await User.create([
      {
        name: 'Admin Tester',
        email: 'admin.test@thermalmind.io',
        password: 'Password123!',
        role: 'Administrator',
        isActive: true
      },
      {
        name: 'Operator Tester',
        email: 'operator.test@thermalmind.io',
        password: 'Password123!',
        role: 'Operator',
        isActive: true
      }
    ]);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  let adminToken = '';
  let operatorToken = '';

  test('POST /api/auth/login - should authenticate valid admin and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin.test@thermalmind.io',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('Administrator');
    adminToken = res.body.token;
  });

  test('POST /api/auth/login - should authenticate valid operator', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'operator.test@thermalmind.io',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('Operator');
    operatorToken = res.body.token;
  });

  test('POST /api/auth/login - should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin.test@thermalmind.io',
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid email address or password');
  });

  test('GET /api/auth/me - should return current user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin.test@thermalmind.io');
  });

  test('GET /api/auth/me - should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication token is required');
  });

  test('PATCH /api/settings - Administrator can update settings', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ warningTempThreshold: 33.5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.warningTempThreshold).toBe(33.5);
  });

  test('PATCH /api/settings - Operator is FORBIDDEN from updating settings (RBAC check)', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ warningTempThreshold: 29.0 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Access denied');
  });
});
