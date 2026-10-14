import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Select,
  Input,
  Space,
  Typography,
  Tag,
  Button,
  Modal
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export function AuditLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [actionSearch, setActionSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get('/security/audit-logs', {
        params: {
          page: p,
          limit: 12,
          module: selectedModule,
          status: selectedStatus,
          action: actionSearch
        }
      });
      if (res.data.success) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setPage(p);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [selectedModule, selectedStatus]);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: t => new Date(t).toLocaleString()
    },
    {
      title: 'Operator / User',
      dataIndex: 'userEmail',
      key: 'userEmail',
      render: (email, row) => (
        <div>
          <strong style={{ color: '#F8F9FA' }}>{email}</strong>
          <div style={{ fontSize: 11, color: '#8D99AE' }}>
            <Tag color={row.userRole === 'Administrator' ? 'purple' : 'cyan'}>{row.userRole}</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 130,
      render: m => <Tag color="blue">{m}</Tag>
    },
    {
      title: 'Action Triggered',
      dataIndex: 'action',
      key: 'action',
      render: a => <strong style={{ color: '#00F5D4' }}>{a}</strong>
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 110,
      render: ip => <span style={{ fontFamily: 'monospace', color: '#ADB5BD' }}>{ip}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: s => <StatusBadge status={s} />
    },
    {
      title: 'Details',
      key: 'details',
      width: 90,
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailModal(row)}
        >
          JSON
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Enterprise Immutable Audit Trail
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            Chronological logging of administrative actions, model retraining, threshold modifications, and alert resolutions
          </Text>
        </div>

        <Space>
          <Select
            value={selectedModule}
            onChange={val => setSelectedModule(val)}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'All Modules' },
              { value: 'AUTH', label: 'Auth' },
              { value: 'INGESTION', label: 'Ingestion' },
              { value: 'AI_FORECAST', label: 'AI Forecast' },
              { value: 'RECOMMENDATIONS', label: 'Recommendations' },
              { value: 'SETTINGS', label: 'Settings' },
              { value: 'SYSTEM', label: 'System' }
            ]}
          />
          <Select
            value={selectedStatus}
            onChange={val => setSelectedStatus(val)}
            style={{ width: 120 }}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'SUCCESS', label: 'Success' },
              { value: 'FAILURE', label: 'Failure' },
              { value: 'WARNING', label: 'Warning' }
            ]}
          />
          <Input.Search
            placeholder="Search action..."
            onSearch={() => fetchLogs(1)}
            value={actionSearch}
            onChange={e => setActionSearch(e.target.value)}
            style={{ width: 180 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(1)}>Refresh</Button>
        </Space>
      </div>

      <Card className="thermal-card">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 12,
            onChange: p => fetchLogs(p)
          }}
          size="small"
        />
      </Card>

      {/* JSON Payload Detail Modal */}
      <Modal
        title={<span style={{ color: '#00F5D4' }}>📄 Audit Event Payload: {detailModal?.action}</span>}
        open={Boolean(detailModal)}
        onCancel={() => setDetailModal(null)}
        footer={null}
        width={600}
        bodyStyle={{ backgroundColor: '#131C36', color: '#F8F9FA' }}
      >
        <pre
          style={{
            backgroundColor: '#0B132B',
            color: '#00F5D4',
            padding: 16,
            borderRadius: 8,
            border: '1px solid rgba(72, 202, 228, 0.2)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            overflowX: 'auto'
          }}
        >
          {JSON.stringify(detailModal, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}

export default AuditLogs;
