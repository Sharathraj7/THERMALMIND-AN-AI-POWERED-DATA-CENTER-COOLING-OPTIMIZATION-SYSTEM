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
  Modal,
  Input,
  message,
  Alert
} from 'antd';
import {
  BulbOutlined,
  ReloadOutlined,
  CheckOutlined,
  SafetyCertificateOutlined,
  ToolOutlined
} from '@ant-design/icons';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import RiskTag from '../components/RiskTag';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export function CoolingRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [counts, setCounts] = useState({ open: 0, acknowledged: 0, resolved: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Resolution modal state
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolvingRec, setResolvingRec] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recommendations', {
        params: {
          status: statusFilter,
          severity: severityFilter
        }
      });
      if (res.data.success) {
        setRecommendations(res.data.recommendations);
        if (res.data.counts) setCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Failed to load cooling recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (recId) => {
    try {
      const res = await api.patch(`/recommendations/${recId}/status`, {
        status: 'Acknowledged',
        resolutionNotes: 'Operator verified recommendation.'
      });
      if (res.data.success) {
        message.success(`Recommendation ${recId} marked as Acknowledged.`);
        await fetchRecommendations();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to acknowledge recommendation');
    }
  };

  const handleOpenResolveModal = (rec) => {
    setResolvingRec(rec);
    setResolutionNotes(`Inspected ${rec.rackId}. Adjusted airflow dampers and checked cold-aisle containment integrity.`);
    setResolveModalVisible(true);
  };

  const handleConfirmResolve = async () => {
    if (!resolvingRec) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/recommendations/${resolvingRec.recommendationId}/status`, {
        status: 'Resolved',
        resolutionNotes
      });
      if (res.data.success) {
        message.success(`Recommendation ${resolvingRec.recommendationId} marked as Resolved.`);
        setResolveModalVisible(false);
        setResolvingRec(null);
        await fetchRecommendations();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to resolve recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: s => <RiskTag risk={s === 'Critical' ? 'Critical' : s === 'High' ? 'High Risk' : s === 'Medium' ? 'Medium Risk' : 'Low Risk'} />
    },
    {
      title: 'Location',
      dataIndex: 'rackId',
      key: 'rackId',
      width: 120,
      render: (r, row) => <strong>{r} {row.serverId ? `• ${row.serverId}` : ''}</strong>
    },
    {
      title: 'Title & Operator Guidance',
      dataIndex: 'title',
      key: 'title',
      render: (t, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#F8F9FA' }}>{t}</div>
          <div style={{ fontSize: 12, color: '#ADB5BD', margin: '4px 0' }}>{row.explanation}</div>
          <div style={{ fontSize: 12, color: '#00F5D4', backgroundColor: 'rgba(0, 245, 212, 0.05)', padding: '6px 10px', borderRadius: 4, borderLeft: '2px solid #00F5D4' }}>
            <strong>Action:</strong> {row.recommendedAction}
          </div>
          {row.resolutionNotes && (
            <div style={{ fontSize: 11, color: '#06D6A0', marginTop: 4 }}>
              <strong>Resolution:</strong> {row.resolutionNotes} (by {row.resolvedBy})
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Supporting Evidence',
      key: 'evidence',
      width: 170,
      render: (_, row) => (
        <div style={{ fontSize: 12, color: '#8D99AE' }}>
          <div>Temp: <strong style={{ color: '#F8F9FA' }}>{row.supportingEvidence?.currentTemp}°C</strong> (Max: {row.supportingEvidence?.safeLimit}°C)</div>
          <div>CPU: {row.supportingEvidence?.cpuUtilization}% • Power: {row.supportingEvidence?.powerWatts}W</div>
          <div>Fan Speed: {row.supportingEvidence?.coolingIntensity}%</div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: s => <StatusBadge status={s} />
    },
    {
      title: 'Workflow',
      key: 'action',
      width: 140,
      render: (_, row) => (
        <Space direction="vertical" size="small">
          {row.status === 'Open' && (
            <Button
              size="small"
              type="primary"
              ghost
              style={{ borderColor: '#00F5D4', color: '#00F5D4' }}
              onClick={() => handleAcknowledge(row.recommendationId)}
            >
              Acknowledge
            </Button>
          )}
          {row.status !== 'Resolved' && (
            <Button
              size="small"
              type="default"
              icon={<CheckOutlined />}
              onClick={() => handleOpenResolveModal(row)}
            >
              Resolve Alert
            </Button>
          )}
          {row.status === 'Resolved' && (
            <Tag color="success">Closed</Tag>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Intelligent Cooling Optimization Guidance
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Prescriptive HVAC adjustments, cold-aisle containment checks, and computational workload redistribution
          </Text>
        </div>

        <Space>
          <Select
            value={statusFilter}
            onChange={val => setStatusFilter(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'Open', label: 'Open Only' },
              { value: 'Acknowledged', label: 'Acknowledged' },
              { value: 'Resolved', label: 'Resolved' }
            ]}
          />
          <Select
            value={severityFilter}
            onChange={val => setSeverityFilter(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All Severities' },
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' }
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchRecommendations}>Refresh</Button>
        </Space>
      </div>

      {/* Safety Notice Banner */}
      <Alert
        message="Operator Decision Support Notice"
        description="Recommendations are synthesized for human operator review only. In adherence to enterprise safety protocols, ThermalMind does not automatically modulate physical chillers or CRAC valve dampers."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Open Alerts"
            value={counts.open}
            icon={<BulbOutlined />}
            subtitle="Requires operator inspection"
            color="#00F5D4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Acknowledged"
            value={counts.acknowledged}
            icon={<ToolOutlined />}
            subtitle="Under active investigation"
            color="#48CAE4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Resolved Alerts"
            value={counts.resolved}
            icon={<CheckOutlined />}
            subtitle="Mitigations applied"
            color="#06D6A0"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Critical Escalations"
            value={counts.critical}
            icon={<span style={{ fontSize: 22 }}>🔥</span>}
            subtitle="Urgent thermal remediation"
            color="#EF476F"
          />
        </Col>
      </Row>

      {/* Table */}
      <Card className="thermal-card">
        <Table
          columns={columns}
          dataSource={recommendations}
          rowKey="recommendationId"
          loading={loading}
          pagination={{ pageSize: 8 }}
          size="middle"
        />
      </Card>

      {/* Resolve Modal */}
      <Modal
        title={<span style={{ color: '#00F5D4' }}>✅ Resolve Cooling Alert: {resolvingRec?.recommendationId}</span>}
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        onOk={handleConfirmResolve}
        confirmLoading={submitting}
        okText="Mark as Resolved"
        bodyStyle={{ backgroundColor: '#131C36', color: '#F8F9FA' }}
      >
        <div style={{ marginTop: 12 }}>
          <Text style={{ color: '#ADB5BD' }}>Please record operator mitigation notes for the audit log:</Text>
          <TextArea
            rows={4}
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            style={{ marginTop: 8, backgroundColor: '#0B132B', color: '#F8F9FA', borderColor: 'rgba(72, 202, 228, 0.3)' }}
          />
        </div>
      </Modal>
    </div>
  );
}

export default CoolingRecommendations;
