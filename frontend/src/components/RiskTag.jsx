import React from 'react';
import { Tag } from 'antd';

export function RiskTag({ risk }) {
  let color = '#8D99AE';
  let label = risk || 'Normal';

  switch (risk) {
    case 'Normal':
      color = '#06D6A0';
      break;
    case 'Low Risk':
      color = '#48CAE4';
      break;
    case 'Medium Risk':
      color = '#FFD166';
      break;
    case 'High Risk':
      color = '#F77F00';
      break;
    case 'Critical':
      color = '#EF476F';
      break;
    default:
      color = '#8D99AE';
  }

  return (
    <Tag
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
        fontWeight: 600,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12
      }}
    >
      {label}
    </Tag>
  );
}

export default RiskTag;
