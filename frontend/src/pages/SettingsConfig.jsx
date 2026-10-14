import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Typography,
  Divider,
  Alert,
  Space,
  message,
  Descriptions,
  Tag
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

export function SettingsConfig() {
  const [form] = Form.useForm();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        form.setFieldsValue(res.data.settings);
        setLastUpdated(res.data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (values) => {
    if (!isAdmin) {
      message.warning('Administrator credentials required to update operational thresholds.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch('/settings', values);
      if (res.data.success) {
        message.success(res.data.message);
        setLastUpdated(res.data.settings);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
            Operational Thresholds & Configuration
          </Title>
          <Text style={{ color: '#8D99AE', fontSize: 13 }}>
            ASHRAE thermal limits, anomaly sensitivity Z-scores, and automated guidance settings
          </Text>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchSettings}>Refresh</Button>
      </div>

      {!isAdmin && (
        <Alert
          message="Read-Only Operator Mode"
          description="You are currently signed in as an Operator. Operational thresholds can be inspected but only Administrators are authorized to update setpoints."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Card className="thermal-card" style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          disabled={!isAdmin}
        >
          <Title level={5} style={{ color: '#00F5D4' }}>ASHRAE TC 9.9 Thermal Limits</Title>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Form.Item
              name="warningTempThreshold"
              label={<span style={{ color: '#ADB5BD' }}>Warning Temperature Threshold (°C)</span>}
              rules={[{ required: true }]}
              extra="ASHRAE recommended upper ceiling for continuous IT server intake"
            >
              <InputNumber min={20} max={45} step={0.5} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="criticalTempThreshold"
              label={<span style={{ color: '#ADB5BD' }}>Critical Hotspot Ceiling (°C)</span>}
              rules={[{ required: true }]}
              extra="ASHRAE allowable threshold triggering immediate operator escalation"
            >
              <InputNumber min={30} max={60} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider style={{ borderColor: 'rgba(72, 202, 228, 0.15)' }} />

          <Title level={5} style={{ color: '#00F5D4' }}>Statistical Anomaly Detection Parameters</Title>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Form.Item
              name="maxAllowedDelta"
              label={<span style={{ color: '#ADB5BD' }}>Maximum Allowed Transient Delta (°C / 10m)</span>}
              rules={[{ required: true }]}
              extra="Triggers SUDDEN_SPIKE anomaly when temperature rises faster than this limit"
            >
              <InputNumber min={1.0} max={15.0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="anomalySensitivity"
              label={<span style={{ color: '#ADB5BD' }}>Statistical Sensitivity (Z-Score σ)</span>}
              rules={[{ required: true }]}
              extra="Number of standard deviations above rolling baseline to flag an anomaly"
            >
              <InputNumber min={1.0} max={5.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider style={{ borderColor: 'rgba(72, 202, 228, 0.15)' }} />

          <Title level={5} style={{ color: '#00F5D4' }}>Automation & Ingestion Stream</Title>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Form.Item
              name="autoRecommendation"
              valuePropName="checked"
              label={<span style={{ color: '#ADB5BD' }}>Automatic Cooling Recommendation Synthesis</span>}
              extra="Automatically generate prescriptive operator guidance upon anomaly detection"
            >
              <Switch checkedChildren="ENABLED" unCheckedChildren="DISABLED" />
            </Form.Item>

            <Form.Item
              name="simulatorIntervalMs"
              label={<span style={{ color: '#ADB5BD' }}>Simulator Telemetry Interval (ms)</span>}
              rules={[{ required: true }]}
              extra="Frequency of time-series sensor generation (default: 4000ms)"
            >
              <InputNumber min={1000} max={60000} step={500} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          {isAdmin && (
            <Form.Item style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
                size="large"
                style={{ backgroundColor: '#00F5D4', borderColor: '#00F5D4', color: '#0B132B', fontWeight: 600 }}
              >
                Save Configuration Changes
              </Button>
            </Form.Item>
          )}
        </Form>

        {lastUpdated && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(72, 202, 228, 0.15)', fontSize: 12, color: '#8D99AE' }}>
            Last modified by: <strong style={{ color: '#F8F9FA' }}>{lastUpdated.updatedBy || 'System Default'}</strong> on {new Date(lastUpdated.updatedAt || Date.now()).toLocaleString()}
          </div>
        )}
      </Card>
    </div>
  );
}

export default SettingsConfig;
