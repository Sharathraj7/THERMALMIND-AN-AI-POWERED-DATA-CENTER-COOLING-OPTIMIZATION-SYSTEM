import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Descriptions, Tag, Space, Table, Progress, Alert } from 'antd';
import { AppstoreOutlined, ClusterOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskTag from '../components/RiskTag';

const { Title, Text, Paragraph } = Typography;

export function DataCenterOverview() {
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/racks');
        if (res.data.success) {
          setRacks(res.data.racks);
        }
      } catch (err) {
        console.error('Failed to load racks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const rowA = racks.filter(r => r.row === 'A');
  const rowB = racks.filter(r => r.row === 'B');

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ color: '#F8F9FA', margin: 0 }}>
          Facility Architecture & Cold-Aisle Containment
        </Title>
        <Text style={{ color: '#8D99AE', fontSize: 13 }}>
          Northern Virginia High-Density Cloud Facility 1 (Ashburn, VA) • Topology & Thermal Zones
        </Text>
      </div>

      {/* Facility Specs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>🏢 Facility Infrastructure Specs</span>}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Data Center ID">
                <strong style={{ color: '#00F5D4' }}>DC-EAST-01</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Geographic Location">Ashburn, Virginia, USA</Descriptions.Item>
              <Descriptions.Item label="Total IT Capacity">1.2 MW Design Peak</Descriptions.Item>
              <Descriptions.Item label="Cooling Architecture">Indirect Evaporative + CRAH Chilled Water</Descriptions.Item>
              <Descriptions.Item label="Aisle Containment">Enclosed Cold-Aisle (18-22°C Target)</Descriptions.Item>
              <Descriptions.Item label="Target PUE">
                <Tag color="cyan">1.18 - 1.25 PUE</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="thermal-card" title={<span style={{ color: '#00F5D4' }}>❄️ Chilled Water Loop Status</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#ADB5BD' }}>CRAH Supply Water Temp:</Text>
                <strong style={{ color: '#06D6A0' }}>7.2°C</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#ADB5BD' }}>Chilled Water Return Temp:</Text>
                <strong style={{ color: '#48CAE4' }}>14.8°C (ΔT: 7.6°C)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#ADB5BD' }}>Plenum Static Pressure:</Text>
                <strong style={{ color: '#00F5D4' }}>42 Pa (Optimal)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#ADB5BD' }}>Airflow Delivery:</Text>
                <strong style={{ color: '#F8F9FA' }}>7,200 CFM Aggregate</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row Layout Visualization */}
      <Card
        className="thermal-card"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#00F5D4' }}>🗺️ Physical Server Hall Layout (Row A & Row B)</span>
            <Space>
              <Tag color="green">Normal (18-27°C)</Tag>
              <Tag color="gold">Warning (32°C)</Tag>
              <Tag color="red">Critical (38°C+)</Tag>
            </Space>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        <div style={{ backgroundColor: '#0B132B', padding: 20, borderRadius: 8, border: '1px solid rgba(72, 202, 228, 0.15)' }}>
          {/* Row A */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ClusterOutlined style={{ color: '#00F5D4', fontSize: 18 }} />
              <strong style={{ color: '#F8F9FA', fontSize: 15 }}>ROW A — Standard High-Performance Compute</strong>
              <Tag color="cyan">Balanced Thermal Zone</Tag>
            </div>
            <Row gutter={[16, 16]}>
              {rowA.map(rack => (
                <Col key={rack.id} xs={24} sm={12} md={6}>
                  <div
                    style={{
                      backgroundColor: '#1C2541',
                      border: `1.5px solid ${rack.maxTemperature >= 38 ? '#EF476F' : rack.maxTemperature >= 32 ? '#FFD166' : '#00F5D4'}`,
                      borderRadius: 8,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ color: '#F8F9FA' }}>{rack.id}</strong>
                      <StatusBadge status={rack.thermalStatus} />
                    </div>
                    <div style={{ fontSize: 12, color: '#ADB5BD', marginBottom: 4 }}>
                      Max Temp: <strong style={{ color: '#F8F9FA' }}>{rack.maxTemperature}°C</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#ADB5BD', marginBottom: 8 }}>
                      Power: {rack.totalPowerKw} kW • {rack.servers?.length || 4} Nodes
                    </div>
                    <Progress
                      percent={Math.min(100, Math.round((rack.maxTemperature / 45) * 100))}
                      strokeColor={rack.maxTemperature >= 38 ? '#EF476F' : rack.maxTemperature >= 32 ? '#FFD166' : '#00F5D4'}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </div>

          {/* Cold Aisle Divider */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(0, 245, 212, 0.08)',
              border: '1px dashed rgba(0, 245, 212, 0.3)',
              borderRadius: 6,
              textAlign: 'center',
              color: '#00F5D4',
              fontSize: 12,
              letterSpacing: 1,
              fontWeight: 600,
              marginBottom: 24
            }}
          >
            ❄️ ENCLOSED COLD AISLE CONTAINMENT CORRIDOR (UNDERFLOOR PERFORATED TILES) ❄️
          </div>

          {/* Row B */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ClusterOutlined style={{ color: '#FFD166', fontSize: 18 }} />
              <strong style={{ color: '#F8F9FA', fontSize: 15 }}>ROW B — High-Density Accelerated Compute (Hotspot Zone)</strong>
              <Tag color="warning">Monitored Zone</Tag>
            </div>
            <Row gutter={[16, 16]}>
              {rowB.map(rack => (
                <Col key={rack.id} xs={24} sm={12} md={6}>
                  <div
                    style={{
                      backgroundColor: '#1C2541',
                      border: `1.5px solid ${rack.maxTemperature >= 38 ? '#EF476F' : rack.maxTemperature >= 32 ? '#FFD166' : '#00F5D4'}`,
                      borderRadius: 8,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ color: '#F8F9FA' }}>{rack.id}</strong>
                      <StatusBadge status={rack.thermalStatus} />
                    </div>
                    <div style={{ fontSize: 12, color: '#ADB5BD', marginBottom: 4 }}>
                      Max Temp: <strong style={{ color: '#F8F9FA' }}>{rack.maxTemperature}°C</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#ADB5BD', marginBottom: 8 }}>
                      Power: {rack.totalPowerKw} kW • {rack.servers?.length || 4} Nodes
                    </div>
                    <Progress
                      percent={Math.min(100, Math.round((rack.maxTemperature / 45) * 100))}
                      strokeColor={rack.maxTemperature >= 38 ? '#EF476F' : rack.maxTemperature >= 32 ? '#FFD166' : '#00F5D4'}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DataCenterOverview;
