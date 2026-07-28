# TrafficVision AI: Smart Traffic Prediction & Congestion Management System

TrafficVision AI is an AI-powered traffic prediction and congestion management platform designed to help city authorities monitor live traffic conditions, predict congestion levels, and optimize traffic flow.

## Features
- **User Authentication**: Secure login and registration with password hashing (Bcrypt).
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full access to dashboard and user management.
  - **Traffic Operator**: Can view dashboard and update live traffic data.
  - **Public User**: Read-only access to the dashboard.
- **Real-time Dashboard**:
  - Statistics cards for total roads, congestion levels, and active alerts.
  - Live traffic data table.
  - Interactive charts using Chart.js.
  - Recent alerts panel.
- **Sample Data**: Automatically seeds sample traffic data and alerts on first run.

## Technology Stack
- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, Bootstrap 5, JavaScript
- **Database**: SQLite (No installation required)
- **ORM**: SQLAlchemy
- **Authentication**: Flask-Login + Flask-Bcrypt
- **Charts**: Chart.js

## Project Structure
```text
TrafficVision_AI/
│── app.py              # Main application entry point
│── config.py           # Configuration settings
│── models.py           # Database models
│── requirements.txt    # Python dependencies
│── README.md           # Project documentation
│── trafficvision.db    # SQLite database (created on first run)
│
├── routes/
│     ├── auth.py       # Authentication routes
│     ├── dashboard.py  # Dashboard and data management routes
│
├── templates/          # HTML templates
│     ├── base.html
│     ├── login.html
│     ├── register.html
│     ├── dashboard.html
│     └── manage_users.html
│
└── static/             # Static assets
      ├── css/
      │      style.css
      └── js/
             dashboard.js
```

## Setup and Installation

1. **Extract the project**
   ```bash
   unzip TrafficVision_AI.zip
   cd TrafficVision_AI
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the application**
   Open your browser and navigate to `http://127.0.0.1:5000`

## Default Users (for testing)
You can register new users through the UI and select their roles.
- **Admin**: Register a user and select 'Admin' role.
- **Operator**: Register a user and select 'Traffic Operator' role.
- **Public**: Register a user and select 'Public User' role.

---
Developed for city traffic optimization and management.
