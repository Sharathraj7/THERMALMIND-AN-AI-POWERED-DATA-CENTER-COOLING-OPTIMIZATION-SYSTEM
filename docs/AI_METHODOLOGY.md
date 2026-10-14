# ThermalMind: Artificial Intelligence & Machine Learning Methodology

## 1. Mathematical Formulation of Temperature Forecasting

Temperature forecasting in data center racks is modeled as a multi-variate dynamic system balancing IT equipment Joule heating against convective heat removal by CRAC/CRAH air handlers.

### 1.1 Physical Thermodynamic Equilibrium

The rate of temperature change of a compute node chassis is given by the lumped capacitance thermal model:

$$C_{\text{th}} \frac{dT}{dt} = \dot{Q}_{\text{in}} - \dot{Q}_{\text{out}}$$

Where:
- $\dot{Q}_{\text{in}} \approx P_{\text{server}} = P_{\text{idle}} + \alpha \cdot \text{CPU}_{\text{util}}$ (Electrical power converted to heat)
- $\dot{Q}_{\text{out}} = \dot{m} c_p (T_{\text{exhaust}} - T_{\text{supply}}) \propto \text{Fan}_{\text{RPM}} \cdot \kappa_{\text{cooling}}$ (Heat extracted by airflow)
- $C_{\text{th}}$ is the thermal capacity (thermal inertia) of the chassis and heat sinks.

---

## 2. Multivariate Ridge Regression Model

To predict future temperature $y \in \mathbb{R}$ at horizon $h \in \{15, 30, 60\}$ minutes, we construct a feature vector $\mathbf{x} \in \mathbb{R}^d$:

$$\mathbf{x} = \begin{bmatrix} 1 \\ T_t \\ \frac{dT}{dt}_{10m} \\ \text{CPU}_{\text{util}} \\ \frac{P_{\text{watts}}}{100} \\ \frac{\text{Fan}_{\text{RPM}}}{10} \\ \frac{\text{Humidity}}{10} \end{bmatrix}$$

### 2.1 Optimization Objective & Closed-Form Normal Equation

We minimize the penalized sum of squared errors ($L_2$ Ridge regularization):

$$J(\mathbf{w}) = \frac{1}{2N} \sum_{i=1}^N (y_i - \mathbf{w}^T \mathbf{x}_i)^2 + \frac{\lambda}{2} \|\mathbf{w}_{1:d}\|^2$$

The analytical closed-form solution is solved via Gauss-Jordan matrix inversion:

$$\mathbf{w}^* = (\mathbf{X}^T \mathbf{X} + \lambda \mathbf{I})^{-1} \mathbf{X}^T \mathbf{y}$$

Where:
- $\mathbf{X} \in \mathbb{R}^{N \times d}$ is the feature design matrix.
- $\mathbf{y} \in \mathbb{R}^N$ is the target temperature vector.
- $\lambda = 0.25$ is the $L_2$ regularization coefficient preventing multicollinearity between CPU and power.

### 2.2 Chronological Train/Test Partitioning

To avoid temporal data leakage (lookahead bias), data is split **chronologically**:
- **Training Set (80%)**: Earlier 1,203 time-series samples.
- **Testing Set (20%)**: Subsequent 301 time-series samples.

### 2.3 Evaluation Metrics

The forecasting accuracy is evaluated using Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE):

$$\text{MAE} = \frac{1}{N_{\text{test}}} \sum_{i=1}^{N_{\text{test}}} |y_i - \hat{y}_i|$$

$$\text{RMSE} = \sqrt{\frac{1}{N_{\text{test}}} \sum_{i=1}^{N_{\text{test}}} (y_i - \hat{y}_i)^2}$$

Empirical results from the baseline historical training:
- **15-Minute Horizon**: MAE = **0.56°C**, RMSE = **1.18°C**
- **30-Minute Horizon**: MAE = **0.59°C**, RMSE = **1.24°C**
- **60-Minute Horizon**: MAE = **0.86°C**, RMSE = **1.74°C**

---

## 3. Statistical Anomaly Detection & Explainability

### 3.1 Rolling Statistical Baseline

For each compute node, a rolling window of $N=20$ valid historical telemetry readings computes the localized mean $\mu$ and sample standard deviation $\sigma$:

$$\mu = \frac{1}{N} \sum_{j=1}^N T_j, \quad \sigma = \sqrt{\frac{1}{N-1} \sum_{j=1}^N (T_j - \mu)^2}$$

### 3.2 Z-Score Standard Deviation Test

The anomaly score is evaluated as the standardized distance:

$$Z = \frac{T_{\text{observed}} - \mu}{\sigma}$$

### 3.3 Rule-Based Physical Heuristics

1. **`CRITICAL_HOTSPOT`**: $T_{\text{observed}} \ge 38.0^\circ\text{C}$ (ASHRAE allowable threshold breach).
2. **`SUDDEN_SPIKE`**: $\Delta T \ge 4.5^\circ\text{C}$ over consecutive monitoring intervals.
3. **`COOLING_DEGRADATION`**: $\text{Fan} \ge 88\% \land T_{\text{observed}} \ge 32.0^\circ\text{C} \land (T_{\text{observed}} - \mu) > 3.0^\circ\text{C}$.
4. **`WORKLOAD_MISMATCH`**: $T_{\text{observed}} \ge 29.5^\circ\text{C} \land \text{CPU} < 25\% \land (T_{\text{observed}} - \mu) > 3.5^\circ\text{C}$.
5. **`PERSISTENT_HIGH`**: $Z \ge 2.2 \sigma$.
