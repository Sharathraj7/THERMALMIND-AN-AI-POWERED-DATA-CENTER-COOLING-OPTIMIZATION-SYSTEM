import React from 'react';
import { Card, Typography } from 'antd';

const { Text, Title } = Typography;

export function MetricCard({
  title,
  value,
  unit = '',
  icon,
  subtitle,
  trend,
  color = '#00F5D4',
  loading = false
}) {
  return (
    <Card
      loading={loading}
      className="thermal-card"
      bodyStyle={{ padding: '20px 24px' }}
      style={{ height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ color: '#ADB5BD', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
            {title}
          </Text>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8 }}>
            <Title
              level={2}
              style={{
                margin: 0,
                color: '#F8F9FA',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600
              }}
            >
              {value}
            </Title>
            {unit && (
              <span style={{ marginLeft: 6, color: color, fontSize: 16, fontWeight: 600 }}>
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#8D99AE' }}>
              {trend && <span style={{ color: trend.startsWith('+') ? '#EF476F' : '#06D6A0', marginRight: 6, fontWeight: 600 }}>{trend}</span>}
              {subtitle}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: color
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default MetricCard;
