/**
 * AI Temperature Forecasting & Evaluation Metrics Tests
 */

const { predictTemperature, getModelMetadata } = require('../src/ai/forecasting');

describe('AI Temperature Forecasting Module', () => {
  test('should predict 15, 30, and 60 minute temperature horizons from feature vector', async () => {
    const input = {
      currentTemp: 26.5,
      tempTrend: 0.8,
      cpuUtilization: 75.0,
      powerWatts: 350,
      fanSpeed: 60,
      humidity: 46
    };

    const preds = await predictTemperature(input);

    expect(preds).toBeDefined();
    expect(preds[15]).toBeDefined();
    expect(preds[30]).toBeDefined();
    expect(preds[60]).toBeDefined();

    // Verify sensible thermodynamic bounds: predicted temp should be within realistic envelope
    expect(preds[15].predictedTemperature).toBeGreaterThan(20);
    expect(preds[15].predictedTemperature).toBeLessThan(45);

    // Confidence interval integrity
    expect(preds[15].confidenceInterval.lower).toBeLessThan(preds[15].predictedTemperature);
    expect(preds[15].confidenceInterval.upper).toBeGreaterThan(preds[15].predictedTemperature);

    // Verify evaluation metrics are present
    expect(preds[15].evaluationMetrics).toBeDefined();
    expect(preds[15].evaluationMetrics.mae).toBeGreaterThanOrEqual(0);
    expect(preds[15].evaluationMetrics.rmse).toBeGreaterThanOrEqual(0);
  });

  test('should reflect higher predicted temperatures under sustained high workload and power', async () => {
    const lowLoadInput = {
      currentTemp: 23.0,
      tempTrend: 0.0,
      cpuUtilization: 15.0,
      powerWatts: 140,
      fanSpeed: 45,
      humidity: 45
    };

    const highLoadInput = {
      currentTemp: 23.0,
      tempTrend: 1.5,
      cpuUtilization: 95.0,
      powerWatts: 440,
      fanSpeed: 45, // Fan has not caught up yet
      humidity: 45
    };

    const lowPreds = await predictTemperature(lowLoadInput);
    const highPreds = await predictTemperature(highLoadInput);

    expect(highPreds[30].predictedTemperature).toBeGreaterThan(lowPreds[30].predictedTemperature);
  });
});
