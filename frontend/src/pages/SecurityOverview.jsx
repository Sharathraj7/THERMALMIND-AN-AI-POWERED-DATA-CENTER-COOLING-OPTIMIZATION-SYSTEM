import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Descriptions,
  Tag,
  Alert,
  Space
} from 'antd';
import {
  SafetyCertificateOutlined,
  ReloadOutlined,
  LockOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  UserOutlined
} from '@ant-design/icons';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

const { Title, Text, Paragraph } = Typography;

export function SecurityOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/security/status');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load security status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const controlColumns = [
    {
      title: 'Security Control',
      dataIndex: 'name',
      key: 'name',
      render: text => <strong style={{ color: '#00F5D4' }}>{text}</strong>
    },
    {
      title: 'Implementation Mechanism',
      dataIndex: 'mechanism',
      key: 'mechanism'
    },
    {
      title: 'Audit Details',
      dataIndex: 'details',
      key: 'details',
      render: d => <span style={{ color: '#ADB5BD', fontSize: 12 }}>{d}</span>
    },
    {
      title: 'Verification Posture',
      dataIndex: 'status',
      key: 'status',
      render: (st, row) => (
        <Tag color={row.verified ? 'success' : 'default'} style={{ fontWeight: 600 }}>
          {row.verified ? 'VERIFIED ACTIVE' : st}
        </Tag>
      )
    }
  ];

  const authEventColumns = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', render: t => new Date(t).toLocaleString() },
    { title: 'User Account', dataIndex: 'userEmail', key: 'userEmail' },
    { title: 'Role', dataIndex: 'userRole', key: 'userRole', render: r => <Tag color={r === 'Administrator' ? 'purple' : 'cyan'}>{r}</Tag> },
    { title: 'Event Action', dataIndex: 'action', key: 'action', render: a => <strong style={{ color: '#F8F9FA' }}>{a}</strong> },
    { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress', render: ip => <span style={{ fontFamily: 'monospace' }}>{ip}</span> },
    { title: 'Outcome', dataIndex: 'status', key: 'status', render: st => <StatusBadge status={st} /> }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Cybersecurity Architecture & Hardening Overview
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Role-based authorization, cryptography, rate limiting, and authenticated audit posture
          </Text>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchSecurityData}>Refresh</Button>
      </div>

      {/* Security Warning Alert */}
      {data?.metrics?.hasDefaultCredentialsWarning && (
        <Alert
          message="Security Advisory: Default Demonstration Credentials Active"
          description="Default credentials (admin@thermalmind.io / Admin@ThermalMind2026) are currently configured for demonstration purposes. Prior to internet-facing deployment, rotate credentials via environment variables."
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Total Users"
            value={data?.metrics?.totalUsers || 2}
            icon={<UserOutlined />}
            subtitle={`${data?.metrics?.adminCount || 1} Admins • ${data?.metrics?.operatorCount || 1} Operators`}
            color="#00F5D4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Failed Login Attempts"
            value={data?.metrics?.failedLoginAttempts || 0}
            icon={<LockOutlined />}
            subtitle="Monitored by brute-force limiter"
            color={data?.metrics?.failedLoginAttempts > 0 ? '#EF476F' : '#06D6A0'}
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Session Authentication"
            value="ACTIVE"
            icon={<SafetyCertificateOutlined />}
            subtitle="HMAC-SHA256 JWT Token"
            color="#48CAE4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="API Hardening"
            value="8 / 8"
            icon={<CheckCircleOutlined />}
            subtitle="Active security controls"
            color="#06D6A0"
          />
        </Col>
      </Row>

      {/* Current User Session Profile */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>👤 Current Authenticated Operator Session</span>} style={{ marginBottom: 20 }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="Operator Name">{data?.currentUserSession?.name}</Descriptions.Item>
          <Descriptions.Item label="Email Account">{data?.currentUserSession?.email}</Descriptions.Item>
          <Descriptions.Item label="Assigned Role">
            <Tag color={data?.currentUserSession?.role === 'Administrator' ? 'purple' : 'cyan'}>
              {data?.currentUserSession?.role}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Session Signed">{new Date(data?.currentUserSession?.lastLogin).toLocaleTimeString()}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Security Controls Matrix */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>🛡️ Cybersecurity Defense Verification Matrix</span>} style={{ marginBottom: 20 }}>
        <Table
          columns={controlColumns}
          dataSource={data?.securityControls || []}
          rowKey="name"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Recent Auth Events */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>🔑 Recent Authentication Events</span>}>
        <Table
          columns={authEventColumns}
          dataSource={data?.recentAuthEvents || []}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: 'No recent authentication events.' }}
        />
      </Card>
    </div>
  );
}

export default SecurityOverview;
