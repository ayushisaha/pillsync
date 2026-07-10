from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import Column, Integer, String, Boolean, DateTime, text
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from database import Base, engine, get_db
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"
EXPIRE     = 1440  # 1 day

# ─── Model ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, nullable=False)
    password   = Column(String, nullable=False)
    role       = Column(String, default="patient")
    phone      = Column(String, nullable=True)
    gender     = Column(String, nullable=True)
    age        = Column(Integer, nullable=True)
    weight     = Column(String, nullable=True)
    height     = Column(String, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

Base.metadata.create_all(bind=engine)

# Auto-migration script to automatically add gender, age, weight, height columns if they don't exist
with engine.connect() as conn:
    for col_name, col_type in [("gender", "VARCHAR"), ("age", "INTEGER"), ("weight", "VARCHAR"), ("height", "VARCHAR")]:
        try:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            conn.commit()
        except Exception as e:
            print(f"Migration column {col_name} check: {e}")

# ─── Schemas ────────────────────────────────────────────
class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "patient"
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[str] = None
    height: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class UpdateSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[str] = None
    height: Optional[str] = None

class PasswordSchema(BaseModel):
    old_password: str
    new_password: str

class ResetPasswordSchema(BaseModel):
    email: EmailStr
    new_password: str


# ─── Auth Helpers ───────────────────────────────────────
pwd    = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="auth/login")

def hash_pw(p):      return pwd.hash(p)
def verify_pw(p, h): return pwd.verify(p, h)

def make_token(data):
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=EXPIRE)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def user_dict(u):
    return {
        "id":     u.id,
        "name":   u.name,
        "email":  u.email,
        "role":   u.role,
        "phone":  u.phone,
        "gender": u.gender,
        "age":    u.age,
        "weight": u.weight,
        "height": u.height
    }

def get_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == data.get("id")).first()
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except JWTError:
        raise HTTPException(401, "Invalid token")

# ─── App ────────────────────────────────────────────────
app = FastAPI(title="PillSync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ─── Auth Routes ────────────────────────────────────────
@app.post("/auth/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(400, "Email already registered")
        user = User(
            name=data.name,
            email=data.email,
            password=hash_pw(data.password),
            role=data.role,
            phone=data.phone,
            gender=data.gender,
            age=data.age,
            weight=data.weight,
            height=data.height
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {
            "token": make_token({"id": user.id}),
            "user":  user_dict(user)
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, f"Registration failed: {str(e)}")

@app.post("/auth/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_pw(data.password, user.password):
        raise HTTPException(401, "Invalid email or password")
    return {
        "token": make_token({"id": user.id}),
        "user":  user_dict(user)
    }

@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(404, "Email address not found")
    user.password = hash_pw(data.new_password)
    db.commit()
    return {"message": "Password reset successful"}


# ─── User Routes ────────────────────────────────────────
@app.get("/users/profile")
def get_profile(user: User = Depends(get_user)):
    return user_dict(user)

@app.patch("/users/profile")
def update_profile(
    data: UpdateSchema,
    db: Session = Depends(get_db),
    user: User = Depends(get_user)
):
    if data.name is not None:   user.name   = data.name
    if data.phone is not None:  user.phone  = data.phone
    if data.gender is not None: user.gender = data.gender
    if data.age is not None:    user.age    = data.age
    if data.weight is not None: user.weight = data.weight
    if data.height is not None: user.height = data.height
    db.commit()
    db.refresh(user)
    return user_dict(user)

@app.patch("/users/password")
def change_password(
    data: PasswordSchema,
    db: Session = Depends(get_db),
    user: User = Depends(get_user)
):
    if not verify_pw(data.old_password, user.password):
        raise HTTPException(400, "Old password incorrect")
    user.password = hash_pw(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

@app.get("/")
def root():
    return {"message": "PillSync API running ✅"}