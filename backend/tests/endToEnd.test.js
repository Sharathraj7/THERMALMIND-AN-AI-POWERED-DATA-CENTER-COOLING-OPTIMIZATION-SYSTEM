/**
 * End-to-End Workflow Integration Test
 * Verifies the full pipeline: Auth -> Ingestion -> AI Analysis -> Recommendation -> Acknowledge -> Audit Trail
 */

const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

describe('End-to-End Operator Workflow', () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteMany();
    await User.create({
      name: 'E2E Operator',
      email: 'e2e.operator@thermalmind.io',
      password: 'OperatorPass2026!',
      role: 'Operator',
      isActive: true
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  let token = '';
  let recommendationId = '';

  test('Step 1: Operator logs in and receives JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e.operator@thermalmind.io',
        password: 'OperatorPass2026!'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('Step 2: Operator loads dashboard summary metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalRacks).toBeGreaterThan(0);
    expect(res.body.summary.thermalHealthIndex).toBeDefined();
  });

  test('Step 3: Ingest a simulated high-temperature anomaly reading', async () => {
    const res = await request(app)
      .post('/api/sensors/ingest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        timestamp: new Date().toISOString(),
        dataCenterId: 'DC-EAST-01',
        rackId: 'RACK-B02',
        serverId: 'SRV-B02-04',
        temperature: 39.8,
        humidity: 49.0,
        cpuUtilization: 88.0,
        workload: 'High',
        powerWatts: 425,
        coolingStatus: 'Critical',
        fanSpeed: 98
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reading.temperature).toBe(39.8);
  });

  test('Step 4: Execute AI thermal analysis scan', async () => {
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.riskAssessment).toBeDefined();
  });

  test('Step 5: Retrieve cooling recommendations and identify open alert', async () => {
    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThan(0);

    const openRec = res.body.recommendations.find(r => r.status === 'Open');
    expect(openRec).toBeDefined();
    recommendationId = openRec.recommendationId;
  });

  test('Step 6: Operator acknowledges the recommendation', async () => {
    const res = await request(app)
      .patch(`/api/recommendations/${recommendationId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'Acknowledged',
        resolutionNotes: 'Operator verified cooling alert, inspecting CRAH blower.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendation.status).toBe('Acknowledged');
  });

  test('Step 7: Verify Cloud operations status reflects Local Mode with AWS unconfigured', async () => {
    const res = await request(app)
      .get('/api/cloud/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.cloudDeployment.mode).toContain('Local Mode');
    expect(res.body.data.database.connected).toBe(true);
  });
});
