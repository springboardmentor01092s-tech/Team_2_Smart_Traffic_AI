from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models import db, User, TrafficData, Alert
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__)

def seed_data():
    if TrafficData.query.first() is None:
        # Roads data
        roads = [
            TrafficData(road_name="Broadway St", vehicle_count=120, avg_speed=35.5, congestion_level="Moderate"),
            TrafficData(road_name="Main Avenue", vehicle_count=45, avg_speed=55.0, congestion_level="Low"),
            TrafficData(road_name="Expressway 101", vehicle_count=350, avg_speed=15.2, congestion_level="Heavy"),
            TrafficData(road_name="Silicon Blvd", vehicle_count=80, avg_speed=42.0, congestion_level="Moderate"),
            TrafficData(road_name="Sunset Road", vehicle_count=30, avg_speed=60.5, congestion_level="Low")
        ]
        db.session.add_all(roads)
        
        # Alerts
        alerts = [
            Alert(message="Accident reported on Expressway 101", severity="Critical"),
            Alert(message="Heavy rain slowing down traffic on Broadway St", severity="Warning"),
            Alert(message="Road construction starting on Sunset Road next week", severity="Info")
        ]
        db.session.add_all(alerts)
        db.session.commit()

@dashboard_bp.route('/')
@login_required
def index():
    seed_data()
    traffic_data = TrafficData.query.all()
    alerts = Alert.query.order_by(Alert.timestamp.desc()).limit(5).all()
    
    # Statistics
    stats = {
        'total_roads': len(traffic_data),
        'heavy': TrafficData.query.filter_by(congestion_level='Heavy').count(),
        'moderate': TrafficData.query.filter_by(congestion_level='Moderate').count(),
        'low': TrafficData.query.filter_by(congestion_level='Low').count(),
        'active_alerts': Alert.query.count()
    }
    
    return render_template('dashboard.html', traffic_data=traffic_data, alerts=alerts, stats=stats)

@dashboard_bp.route('/manage-users')
@login_required
def manage_users():
    if current_user.role != 'Admin':
        flash('Access denied. Admins only.', 'danger')
        return redirect(url_for('dashboard.index'))
    
    users = User.query.all()
    return render_template('manage_users.html', users=users)

@dashboard_bp.route('/update-traffic', methods=['POST'])
@login_required
def update_traffic():
    if current_user.role not in ['Admin', 'Traffic Operator']:
        flash('Access denied. Unauthorized to update data.', 'danger')
        return redirect(url_for('dashboard.index'))
    
    road_id = request.form.get('road_id')
    vehicle_count = int(request.form.get('vehicle_count'))
    avg_speed = float(request.form.get('avg_speed'))
    
    road = TrafficData.query.get(road_id)
    if road:
        road.vehicle_count = vehicle_count
        road.avg_speed = avg_speed
        # Simple logic for congestion level
        if vehicle_count > 250:
            road.congestion_level = 'Heavy'
        elif vehicle_count > 100:
            road.congestion_level = 'Moderate'
        else:
            road.congestion_level = 'Low'
        
        db.session.commit()
        flash(f'Traffic data for {road.road_name} updated successfully.', 'success')
    
    return redirect(url_for('dashboard.index'))
