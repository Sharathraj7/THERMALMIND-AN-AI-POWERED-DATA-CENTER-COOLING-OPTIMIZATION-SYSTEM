import React from 'react';
import { Modal, Descriptions, Typography, Alert, Divider, Space, Table } from 'antd';
import { AlertOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import RiskTag from './RiskTag';

const { Title, Text, Paragraph } = Typography;

export function ExplainableModal({ visible, onClose, data, type = 'anomaly' }) {
  if (!data) return null;

  const isAnomaly = type === 'anomaly';

  const featureColumns = [
    { title: 'Feature Metric', dataIndex: 'feature', key: 'feature', render: text => <strong style={{ color: '#48CAE4' }}>{text}</strong> },
    { title: 'Observed Value', dataIndex: 'value', key: 'value', render: text => <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{text}</span> },
    { title: 'Baseline / Expected', dataIndex: 'baseline', key: 'baseline', render: text => <span style={{ color: '#ADB5BD' }}>{text}</span> },
    { title: 'Significance / Deviation', dataIndex: 'deviation', key: 'deviation' }
  ];

  const featureRows = isAnomaly && data.evidence ? [
    {
      key: '1',
      feature: 'Temperature',
      value: `${data.observedTemperature || data.evidence.currentTemp}°C`,
      baseline: `${data.baselineTemperature || data.evidence.rollingMean}°C (±${data.evidence.rollingStd || 1.2}°C)`,
      deviation: `Z-Score: ${data.evidence.zScore || data.anomalyScore || 'N/A'}`
    },
    {
      key: '2',
      feature: 'CPU Utilization',
      value: `${data.evidence.cpuUtilization}%`,
      baseline: '30 - 65% Normal Band',
      deviation: data.evidence.cpuUtilization > 85 ? 'Elevated compute workload' : 'Normal / Low load'
    },
    {
      key: '3',
      feature: 'Server Power',
      value: `${data.evidence.powerWatts} W`,
      baseline: '180 - 280 W Typical',
      deviation: data.evidence.powerWatts > 350 ? 'High power dissipation' : 'Nominal power draw'
    },
    {
      key: '4',
      feature: 'Cooling / Fan Speed',
      value: `${data.evidence.fanSpeed}%`,
      baseline: '45 - 60% Target',
      deviation: data.evidence.fanSpeed > 85 ? 'Fan controller saturated' : 'Active modulation'
    },
    {
      key: '5',
      feature: 'Rate-of-Rise (Delta)',
      value: `+${data.evidence.temperatureDelta || 0}°C / interval`,
      baseline: '< 2.0°C / interval',
      deviation: (data.evidence.temperatureDelta || 0) > 4.5 ? 'Surge limit breached' : 'Acceptable thermal rate'
    }
  ] : [];

  return (
    <Modal
      title={
        <Space>
          <span style={{ color: '#00F5D4', fontSize: 18 }}>🧠 Explainable AI Decision Evidence</span>
          {data.riskCategory && <RiskTag risk={data.riskCategory} />}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={780}
      bodyStyle={{ backgroundColor: '#131C36', color: '#F8F9FA' }}
    >
      <div style={{ marginTop: 12 }}>
        <Alert
          message={isAnomaly ? (data.anomalyType || 'Thermal Anomaly') : 'Predictive Forecast Horizon'}
          description={data.explanation || data.title || 'Derived from empirical sensor features and physics-informed models.'}
          type={data.riskCategory === 'Critical' ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 20 }}
        />

        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Identifier">
            <span style={{ fontFamily: 'monospace', color: '#00F5D4' }}>{data.anomalyId || data.recommendationId || data.forecastId || 'N/A'}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Rack / Server">
            <strong>{data.rackId}</strong> • {data.serverId || 'Rack Aggregate'}
          </Descriptions.Item>
          <Descriptions.Item label="Timestamp">
            {new Date(data.timestamp || data.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Risk Category">
            <RiskTag risk={data.riskCategory || data.severity || 'Normal'} />
          </Descriptions.Item>
        </Descriptions>

        {featureRows.length > 0 && (
          <>
            <Divider orientation="left" style={{ borderColor: 'rgba(72, 202, 228, 0.2)', color: '#48CAE4' }}>
              Feature Evidence Breakdown
            </Divider>
            <Table
              columns={featureColumns}
              dataSource={featureRows}
              pagination={false}
              size="small"
              bordered
            />
          </>
        )}

        {(data.recommendedInvestigation || data.recommendedAction) && (
          <>
            <Divider orientation="left" style={{ borderColor: 'rgba(72, 202, 228, 0.2)', color: '#00F5D4' }}>
              Recommended Operator Action
            </Divider>
            <div style={{ background: 'rgba(0, 245, 212, 0.05)', padding: 14, borderRadius: 8, border: '1px solid rgba(0, 245, 212, 0.2)' }}>
              <Paragraph style={{ margin: 0, color: '#F8F9FA', whiteSpace: 'pre-line' }}>
                {data.recommendedInvestigation || data.recommendedAction}
              </Paragraph>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default ExplainableModal;
