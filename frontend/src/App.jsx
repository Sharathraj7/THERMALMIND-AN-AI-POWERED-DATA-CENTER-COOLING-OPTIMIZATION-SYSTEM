import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataCenterOverview from './pages/DataCenterOverview';
import RackServerMonitoring from './pages/RackServerMonitoring';
import DataEngineering from './pages/DataEngineering';
import TemperatureForecasting from './pages/TemperatureForecasting';
import AnomalyDetection from './pages/AnomalyDetection';
import CoolingRecommendations from './pages/CoolingRecommendations';
import EnergyAnalysis from './pages/EnergyAnalysis';
import CloudOperations from './pages/CloudOperations';
import SecurityOverview from './pages/SecurityOverview';
import AuditLogs from './pages/AuditLogs';
import SettingsConfig from './pages/SettingsConfig';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B132B' }}>
        <Spin size="large" tip="Authenticating Session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="datacenter" element={<DataCenterOverview />} />
        <Route path="racks" element={<RackServerMonitoring />} />
        <Route path="data-engineering" element={<DataEngineering />} />
        <Route path="ai-forecasting" element={<TemperatureForecasting />} />
        <Route path="anomalies" element={<AnomalyDetection />} />
        <Route path="recommendations" element={<CoolingRecommendations />} />
        <Route path="energy" element={<EnergyAnalysis />} />
        <Route path="cloud" element={<CloudOperations />} />
        <Route path="security" element={<SecurityOverview />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<SettingsConfig />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
