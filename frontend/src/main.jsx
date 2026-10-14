import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './styles/custom.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00F5D4',
          colorInfo: '#48CAE4',
          colorSuccess: '#06D6A0',
          colorWarning: '#FFD166',
          colorError: '#EF476F',
          colorBgBase: '#0B132B',
          colorBgContainer: '#1C2541',
          colorBgElevated: '#131C36',
          colorBorder: 'rgba(72, 202, 228, 0.18)',
          colorTextBase: '#F8F9FA',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          borderRadius: 8
        }
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
