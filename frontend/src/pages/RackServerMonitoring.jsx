import React, { useState, useEffect } from 'react';
import { Card, Table, Select, Space, Typography, Progress, Tag, Button, Row, Col, Drawer, Descriptions } from 'antd';
import { ClusterOutlined, ReloadOutlined, DesktopOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskTag from '../components/RiskTag';

const { Title, Text } = Typography;

export function RackServerMonitoring() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState('ALL');
  const [selectedServer, setSelectedServer] = useState(null);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/racks/servers/all');
      if (res.data.success) {
        setServers(res.data.servers);
      }
    } catch (err) {
      console.error('Failed to load server monitoring telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredServers = selectedRack === 'ALL'
    ? servers
    : servers.filter(s => s.rackId === selectedRack);

  const columns = [
    {
      title: 'Server Node',
      dataIndex: 'id',
      key: 'id',
      render: (id, row) => (
        <div>
          <strong style={{ color: '#00F5D4' }}>{id}</strong>
          <div style={{ fontSize: 11, color: '#8D99AE' }}>{row.rackId} • {row.hostname}</div>
        </div>
      )
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: ip => <span style={{ fontFamily: 'monospace', color: '#ADB5BD' }}>{ip}</span>
    },
    {
      title: 'Temperature',
      key: 'temp',
      sorter: (a, b) => a.telemetry.temperature - b.telemetry.temperature,
      render: (_, row) => {
        const t = row.telemetry.temperature;
        const color = t >= 38 ? '#EF476F' : t >= 32 ? '#FFD166' : '#00F5D4';
        return (
          <span style={{ color, fontWeight: 700, fontFamily: 'monospace', fontSize: 15 }}>
            {t}°C
          </span>
        );
      }
    },
    {
      title: 'CPU Load',
      key: 'cpu',
      sorter: (a, b) => a.telemetry.cpuUtilization - b.telemetry.cpuUtilization,
      render: (_, row) => (
        <div style={{ width: 110 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
            <span style={{ color: '#ADB5BD' }}>{row.telemetry.cpuUtilization}%</span>
            <span style={{ color: '#8D99AE' }}>{row.telemetry.workload}</span>
          </div>
          <Progress
            percent={row.telemetry.cpuUtilization}
            size="small"
            strokeColor={row.telemetry.cpuUtilization > 85 ? '#EF476F' : '#00F5D4'}
            showInfo={false}
          />
        </div>
      )
    },
    {
      title: 'Power',
      key: 'power',
      render: (_, row) => (
        <span style={{ fontFamily: 'monospace', color: '#48CAE4' }}>
          {row.telemetry.powerWatts} W
        </span>
      )
    },
    {
      title: 'Fan Speed',
      key: 'fan',
      render: (_, row) => (
        <span style={{ fontFamily: 'monospace' }}>
          {row.telemetry.fanSpeed}%
        </span>
      )
    },
    {
      title: 'Thermal Risk',
      dataIndex: 'riskCategory',
      key: 'riskCategory',
      render: r => <RiskTag risk={r} />
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedServer(row)}
          style={{ backgroundColor: 'rgba(0, 245, 212, 0.1)', borderColor: '#00F5D4', color: '#00F5D4' }}
        >
          Telemetry
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Rack & Compute Node Telemetry
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Per-server thermal monitoring, chassis tachometer speed, and power draw
          </Text>
        </div>

        <Space>
          <Select
            value={selectedRack}
            onChange={val => setSelectedRack(val)}
            style={{ width: 160 }}
            options={[
              { value: 'ALL', label: 'All Racks (16 Nodes)' },
              { value: 'RACK-A01', label: 'Rack A01 (Row A)' },
              { value: 'RACK-A02', label: 'Rack A02 (Row A)' },
              { value: 'RACK-B01', label: 'Rack B01 (Row B)' },
              { value: 'RACK-B02', label: 'Rack B02 (Row B)' }
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchServers}>Refresh</Button>
        </Space>
      </div>

      <Card className="thermal-card">
        <Table
          columns={columns}
          dataSource={filteredServers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          size="middle"
        />
      </Card>

      {/* Server Telemetry Detail Drawer */}
      <Drawer
        title={<span style={{ color: '#00F5D4' }}>🖥️ Node Diagnostics: {selectedServer?.id}</span>}
        placement="right"
        width={480}
        onClose={() => setSelectedServer(null)}
        open={Boolean(selectedServer)}
        bodyStyle={{ backgroundColor: '#131C36', color: '#F8F9FA' }}
      >
        {selectedServer && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Server Identifier">{selectedServer.id}</Descriptions.Item>
              <Descriptions.Item label="Rack Bay">{selectedServer.rackId}</Descriptions.Item>
              <Descriptions.Item label="Hostname">{selectedServer.hostname}</Descriptions.Item>
              <Descriptions.Item label="IP Address">{selectedServer.ipAddress}</Descriptions.Item>
              <Descriptions.Item label="Processor Model">{selectedServer.cpuModel}</Descriptions.Item>
              <Descriptions.Item label="Core Count">{selectedServer.cores} Physical Cores</Descriptions.Item>
              <Descriptions.Item label="Thermal Design Power">{selectedServer.tdpWatts} W TDP</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ color: '#48CAE4' }}>Instantaneous Sensor Readings</Title>
            <div style={{ backgroundColor: '#0B132B', padding: 16, borderRadius: 8, border: '1px solid rgba(72, 202, 228, 0.2)' }}>
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Text style={{ color: '#8D99AE' }}>Temperature:</Text>
                  <div style={{ fontSize: 20, color: selectedServer.telemetry.temperature >= 38 ? '#EF476F' : '#00F5D4', fontWeight: 700 }}>
                    {selectedServer.telemetry.temperature}°C
                  </div>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#8D99AE' }}>CPU Utilization:</Text>
                  <div style={{ fontSize: 20, color: '#F8F9FA', fontWeight: 700 }}>
                    {selectedServer.telemetry.cpuUtilization}%
                  </div>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#8D99AE' }}>Power Consumption:</Text>
                  <div style={{ fontSize: 20, color: '#48CAE4', fontWeight: 700 }}>
                    {selectedServer.telemetry.powerWatts} W
                  </div>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#8D99AE' }}>Fan Tachometer:</Text>
                  <div style={{ fontSize: 20, color: '#F8F9FA', fontWeight: 700 }}>
                    {selectedServer.telemetry.fanSpeed}%
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default RackServerMonitoring;
