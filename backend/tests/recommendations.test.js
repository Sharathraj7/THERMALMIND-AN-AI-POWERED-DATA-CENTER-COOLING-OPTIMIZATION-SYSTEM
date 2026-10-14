/**
 * Cooling Recommendation Engine & Workflow Tests
 */

const { connectDB, disconnectDB } = require('../src/config/db');
const {
  evaluateAndGenerateRecommendation,
  acknowledgeRecommendation,
  resolveRecommendation
} = require('../src/services/recommendationEngine');
const CoolingRecommendation = require('../src/models/CoolingRecommendation');

describe('Cooling Recommendation Engine & Workflow', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await CoolingRecommendation.deleteMany({ serverId: 'SRV-REC-TEST' });
    await disconnectDB();
  });

  let createdRec = null;

  test('should generate practical cooling recommendation from Critical Hotspot anomaly', async () => {
    const anomaly = {
      anomalyId: 'ANOM-REC-001',
      anomalyType: 'CRITICAL_HOTSPOT',
      evidence: { zScore: 3.5, temperatureDelta: 6.0 }
    };

    const reading = {
      rackId: 'RACK-B02',
      serverId: 'SRV-REC-TEST',
      temperature: 39.2,
      cpuUtilization: 88,
      powerWatts: 430,
      fanSpeed: 95
    };

    createdRec = await evaluateAndGenerateRecommendation(anomaly, reading);

    expect(createdRec).toBeDefined();
    expect(createdRec.severity).toBe('Critical');
    expect(createdRec.status).toBe('Open');
    expect(createdRec.title).toContain('Critical Hotspot Escalation');
    expect(createdRec.recommendedAction).toContain('cold-aisle containment');
    expect(createdRec.supportingEvidence.currentTemp).toBe(39.2);
  });

  test('operator should acknowledge recommendation', async () => {
    const user = {
      _id: 'user-op-123',
      name: 'Operator Jane',
      email: 'jane@thermalmind.io',
      role: 'Operator'
    };

    const ackRec = await acknowledgeRecommendation(createdRec.recommendationId, user);
    expect(ackRec.status).toBe('Acknowledged');
    expect(ackRec.acknowledgedBy).toContain('Operator Jane');
    expect(ackRec.acknowledgedAt).toBeDefined();
  });

  test('operator should resolve recommendation with investigation notes', async () => {
    const user = {
      _id: 'user-op-123',
      name: 'Operator Jane',
      email: 'jane@thermalmind.io',
      role: 'Operator'
    };

    const resRec = await resolveRecommendation(
      createdRec.recommendationId,
      user,
      'Adjusted CRAH damper setpoint and repositioned cold aisle floor tiles.'
    );

    expect(resRec.status).toBe('Resolved');
    expect(resRec.resolvedBy).toContain('Operator Jane');
    expect(resRec.resolutionNotes).toContain('Adjusted CRAH damper');
  });
});
