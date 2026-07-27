from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import sessionmaker
from models import engine, User
from schemas import UserCreate, UserLogin
from security import create_access_token
import bcrypt

router = APIRouter()

SessionLocal = sessionmaker(bind=engine)


# ---------------- REGISTER ---------------- #

@router.post("/register")
def register(user: UserCreate):

    db = SessionLocal()

    try:
        hashed_password = bcrypt.hashpw(
            user.password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        new_user = User(
            name=user.name,
            email=user.email,
            password=hashed_password,
            role=user.role
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {"message": "User Registered Successfully"}

    finally:
        db.close()


# ---------------- LOGIN ---------------- #

@router.post("/login")
def login(user: UserLogin):

    db = SessionLocal()

    try:
        db_user = db.query(User).filter(User.email == user.email).first()

        if not db_user:
            raise HTTPException(
                status_code=401,
                detail="Invalid Email"
            )

        if not bcrypt.checkpw(
            user.password.encode("utf-8"),
            db_user.password.encode("utf-8")
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid Password"
            )

        token = create_access_token(
            {
                "sub": db_user.email,
                "role": db_user.role
            }
        )

        return {
            "access_token": token,
            "token_type": "bearer"
        }

    finally:
        db.close()