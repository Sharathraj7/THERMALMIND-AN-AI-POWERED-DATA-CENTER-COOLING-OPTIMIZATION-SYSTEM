import React from 'react';
import { Layout, Typography, Space, Button, Badge, Tag, Dropdown } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  CloudServerOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header } = Layout;
const { Text } = Typography;

export function Navbar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div>
          <Text strong>{user?.name}</Text>
          <div style={{ fontSize: 12, color: '#8D99AE' }}>{user?.email}</div>
          <div style={{ marginTop: 4 }}>
            <Tag color={user?.role === 'Administrator' ? 'purple' : 'cyan'}>
              {user?.role}
            </Tag>
          </div>
        </div>
      )
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: logout
    }
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: '#0E172E',
        borderBottom: '1px solid rgba(72, 202, 228, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: 64
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>❄️</span>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5, color: '#00F5D4' }}>
              THERMALMIND
            </span>
            <span style={{ fontSize: 11, color: '#48CAE4', marginLeft: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
              DC Cooling Optimization
            </span>
          </div>
        </div>

        <Tag
          style={{
            marginLeft: 24,
            backgroundColor: 'rgba(0, 245, 212, 0.1)',
            borderColor: 'rgba(0, 245, 212, 0.3)',
            color: '#00F5D4',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span className="pulse-indicator"></span>
          <span>FACILITY: DC-EAST-01 • ASHBURN</span>
        </Tag>
      </div>

      <Space size="middle" align="center">
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button
            type="text"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#F8F9FA',
              height: 40,
              padding: '0 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(28, 37, 65, 0.6)',
              border: '1px solid rgba(72, 202, 228, 0.15)'
            }}
          >
            <UserOutlined style={{ color: '#00F5D4' }} />
            <span style={{ fontWeight: 500 }}>{user?.name || 'Operator'}</span>
            <Tag color={user?.role === 'Administrator' ? 'purple' : 'cyan'} style={{ margin: 0, fontSize: 10 }}>
              {user?.role}
            </Tag>
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
}

export default Navbar;
