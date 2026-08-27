<div align="center">

# 🚦 TrafficVision AI

### Smart Traffic Prediction & Congestion Management System

*An AI-powered platform that turns raw traffic data into live monitoring, predictive insight, and actionable route intelligence.*

![Python](https://img.shields.io/badge/Backend-Flask-000000?logo=flask)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)
![ML](https://img.shields.io/badge/ML-Random_Forest-orange?logo=scikitlearn)
![Docker](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/status-active_development-brightgreen)

</div>

---

## 📑 Table of Contents

1. [Objective](#-1-objective)
2. [Project Outcomes](#-2-project-outcomes)
3. [Architecture Overview](#-3-architecture-overview)
4. [Technology Stack](#-4-technology-stack)
5. [Project Structure](#-5-project-structure)
6. [System Modules](#-6-system-modules)
7. [AI / ML Workflow](#-7-ai--machine-learning-workflow)
8. [Milestone-wise Implementation](#-8-milestone-wise-implementation)
9. [Evaluation Criteria](#-9-evaluation-criteria)
10. [Setup Guide](#-10-setup-guide)
11. [API Overview](#-11-api-overview)
12. [Testing Performed](#-12-testing-performed)
13. [Performance Metrics](#-13-performance-metrics)
14. [Scope, Limitations & Roadmap](#-14-scope-limitations--roadmap)
15. [Team](#-15-team)

---

## 🎯 1. Objective

TrafficVision AI is built to give traffic authorities and operators a **single control-room view** of city traffic — combining real-time feeds, historical patterns, and machine learning to answer three questions at once: *What's happening now? What's about to happen? What should we do about it?*

| Capability | What it delivers |
|---|---|
| 🛰️ Live Monitoring | Real-time traffic flow, speed, and congestion levels |
| 🔮 Congestion Prediction | ML-driven forecasts (Low / Moderate / Heavy) |
| 📊 Trend Analysis | Historical patterns, peak-hour detection |
| 🗺️ Route Intelligence | Traffic-aware routing & alternate route suggestions |
| 🚨 Alerting | Congestion, accident, roadwork & weather notifications |
| 🌡️ Heatmaps | Interactive visual congestion hotspots |
| 🤖 AI Recommendations | Synthesized insights and auto-generated reports |
| 🔐 Access Control | Role-based auth for admins & operators |

> **Insight:** The system's core value isn't any single feature — it's the *feedback loop* it closes: live data → prediction → alerting → analytics → recommendation, all feeding back into better-informed traffic decisions.

---

## ✅ 2. Project Outcomes

- ✅ AI-powered traffic prediction & congestion management platform
- ✅ JWT authentication with role-based access control
- ✅ Live traffic monitoring workflows
- ✅ Random Forest–based congestion prediction model
- ✅ Historical trend analysis engine
- ✅ Alert & notification pipeline (congestion + accidents)
- ✅ Analytics dashboards with congestion heatmaps
- ✅ Route analysis with alternate route recommendations
- ✅ Traffic-aware travel time estimation
- ✅ TomTom (Search, Traffic Flow, Routing) + OpenStreetMap/Nominatim integration
- ✅ AI-generated traffic recommendations and reports

---

## 🏗️ 3. Architecture Overview

The platform follows a **layered architecture**: a React client talks to a Flask API, which orchestrates data from PostgreSQL, external TomTom APIs, and an in-process ML model — then feeds unified results back to the dashboard.

```mermaid
flowchart TB
    U["👤 Users / Traffic Operators"] --> FE["🖥️ React Web Application"]
    FE --> API["⚙️ Flask REST API"]

    API --> DB[("🗄️ PostgreSQL Database")]
    API --> TT["🌐 TomTom APIs<br/>(Traffic / Routing / Search)"]
    API --> ML["🤖 AI/ML Model<br/>(Random Forest)"]

    DB --> DP["🔄 Data Processing Layer"]
    TT --> DP
    ML --> DP

    DP --> PR["📈 Predictions"]
    DP --> AN["📊 Analytics"]
    DP --> AL["🚨 Alerts"]

    PR --> RR["🤖 Recommendations & Reports"]
    AN --> RR
    AL --> RR

    RR --> DASH["📋 React Dashboard"]
```

### End-to-End Data Flow

```mermaid
flowchart LR
    A["Traffic Data"] --> B["Backend Processing"]
    B --> C["Database + AI Model"]
    C --> D["Prediction / Analytics"]
    D --> E["Alerts + Heatmaps + Trends"]
    E --> F["AI Recommendations & Reports"]
    F --> G["React Dashboard"]
```

> **Insight:** Notice the pipeline is unidirectional but **cyclical over time** — each new batch of traffic data re-triggers prediction, which reshapes alerts and analytics, which in turn reshapes the recommendations shown next cycle. This is what makes the dashboard feel "live" rather than static.

---

## 🧰 4. Technology Stack

<table>
<tr><th>Layer</th><th>Technology</th></tr>
<tr><td colspan="2"><b>Frontend</b></td></tr>
<tr><td>Framework</td><td>React.js 18</td></tr>
<tr><td>Build Tool</td><td>Vite</td></tr>
<tr><td>Styling</td><td>Tailwind CSS</td></tr>
<tr><td>Routing</td><td>React Router</td></tr>
<tr><td>Charts</td><td>Recharts</td></tr>
<tr><td>Maps</td><td>React-Leaflet</td></tr>
<tr><td>Geo Data</td><td>OpenStreetMap / Nominatim</td></tr>
<tr><td>HTTP Client</td><td>Axios</td></tr>
<tr><td colspan="2"><b>Backend</b></td></tr>
<tr><td>Framework</td><td>Python / Flask</td></tr>
<tr><td>Authentication</td><td>JWT / Flask-JWT-Extended</td></tr>
<tr><td>ORM</td><td>Flask-SQLAlchemy</td></tr>
<tr><td>Password Security</td><td>Flask-Bcrypt</td></tr>
<tr><td colspan="2"><b>Data & ML</b></td></tr>
<tr><td>Database</td><td>PostgreSQL / SQLite</td></tr>
<tr><td>Machine Learning</td><td>Scikit-learn</td></tr>
<tr><td>ML Algorithm</td><td>Random Forest Classifier</td></tr>
<tr><td>Data Processing</td><td>Pandas / NumPy</td></tr>
<tr><td colspan="2"><b>External Services</b></td></tr>
<tr><td>Traffic APIs</td><td>TomTom Search / Traffic Flow / Routing</td></tr>
<tr><td colspan="2"><b>DevOps</b></td></tr>
<tr><td>Containerization</td><td>Docker / Docker Compose</td></tr>
<tr><td>Version Control</td><td>Git / GitHub</td></tr>
<tr><td>IDE</td><td>VS Code</td></tr>
</table>

---

## 📂 5. Project Structure

```text
TrafficVision_Infosys_project/
│
├── backend/
│   ├── app.py                      # Flask entry point
│   ├── config.py                   # App configuration
│   ├── extensions.py               # Flask extensions init
│   ├── seed.py                     # DB seeding script
│   ├── requirements.txt
│   │
│   ├── models/                     # SQLAlchemy models
│   │   ├── alert.py
│   │   ├── prediction.py
│   │   ├── report.py
│   │   ├── route.py
│   │   ├── settings.py
│   │   ├── traffic.py
│   │   └── user.py
│   │
│   ├── routes/                     # API route blueprints
│   │   ├── alerts.py
│   │   ├── analytics.py
│   │   ├── auth.py
│   │   ├── prediction.py
│   │   ├── profile.py
│   │   ├── reports.py
│   │   ├── routes_bp.py
│   │   ├── settings.py
│   │   ├── traffic.py
│   │   └── users.py
│   │
│   ├── services/
│   │   └── tomtom_service.py       # TomTom API integration
│   │
│   ├── ml/                         # Machine learning pipeline
│   │   ├── generate_training_data.py
│   │   ├── train_model.py
│   │   ├── predictor.py
│   │   ├── training_data.csv
│   │   ├── traffic_model.pkl
│   │   ├── label_encoder.pkl
│   │   └── feature_columns.json
│   │
│   └── utils/
│       ├── decorators.py
│       └── validators.py
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── database/
│   └── schema.sql
│
├── models/                         # Deployed model artifacts
│   ├── traffic_model.pkl
│   ├── label_encoder.pkl
│   └── feature_columns.json
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🧩 6. System Modules

```mermaid
mindmap
  root((TrafficVision AI))
    User Management
      Authentication
      RBAC
      Profiles
    Traffic Monitoring
      Live flow
      Congestion levels
      Traffic history
    Traffic Prediction
      Random Forest
      Low/Moderate/Heavy
    Route Analysis
      TomTom Routing
      Alternate routes
      Travel time
    Traffic Alerts
      Congestion
      Accidents
      Roadwork/Weather
    Analytics & Heatmap
      Dashboards
      Hotspots
    Trend Analysis
      Peak periods
      Volume changes
    AI Recommendations
      Reports
```

### 6.1 👤 User Management Module
Secure authentication and administration.
- Admin & operator login · JWT authentication · Role-based access control
- User creation, status management & profile/password management

### 6.2 📡 Traffic Monitoring Module
Real-time visibility into current conditions.
- Live traffic flow, congestion level & average speed
- Road-based and vehicle-level traffic information
- Traffic history + interactive map view

### 6.3 🔮 Traffic Prediction Module
A **Random Forest Classifier** (Scikit-learn) predicts congestion using:

| Feature category | Fields |
|---|---|
| Temporal | Hour, Day of week, Month |
| Environmental | Temperature, Rain, Snow, Cloud coverage |
| Traffic | Vehicle count, Vehicle speed, Congestion percentage |

Output classes: **Low · Moderate · Heavy** — feeding directly into analytics and AI recommendations.

### 6.4 🗺️ Route Analysis Module
Traffic-aware routing powered by the TomTom Routing API.
- Source/destination selection · route calculation · travel time estimation
- Traffic-aware routing · alternate route recommendations · route comparison
- Route history & saved routes

### 6.5 🚨 Traffic Alert Module
Detects and manages significant traffic events.
- Congestion, accident, roadwork & weather-related alerts
- Severity & status tracking · filtering · resolution workflow

### 6.6 📊 Analytics & Heatmap Module

This module is the platform's "big picture" lens — instead of looking at one road at a time, it aggregates traffic data across the entire monitored network and turns it into visual, at-a-glance insight that a traffic operator can act on in seconds rather than minutes.

**What it does:**
- **Traffic statistics** — rolls up raw traffic records into summary numbers: average speed across the network, total vehicle volume, percentage of roads currently congested
- **Congestion summaries** — groups current conditions into Low / Moderate / Heavy buckets so operators instantly see the overall health of the network
- **Volume analysis** — tracks how many vehicles are passing through key roads/intersections over a given window
- **High-congestion area identification** — automatically flags the roads or zones with the worst conditions, so attention goes where it's needed first
- **Interactive heatmaps** — a color-coded map (green → yellow → red) overlaid on the road network, letting operators *see* congestion geographically instead of reading it off a table
- **Analytics charts & historical insights** — bar/line charts (via Recharts) summarizing conditions over custom time ranges

**Worked example:**

> An operator opens the dashboard at 6:00 PM. The heatmap immediately shows a red cluster along the **MG Road – Silk Board corridor**. The analytics panel confirms: average speed has dropped from 38 km/h to 11 km/h in the last 20 minutes, and volume is up 64% versus the same time last week. Because this is flagged as a **high-congestion area**, it's surfaced at the top of the dashboard rather than buried in a list — the operator can immediately cross-check it against the Alerts module to see if an accident is the cause, or just evening rush hour.

**Typical dashboard tiles:**

| Tile | Example Value | What it tells the operator |
|---|---|---|
| Network Average Speed | 24 km/h | Is traffic generally flowing or stalled? |
| Congested Roads (%) | 18% of monitored roads | How widespread is the slowdown? |
| Peak Congestion Zone | MG Road – Silk Board | Where to focus attention right now |
| Total Vehicle Volume (1h) | 42,300 vehicles | Is this a high-traffic period? |
| Heatmap | 🟢🟡🔴 color-graded map | Where congestion is concentrated geographically |

> **Insight:** The heatmap isn't just a prettier version of the stats table — color-encoded geography lets a human brain spot *clusters and spread* (e.g., "congestion is bleeding from Silk Board into the connecting roads") far faster than scanning numbers ever could. That pattern-recognition speed is the entire point of this module.

### 6.7 📈 Traffic Trend Analysis Module

While the Analytics module answers *"what's happening right now?"*, the Trend Analysis module answers *"what does 'normal' look like, and how are things changing over time?"* — it works by comparing current conditions against days, weeks, or months of stored historical traffic data.

**What it identifies:**
- **Traffic patterns** — recurring shapes in the data, e.g. a predictable congestion spike every weekday morning
- **Peak traffic periods** — the specific hours where volume and congestion consistently run highest (commonly 8–10 AM and 6–8 PM in urban corridors)
- **Low traffic periods** — quiet windows (e.g. late night or mid-morning) useful for planning roadwork or maintenance
- **Congestion trends** — whether a road is getting *better or worse* over weeks/months, not just today
- **Average speed trends** — long-term speed changes on a route, useful for spotting slow-building problems before they become critical
- **Traffic volume changes** — growth or decline in vehicle counts over time, e.g. after a new office complex opens nearby

**Worked example:**

> A city planner filters the Trend Analysis view for **Outer Ring Road** over the last 8 weeks. The chart shows average speed during the 6–8 PM peak has fallen from 32 km/h to 19 km/h, a steady week-over-week decline rather than a one-off spike. Cross-referencing volume data shows a 22% rise in vehicle counts over the same window. This trend — not any single day's snapshot — is what justifies flagging the corridor for a longer-term intervention (e.g. signal retiming or an alternate route campaign) rather than a one-off alert.

**Example trend outputs:**

| Metric | This Week | 4 Weeks Ago | Trend |
|---|---|---|---|
| Morning peak avg. speed | 21 km/h | 27 km/h | 📉 Declining |
| Evening peak start time | 5:40 PM | 6:10 PM | ⏪ Shifting earlier |
| Weekend volume | +12% vs. weekday | — | 📈 Rising |
| Congestion frequency (Heavy) | 5 days/week | 3 days/week | 📉 Worsening |

> **Insight:** A single congested moment could just be noise — an accident, bad weather, a one-off event. Trend analysis is what turns noise into *signal*: it's the difference between reacting to today's traffic jam and recognizing that a road needs structural attention because the same slowdown keeps recurring and getting worse.

### 6.8 🤖 AI Recommendation & Report Module
Synthesizes **predictions + analytics + trends + incidents + routes** into actionable recommendations and generated traffic reports.

---

## 🧠 7. AI / Machine Learning Workflow

```mermaid
flowchart TD
    A["Traffic & Environmental Data"] --> B["Data Preparation"]
    B --> C["Feature Selection"]
    C --> D["Random Forest Classifier"]
    D --> E["Congestion Prediction"]
    E --> F{"Low / Moderate / Heavy"}
    F --> G["Traffic Analysis"]
    G --> H["AI Recommendations"]
    H --> I["Traffic Reports"]
```

> **Insight:** Random Forest was chosen over deeper models for a reason worth calling out — it handles the *mixed* feature types here (categorical time fields + continuous weather/traffic fields) natively, trains fast on modest data, and stays interpretable enough to explain *why* a congestion level was predicted — important for an operational tool traffic staff need to trust.

### Traffic Alert Workflow

```mermaid
flowchart TD
    A["Traffic / Incident Data"] --> B["Condition Detection"]
    B --> C["Congestion / Accident Identification"]
    C --> D["Alert Generation"]
    D --> E[("Database Storage")]
    E --> F["Alert Dashboard"]
    F --> G["User Management / Resolution"]
```

### Analytics Workflow

```mermaid
flowchart TD
    A["Traffic Data"] --> B[("Historical Data Storage")]
    B --> C["Backend Analytics Processing"]
    C --> D["Traffic Metrics"]
    D --> E["Charts + Trends + Heatmap"]
    E --> F["Dashboard Visualization"]
```

---

## 🏁 8. Milestone-wise Implementation

```mermaid
gantt
    title TrafficVision AI — 8-Week Delivery Plan
    dateFormat  X
    axisFormat Week %s
    section Milestone 1
    Core Setup & Auth           :m1, 0, 2
    section Milestone 2
    Prediction & Routing        :m2, 2, 2
    section Milestone 3
    Alerts, Analytics, AI       :m3, 4, 2
    section Milestone 4
    Testing & Deployment        :m4, 6, 2
```

### Milestone 1 — Weeks 1–2 · Project Initialization, Design & Core Setup
- Project objectives & traffic workflows defined
- System architecture and database schema
- Frontend/backend scaffolding, authentication, RBAC
- Live traffic monitoring & congestion tracking workflows

**Outcome:** Foundation established — auth, DB connectivity, live monitoring, congestion tracking.

### Milestone 2 — Weeks 3–4 · Traffic Prediction & Route Optimization
- Random Forest-based traffic prediction model + history
- TomTom traffic API integration
- Route calculation, alternate routes, travel time estimation, traffic-aware routing

**Outcome:** Working ML-driven prediction and route analysis system.

### Milestone 3 — Weeks 5–6 · Alerts, Analytics & AI Insights

This milestone is where TrafficVision AI stops being a set of separate features and starts behaving like one intelligent system — detection feeds alerts, alerts and history feed analytics, and everything together feeds the final AI recommendation layer.

| Task | Milestone 3 Task |
|:---:|---|
| **Task 1** | Implement Traffic Alert System |
| **Task 2** | Generate Congestion & Accident Notifications |
| **Task 3** | Build Analytics & Heatmap Dashboard |
| **Task 4** | Develop Traffic Trend Analysis Workflows |
| **Task 5** | Generate AI-Based Traffic Recommendations & Reports |

```mermaid
flowchart LR
    T1["Task 1\nAlert System"] --> T2["Task 2\nNotifications"]
    T2 --> T3["Task 3\nAnalytics & Heatmap"]
    T3 --> T4["Task 4\nTrend Analysis"]
    T4 --> T5["Task 5\nAI Recommendations & Reports"]

    style T1 fill:#7f1d1d,color:#fff
    style T2 fill:#9a3412,color:#fff
    style T3 fill:#854d0e,color:#fff
    style T4 fill:#166534,color:#fff
    style T5 fill:#1e3a8a,color:#fff
```

> **Insight:** These five tasks aren't independent checkboxes — they form a **pipeline**. Alerts (Task 1) generate the raw event data that notifications (Task 2) push out. That same event data becomes part of the historical record analytics (Task 3) and trends (Task 4) draw on. Finally, Task 5 pulls from *all four* of the previous tasks to produce a recommendation — meaning Milestone 3's real deliverable is the wiring between tasks, not just the tasks themselves.

---

#### 🔴 Task 1 — Implement Traffic Alert System

Builds the core workflow that detects and manages significant traffic conditions across the network — the foundation every other task in this milestone depends on.

**What was implemented:**
- Detection logic for congestion, accidents, roadwork, and weather-related conditions
- Alert severity levels (e.g. Low / Medium / High / Critical)
- Alert status lifecycle: `Active → Acknowledged → Resolved`
- Filtering by road, severity, type, and time range
- Manual resolution workflow for traffic operators

```mermaid
stateDiagram-v2
    [*] --> Active: Condition detected
    Active --> Acknowledged: Operator reviews
    Acknowledged --> Resolved: Issue cleared
    Active --> Resolved: Auto-resolved
    Resolved --> [*]
```

**Example:** A sustained speed drop below 10 km/h on **Anna Salai** for more than 5 minutes automatically creates an alert with severity `High` and status `Active`, ready to be picked up by Task 2.

---

#### 🟠 Task 2 — Generate Congestion & Accident Notifications

Takes the alerts created in Task 1 and turns them into timely, human-readable notifications — the difference between data sitting in a database and information reaching the people who need it.

**What was implemented:**
- Notification generation rules for **heavy congestion** thresholds
- Notification generation rules for **accident-related** incidents
- De-duplication logic so the same event doesn't spam repeat notifications
- Notification payloads linked back to the originating alert record

```mermaid
sequenceDiagram
    participant D as Detection Engine
    participant A as Alert System (Task 1)
    participant N as Notification Generator (Task 2)
    participant O as Operator Dashboard

    D->>A: Congestion % exceeds threshold
    A->>A: Create alert (severity: High)
    A->>N: Trigger notification
    N->>N: Check for duplicate/recent alert
    N->>O: Push "Heavy congestion on X Road"
    O->>A: Acknowledge / Resolve
```

**Example:** Congestion crosses 85% on **Silk Board Junction** → Task 1 logs the alert → Task 2 immediately generates: *"⚠️ Heavy congestion detected — Silk Board Junction (85% congestion, avg. speed 8 km/h)."*

---

#### 🟡 Task 3 — Build Analytics & Heatmap Dashboard

Converts the growing pool of traffic and alert data into a visual control-room view — statistics, charts, and a color-graded map that let an operator understand network health in seconds.

**What was implemented:**
- Traffic statistics panel (avg. speed, volume, % congested roads)
- Congestion summaries grouped into Low / Moderate / Heavy
- High-congestion area identification
- Interactive heatmap (React-Leaflet) with color-coded overlays
- Analytics charts (Recharts) for time-based breakdowns

```mermaid
flowchart TB
    A["Traffic Records"] --> B["Aggregation Engine"]
    C["Alert Records (Task 1 & 2)"] --> B
    B --> D["Dashboard Stat Tiles"]
    B --> E["Congestion Heatmap"]
    B --> F["Analytics Charts"]
```

**Example dashboard snapshot:**

| Tile | Value |
|---|---|
| Network Avg. Speed | 24 km/h |
| Roads Congested | 18% |
| Peak Congestion Zone | MG Road – Silk Board |
| Heatmap | 🟢🟡🔴 color-graded overlay |

*(See [§6.6 Analytics & Heatmap Module](#66--analytics--heatmap-module) for the full walkthrough.)*

---

#### 🟢 Task 4 — Develop Traffic Trend Analysis Workflow

Looks backward across days and weeks of stored data to answer *"is this normal, or is something changing?"* — turning single data points into patterns operators and planners can act on.

**What was implemented:**
- Peak / low traffic period detection
- Congestion trend tracking (improving vs. worsening over time)
- Average speed trend tracking per road/corridor
- Traffic volume change detection
- Trend visualization via time-series charts

```mermaid
flowchart LR
    A["Historical Traffic Data"] --> B["Time-Window Aggregation"]
    B --> C["Pattern Detection"]
    C --> D["Peak/Low Periods"]
    C --> E["Congestion Trend"]
    C --> F["Speed Trend"]
    C --> G["Volume Trend"]
    D & E & F & G --> H["Trend Charts & Summaries"]
```

**Example:** Trend analysis on **Outer Ring Road** shows evening-peak average speed falling from 32 → 19 km/h over 8 weeks — a **worsening congestion trend** rather than a one-off spike.

*(See [§6.7 Traffic Trend Analysis Module](#67--traffic-trend-analysis-module) for the full walkthrough.)*

---

#### 🔵 Task 5 — Generate AI-Based Traffic Recommendations & Reports

The capstone task of Milestone 3 — combines everything upstream (predictions, live analytics, historical trends, and active incidents) into synthesized, human-readable recommendations and reports.

**What was implemented:**
- Recommendation engine combining ML predictions, analytics, and trend outputs
- Incident- and route-aware suggestion logic
- Auto-generated traffic reports summarizing conditions over a chosen period
- Report data structured for future PDF export (see [Roadmap](#-14-scope-limitations--roadmap))

```mermaid
flowchart TB
    P["🔮 ML Predictions"] --> R["AI Recommendation Engine"]
    AN["📊 Analytics (Task 3)"] --> R
    TR["📈 Trends (Task 4)"] --> R
    AL["🚨 Active Alerts (Task 1 & 2)"] --> R
    RT["🗺️ Route Data"] --> R
    R --> REC["Actionable Recommendation"]
    R --> REP["Traffic Report"]
```

**Example output:**

> *"Heavy congestion predicted on Silk Board Junction between 6:00–7:30 PM based on current trend and historical pattern. Recommend rerouting via Bannerghatta Road (est. 12 min faster). 3 related alerts active in this zone over the past 2 hours."*

**Outcome:** End-to-end alert, notification, analytics, heatmap, trend, and AI reporting workflows completed — the platform now closes the full loop from raw traffic data to an actionable, explainable recommendation.

### Milestone 4 — Weeks 7–8 · Testing, Deployment & Documentation
- Application testing & workflow validation
- UI responsiveness & performance optimization
- Final documentation, presentation, and end-to-end demo

**Outcome:** Fully validated, documented, and demonstrated TrafficVision AI platform.

---

## 📋 9. Evaluation Criteria

<details>
<summary><b>Milestone 1</b></summary>

- [x] Project initialization completed
- [x] System architecture and database setup completed
- [x] Authentication implemented
- [x] Traffic monitoring workflow implemented
- [x] Congestion tracking implemented
</details>

<details>
<summary><b>Milestone 2</b></summary>

- [x] Traffic prediction implemented
- [x] Congestion prediction implemented
- [x] Route analysis implemented
- [x] Alternate route recommendations implemented
- [x] Traffic APIs integrated
- [x] Travel time estimation implemented
</details>

<details>
<summary><b>Milestone 3</b></summary>

- [x] Traffic alert system implemented
- [x] Congestion and accident notifications implemented
- [x] Analytics dashboard implemented
- [x] Heatmap visualization implemented
- [x] Traffic trend analysis implemented
- [x] AI-based recommendations implemented
- [x] Traffic reports implemented
</details>

<details>
<summary><b>Milestone 4</b></summary>

- [ ] Application testing completed
- [ ] Workflow validation completed
- [ ] UI optimization completed
- [ ] Documentation prepared
- [ ] Final presentation prepared
- [ ] End-to-end demonstration completed
</details>

---

## ⚙️ 10. Setup Guide

### 10.1 Database Setup

Using Docker Compose:
```bash
docker compose up -d
```
Or configure an existing PostgreSQL server via the `DATABASE_URL` environment variable.

### 10.2 Backend Setup
```bash
cd backend

# Create virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
copy ..\.env.example ..\.env
# → configure the required environment variables

# Optional: seed the database
python seed.py

# Start the Flask backend
flask --app app run --port 5000
```

### 10.3 AI Model Setup

Trained Random Forest artifacts are included, but can be regenerated:
```bash
cd backend/ml
python generate_training_data.py   # rebuild training data
python train_model.py              # retrain the model
```
This produces:
- `traffic_model.pkl`
- `label_encoder.pkl`
- `feature_columns.json`

### 10.4 TomTom API Configuration

Traffic and routing features require a TomTom API key in `.env`:
```env
TOMTOM_API_KEY=your_api_key
```

Used for **Search**, **Traffic Flow**, and **Routing** services.

> **Design note:** If the API key is missing, the application surfaces a clear *"unavailable / not configured"* state rather than fabricating live traffic data — a deliberate reliability choice over a cosmetic one.

### 10.5 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on Vite and communicates with the Flask REST API.

---

## 🔌 11. API Overview

| Module | Main Functions |
|---|---|
| **Authentication** | Login, refresh token, logout, current user |
| **Users** | User creation, update, status and management |
| **Traffic** | Traffic search, current traffic, history, road data |
| **Prediction** | Congestion prediction and prediction history |
| **Routes** | Route calculation, saved routes, route history |
| **Alerts** | Create, read, resolve, delete alerts |
| **Analytics** | Dashboard summary, analytics, heatmap data |
| **Reports** | Traffic report generation and report data |
| **Profile** | User profile management |
| **Settings** | User and system settings |

---

## 🧪 12. Testing Performed

- Backend application startup & API endpoint functionality
- User authentication & JWT flow · role-based access control
- Traffic data retrieval & prediction (Random Forest model)
- Route calculation · alert creation and management
- Analytics dashboard · heatmap visualization
- Traffic history & trend analysis · traffic reports
- Frontend application build

> Testing was performed through local development workflows to validate the major system features end-to-end.

---

## 📈 13. Performance Metrics

| Area | Metrics Tracked |
|---|---|
| **Traffic Prediction** | Congestion classification accuracy · prediction confidence · detection performance |
| **Analytics** | Dashboard response time · heatmap generation time · historical data processing · chart rendering |
| **System** | API response time · database query performance · authentication performance · frontend responsiveness |

### Example Quantitative Goals

| Goal | Target Outcome |
|---|---|
| Traffic Monitoring | Generate useful real-time traffic & congestion insights |
| Route Optimization | Reliable alternate routes & travel time estimation |
| Traffic Prediction | Predict congestion & peak conditions via ML |
| Analytics | Meaningful trends, heatmaps, and historical insight |
| Platform Performance | Stable monitoring & analytics workflows |

---

## 🔭 14. Scope, Limitations & Roadmap

The current implementation focuses on **software-based** traffic monitoring, prediction, analytics, alerts, route analysis, and AI recommendations — without live camera feeds or physical infrastructure integration.

### Planned Future Enhancements

```mermaid
flowchart LR
    subgraph Now["✅ Current Scope"]
        A1[Software-based monitoring]
        A2[ML congestion prediction]
        A3[Route & alert workflows]
    end
    subgraph Next["🚀 Future Enhancements"]
        B1[Real CCTV / camera feeds]
        B2[Computer vision vehicle detection]
        B3[Deep learning forecasting]
        B4[Automatic signal optimization]
        B5[Mobile application]
        B6[Cloud deployment]
        B7[Real-time push notifications]
        B8[Automated PDF reports]
    end
    Now -.extends to.-> Next
```

These extensions are designed to layer onto the existing architecture **without requiring a redesign** of the core system.

---

## 👥 15. Team

| Name | Email |
|---|---|
| Asvitha J | asvitha.28csa@licet.ac.in |
| Barigala Shainy | shainysureshb@gmail.com |
| Maharshini | maharshini01@gmail.com |
| Pavan S | spavannalini29225@gmail.com |
| Hemamrutha M P | hemamruthamp2005@gmail.com |
| Shreya Samal | shreysamal101@gmail.com |
| Dibita Biswas | dibitabiswas4@gmail.com |

---

## 🏁 Conclusion

TrafficVision AI brings together **real-time traffic services, historical data, machine learning, route analysis, alerting, analytics, heatmaps, trend analysis, and AI-generated recommendations** into one coherent platform for understanding and managing traffic conditions.

It's a practical demonstration of how AI/ML, modern web development, relational databases, external APIs, geographic visualization, and data analytics come together to solve a real, everyday urban problem — **smarter, calmer traffic.**

</div>
