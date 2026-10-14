import React, { useState } from 'react';
import { Layout as AntLayout } from 'antd';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const { Content } = AntLayout;

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AntLayout style={{ minHeight: '100vh', backgroundColor: '#0B132B' }}>
      <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
      <AntLayout style={{ backgroundColor: '#0B132B' }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            backgroundColor: '#101B36',
            borderRadius: 12,
            border: '1px solid rgba(72, 202, 228, 0.12)',
            minHeight: 'calc(100vh - 112px)',
            overflowY: 'auto'
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default Layout;
