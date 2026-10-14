import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Upload,
  Select,
  Space,
  Tag,
  message,
  Alert,
  Divider
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepForwardOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  WarningOutlined
} from '@ant-design/icons';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

export function DataEngineering() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [readings, setReadings] = useState([]);
  const [totalReadings, setTotalReadings] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/sensors/ingestion-stats');
      if (res.data.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load ingestion stats:', err);
    }
  };

  const fetchReadings = async (page = 1, status = filterStatus) => {
    setLoading(true);
    try {
      const res = await api.get('/sensors', {
        params: {
          page,
          limit: 10,
          validationStatus: status
        }
      });
      if (res.data.success) {
        setReadings(res.data.readings);
        setTotalReadings(res.data.total);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Failed to load readings table:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchReadings(1, filterStatus);
  }, [filterStatus]);

  const handleSimulatorAction = async (action, extra = {}) => {
    if (!isAdmin) {
      message.warning('Administrator role required to control telemetry simulator.');
      return;
    }

    setSimLoading(true);
    try {
      const res = await api.post('/sensors/simulator', {
        action,
        ...extra
      });
      if (res.data.success) {
        message.success(res.data.message);
        await fetchStats();
        await fetchReadings(1, filterStatus);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Simulator action failed');
    } finally {
      setSimLoading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/sensors/upload-csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) {
          message.success(`Uploaded: ${res.data.message}`);
          onSuccess(res.data);
          await fetchStats();
          await fetchReadings(1, filterStatus);
        } else {
          onError(new Error(res.data.error));
        }
      } catch (err) {
        message.error(err.response?.data?.error || 'CSV upload failed');
        onError(err);
      }
    },
    showUploadList: false
  };

  const readingsColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: t => new Date(t).toLocaleTimeString()
    },
    {
      title: 'Node ID',
      dataIndex: 'serverId',
      key: 'serverId',
      render: (srv, row) => <strong>{row.rackId} • {srv}</strong>
    },
    {
      title: 'Temp (°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (t, row) => (
        <span style={{
          fontFamily: 'monospace',
          color: row.validationStatus === 'INVALID' ? '#EF476F' : t >= 38 ? '#EF476F' : t >= 32 ? '#FFD166' : '#00F5D4',
          fontWeight: 700
        }}>
          {t}°C
        </span>
      )
    },
    {
      title: 'CPU',
      dataIndex: 'cpuUtilization',
      key: 'cpuUtilization',
      render: cpu => `${cpu}%`
    },
    {
      title: 'Power',
      dataIndex: 'powerWatts',
      key: 'powerWatts',
      render: p => `${p} W`
    },
    {
      title: 'Data Source',
      dataIndex: 'dataSource',
      key: 'dataSource',
      render: src => <Tag>{src}</Tag>
    },
    {
      title: 'Validation',
      dataIndex: 'validationStatus',
      key: 'validationStatus',
      render: (st, row) => (
        <div>
          <StatusBadge status={st} />
          {row.rejectionReason && (
            <div style={{ fontSize: 11, color: '#EF476F', marginTop: 4 }}>
              {row.rejectionReason}
            </div>
          )}
        </div>
      )
    }
  ];

  const jobsColumns = [
    { title: 'Job ID', dataIndex: 'jobId', key: 'jobId', render: id => <span style={{ fontFamily: 'monospace' }}>{id}</span> },
    { title: 'Filename', dataIndex: 'filename', key: 'filename' },
    { title: 'Processed', dataIndex: 'totalProcessed', key: 'totalProcessed' },
    { title: 'Valid', dataIndex: 'validRecords', key: 'validRecords', render: v => <span style={{ color: '#06D6A0', fontWeight: 600 }}>{v}</span> },
    { title: 'Invalid', dataIndex: 'invalidRecords', key: 'invalidRecords', render: inv => <span style={{ color: inv > 0 ? '#EF476F' : '#8D99AE' }}>{inv}</span> },
    { title: 'Duplicates', dataIndex: 'duplicateRecords', key: 'duplicateRecords' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: st => <StatusBadge status={st} /> },
    { title: 'Time', dataIndex: 'createdAt', key: 'createdAt', render: t => new Date(t).toLocaleTimeString() }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
          Data Engineering Pipeline & Ingestion Center
        </Title>
        <Text style={{ color: '#8D99AE', fontSize: 13 }}>
          ETL pipeline, physical bounds validation, duplicate deduplication, and synthetic telemetry simulation
        </Text>
      </div>

      {/* KPI Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Total Ingested"
            value={stats?.stats?.totalRecords || 0}
            icon={<DatabaseOutlined />}
            subtitle="Persisted sensor records"
            color="#00F5D4"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Valid Records"
            value={stats?.stats?.validRecords || 0}
            icon={<CheckCircleOutlined />}
            subtitle="Passed physical validation"
            color="#06D6A0"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Invalid / Rejected"
            value={stats?.stats?.invalidRecords || 0}
            icon={<CloseCircleOutlined />}
            subtitle="Rejected out-of-bounds telemetry"
            color="#EF476F"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Duplicates Filtered"
            value={stats?.stats?.duplicateRecords || 0}
            icon={<CopyOutlined />}
            subtitle="Identified & deduplicated"
            color="#FFD166"
          />
        </Col>
      </Row>

      {/* Simulator Controls & CSV Upload */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Simulator Control Card */}
        <Col xs={24} lg={12}>
          <Card
            className="thermal-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#00F5D4' }}>⚙️ Sensor Telemetry Simulator</span>
                <Tag color={stats?.simulator?.isRunning ? 'green' : 'default'}>
                  {stats?.simulator?.isRunning ? 'Running (4s tick)' : 'Stopped'}
                </Tag>
              </div>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#ADB5BD' }}>Operational Simulation Scenario:</Text>
              <Select
                value={stats?.simulator?.currentScenario || 'NORMAL'}
                onChange={val => handleSimulatorAction('set_scenario', { scenario: val })}
                style={{ width: '100%', marginTop: 6 }}
                options={stats?.simulator?.availableScenarios?.map(s => ({
                  value: s.id,
                  label: `${s.name} — ${s.description}`
                })) || []}
              />
            </div>

            <Space wrap size="middle">
              {stats?.simulator?.isRunning ? (
                <Button
                  danger
                  icon={<PauseCircleOutlined />}
                  loading={simLoading}
                  onClick={() => handleSimulatorAction('stop')}
                >
                  Stop Simulator
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={simLoading}
                  style={{ backgroundColor: '#00F5D4', borderColor: '#00F5D4', color: '#0B132B', fontWeight: 600 }}
                  onClick={() => handleSimulatorAction('start')}
                >
                  Start Simulator
                </Button>
              )}

              <Button
                icon={<StepForwardOutlined />}
                loading={simLoading}
                onClick={() => handleSimulatorAction('step')}
              >
                Generate 1 Tick
              </Button>
            </Space>

            <Divider style={{ borderColor: 'rgba(72, 202, 228, 0.15)', margin: '16px 0' }} />

            <div style={{ fontSize: 12, color: '#8D99AE' }}>
              Physics Model: Heat Generated = <em>P</em>/450 × 15°C • Heat Extracted = (<em>RPM</em>/100) × 11°C • Thermal Inertia Damping: 0.82
            </div>
          </Card>
        </Col>

        {/* CSV Ingestion Card */}
        <Col xs={24} lg={12}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>📥 CSV Dataset Ingestion</span>}>
            <Dragger {...uploadProps} style={{ padding: '20px 0', background: 'rgba(19, 28, 54, 0.5)', borderColor: 'rgba(72, 202, 228, 0.3)' }}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: '#00F5D4', fontSize: 32 }} />
              </p>
              <p className="ant-upload-text" style={{ color: '#F8F9FA', fontWeight: 500 }}>
                Click or drag CSV file to upload & ingest
              </p>
              <p className="ant-upload-hint" style={{ color: '#8D99AE', fontSize: 12 }}>
                Supports batch sensor records with headers: timestamp, rackId, serverId, temperature, cpuUtilization, powerWatts
              </p>
            </Dragger>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#ADB5BD' }}>Sample available in: <code style={{ color: '#00F5D4' }}>datasets/sample_upload.csv</code></span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Historical Data Table */}
      <Card
        className="thermal-card"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#00F5D4' }}>📜 Ingested Telemetry Records</span>
            <Space>
              <span style={{ color: '#ADB5BD', fontSize: 12 }}>Filter Validation:</span>
              <Select
                value={filterStatus}
                onChange={val => setFilterStatus(val)}
                style={{ width: 130 }}
                options={[
                  { value: 'ALL', label: 'All Records' },
                  { value: 'VALID', label: 'Valid Only' },
                  { value: 'INVALID', label: 'Invalid / Rejected' },
                  { value: 'SUSPECT', label: 'Suspect' }
                ]}
              />
            </Space>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        <Table
          columns={readingsColumns}
          dataSource={readings}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            total: totalReadings,
            pageSize: 10,
            onChange: page => fetchReadings(page, filterStatus)
          }}
          size="small"
        />
      </Card>

      {/* Recent Ingestion Jobs */}
      <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>⏱️ Ingestion Jobs History</span>}>
        <Table
          columns={jobsColumns}
          dataSource={stats?.recentJobs || []}
          rowKey="jobId"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

export default DataEngineering;
