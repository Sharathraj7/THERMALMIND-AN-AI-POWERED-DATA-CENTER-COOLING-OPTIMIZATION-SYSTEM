# THERMALMIND: AN AI-POWERED DATA CENTER COOLING OPTIMIZATION SYSTEM

[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-28%2F28%20Passing-06D6A0?style=for-the-badge&logo=jest)](tests)
[![Vite Build](https://img.shields.io/badge/Vite%20Frontend-Production%20Build%20Ready-00F5D4?style=for-the-badge&logo=vite)](frontend)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-48CAE4?style=for-the-badge&logo=nodedotjs)](backend)
[![MongoDB](https://img.shields.io/badge/MongoDB-Dual--Mode%20Embedded%2FExternal-0077B6?style=for-the-badge&logo=mongodb)](backend)
[![Architecture](https://img.shields.io/badge/Architecture-Cloud--Ready%20%2F%20AWS-1C2541?style=for-the-badge&logo=amazonwebservices)](docs/AWS_DEPLOYMENT_GUIDE.md)

---

## 1. Project Overview

**ThermalMind** is an intelligent, full-stack data center monitoring and cooling optimization platform designed to solve one of the most critical challenges in modern cloud computing: **thermal hotspot escalation and cooling efficiency**.

By coupling physics-informed machine learning, statistical thermal anomaly detection, time-series data engineering pipelines, and cybersecurity controls, ThermalMind provides data center operators with actionable, explainable HVAC recommendations—without risking automated physical actuator overrides.

### Key Capabilities
- **Real-Time Thermal Monitoring**: 16 compute nodes across 4 high-density racks in an Ashburn, VA cloud facility.
- **Data Engineering Pipeline**: CSV batch ingestion, physical bounds validator, duplicate deduplication, and a 6-scenario physics-informed simulator.
- **Predictive AI Temperature Forecasting**: Multi-horizon forecasting (15m, 30m, 60m) using Multivariate Ridge Regression trained with chronological splits (15m MAE: 0.56°C, RMSE: 1.18°C).
- **Statistical Thermal Anomaly Detection**: 20-sample rolling baselines with Z-score outlier detection and physical heuristics (`CRITICAL_HOTSPOT`, `SUDDEN_SPIKE`, `COOLING_DEGRADATION`, `WORKLOAD_MISMATCH`).
- **Explainable AI (XAI)**: Full transparent evidence modals displaying empirical sensor features, baselines, and deviation rationale.
- **Cooling Optimization & Workflow**: Prescriptive HVAC guidance with operator lifecycle tracking (`Open` $\rightarrow$ `Acknowledged` $\rightarrow$ `Resolved`).
- **Energy Analysis**: PUE calculation, IT power vs. cooling power breakdown, and derived kWh energy integration.
- **Cloud Readiness & Security**: Zero-friction local deployment with auto-fallback to embedded MongoMemoryServer, transparent `Local Mode — AWS Not Configured` reporting, role-based access control, bcrypt hashing, and immutable audit logging.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **UI Design System**: Ant Design 5 (customized dark industrial palette) + Vanilla CSS
- **Charts & Visualization**: Recharts (multi-axis lines, stacked areas, bar comparisons, scatter plots, donut charts)
- **HTTP Client**: Axios (configured with JWT bearer interceptors and 401 handling)
- **Routing**: React Router 6 (protected routes and RBAC guards)

### Backend
- **Runtime**: Node.js + Express.js
- **Database & ODM**: MongoDB + Mongoose (supports external MongoDB or embedded in-memory fallback)
- **Security & Auth**: JSON Web Tokens (JWT), bcryptjs (10 salt rounds), Helmet security headers, Express-Rate-Limit
- **Validation**: Joi schema validation on all inputs and query parameters
- **ETL & Data Processing**: Custom physical bounds validator, CSV parsers, Multer for file uploads
- **Audit & Cloud**: Append-only structured audit logger, CloudWatch-ready metrics collector

---

## 3. Repository Structure

```
thermalmind/
├── backend/
│   ├── src/
│   │   ├── ai/                      # Multivariate Ridge Regression & Anomaly Detector
│   │   ├── audit/                   # Structured MongoDB audit logger
│   │   ├── cloud/                   # Cloud operations & AWS readiness manager
│   │   ├── config/                  # DB connection (Dual-mode) & env configs
│   │   ├── controllers/            # REST API controllers
│   │   ├── data-engineering/       # CSV ingestion, validator, & sensor simulator
│   │   ├── middleware/              # JWT auth, RBAC, rate limiting, error handlers
│   │   ├── models/                  # 12 Mongoose collections (User, Rack, Sensor, etc.)
│   │   ├── routes/                  # Express route definitions
│   │   ├── services/                # Cooling recommendation engine
│   │   └── validators/              # Joi request validation schemas
│   ├── tests/                       # 6 Jest test suites (28 passing unit/integration tests)
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                     # Axios API client with token interceptors
│   │   ├── components/              # Navbar, Sidebar, Layout, MetricCard, RiskTag, etc.
│   │   ├── contexts/                # AuthContext (JWT session state & RBAC)
│   │   ├── pages/                   # 13 Complete application views
│   │   ├── styles/                  # Custom industrial dark theme CSS
│   │   ├── App.jsx                  # Protected route configurations
│   │   └── main.jsx                 # React root with Ant Design dark theme tokens
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── nginx.conf
├── datasets/
│   ├── data_center_sensors_historical.csv  # 1,536-row historical telemetry dataset
│   └── sample_upload.csv                   # 50-row CSV for testing file upload
├── scripts/
│   ├── generateDataset.js           # Synthetic dataset generator
│   └── seedDatabase.js              # Database initialization & seed script
├── docs/
│   ├── ARCHITECTURE.md              # System architecture & Mermaid flowcharts
│   ├── AWS_DEPLOYMENT_GUIDE.md      # AWS ECS, S3, KMS, CloudWatch deployment guide
│   ├── AI_METHODOLOGY.md            # Regression math, train/test split, anomaly formulas
│   └── API_DOCUMENTATION.md         # Full REST API endpoint reference
├── docker-compose.yml               # Multi-container orchestration (Mongo, Backend, Frontend)
└── README.md                        # Project documentation & demonstration guide
```

---

## 4. Getting Started & Execution

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+
- Optional: MongoDB 7.0 (if not installed, the backend automatically uses an embedded in-memory MongoDB instance out of the box with zero setup)

### Step 1: Install Dependencies
```bash
# In the root project directory:
npm run install:all
```
*(Or install individually: `cd backend && npm install`, then `cd ../frontend && npm install`)*

### Step 2: Seed the Database
```bash
# Initialize demo accounts, facility topology, historical telemetry, and ML models:
npm run seed
```

### Step 3: Run the Application
You can run backend and frontend concurrently or in separate terminals:

**Terminal 1 (Backend API - Port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend React App - Port 5173):**
```bash
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 5. Sample Demonstration Accounts

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Lead Administrator** | `admin@thermalmind.io` | `Admin@ThermalMind2026` | Full system control, threshold tuning, simulator controls, model retraining, audit inspection |
| **Data Center Operator** | `operator@thermalmind.io` | `Operator@ThermalMind2026` | Telemetry inspection, AI forecast review, alert acknowledgment & resolution |

*(The login screen also includes convenient single-click demo credential fillers)*

---

## 6. End-to-End Demonstration Walkthrough

Follow this step-by-step workflow during project demonstrations:

1. **Sign In**: Navigate to `http://localhost:5173/login`, click **Lead Administrator**, and sign in.
2. **Main Dashboard (`/dashboard`)**:
   - Inspect the **Thermal Health Index** (gauge).
   - Observe real-time temperature trends and peak hotspot nodes.
   - Click **Run AI Thermal Scan** to execute on-demand facility-wide anomaly detection.
3. **Data Engineering (`/data-engineering`)**:
   - Review total ingested records and duplicate statistics.
   - In the **Sensor Telemetry Simulator**, switch the scenario to **"Sudden Thermal Spike"** or **"Cooling System Degradation"** and click **Generate 1 Tick**.
   - Test CSV ingestion by dragging `datasets/sample_upload.csv` into the upload box.
4. **AI Temperature Forecasting (`/ai-forecasting`)**:
   - Review chronological train/test split metrics (15m MAE: 0.56°C, 30m MAE: 0.59°C, 60m MAE: 0.86°C).
   - Adjust the **What-If Scenario Simulator** sliders (Initial Temp, CPU Load, Power, Fan Speed) and watch the multi-horizon trajectory update in real time.
5. **Thermal Anomaly Detection (`/anomalies`)**:
   - Locate the detected anomaly (e.g. `ANOM-...` on `SRV-B02-03`).
   - Click **View Evidence** to inspect the **Explainable AI (XAI)** modal showing the 20-sample rolling baseline, Z-score, and feature deviations.
6. **Cooling Guidance (`/recommendations`)**:
   - Review prescriptive operator guidance for the active hotspot.
   - Click **Acknowledge** to mark the alert as under investigation.
   - Click **Resolve Alert**, enter investigation notes (e.g. *"Inspected cold-aisle containment and adjusted perforated damper"*), and confirm.
7. **Energy Analysis (`/energy`)**:
   - Inspect instantaneous and 24-hour PUE (typically 1.34).
   - Review the mathematical integration formula used for derived kWh energy consumption.
   - Analyze the Temperature vs. Power and CPU vs. Power scatter correlations.
8. **Cloud Operations (`/cloud`)**:
   - Observe runtime health, memory usage, and database connection state.
   - Verify that the cloud readiness module displays **`Local Mode — AWS Not Configured`** (confirming that no fabricated cloud infrastructure is claimed).
9. **Cybersecurity & Audit Logs (`/security` and `/audit`)**:
   - Inspect the **Cybersecurity Defense Verification Matrix** on the Security Overview page.
   - Navigate to **Audit Trail** to see the immutable log entry recording your login, threshold changes, and alert resolution!

---

## 7. Automated Test Suite Results

The project includes an automated test suite executed with Jest and Supertest.

Run all tests from the backend directory:
```bash
cd backend
npm test
```

### Verified Test Suites:
- `tests/dataValidation.test.js`: Validates physical bounds (-10°C to 100°C), rejects missing mandatory fields, detects invalid timestamps, and flags suspect readings.
- `tests/auth.test.js`: Tests valid logins, invalid credentials, JWT token verification, and Role-Based Access Control (RBAC).
- `tests/aiForecasting.test.js`: Tests analytical Ridge regression model fitting, multi-horizon predictions (15m, 30m, 60m), and confidence interval bands.
- `tests/anomalyDetection.test.js`: Tests critical hotspot detection (38°C ceiling), sudden rate-of-rise spikes, and normal reading passes.
- `tests/recommendations.test.js`: Tests recommendation synthesis, operator acknowledgment, resolution notes, and status transitions.
- `tests/endToEnd.test.js`: Tests the complete end-to-end integration flow from authentication to sensor ingestion, anomaly detection, recommendation lifecycle, and audit trail.

**Test Summary**: `6 passed, 6 total | 28 passed, 28 total (100% Passing)`

---

## 8. Limitations & Future Roadmap

- **Physical Actuator Integration**: In accordance with enterprise safety standards, ThermalMind generates advisory recommendations for human operator review and does not automatically send override signals to physical Modbus or BACnet chiller controllers.
- **AWS Cloud Credentials**: The system defaults to Local Demonstration Mode. Real AWS services (S3, CloudWatch, KMS) can be enabled by supplying valid credentials in `.env` as documented in `docs/AWS_DEPLOYMENT_GUIDE.md`.
- **Future Enhancements**: Deep Reinforcement Learning (DRL) for predictive chiller setpoint optimization, CFD (Computational Fluid Dynamics) thermal contour modeling, and OpenTelemetry instrumentation.
