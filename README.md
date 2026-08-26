# TrafficVision AI

### Smart Traffic Prediction & Congestion Management System

An AI-powered platform for city authorities and traffic operators to monitor live traffic,
predict congestion with a trained Random Forest model, plan traffic-aware routes, manage
alerts, and generate analytics reports — anywhere in the world, not just one city.

---

## 1. What's real vs. what needs your setup

Everything in this repo is a working implementation, not a mockup:

- **Backend** — Flask REST API, SQLAlchemy models, JWT auth with role-based access, all
  wired to real database queries (no mocked responses).
- **Database** — PostgreSQL schema (`database/schema.sql`), auto-created by SQLAlchemy on
  first run. Includes 10 days of seeded demo history so the dashboard isn't empty.
- **AI model** — a real `RandomForestClassifier` (`backend/ml/train_model.py`) trained on a
  synthetic-but-realistic traffic dataset (hour/day/month/weather/volume → congestion level),
  achieving ~77–85% test accuracy. **Swap in your real historical `traffic_history` export
  and re-run `train_model.py` to train on real data once you have some.**
- **TomTom integration** — `backend/services/tomtom_service.py` makes real calls to the
  Search, Traffic Flow, and Routing APIs. It requires **your own TomTom API key**
  (free tier at https://developer.tomtom.com/). Until a key is set, the app clearly reports
  "unavailable" rather than fabricating live traffic numbers.
- **Frontend** — React app styled to match the provided dark dashboard reference, with every
  button wired to a real API call (search, predict, save, add user, resolve alert, etc.).

**Two things you need to do yourself**, since I can't do them from this chat:
1. Run `docker compose up -d` (or your own Postgres instance) — see below.
2. Get a TomTom API key and put it in `.env` — Live Monitoring and Route Analysis will show
   a clear "not configured" message until you do.

---

## 2. Architecture

```
React (Vite) ──► Flask REST API ──► PostgreSQL
                        │
                        ├──► TomTom Search / Traffic / Routing APIs
                        └──► Random Forest model (scikit-learn)
```

- **Live data** → TomTom Traffic API (real-time flow/congestion)
- **Historical data** → PostgreSQL `traffic_history` table
- **Predictions** → the trained Random Forest model — never presented as live/current traffic

---

## 3. Tech stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18, Vite, Tailwind CSS, React Router, Recharts, React-Leaflet, Axios |
| Backend   | Python, Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-Bcrypt |
| Database  | PostgreSQL |
| AI/ML     | scikit-learn (Random Forest), pandas, NumPy |
| External  | TomTom Search / Traffic / Routing APIs |

---

## 4. Project structure

```
TrafficVision_AI/
├── backend/
│   ├── app.py                 # Flask app factory + blueprint registration
│   ├── config.py               # Env-based config (requires DATABASE_URL)
│   ├── extensions.py           # db, jwt, bcrypt, cors singletons
│   ├── seed.py                 # Creates admin/operator accounts + demo data
│   ├── requirements.txt
│   ├── models/                 # SQLAlchemy models (User, Road, TrafficData, ...)
│   ├── routes/                 # Blueprints: auth, users, traffic, prediction,
│   │                           #   routes_bp, alerts, analytics, profile, settings
│   ├── services/
│   │   └── tomtom_service.py   # Search / Traffic / Routing API wrapper
│   ├── ml/
│   │   ├── generate_training_data.py
│   │   ├── train_model.py      # Trains + saves the Random Forest model
│   │   └── predictor.py        # Loads model, exposes predict_congestion()
│   └── utils/                  # role-based decorators, validators
├── frontend/
│   └── src/
│       ├── pages/               # Login, Dashboard, LiveMonitoring, TrafficPrediction,
│       │                       #   RouteAnalysis, Alerts, TrafficHistory, Reports,
│       │                       #   UsersRoles, SystemSettings, Profile
│       ├── components/          # Sidebar, Header, Layout, StatCard, CongestionBadge
│       ├── context/AuthContext.jsx
│       ├── services/api.js      # Axios instance with JWT refresh interceptor
│       └── routes/ProtectedRoute.jsx
├── models/                      # Trained model artifacts (traffic_model.pkl, etc.)
├── database/schema.sql          # Reference SQL schema
├── docker-compose.yml           # Postgres container
├── .env.example
└── README.md
```

---

## 5. Setup

### 5.1 Database (PostgreSQL)

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with database `trafficvision_ai`, user/password
`trafficvision`/`trafficvision` (matches `.env.example`). Using your own existing Postgres
server instead is fine — just point `DATABASE_URL` at it.

### 5.2 Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example ../.env
# edit ../.env: set TOMTOM_API_KEY once you have one, change SECRET_KEY/JWT_SECRET_KEY

python seed.py        # creates tables + admin/operator accounts + demo history
flask --app app run --port 5000
```

Demo accounts created by `seed.py`:
- **Admin:** `admin@trafficvision.ai` / `Admin@12345`
- **Traffic Operator:** `operator@trafficvision.ai` / `Operator@12345`

### 5.3 AI model (already trained — retrain only if you want to)

```bash
cd backend/ml
python generate_training_data.py   # regenerate the synthetic dataset (optional)
python train_model.py              # retrains and overwrites the .pkl files
cp traffic_model.pkl label_encoder.pkl feature_columns.json ../../models/
```

### 5.4 TomTom API key

1. Create a free account at https://developer.tomtom.com/
2. Generate an API key with Search, Traffic, and Routing enabled
3. Put it in `.env` as `TOMTOM_API_KEY=...`
4. Restart the Flask server

Until this is set, Live Monitoring and Route Analysis will show a clear
"not configured" message — the app never fabricates live traffic numbers.

### 5.5 Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to `http://localhost:5000`.

---

## 6. API overview

All endpoints are under `/api` and (except `/auth/login`, `/auth/register`) require a
`Authorization: Bearer <token>` header.

| Area       | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me` |
| Users      | `GET/POST /users`, `PUT/DELETE /users/:id`, `PATCH /users/:id/status` (admin only) |
| Traffic    | `GET /traffic/search`, `GET /traffic/live`, `PUT /traffic/update/:roadId`, `GET /traffic/current`, `GET /traffic/history`, `GET /traffic/roads` |
| Prediction | `POST /prediction/predict`, `GET /prediction/history`, `GET /prediction/next-24h` |
| Routes     | `POST /routes/calculate`, `GET /routes/history`, `GET /routes/saved`, `PATCH /routes/:id/save` |
| Alerts     | `GET/POST /alerts`, `PATCH /alerts/:id/read`, `PATCH /alerts/:id/resolve`, `DELETE /alerts/:id` |
| Analytics  | `GET /analytics/summary`, `/analytics/dashboard`, `/analytics/heatmap` |
| Profile    | `GET/PUT /profile` |
| Settings   | `GET/PUT /settings/user`, `GET/PUT /settings/system` (admin only) |

---

## 7. Testing performed

Before delivery, the following was verified by actually running the app (not just reading
the code):

- ✅ Backend imports and starts cleanly (`app.py` compiles, 40 routes registered)
- ✅ `seed.py` creates the database schema, admin/operator accounts, and 10 days of demo history
- ✅ Login returns a valid JWT; `/auth/me` resolves the authenticated user
- ✅ `POST /prediction/predict` calls the real trained Random Forest model and returns a
  congestion class + confidence (verified against a rush-hour + rain scenario → correctly
  predicted "heavy" congestion at 82% confidence)
- ✅ `/analytics/dashboard`, `/users`, `/traffic/history`, `/alerts` all return real data
  from the seeded database
- ✅ TomTom-dependent endpoints correctly return `503 TOMTOM_NOT_CONFIGURED` (not fake data)
  when no API key is present
- ✅ `npm run build` compiles the full React app with no errors

**Not yet tested against a live TomTom key or a real deployed PostgreSQL/cloud
environment**, since those require credentials only you can provide. Once you add your
TomTom key and point `DATABASE_URL` at your Postgres instance, re-run the flows in
Section 5 to confirm end-to-end.

---

## 8. Notes on scope

A few things were intentionally simplified versus the original spec, and are easy follow-ups:

- **Report export** ships as CSV, not PDF. Adding PDF export (e.g. with `reportlab` or
  `weasyprint` on the backend) is a natural next step if you need it.
- **Docker/cloud deployment** (AWS/Azure) is not included — `docker-compose.yml` currently
  only containerizes Postgres. A `Dockerfile` for the Flask app and a build step for the
  React app would be needed for full containerized deployment.
- **CCTV/traffic camera feeds** mentioned in the UI reference are represented as UI space
  but not wired to a real camera/video source, since none was provided.
- **2FA** is a stored toggle in Settings; actual TOTP/SMS verification isn't implemented.

None of these affect the core flow: search → live traffic → save → history → predict →
alert → report, which is fully wired end-to-end.
