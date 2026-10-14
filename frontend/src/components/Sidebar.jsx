import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  AlertOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Main Dashboard'
    },
    {
      key: '/datacenter',
      icon: <AppstoreOutlined />,
      label: 'Data Center Overview'
    },
    {
      key: '/racks',
      icon: <ClusterOutlined />,
      label: 'Rack & Server Monitoring'
    },
    {
      key: '/data-engineering',
      icon: <DatabaseOutlined />,
      label: 'Data Engineering'
    },
    {
      key: '/ai-forecasting',
      icon: <LineChartOutlined />,
      label: 'AI Temp Forecasting'
    },
    {
      key: '/anomalies',
      icon: <AlertOutlined />,
      label: 'Thermal Anomalies'
    },
    {
      key: '/recommendations',
      icon: <BulbOutlined />,
      label: 'Cooling Guidance'
    },
    {
      key: '/energy',
      icon: <ThunderboltOutlined />,
      label: 'Energy Analysis'
    },
    {
      key: '/cloud',
      icon: <CloudServerOutlined />,
      label: 'Cloud Operations'
    },
    {
      key: '/security',
      icon: <SafetyCertificateOutlined />,
      label: 'Security Overview'
    },
    {
      key: '/audit',
      icon: <HistoryOutlined />,
      label: 'Audit Trail'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Threshold Settings'
    }
  ];

  const currentKey = location.pathname === '/' ? '/dashboard' : location.pathname;

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={value => setCollapsed(value)}
      width={240}
      style={{
        backgroundColor: '#0E172E',
        borderRight: '1px solid rgba(72, 202, 228, 0.15)',
        minHeight: 'calc(100vh - 64px)'
      }}
    >
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[currentKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{
          backgroundColor: 'transparent',
          borderRight: 0,
          marginTop: 8
        }}
      />
    </Sider>
  );
}

export default Sidebar;
