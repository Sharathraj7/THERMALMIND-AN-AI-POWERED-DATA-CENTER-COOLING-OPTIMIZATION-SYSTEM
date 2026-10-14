import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Select,
  Space,
  Tag,
  Tooltip
} from 'antd';
import {
  AlertOutlined,
  ReloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  FilterOutlined
} from '@ant-design/icons';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import RiskTag from '../components/RiskTag';
import ExplainableModal from '../components/ExplainableModal';

const { Title, Text, Paragraph } = Typography;

export function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [activeModalData, setActiveModalData] = useState(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/anomalies', {
        params: {
          rackId: selectedRack,
          riskCategory: selectedRisk
        }
      });
      if (res.data.success) {
        setAnomalies(res.data.anomalies);
      }
    } catch (err) {
      console.error('Failed to load anomaly telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [selectedRack, selectedRisk]);

  const criticalCount = anomalies.filter(a => a.riskCategory === 'Critical').length;
  const highRiskCount = anomalies.filter(a => a.riskCategory === 'High Risk').length;
  const mediumRiskCount = anomalies.filter(a => a.riskCategory === 'Medium Risk').length;

  const columns = [
    {
      title: 'Anomaly ID',
      dataIndex: 'anomalyId',
      key: 'anomalyId',
      render: id => <span style={{ fontFamily: 'monospace', color: '#00F5D4' }}>{id}</span>
    },
    {
      title: 'Target Node',
      dataIndex: 'serverId',
      key: 'serverId',
      render: (s, row) => <strong>{row.rackId} • {s}</strong>
    },
    {
      title: 'Anomaly Type',
      dataIndex: 'anomalyType',
      key: 'anomalyType',
      render: type => {
        let color = 'cyan';
        if (type === 'CRITICAL_HOTSPOT') color = 'magenta';
        else if (type === 'SUDDEN_SPIKE') color = 'orange';
        else if (type === 'COOLING_DEGRADATION') color = 'volcano';
        else if (type === 'WORKLOAD_MISMATCH') color = 'gold';
        return <Tag color={color}>{type.replace(/_/g, ' ')}</Tag>;
      }
    },
    {
      title: 'Risk Level',
      dataIndex: 'riskCategory',
      key: 'riskCategory',
      render: r => <RiskTag risk={r} />
    },
    {
      title: 'Observed Temp',
      dataIndex: 'observedTemperature',
      key: 'observedTemperature',
      sorter: (a, b) => a.observedTemperature - b.observedTemperature,
      render: t => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t >= 38 ? '#EF476F' : '#FFD166' }}>
          {t}°C
        </span>
      )
    },
    {
      title: 'Baseline (Mean)',
      dataIndex: 'baselineTemperature',
      key: 'baselineTemperature',
      render: b => <span style={{ color: '#ADB5BD' }}>{b}°C</span>
    },
    {
      title: 'Anomaly Score (Z)',
      dataIndex: 'anomalyScore',
      key: 'anomalyScore',
      render: s => <span style={{ fontFamily: 'monospace', color: '#48CAE4' }}>{s} σ</span>
    },
    {
      title: 'Detected At',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: t => new Date(t).toLocaleTimeString()
    },
    {
      title: 'Explainable AI',
      key: 'action',
      render: (_, row) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<EyeOutlined />}
          style={{ borderColor: '#00F5D4', color: '#00F5D4' }}
          onClick={() => setActiveModalData(row)}
        >
          View Evidence
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Statistical Thermal Anomaly Detection
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            20-sample rolling baselines, Z-score standard deviation analysis, and physical heuristic boundaries
          </Text>
        </div>

        <Space>
          <Select
            value={selectedRack}
            onChange={val => setSelectedRack(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All Racks' },
              { value: 'RACK-A01', label: 'Rack A01' },
              { value: 'RACK-A02', label: 'Rack A02' },
              { value: 'RACK-B01', label: 'Rack B01' },
              { value: 'RACK-B02', label: 'Rack B02' }
            ]}
          />
          <Select
            value={selectedRisk}
            onChange={val => setSelectedRisk(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All Risk Levels' },
              { value: 'Critical', label: 'Critical Only' },
              { value: 'High Risk', label: 'High Risk' },
              { value: 'Medium Risk', label: 'Medium Risk' },
              { value: 'Low Risk', label: 'Low Risk' }
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchAnomalies}>Refresh</Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <MetricCard
            title="Critical Thermal Hotspots"
            value={criticalCount}
            subtitle="Breached ASHRAE allowable ceiling (38°C)"
            color="#EF476F"
          />
        </Col>
        <Col xs={24} sm={8}>
          <MetricCard
            title="High Risk Thermal Events"
            value={highRiskCount}
            subtitle="Approaching warning thresholds or cooling failure"
            color="#F77F00"
          />
        </Col>
        <Col xs={24} sm={8}>
          <MetricCard
            title="Medium Risk Surges"
            value={mediumRiskCount}
            subtitle="Elevated Z-score or transient rate-of-rise"
            color="#FFD166"
          />
        </Col>
      </Row>

      {/* Anomaly Table */}
      <Card className="thermal-card">
        <Table
          columns={columns}
          dataSource={anomalies}
          rowKey="anomalyId"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="middle"
          locale={{ emptyText: 'No anomalies matching filter criteria.' }}
        />
      </Card>

      {/* Explainable Modal */}
      <ExplainableModal
        visible={Boolean(activeModalData)}
        onClose={() => setActiveModalData(null)}
        data={activeModalData}
        type="anomaly"
      />
    </div>
  );
}

export default AnomalyDetection;
