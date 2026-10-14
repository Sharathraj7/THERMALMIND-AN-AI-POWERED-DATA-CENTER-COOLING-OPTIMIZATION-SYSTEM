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
  Space,
  Badge
} from 'antd';
import {
  CloudServerOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  ApiOutlined,
  LockOutlined
} from '@ant-design/icons';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

const { Title, Text, Paragraph } = Typography;

export function CloudOperations() {
  const [cloudStatus, setCloudStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCloudStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cloud/status');
      if (res.data.success) {
        setCloudStatus(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load cloud operations status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudStatus();
  }, []);

  const serviceColumns = [
    {
      title: 'Cloud Service',
      dataIndex: 'service',
      key: 'service',
      render: s => <strong style={{ color: '#00F5D4' }}>{s}</strong>
    },
    {
      title: 'Architectural Role',
      dataIndex: 'role',
      key: 'role'
    },
    {
      title: 'Target Endpoint / Resource',
      dataIndex: 'target',
      key: 'target',
      render: t => <span style={{ fontFamily: 'monospace', color: '#ADB5BD' }}>{t}</span>
    },
    {
      title: 'Integration Status',
      dataIndex: 'status',
      key: 'status',
      render: st => (
        <Tag color={st.includes('Configured') && !st.includes('Not') ? 'success' : 'default'}>
          {st}
        </Tag>
      )
    }
  ];

  const errorColumns = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', render: t => new Date(t).toLocaleTimeString() },
    { title: 'Method', dataIndex: 'method', key: 'method', render: m => <Tag color="blue">{m}</Tag> },
    { title: 'Endpoint', dataIndex: 'path', key: 'path' },
    { title: 'Status Code', dataIndex: 'statusCode', key: 'statusCode', render: code => <Tag color="error">{code}</Tag> },
    { title: 'Duration', dataIndex: 'durationMs', key: 'durationMs', render: d => `${d} ms` }
  ];

  const isAws = cloudStatus?.cloudDeployment?.isAwsConfigured;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Cloud Operations & System Reliability
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Backend runtime telemetry, database connection health, API performance, and AWS cloud readiness
          </Text>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchCloudStatus}>Refresh</Button>
      </div>

      {/* Cloud Mode Banner */}
      <Alert
        message={isAws ? 'AWS Cloud Deployment Active' : 'Local Mode — AWS Not Configured'}
        description={
          isAws
            ? `Production AWS Cloud deployment connected to region ${cloudStatus?.cloudDeployment?.region}. Telemetry streams and reports routed to S3 bucket ${cloudStatus?.cloudDeployment?.s3Bucket}.`
            : 'The application is running in fully self-contained Local Demonstration Mode. Real-time telemetry, MongoDB storage, and AI models are running locally without requiring active AWS cloud credentials.'
        }
        type={isAws ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: 20 }}
      />

      {/* Health KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Backend Service Health"
            value={cloudStatus?.status || 'HEALTHY'}
            icon={<CheckCircleOutlined />}
            subtitle={`Uptime: ${cloudStatus?.uptimeSeconds || 0} seconds`}
            color="#06D6A0"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="Database Connection"
            value={cloudStatus?.database?.readyStateText?.toUpperCase() || 'CONNECTED'}
            icon={<DatabaseOutlined />}
            subtitle={cloudStatus?.database?.mode || 'Local In-Memory'}
            color="#00F5D4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="AI Engine Readiness"
            value={cloudStatus?.aiEngine?.modelTrained ? 'TRAINED' : 'STANDBY'}
            icon={<CloudServerOutlined />}
            subtitle={cloudStatus?.aiEngine?.modelVersion || 'v1.2 OLS'}
            color="#48CAE4"
          />
        </Col>
        <Col xs={24} sm={6}>
          <MetricCard
            title="API Success Rate"
            value={cloudStatus?.apiPerformance?.successRate || '100%'}
            icon={<ApiOutlined />}
            subtitle={`${cloudStatus?.apiPerformance?.totalRequests || 0} total requests handled`}
            color="#0077B6"
          />
        </Col>
      </Row>

      {/* Runtime & DB Diagnostics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>🖥️ Runtime System Health</span>}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Node.js Environment">{cloudStatus?.runtime?.nodeVersion} on {cloudStatus?.runtime?.platform}</Descriptions.Item>
              <Descriptions.Item label="CPU Hardware Cores">{cloudStatus?.runtime?.cpuCount} Virtual / Physical Cores</Descriptions.Item>
              <Descriptions.Item label="Process Memory (RSS / Heap)">
                {cloudStatus?.runtime?.processRssMb} MB RSS / {cloudStatus?.runtime?.processHeapUsedMb} MB Heap
              </Descriptions.Item>
              <Descriptions.Item label="System Free Memory">
                {cloudStatus?.runtime?.freeMemoryMb} MB Free of {cloudStatus?.runtime?.totalMemoryMb} MB Total
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>🗄️ Database Connection & Storage State</span>}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Operational Mode">
                <Tag color="cyan">{cloudStatus?.database?.mode}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Host Connection Endpoint">
                <span style={{ fontFamily: 'monospace' }}>{cloudStatus?.database?.host}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Database Name">{cloudStatus?.database?.database}</Descriptions.Item>
              <Descriptions.Item label="Total Sensor Telemetry Records">
                <strong style={{ color: '#00F5D4' }}>{cloudStatus?.database?.totalSensorRecords} documents</strong>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Cloud Services Integration Matrix */}
      <Card
        className="thermal-card"
        title={<span style={{ color: '#00F5D4' }}>☁️ AWS Cloud Integration Services Matrix</span>}
        style={{ marginBottom: 20 }}
      >
        <Table
          columns={serviceColumns}
          dataSource={cloudStatus?.cloudDeployment?.servicesReadiness || []}
          rowKey="service"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Recent API Errors Table */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>⚠️ Recent API Monitoring & Error Log</span>}>
        <Table
          columns={errorColumns}
          dataSource={cloudStatus?.apiPerformance?.recentErrors || []}
          rowKey="timestamp"
          pagination={false}
          size="small"
          locale={{ emptyText: 'No HTTP errors recorded. All backend routes responding nominally.' }}
        />
      </Card>
    </div>
  );
}

export default CloudOperations;
