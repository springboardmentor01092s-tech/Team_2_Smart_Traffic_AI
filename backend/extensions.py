"""Central place for Flask extension instances to avoid circular imports."""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_socketio import SocketIO

# Database
db = SQLAlchemy()

# Authentication
jwt = JWTManager()

# Password hashing
bcrypt = Bcrypt()

# CORS
cors = CORS()

# Real-time notifications
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading"
)

