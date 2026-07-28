import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'trafficvision-ai-secret-key-12345'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///trafficvision.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
