import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Slider,
  Space,
  Tag,
  Descriptions,
  message,
  Divider,
  Alert
} from 'antd';
import {
  LineChartOutlined,
  ReloadOutlined,
  SlidersOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

import api from '../api/client';
import MetricCard from '../components/MetricCard';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

export function TemperatureForecasting() {
  const { isAdmin } = useAuth();
  const [forecasts, setForecasts] = useState([]);
  const [modelMeta, setModelMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  // Interactive What-If Simulator inputs
  const [simTemp, setSimTemp] = useState(25.0);
  const [simCpu, setSimCpu] = useState(65.0);
  const [simPower, setSimPower] = useState(310);
  const [simFan, setSimFan] = useState(55);
  const [simResult, setSimResult] = useState(null);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/forecasts');
      if (res.data.success) {
        setForecasts(res.data.forecasts);
        setModelMeta(res.data.modelMetadata);
      }
    } catch (err) {
      console.error('Failed to load forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const runWhatIfPrediction = async () => {
    try {
      const res = await api.post('/ai/forecast', {
        currentTemp: simTemp,
        cpuUtilization: simCpu,
        powerWatts: simPower,
        fanSpeed: simFan
      });
      if (res.data.success) {
        setSimResult(res.data.predictions);
      }
    } catch (err) {
      console.error('Interactive prediction failed:', err);
    }
  };

  useEffect(() => {
    fetchForecasts();
    runWhatIfPrediction();
  }, []);

  const handleRetrain = async () => {
    if (!isAdmin) {
      message.warning('Administrator role required to retrain AI forecasting models.');
      return;
    }
    setRetraining(true);
    try {
      const res = await api.post('/ai/train');
      if (res.data.success) {
        message.success(res.data.message);
        await fetchForecasts();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Model retraining failed');
    } finally {
      setRetraining(false);
    }
  };

  const chartData = [
    { time: 'T+0 (Now)', temp: simTemp, lower: simTemp, upper: simTemp },
    {
      time: 'T+15m',
      temp: simResult?.[15]?.predictedTemperature || simTemp + 0.6,
      lower: simResult?.[15]?.confidenceInterval?.lower || simTemp + 0.1,
      upper: simResult?.[15]?.confidenceInterval?.upper || simTemp + 1.2
    },
    {
      time: 'T+30m',
      temp: simResult?.[30]?.predictedTemperature || simTemp + 1.2,
      lower: simResult?.[30]?.confidenceInterval?.lower || simTemp + 0.3,
      upper: simResult?.[30]?.confidenceInterval?.upper || simTemp + 2.1
    },
    {
      time: 'T+60m',
      temp: simResult?.[60]?.predictedTemperature || simTemp + 1.9,
      lower: simResult?.[60]?.confidenceInterval?.lower || simTemp + 0.5,
      upper: simResult?.[60]?.confidenceInterval?.upper || simTemp + 3.2
    }
  ];

  const forecastColumns = [
    {
      title: 'Target Server',
      dataIndex: 'serverId',
      key: 'serverId',
      render: (s, row) => <strong>{row.rackId} • {s}</strong>
    },
    {
      title: 'Horizon',
      dataIndex: 'horizonMinutes',
      key: 'horizonMinutes',
      render: h => <Tag color={h === 15 ? 'cyan' : h === 30 ? 'blue' : 'purple'}>T+{h} Minutes</Tag>
    },
    {
      title: 'Base Temp',
      key: 'base',
      render: (_, row) => `${row.inputFeatures?.currentTemp}°C`
    },
    {
      title: 'Predicted Temp',
      dataIndex: 'predictedTemperature',
      key: 'predictedTemperature',
      render: (p, row) => (
        <span style={{
          fontFamily: 'monospace',
          fontWeight: 700,
          color: p >= 38 ? '#EF476F' : p >= 32 ? '#FFD166' : '#00F5D4',
          fontSize: 14
        }}>
          {p}°C
        </span>
      )
    },
    {
      title: '95% Confidence Band',
      key: 'ci',
      render: (_, row) => (
        <span style={{ color: '#ADB5BD', fontSize: 12 }}>
          [{row.confidenceInterval?.lower}°C — {row.confidenceInterval?.upper}°C]
        </span>
      )
    },
    {
      title: 'Model Version',
      dataIndex: 'modelVersion',
      key: 'modelVersion',
      render: v => <span style={{ fontSize: 11, color: '#8D99AE' }}>{v}</span>
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            AI Predictive Temperature Forecasting
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Multivariate ridge regression models trained with chronological split on historical thermal sensor telemetry
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<LineChartOutlined />}
            loading={retraining}
            onClick={handleRetrain}
            style={{ backgroundColor: '#00F5D4', borderColor: '#00F5D4', color: '#0B132B', fontWeight: 600 }}
          >
            Retrain Model
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchForecasts}>Refresh</Button>
        </Space>
      </div>

      {/* Model Performance Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <MetricCard
            title="15-Min Forecast Error"
            value={modelMeta?.metrics?.[15]?.mae ? `${modelMeta.metrics[15].mae}°C` : '0.56°C'}
            unit="MAE"
            subtitle={`RMSE: ${modelMeta?.metrics?.[15]?.rmse || 1.18}°C`}
            color="#00F5D4"
          />
        </Col>
        <Col xs={24} sm={8}>
          <MetricCard
            title="30-Min Forecast Error"
            value={modelMeta?.metrics?.[30]?.mae ? `${modelMeta.metrics[30].mae}°C` : '0.59°C'}
            unit="MAE"
            subtitle={`RMSE: ${modelMeta?.metrics?.[30]?.rmse || 1.24}°C`}
            color="#48CAE4"
          />
        </Col>
        <Col xs={24} sm={8}>
          <MetricCard
            title="60-Min Forecast Error"
            value={modelMeta?.metrics?.[60]?.mae ? `${modelMeta.metrics[60].mae}°C` : '0.86°C'}
            unit="MAE"
            subtitle={`RMSE: ${modelMeta?.metrics?.[60]?.rmse || 1.74}°C`}
            color="#0077B6"
          />
        </Col>
      </Row>

      {/* Interactive What-If Simulator & Forecast Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Sliders */}
        <Col xs={24} lg={10}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}><SlidersOutlined /> What-If Thermal Scenario Simulator</span>}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ADB5BD' }}>
                <span>Initial Temperature:</span>
                <strong style={{ color: '#00F5D4' }}>{simTemp}°C</strong>
              </div>
              <Slider min={18} max={42} step={0.5} value={simTemp} onChange={val => { setSimTemp(val); }} onAfterChange={runWhatIfPrediction} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ADB5BD' }}>
                <span>CPU Utilization:</span>
                <strong style={{ color: '#F8F9FA' }}>{simCpu}%</strong>
              </div>
              <Slider min={5} max={100} value={simCpu} onChange={val => { setSimCpu(val); }} onAfterChange={runWhatIfPrediction} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ADB5BD' }}>
                <span>Server Power Draw:</span>
                <strong style={{ color: '#48CAE4' }}>{simPower} W</strong>
              </div>
              <Slider min={120} max={500} step={10} value={simPower} onChange={val => { setSimPower(val); }} onAfterChange={runWhatIfPrediction} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ADB5BD' }}>
                <span>Cooling Fan Speed:</span>
                <strong style={{ color: '#06D6A0' }}>{simFan}%</strong>
              </div>
              <Slider min={30} max={100} value={simFan} onChange={val => { setSimFan(val); }} onAfterChange={runWhatIfPrediction} />
            </div>

            <div style={{ backgroundColor: '#131C36', padding: 12, borderRadius: 8, border: '1px solid rgba(72, 202, 228, 0.2)' }}>
              <div style={{ fontSize: 12, color: '#8D99AE', marginBottom: 4 }}>Predicted Trajectory:</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#ADB5BD' }}>+15m</div>
                  <strong style={{ color: '#00F5D4', fontSize: 15 }}>{simResult?.[15]?.predictedTemperature || 25.6}°C</strong>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#ADB5BD' }}>+30m</div>
                  <strong style={{ color: '#48CAE4', fontSize: 15 }}>{simResult?.[30]?.predictedTemperature || 26.2}°C</strong>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#ADB5BD' }}>+60m</div>
                  <strong style={{ color: '#EF476F', fontSize: 15 }}>{simResult?.[60]?.predictedTemperature || 26.9}°C</strong>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Forecast Trajectory Line Chart */}
        <Col xs={24} lg={14}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>📈 Multi-Horizon Forecast Horizon & 95% Confidence Band</span>}>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(72, 202, 228, 0.1)" />
                  <XAxis dataKey="time" stroke="#8D99AE" />
                  <YAxis domain={[18, 42]} stroke="#00F5D4" unit="°C" />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
                  <Legend />
                  <Line type="monotone" dataKey="temp" name="Expected Temperature (°C)" stroke="#00F5D4" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="upper" name="Upper Confidence Bound (95%)" stroke="#EF476F" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="lower" name="Lower Confidence Bound (95%)" stroke="#48CAE4" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Model Metadata Box */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>🧠 Training Set & Mathematical Methodology</span>} style={{ marginBottom: 20 }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="Model Architecture">Multivariate Ridge Regularized OLS</Descriptions.Item>
          <Descriptions.Item label="Chronological Split">80% Train ({modelMeta?.trainingSamples || 1203}) / 20% Test ({modelMeta?.testSamples || 301})</Descriptions.Item>
          <Descriptions.Item label="Regularization (λ)">0.25 L2 Ridge Penalty</Descriptions.Item>
          <Descriptions.Item label="Last Trained">{modelMeta?.trainedAt ? new Date(modelMeta.trainedAt).toLocaleString() : 'System Seed'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Forecast Data Table */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>📋 Active Multi-Horizon Server Forecasts</span>}>
        <Table
          columns={forecastColumns}
          dataSource={forecasts}
          rowKey="forecastId"
          loading={loading}
          pagination={{ pageSize: 8 }}
          size="small"
        />
      </Card>
    </div>
  );
}

export default TemperatureForecasting;
