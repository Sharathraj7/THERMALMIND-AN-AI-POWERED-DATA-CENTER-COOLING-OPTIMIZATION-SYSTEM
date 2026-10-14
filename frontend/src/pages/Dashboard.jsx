import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Typography,
  Table,
  Space,
  Tag,
  Progress,
  message,
  Tooltip,
  Alert
} from 'antd';
import {
  ReloadOutlined,
  RadarChartOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  FireOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import RiskTag from '../components/RiskTag';
import ExplainableModal from '../components/ExplainableModal';

const { Title, Text } = Typography;

const RISK_COLORS = {
  Normal: '#06D6A0',
  'Low Risk': '#48CAE4',
  'Medium Risk': '#FFD166',
  'High Risk': '#F77F00',
  Critical: '#EF476F'
};

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, trendRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/trends')
      ]);

      if (sumRes.data.success) {
        setData(sumRes.data);
      }
      if (trendRes.data.success) {
        setTrends(trendRes.data);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 4000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/ai/analyze');
      if (res.data.success) {
        message.success(res.data.message || 'Thermal analysis scan completed.');
        await fetchDashboardData();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to execute thermal analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcknowledgeAlert = async (recId) => {
    try {
      const res = await api.patch(`/recommendations/${recId}/status`, {
        status: 'Acknowledged',
        resolutionNotes: 'Operator verified from main dashboard.'
      });
      if (res.data.success) {
        message.success(`Alert ${recId} acknowledged.`);
        await fetchDashboardData();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to acknowledge alert.');
    }
  };

  const alertColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 90,
      render: s => <RiskTag risk={s === 'Critical' ? 'Critical' : s === 'High' ? 'High Risk' : s === 'Medium' ? 'Medium Risk' : 'Low Risk'} />
    },
    {
      title: 'Rack / Target',
      dataIndex: 'rackId',
      key: 'rackId',
      width: 110,
      render: (r, row) => <strong style={{ color: '#00F5D4' }}>{r} {row.serverId ? `(${row.serverId.split('-')[2]})` : ''}</strong>
    },
    {
      title: 'Thermal Guidance',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (t, row) => (
        <div>
          <span style={{ fontWeight: 500, color: '#F8F9FA' }}>{t}</span>
          <div style={{ fontSize: 11, color: '#8D99AE' }}>
            Temp: {row.supportingEvidence?.currentTemp}°C • Limit: {row.supportingEvidence?.safeLimit || 32}°C
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: s => <StatusBadge status={s} />
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      render: (_, row) => (
        <Space orientation="horizontal" size="small">
          {row.status === 'Open' ? (
            <Button
              size="small"
              type="primary"
              ghost
              style={{ borderColor: '#00F5D4', color: '#00F5D4' }}
              onClick={() => handleAcknowledgeAlert(row.recommendationId)}
            >
              Acknowledge
            </Button>
          ) : (
            <Tag color="success">Acknowledged</Tag>
          )}
        </Space>
      )
    }
  ];

  const pieData = data?.riskDistribution ? Object.entries(data.riskDistribution).map(([name, value]) => ({
    name,
    value
  })) : [];

  return (
    <div>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Operational Command Dashboard
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Continuous thermal telemetry, AI forecasting, and cooling optimization engine
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<RadarChartOutlined />}
            loading={analyzing}
            onClick={handleRunAnalysis}
            style={{ backgroundColor: '#00F5D4', borderColor: '#00F5D4', color: '#0B132B', fontWeight: 600 }}
          >
            Run AI Thermal Scan
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDashboardData}
            style={{ backgroundColor: '#1C2541', borderColor: 'rgba(72, 202, 228, 0.2)', color: '#F8F9FA' }}
          >
            Refresh
          </Button>
          <Button
            type={autoRefresh ? 'dashed' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              backgroundColor: autoRefresh ? 'rgba(0, 245, 212, 0.1)' : '#1C2541',
              borderColor: autoRefresh ? '#00F5D4' : 'rgba(72, 202, 228, 0.2)',
              color: autoRefresh ? '#00F5D4' : '#F8F9FA'
            }}
          >
            {autoRefresh ? 'Live Stream: 4s' : 'Stream Paused'}
          </Button>
        </Space>
      </div>

      {/* KPI Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Avg Facility Temp"
            value={data?.summary?.averageTemperature || 23.5}
            unit="°C"
            icon={<span style={{ fontSize: 22 }}>🌡️</span>}
            subtitle="ASHRAE Standard: 18 - 27°C"
            color="#00F5D4"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Peak Rack Hotspot"
            value={data?.summary?.highestTemperature || 26.8}
            unit="°C"
            icon={<FireOutlined />}
            subtitle={data?.summary?.highestServer ? `Peak on ${data.summary.highestServer}` : 'All nodes within limits'}
            color={data?.summary?.highestTemperature >= 38 ? '#EF476F' : data?.summary?.highestTemperature >= 32 ? '#FFD166' : '#00F5D4'}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Active Anomalies"
            value={data?.summary?.activeAnomalies || 0}
            icon={<AlertOutlined />}
            subtitle={`${data?.summary?.criticalAlerts || 0} critical cooling escalations`}
            color={data?.summary?.activeAnomalies > 0 ? '#EF476F' : '#06D6A0'}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Total IT Load"
            value={data?.summary?.aggregatePowerKw || 3.8}
            unit="kW"
            icon={<ThunderboltOutlined />}
            subtitle="Estimated facility PUE: 1.34"
            color="#48CAE4"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Second Row: Thermal Health Index & Telemetry Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            className="thermal-card"
            title={
              <Space>
                <span style={{ color: '#00F5D4' }}>📈 Real-Time Temperature Trajectory & IT Power</span>
                <span style={{ fontSize: 11, color: '#8D99AE' }}>(Last 20 Samples)</span>
              </Space>
            }
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.timelineData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(72, 202, 228, 0.1)" />
                  <XAxis dataKey="time" stroke="#8D99AE" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#00F5D4" domain={[15, 45]} unit="°C" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#48CAE4" unit="kW" fontSize={11} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avgTemp" name="Avg Temperature (°C)" stroke="#00F5D4" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="maxTemp" name="Peak Temp (°C)" stroke="#EF476F" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="powerKw" name="IT Power (kW)" stroke="#48CAE4" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>🛡️ Thermal Health Index</span>}
          >
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <Progress
                type="dashboard"
                percent={data?.summary?.thermalHealthIndex || 92}
                strokeColor={{
                  '0%': '#EF476F',
                  '50%': '#FFD166',
                  '100%': '#00F5D4'
                }}
                format={percent => (
                  <div style={{ color: '#F8F9FA' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace' }}>{percent}%</div>
                    <div style={{ fontSize: 11, color: '#8D99AE' }}>Facility Status</div>
                  </div>
                )}
                size={160}
              />
              <div style={{ marginTop: 12, fontSize: 13, color: '#ADB5BD' }}>
                {data?.summary?.thermalHealthIndex >= 85
                  ? 'Facility operating within optimal thermal envelope'
                  : 'Hotspot escalation detected on high-density row'}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Third Row: Rack Comparisons & Risk Distribution */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>📊 Rack Temperature Comparison (ASHRAE Limit: 32°C)</span>}
          >
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends?.rackComparison || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(72, 202, 228, 0.1)" />
                  <XAxis dataKey="rackId" stroke="#8D99AE" />
                  <YAxis domain={[0, 45]} stroke="#8D99AE" unit="°C" />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
                  <Legend />
                  <Bar dataKey="avgTemp" name="Avg Temperature (°C)" fill="#0077B6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maxTemp" name="Max Server (°C)" fill="#00F5D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>🎯 Thermal Risk Distribution</span>}
          >
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#8D99AE'} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Fourth Row: Active Cooling Recommendations & Recent Anomalies */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>🚨 Priority Cooling Recommendations</span>}
          >
            <Table
              columns={alertColumns}
              dataSource={data?.recentAlerts || []}
              rowKey="recommendationId"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No open cooling recommendations. Facility cooling is optimal.' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>⚡ Recent Thermal Anomaly Detections</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.recentAnomalies || []).map(anom => (
                <div
                  key={anom.anomalyId}
                  style={{
                    backgroundColor: 'rgba(28, 37, 65, 0.6)',
                    border: '1px solid rgba(72, 202, 228, 0.15)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RiskTag risk={anom.riskCategory} />
                      <strong style={{ color: '#F8F9FA' }}>{anom.rackId} • {anom.serverId}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#ADB5BD', marginTop: 4 }}>
                      Observed: {anom.observedTemperature}°C (Z-Score: {anom.anomalyScore})
                    </div>
                  </div>
                  <Button
                    size="small"
                    style={{ backgroundColor: 'rgba(0, 245, 212, 0.1)', borderColor: '#00F5D4', color: '#00F5D4' }}
                    onClick={() => setSelectedAnomaly(anom)}
                  >
                    Evidence
                  </Button>
                </div>
              ))}
              {(!data?.recentAnomalies || data.recentAnomalies.length === 0) && (
                <div style={{ textAlign: 'center', color: '#8D99AE', padding: 20 }}>
                  No recent thermal anomalies detected.
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Explainable AI Evidence Modal */}
      <ExplainableModal
        visible={Boolean(selectedAnomaly)}
        onClose={() => setSelectedAnomaly(null)}
        data={selectedAnomaly}
        type="anomaly"
      />
    </div>
  );
}

export default Dashboard;
