from flask import Flask
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from config import Config
from models import db, User
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'auth.login'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Seed data logic will be added in dashboard.py or a separate script
    app.run(debug=True, port=5000)
