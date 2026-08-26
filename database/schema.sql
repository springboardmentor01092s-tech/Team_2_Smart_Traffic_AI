-- TrafficVision AI - reference schema (SQLAlchemy's db.create_all() generates
-- this automatically from backend/models/*.py; this file is provided for
-- manual inspection / DBA review).

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'traffic_operator',
    phone VARCHAR(30),
    department VARCHAR(120),
    assigned_area VARCHAR(120) DEFAULT 'All Locations',
    avatar_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(255),
    city VARCHAR(120),
    state VARCHAR(120),
    country VARCHAR(120),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    tomtom_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_roads_city_state ON roads(city, state);

CREATE TABLE IF NOT EXISTS traffic_data (
    id SERIAL PRIMARY KEY,
    road_id INTEGER NOT NULL REFERENCES roads(id),
    vehicle_count INTEGER NOT NULL DEFAULT 0,
    average_speed DOUBLE PRECISION NOT NULL DEFAULT 0,
    free_flow_speed DOUBLE PRECISION,
    congestion_level VARCHAR(20) NOT NULL DEFAULT 'low',
    congestion_percent DOUBLE PRECISION DEFAULT 0,
    incidents_count INTEGER DEFAULT 0,
    weather_condition VARCHAR(60),
    source VARCHAR(20) DEFAULT 'manual',
    recorded_by_id INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traffic_history (
    id SERIAL PRIMARY KEY,
    road_id INTEGER NOT NULL REFERENCES roads(id),
    vehicle_count INTEGER NOT NULL DEFAULT 0,
    average_speed DOUBLE PRECISION NOT NULL DEFAULT 0,
    congestion_level VARCHAR(20) NOT NULL,
    congestion_percent DOUBLE PRECISION DEFAULT 0,
    incidents_count INTEGER DEFAULT 0,
    weather_condition VARCHAR(60),
    recorded_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_history_road_time ON traffic_history(road_id, recorded_at);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    road_id INTEGER REFERENCES roads(id),
    alert_type VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    location_name VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_read BOOLEAN DEFAULT FALSE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    road_id INTEGER REFERENCES roads(id),
    requested_by_id INTEGER REFERENCES users(id),
    hour INTEGER,
    day_of_week INTEGER,
    month INTEGER,
    temperature DOUBLE PRECISION,
    rain DOUBLE PRECISION,
    snow DOUBLE PRECISION,
    clouds DOUBLE PRECISION,
    vehicle_count INTEGER,
    predicted_congestion VARCHAR(20),
    confidence DOUBLE PRECISION,
    estimated_delay_min DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    origin_name VARCHAR(255),
    origin_lat DOUBLE PRECISION,
    origin_lng DOUBLE PRECISION,
    destination_name VARCHAR(255),
    destination_lat DOUBLE PRECISION,
    destination_lng DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    travel_time_min DOUBLE PRECISION,
    traffic_delay_min DOUBLE PRECISION,
    route_summary_json JSONB,
    is_saved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(20) DEFAULT 'en-US',
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_alerts BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    map_provider VARCHAR(20) DEFAULT 'tomtom',
    two_factor_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value VARCHAR(255),
    updated_at TIMESTAMP DEFAULT now()
);
