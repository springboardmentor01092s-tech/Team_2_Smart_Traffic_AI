from database import engine, Base, SessionLocal
from models import Traffic, User
from security import hash_password

def recreate_and_seed():
    print("Dropping legacy database tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating updated database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding default operations user...")
        default_admin = User(
            full_name="Dibita Biswas",
            email="dibita@agency.gov",
            password=hash_password("password123"),
            role="admin"
        )
        db.add(default_admin)
        
        print("Seeding default Indian metropolitan segments...")
        seeds = [
            Traffic(
                location="Howrah Bridge, Kolkata",
                road_name="Junction 2",
                latitude=22.5726,
                longitude=88.3639,
                vehicle_count=120,
                capacity=150,
                average_speed=25.5,
                congestion_level="High"
            ),
            Traffic(
                location="Connaught Place, Delhi",
                road_name="Outer Circle",
                latitude=28.6139,
                longitude=77.2090,
                vehicle_count=50,
                capacity=200,
                average_speed=48.2,
                congestion_level="Low"
            ),
            Traffic(
                location="Bandra-Worli Sea Link, Mumbai",
                road_name="Sea Link Expressway",
                latitude=19.0330,
                longitude=72.8190,
                vehicle_count=180,
                capacity=250,
                average_speed=18.0,
                congestion_level="Critical"
            )
        ]
        db.add_all(seeds)
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    recreate_and_seed()
