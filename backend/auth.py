from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin
from security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["Auth"])

# ---------------- REGISTER ---------------- #
@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email already registered
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    # Hash user password
    hashed_pw = hash_password(user_data.password)

    # Save user record
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password=hashed_pw,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Registration completed successfully."}

# ---------------- LOGIN ---------------- #
@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # Find user record
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    # Verify password hash
    if not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    # Generate JWT token
    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "fullName": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }