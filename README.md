# TrafficVision AI

## Smart Traffic Prediction & Congestion Management System

TrafficVision AI is an AI-powered traffic prediction and congestion management platform designed to help traffic authorities and operators monitor traffic conditions, predict congestion levels, analyze traffic trends, manage alerts, perform route analysis, and generate intelligent traffic recommendations and reports.

The system combines real-time traffic data, historical traffic information, machine learning, interactive maps, analytics dashboards, and alert management into a centralized platform for smart traffic management.

---

## 1. Objective

The main objective of TrafficVision AI is to develop an intelligent traffic management platform that uses real-time and historical traffic data to monitor traffic conditions, predict congestion, analyze traffic patterns, and support better traffic management decisions.

The system provides:

- Live traffic monitoring
- Traffic congestion prediction
- Traffic history and trend analysis
- Route analysis and alternate route recommendations
- Congestion and accident notifications
- Interactive congestion heatmaps
- Traffic analytics dashboards
- AI-based traffic recommendations
- Traffic reports
- User and role management

The platform is designed to improve traffic monitoring, support transportation planning, and provide useful insights for smart city traffic management.

---

## 2. Project Outcomes

- Developed an AI-powered traffic prediction and congestion management platform
- Implemented authentication and role-based access control
- Built live traffic monitoring workflows
- Developed a Random Forest-based traffic congestion prediction model
- Implemented traffic history and trend analysis
- Built traffic alert and notification workflows
- Implemented congestion and accident notifications
- Developed analytics and congestion heatmap dashboards
- Implemented traffic route analysis
- Developed alternate route recommendation workflows
- Implemented traffic-aware travel time estimation
- Integrated TomTom Search, Traffic Flow, and Routing APIs
- Integrated OpenStreetMap/Nominatim for geographic information
- Generated AI-based traffic recommendations and traffic reports

---

## 3. Architecture Overview

```text
                    Users / Traffic Operators
                              |
                              v
                     React Web Application
                              |
                              v
                       Flask REST API
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
        PostgreSQL        TomTom APIs      AI/ML Model
         Database         Traffic/Route    Random Forest
             |                |                |
             +----------------+----------------+
                              |
                              v
                     Data Processing Layer
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
         Predictions       Analytics         Alerts
             |                |                |
             +----------------+----------------+
                              |
                              v
                   Recommendations & Reports
                              |
                              v
                       React Dashboard


Main System Workflow:
Traffic Data
     |
     v
Backend Processing
     |
     v
Database + AI Model
     |
     v
Prediction / Analytics
     |
     v
Alerts + Heatmaps + Trends
     |
     v
AI Recommendations & Reports
     |
     v
React Dashboard

Technology Stack:
Layer	Technology:
Frontend	-React.js 18
Frontend Build Tool	-Vite
UI Styling	-Tailwind CSS
Frontend Routing-	React Router
Charts-	Recharts
Maps	-React-Leaflet
Geographic Data-	OpenStreetMap / Nominatim
HTTP Client-	Axios
Backend-	Python / Flask
Authentication	-JWT / Flask-JWT-Extended
ORM	-Flask-SQLAlchemy
Password Security	-Flask-Bcrypt
Database-	PostgreSQL / SQLite
Machine Learning-	Scikit-learn
ML Algorithm-	Random Forest Classifier
Data Processing-	Pandas / NumPy
Traffic APIs-	TomTom Search / Traffic Flow / Routing
Containerization-	Docker / Docker Compose
Version Control	-Git / GitHub
Development Environment	-VS Code

Project Structure:
TrafficVision_Infosys_project/
|
+-- backend/
|   +-- app.py
|   +-- config.py
|   +-- extensions.py
|   +-- seed.py
|   +-- requirements.txt
|   |
|   +-- models/
|   |   +-- alert.py
|   |   +-- prediction.py
|   |   +-- report.py
|   |   +-- route.py
|   |   +-- settings.py
|   |   +-- traffic.py
|   |   +-- user.py
|   |
|   +-- routes/
|   |   +-- alerts.py
|   |   +-- analytics.py
|   |   +-- auth.py
|   |   +-- prediction.py
|   |   +-- profile.py
|   |   +-- reports.py
|   |   +-- routes_bp.py
|   |   +-- settings.py
|   |   +-- traffic.py
|   |   +-- users.py
|   |
|   +-- services/
|   |   +-- tomtom_service.py
|   |
|   +-- ml/
|   |   +-- generate_training_data.py
|   |   +-- train_model.py
|   |   +-- predictor.py
|   |   +-- training_data.csv
|   |   +-- traffic_model.pkl
|   |   +-- label_encoder.pkl
|   |   +-- feature_columns.json
|   |
|   +-- utils/
|       +-- decorators.py
|       +-- validators.py
|
+-- frontend/
|   +-- src/
|       +-- components/
|       +-- context/
|       +-- pages/
|       +-- routes/
|       +-- services/
|       +-- App.jsx
|       +-- main.jsx
|       +-- index.css
|
+-- database/
|   +-- schema.sql
|
+-- models/
|   +-- traffic_model.pkl
|   +-- label_encoder.pkl
|   +-- feature_columns.json
|
+-- docker-compose.yml
+-- .env.example
+-- .gitignore
+-- README.md

System Modules
6.1 User Management Module

The User Management module provides secure authentication and user administration.

Features include:

Admin authentication
Traffic operator login
JWT authentication
Role-based access control
User creation and management
User status management
Profile management
Password management
6.2 Traffic Monitoring Module

The Traffic Monitoring module provides information about current traffic conditions.

Features include:

Live traffic monitoring
Traffic flow information
Congestion level monitoring
Average speed
Vehicle/traffic information
Road-based traffic information
Traffic history
Interactive traffic map
6.3 Traffic Prediction Module

The Traffic Prediction module uses a machine learning model to predict traffic congestion.

A Random Forest Classifier developed using Scikit-learn is used for congestion-level classification.

The model uses traffic and environmental features such as:

Hour
Day of week
Month
Temperature
Rain
Snow
Cloud coverage
Vehicle count
Vehicle speed
Congestion percentage

The model classifies traffic conditions into:

Low
Moderate
Heavy

The prediction results are used in traffic analysis and AI-based recommendations.

6.4 Route Analysis Module

The Route Analysis module provides traffic-aware route calculation using the TomTom Routing API.

Features include:

Source and destination selection
Route calculation
Travel time estimation
Traffic-aware routing
Alternate route recommendations
Route comparison
Route history
Saved routes
6.5 Traffic Alert Module

The Traffic Alert module allows the system to identify and manage important traffic conditions.

Features include:

Traffic congestion alerts
Accident alerts
Roadwork alerts
Weather-related alerts
Alert severity
Alert status
Alert filtering
Alert resolution
Alert management
6.6 Analytics & Heatmap Module

The Analytics & Heatmap module converts traffic data into visual insights.

Features include:

Traffic statistics
Congestion summaries
Average speed analysis
Traffic volume analysis
High-congestion area identification
Interactive traffic heatmaps
Traffic analytics charts
Historical traffic insights
6.7 Traffic Trend Analysis Module

The Traffic Trend Analysis module analyzes historical traffic data over time.

It helps identify:

Traffic patterns
Peak traffic periods
Low traffic periods
Congestion trends
Average speed trends
Traffic volume changes

The results are displayed using charts and analytical summaries.

6.8 AI Recommendation & Report Module

The AI Recommendation and Report module combines machine learning predictions with traffic analytics.

The system considers:

Current traffic conditions
Congestion predictions
Traffic trends
Traffic volume
Average speed
Incident information
Route information

These results are used to generate useful traffic recommendations and reports.

7. AI / Machine Learning Workflow:
Traffic & Environmental Data
            |
            v
Data Preparation
            |
            v
Feature Selection
            |
            v
Random Forest Classifier
            |
            v
Congestion Prediction
            |
            v
Low / Moderate / Heavy
            |
            v
Traffic Analysis
            |
            v
AI Recommendations
            |
            v
Traffic Reports

The machine learning component uses Scikit-learn's Random Forest Classifier for congestion prediction.

The model is trained using traffic and environmental features and produces congestion classifications that are integrated into the application's prediction workflow.


Traffic Alert Workflow:
Traffic / Incident Data
          |
          v
Condition Detection
          |
          v
Congestion / Accident Identification
          |
          v
Alert Generation
          |
          v
Database Storage
          |
          v
Alert Dashboard
          |
          v
User Management / Resolution


Analytics Workflow:
Traffic Data
     |
     v
Historical Data Storage
     |
     v
Backend Analytics Processing
     |
     v
Traffic Metrics
     |
     v
Charts + Trends + Heatmap
     |
     v
Dashboard Visualization



Milestone-wise Implementation:

Milestone 1: Week 1 & 2
Project Initialization, Design Process & Core Setup

Implemented:

Project objectives and traffic workflows
System architecture
Database schema
Frontend and backend setup
Authentication system
Role-based access control
Live traffic monitoring
Congestion tracking workflows
Outcome

Established the project foundation with authentication, database connectivity, traffic monitoring, and congestion management.

Milestone 2: Week 3 & 4
Traffic Prediction & Route Optimization

Implemented:

Traffic prediction model
Congestion prediction
Traffic prediction history
Random Forest-based AI prediction
TomTom traffic API integration
Route calculation
Alternate route recommendations
Travel time estimation
Traffic-aware routing
Outcome

Developed a working traffic prediction and route analysis system using machine learning and traffic APIs.

Milestone 3: Week 5 & 6
Alerts, Analytics & AI Insights
Task 1 — Implement Traffic Alert System

Implemented an alert management workflow for monitoring and managing important traffic conditions.

Task 2 — Generate Congestion and Accident Notifications

Implemented notification generation for heavy congestion and accident-related traffic incidents.

Task 3 — Build Analytics & Heatmap Dashboard

Developed analytics dashboards with traffic statistics, charts, congestion summaries, high-congestion areas, and interactive heatmap visualization.

Task 4 — Develop Traffic Trend Analysis Workflow

Implemented historical traffic analysis to identify traffic patterns, congestion trends, peak periods, average speed changes, and traffic volume trends.

Task 5 — Generate AI-based Traffic Recommendations & Reports

Implemented AI-driven traffic insights using ML predictions, traffic analytics, trends, incidents, and route information to generate recommendations and reports.

Outcome

Completed the end-to-end alert, notification, analytics, heatmap, traffic trend, AI recommendation, and reporting workflows.

Milestone 4: Week 7 & 8
Testing, Deployment & Documentation

Planned activities include:

Application testing
Workflow validation
UI responsiveness improvements
Performance optimization
Final documentation
Project presentation
End-to-end project demonstration
Outcome

Final validation, documentation, presentation, and demonstration of the TrafficVision AI platform.

11. Evaluation Criteria

Milestone 1
Project initialization completed
System architecture and database setup completed
Authentication implemented
Traffic monitoring workflow implemented
Congestion tracking implemented


Milestone 2
Traffic prediction implemented
Congestion prediction implemented
Route analysis implemented
Alternate route recommendations implemented
Traffic APIs integrated
Travel time estimation implemented


Milestone 3
Traffic alert system implemented
Congestion and accident notifications implemented
Analytics dashboard implemented
Heatmap visualization implemented
Traffic trend analysis implemented
AI-based recommendations implemented
Traffic reports implemented


Milestone 4
Application testing completed
Workflow validation completed
UI optimization completed
Documentation prepared
Final presentation prepared
End-to-end demonstration completed


12. Setup
12.1 Database Setup

The project uses PostgreSQL.

Using Docker Compose:

docker compose up -d

Alternatively, an existing PostgreSQL server can be configured using the DATABASE_URL environment variable.

12.2 Backend Setup

Navigate to the backend:

cd backend

Create a virtual environment:

Windows
python -m venv venv
venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Create the environment file:

copy ..\.env.example ..\.env

Configure the required environment variables.

Run database seeding if required:

python seed.py

Start the Flask backend:

flask --app app run --port 5000


13. AI Model Setup

The project contains trained Random Forest model artifacts.

To regenerate the training data:

cd backend/ml
python generate_training_data.py

To train the model:

python train_model.py

The model generates:

traffic_model.pkl
label_encoder.pkl
feature_columns.json


14. TomTom API Configuration

Traffic and route-related features use TomTom APIs.

Configure the API key in .env:

TOMTOM_API_KEY=your_api_key

The system uses TomTom services for:

Search
Traffic Flow
Routing

The application reports a clear unavailable/not-configured state when the required API key is not configured instead of fabricating live traffic information.

15. Frontend Setup

Navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

The frontend uses Vite for development and communicates with the Flask REST API.

16. API Overview
Module	Main Functions
Authentication	Login, refresh token, logout, current user
Users	User creation, update, status and management
Traffic	Traffic search, current traffic, history and road data
Prediction	Congestion prediction and prediction history
Routes	Route calculation, saved routes and route history
Alerts	Create, read, resolve and delete alerts
Analytics	Dashboard summary, analytics and heatmap data
Reports	Traffic report generation and report data
Profile	User profile management
Settings	User and system settings


17. Testing Performed

The following areas were tested during development:

Backend application startup
API endpoint functionality
User authentication
JWT authentication flow
Role-based access control
Traffic data retrieval
Traffic prediction
Random Forest model prediction
Route calculation
Alert creation and management
Analytics dashboard
Heatmap visualization
Traffic history
Traffic trend analysis
Traffic reports
Frontend application build

The application was tested through local development workflows to validate the major system features.

18. Performance Metrics
Traffic Prediction
Congestion classification accuracy
Prediction confidence
Congestion detection performance
Analytics
Dashboard response time
Heatmap generation
Historical data processing
Chart rendering
System
API response time
Database query performance
Authentication performance
Frontend responsiveness


19. Current Scope & Limitations

The current implementation focuses on software-based traffic monitoring, prediction, analytics, alerts, route analysis, and AI recommendations.

Some features can be extended in future versions:

Real CCTV and traffic camera feeds
Larger real-world historical datasets
Advanced deep learning traffic prediction
PDF report generation
Cloud deployment
Real-time push notification services
Advanced traffic signal optimization
Large-scale traffic simulation

These extensions can be added as future improvements without changing the core TrafficVision AI architecture.

20. Future Enhancements

Future versions of TrafficVision AI can include:

Deep learning-based traffic forecasting
Real-time CCTV analysis
Computer vision-based vehicle detection
Automatic traffic signal optimization
Advanced accident detection
Mobile application
Cloud deployment
Large-scale real-time traffic prediction
Advanced AI traffic recommendations
Automated PDF report generation


21. Example Quantitative Goals
Traffic Monitoring: Generate useful real-time traffic and congestion monitoring insights.
Route Optimization: Provide reliable alternate route recommendations and travel time estimation.
Traffic Prediction: Predict congestion and peak traffic conditions using machine learning.
Analytics: Provide meaningful traffic trends, heatmaps, and historical insights.
Platform Performance: Provide stable traffic monitoring and analytics workflows.


22. Team Members
Asvitha J — asvitha.28csa@licet.ac.in
Barigala Shainy — shainysureshb@gmail.com
Maharshini — maharshini01@gmail.com
Pavan S — spavannalini29225@gmail.com
Hemamrutha M P — hemamruthamp2005@gmail.com
Shreya Samal — shreysamal101@gmail.com
Dibita Biswas — dibitabiswas4@gmail.com

23. Conclusion

TrafficVision AI provides an integrated platform for intelligent traffic monitoring and congestion management. By combining real-time traffic services, historical traffic data, machine learning, route analysis, alerts, analytics, heatmaps, trend analysis, and AI-based recommendations, the system provides a complete workflow for understanding and managing traffic conditions.

The project demonstrates the practical application of Artificial Intelligence, Machine Learning, web development, databases, external APIs, geographic visualization, and data analytics in smart traffic management.

