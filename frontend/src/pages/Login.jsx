import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Space, Divider, Tag } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

export function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await login(values.email, values.password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMsg(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Unable to connect to backend API server.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email, password) => {
    form.setFieldsValue({ email, password });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B132B',
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0, 245, 212, 0.08) 0%, transparent 60%)',
        padding: 20
      }}
    >
      <Card
        className="thermal-card"
        style={{
          width: '100%',
          maxWidth: 440,
          borderColor: 'rgba(72, 202, 228, 0.25)',
          padding: '12px 16px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>❄️</div>
          <Title level={3} style={{ color: '#00F5D4', margin: 0, letterSpacing: 0.5 }}>
            THERMALMIND
          </Title>
          <Text style={{ color: '#48CAE4', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
            Data Center Cooling Optimization
          </Text>
          <Paragraph style={{ color: '#8D99AE', fontSize: 13, marginTop: 8 }}>
            AI-Powered Thermal Telemetry & HVAC Guidance System
          </Paragraph>
        </div>

        {errorMsg && (
          <Alert
            message="Authentication Error"
            description={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label={<span style={{ color: '#ADB5BD' }}>Operator Email</span>}
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email address' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#00F5D4' }} />}
              placeholder="operator@thermalmind.io"
              size="large"
              style={{ backgroundColor: '#131C36', borderColor: 'rgba(72, 202, 228, 0.2)', color: '#F8F9FA' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: '#ADB5BD' }}>Security Key / Password</span>}
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#00F5D4' }} />}
              placeholder="••••••••••••"
              size="large"
              style={{ backgroundColor: '#131C36', borderColor: 'rgba(72, 202, 228, 0.2)', color: '#F8F9FA' }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={loading}
              block
              size="large"
              style={{
                backgroundColor: '#00F5D4',
                borderColor: '#00F5D4',
                color: '#0B132B',
                fontWeight: 600,
                height: 44
              }}
            >
              Sign In to Operations Console
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: 'rgba(72, 202, 228, 0.15)', color: '#8D99AE', fontSize: 12 }}>
          Quick Demo Accounts
        </Divider>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button
            size="small"
            style={{
              textAlign: 'left',
              height: 'auto',
              padding: '8px 12px',
              backgroundColor: 'rgba(28, 37, 65, 0.8)',
              borderColor: 'rgba(72, 202, 228, 0.2)',
              color: '#F8F9FA'
            }}
            onClick={() => fillCredentials('admin@thermalmind.io', 'Admin@ThermalMind2026')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#48CAE4' }}>Lead Administrator</strong>
                <div style={{ fontSize: 11, color: '#ADB5BD' }}>admin@thermalmind.io</div>
              </div>
              <Tag color="purple">Admin</Tag>
            </div>
          </Button>

          <Button
            size="small"
            style={{
              textAlign: 'left',
              height: 'auto',
              padding: '8px 12px',
              backgroundColor: 'rgba(28, 37, 65, 0.8)',
              borderColor: 'rgba(72, 202, 228, 0.2)',
              color: '#F8F9FA'
            }}
            onClick={() => fillCredentials('operator@thermalmind.io', 'Operator@ThermalMind2026')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#00F5D4' }}>Ashburn DC Operator</strong>
                <div style={{ fontSize: 11, color: '#ADB5BD' }}>operator@thermalmind.io</div>
              </div>
              <Tag color="cyan">Operator</Tag>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default Login;
