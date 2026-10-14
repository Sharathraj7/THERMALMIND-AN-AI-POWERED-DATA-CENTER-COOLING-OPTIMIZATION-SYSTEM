import React from 'react';
import { Tag } from 'antd';

export function StatusBadge({ status }) {
  let color = 'default';
  let label = status || 'Unknown';

  switch (status) {
    case 'Optimal':
    case 'COMPLETED':
    case 'VALID':
    case 'SUCCESS':
      color = 'success';
      break;
    case 'Active':
    case 'PROCESSING':
    case 'Acknowledged':
      color = 'processing';
      break;
    case 'Warning':
    case 'SUSPECT':
    case 'WARNING':
      color = 'warning';
      break;
    case 'Critical':
    case 'Failed':
    case 'FAILED':
    case 'INVALID':
    case 'FAILURE':
      color = 'error';
      break;
    default:
      color = 'default';
  }

  return (
    <Tag color={color} style={{ fontWeight: 600, borderRadius: 4, textTransform: 'uppercase', fontSize: 11 }}>
      {label}
    </Tag>
  );
}

export default StatusBadge;
