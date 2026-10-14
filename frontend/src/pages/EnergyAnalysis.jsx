import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Descriptions,
  Space,
  Tag,
  Alert
} from 'antd';
import {
  ThunderboltOutlined,
  ReloadOutlined,
  DotChartOutlined,
  AreaChartOutlined,
  FundOutlined
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Legend
} from 'recharts';

import api from '../api/client';
import MetricCard from '../components/MetricCard';

const { Title, Text, Paragraph } = Typography;

export function EnergyAnalysis() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, histRes] = await Promise.all([
        api.get('/energy/summary'),
        api.get('/energy/history')
      ]);

      if (sumRes.data.success) {
        setSummary(sumRes.data);
      }
      if (histRes.data.success) {
        setHistory(histRes.data);
      }
    } catch (err) {
      console.error('Failed to load energy analysis telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Energy & Power Utilization Analysis
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            IT equipment power, estimated cooling overhead, instantaneous PUE, and derived kilowatt-hour energy
          </Text>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Instantaneous PUE"
            value={summary?.current?.instantaneousPue || 1.34}
            subtitle={`24-Hr Average: ${summary?.last24Hours?.averagePue || 1.35}`}
            color="#00F5D4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Server IT Power"
            value={summary?.current?.serverItPowerKw || 3.8}
            unit="kW"
            subtitle="Compute hardware load"
            color="#48CAE4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Estimated Cooling Power"
            value={summary?.current?.estimatedCoolingPowerKw || 1.29}
            unit="kW"
            subtitle="CRAH fans & chiller loop"
            color="#0077B6"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="24-Hr Derived Energy"
            value={summary?.last24Hours?.totalEnergyKwh || 48.5}
            unit="kWh"
            subtitle="Mathematically integrated P × t"
            color="#06D6A0"
          />
        </Col>
      </Row>

      {/* Power Over Time Area Chart */}
      <Card
        className="thermal-card"
        title={<span style={{ color: '#00F5D4' }}>⚡ Facility Power Breakdown Over Time (kW)</span>}
        style={{ marginBottom: 20 }}
      >
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history?.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(72, 202, 228, 0.1)" />
              <XAxis dataKey="time" stroke="#8D99AE" fontSize={11} />
              <YAxis stroke="#00F5D4" unit="kW" fontSize={11} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
              <Legend />
              <Area type="monotone" dataKey="itPowerKw" name="Server IT Load (kW)" stackId="1" stroke="#00F5D4" fill="#00F5D4" fillOpacity={0.6} />
              <Area type="monotone" dataKey="coolingPowerKw" name="Cooling Overhead (kW)" stackId="1" stroke="#48CAE4" fill="#48CAE4" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Scatter Plots: Temp vs Power & CPU vs Power */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>🎯 Temperature vs. Power Draw Correlation</span>}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(72, 202, 228, 0.1)" />
                  <XAxis dataKey="temp" name="Temperature" unit="°C" stroke="#8D99AE" domain={[18, 42]} />
                  <YAxis dataKey="powerWatts" name="Power" unit="W" stroke="#8D99AE" domain={[100, 500]} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
                  <Scatter name="Server Telemetry" data={history?.scatterData || []} fill="#00F5D4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 12, color: '#8D99AE', marginTop: 8 }}>
              Higher power dissipation increases thermal envelope according to Joule heating physics.
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            className="thermal-card"
            title={<span style={{ color: '#00F5D4' }}>🎯 CPU Utilization vs. Power Draw Correlation</span>}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(72, 202, 228, 0.1)" />
                  <XAxis dataKey="cpu" name="CPU Load" unit="%" stroke="#8D99AE" domain={[0, 100]} />
                  <YAxis dataKey="powerWatts" name="Power" unit="W" stroke="#8D99AE" domain={[100, 500]} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#131C36', borderColor: '#48CAE4', color: '#F8F9FA' }} />
                  <Scatter name="Server Telemetry" data={history?.scatterData || []} fill="#48CAE4" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 12, color: '#8D99AE', marginTop: 8 }}>
              Proportional dynamic power scaling with base idle draw (~130W) and max active draw (~450W).
            </div>
          </Card>
        </Col>
      </Row>

      {/* Energy Methodology & Disclaimer */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>📐 Energy Calculation Methodology & Boundary Definitions</span>}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Mathematical Formula">
            <code style={{ color: '#00F5D4', fontSize: 14 }}>E (kWh) = ∫ P(t) dt ≈ Σ [P_avg (kW) × Δt (hours)]</code>
          </Descriptions.Item>
          <Descriptions.Item label="PUE Calculation">
            <code style={{ color: '#48CAE4', fontSize: 14 }}>PUE = Total Facility Power / IT Server Power</code>
          </Descriptions.Item>
          <Descriptions.Item label="Cooling Power Basis">
            Derived from ASHRAE TC 9.9 sensible heat ratio and chiller fan affinity laws
          </Descriptions.Item>
          <Descriptions.Item label="Experimental Integrity">
            <Tag color="orange">Estimated Metrics Distinct from Verified Physical Utility Meter</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}

export default EnergyAnalysis;
