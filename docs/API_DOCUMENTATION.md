# ThermalMind: REST API Reference Documentation

All endpoints require JSON payloads and return JSON responses. Protected endpoints require an `Authorization: Bearer <TOKEN>` header.

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates an operator or administrator. Rate-limited to 30 requests per 15 minutes.

- **Request Body**:
```json
{
  "email": "operator@thermalmind.io",
  "password": "Operator@ThermalMind2026"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "670cfa12...",
    "name": "Ashburn Data Center Operator",
    "email": "operator@thermalmind.io",
    "role": "Operator"
  }
}
```

### `GET /api/auth/me`
Returns profile and permissions for the currently authenticated bearer token.

---

## 2. Dashboard Endpoints

### `GET /api/dashboard/summary`
Returns aggregate facility metrics, average temperatures, peak hotspot, active anomaly count, and Thermal Health Index.

### `GET /api/dashboard/trends`
Returns time-series telemetry buckets for line charts, rack comparison bars, and risk distribution pies.

---

## 3. Sensors & Data Engineering Endpoints

### `GET /api/sensors`
- **Query Params**: `page`, `limit`, `rackId`, `serverId`, `validationStatus`
- Returns paginated raw and sanitized sensor readings.

### `POST /api/sensors/ingest`
Ingests a single sensor reading through the validator pipeline.
- **Request Body**:
```json
{
  "timestamp": "2026-10-14T10:00:00Z",
  "rackId": "RACK-A01",
  "serverId": "SRV-A01-01",
  "temperature": 24.5,
  "humidity": 48.0,
  "cpuUtilization": 45.0,
  "powerWatts": 240,
  "fanSpeed": 52
}
```

### `POST /api/sensors/upload-csv`
Multipart form upload (`file` field). Ingests CSV batches, validates bounds, deduplicates collisions, and returns job statistics.

### `POST /api/sensors/simulator`
Controls the physics-based synthetic telemetry generator (Admin only).
- **Actions**: `start`, `stop`, `step`, `set_scenario`
- **Scenarios**: `NORMAL`, `GRADUAL_RISE`, `SUDDEN_SPIKE`, `HIGH_LOAD`, `COOLING_DEGRADATION`, `SENSOR_FAULT`.

---

## 4. AI Engineering Endpoints

### `GET /api/ai/forecasts`
Returns multi-horizon predictions (15m, 30m, 60m) with 95% confidence intervals.

### `POST /api/ai/forecast`
Runs live model inference on custom feature inputs (What-If simulation).
- **Request Body**:
```json
{
  "currentTemp": 27.5,
  "cpuUtilization": 75.0,
  "powerWatts": 350,
  "fanSpeed": 60
}
```

### `GET /api/ai/anomalies`
Returns detected statistical thermal anomalies with explainable feature evidence.

### `POST /api/ai/analyze`
Scans all 16 compute nodes across all 4 racks and evaluates anomalies, forecasts, and recommendations.

### `POST /api/ai/train`
Retrains the multi-horizon ridge regression models using chronological train/test split (Admin only).

---

## 5. Cooling Recommendations Endpoints

### `GET /api/recommendations`
Returns prescriptive operator guidance cards filtered by status (`Open`, `Acknowledged`, `Resolved`) or severity.

### `PATCH /api/recommendations/:id/status`
Updates lifecycle status of a recommendation.
- **Request Body**:
```json
{
  "status": "Resolved",
  "resolutionNotes": "Repositioned cold-aisle blanking panel and verified supply airflow."
}
```

---

## 6. Energy Analysis Endpoints

### `GET /api/energy/summary`
Returns instantaneous PUE, IT load (kW), cooling overhead (kW), and 24-hr derived energy in kWh.

### `GET /api/energy/history`
Returns time-series power by rack and temperature vs power scatter data.

---

## 7. Cloud, Security & Settings Endpoints

- `GET /api/cloud/status`: System health, DB mode, and AWS cloud readiness.
- `GET /api/health`: HTTP 200 health probe.
- `GET /api/security/status`: Cybersecurity posture and control verification matrix.
- `GET /api/security/audit-logs`: Searchable audit trail (Admin only).
- `GET /api/settings`: Current temperature thresholds and sensitivity parameters.
- `PATCH /api/settings`: Updates operational limits (Admin only).
