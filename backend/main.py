"""
PillSync Backend – Milestone 2
Full CRUD for medicines, scheduling, dose logging,
APScheduler reminders, SendGrid emails, caregiver/admin endpoints.
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, text, Date, Float
from sqlalchemy.orm import Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, date
from typing import Optional, List
from dotenv import load_dotenv
from database import Base, engine, get_db
import os, logging

# ── APScheduler ────────────────────────────────────────────
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    logging.warning("APScheduler not installed – reminders disabled")

# ── SendGrid ───────────────────────────────────────────────
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logging.warning("SendGrid not installed – email reminders disabled")

load_dotenv()

SECRET_KEY    = os.getenv("SECRET_KEY", "fallback-secret-change-in-production")
ALGORITHM     = "HS256"
EXPIRE        = 1440          # minutes (1 day)
SENDGRID_KEY  = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL    = os.getenv("SENDGRID_FROM_EMAIL", os.getenv("FROM_EMAIL", "noreply@pillsync.app"))

# ══════════════════════════════════════════════════════════
#  DATABASE MODELS
# ══════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, index=True, nullable=False)
    password   = Column(String, nullable=False)
    role       = Column(String, default="patient")   # patient | caregiver | admin
    phone      = Column(String, nullable=True)
    gender     = Column(String, nullable=True)
    age        = Column(Integer, nullable=True)
    weight     = Column(String, nullable=True)
    height     = Column(String, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    medicines  = relationship("Medicine", back_populates="owner", cascade="all, delete-orphan")
    intake_logs = relationship("IntakeLog", back_populates="user", cascade="all, delete-orphan")


class Medicine(Base):
    __tablename__ = "medicines"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    name          = Column(String, nullable=False)
    description   = Column(String, nullable=True)
    dosage        = Column(String, nullable=True)
    category      = Column(String, nullable=True, default="Other")
    stock         = Column(Integer, default=0)
    initial_stock = Column(Integer, default=0)
    start_date    = Column(Date, nullable=True)
    end_date      = Column(Date, nullable=True)
    is_deleted    = Column(Boolean, default=False)   # soft-delete flag
    created_at    = Column(DateTime, server_default=func.now())
    owner         = relationship("User", back_populates="medicines")
    schedules     = relationship("Schedule", back_populates="medicine", cascade="all, delete-orphan")
    logs          = relationship("IntakeLog", back_populates="medicine")


class Schedule(Base):
    """Stores the per-medicine reminder times (e.g. '08:30 am')."""
    __tablename__ = "schedules"
    id          = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    time        = Column(String, nullable=False)   # "hh:mm am/pm" format
    medicine    = relationship("Medicine", back_populates="schedules")


class IntakeLog(Base):
    """Records every dose event (taken / missed)."""
    __tablename__ = "intake_logs"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    medicine_id    = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    status         = Column(String, nullable=False)   # "taken" | "missed"
    scheduled_time = Column(String, nullable=True)    # e.g. "08:30 am"
    log_date       = Column(Date, nullable=False, default=date.today)
    taken_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    user           = relationship("User", back_populates="intake_logs")
    medicine       = relationship("Medicine", back_populates="logs")


# Create tables
Base.metadata.create_all(bind=engine)

# Auto-migrate missing columns safely (idempotent)
_MIGRATIONS = [
    ("users",       "gender",       "VARCHAR"),
    ("users",       "age",          "INTEGER"),
    ("users",       "weight",       "VARCHAR"),
    ("users",       "height",       "VARCHAR"),
    ("intake_logs", "log_date",     "DATE"),
    ("medicines",   "start_date",   "DATE"),
    ("medicines",   "end_date",     "DATE"),
]
with engine.connect() as _conn:
    for _table, _col, _type in _MIGRATIONS:
        try:
            _conn.execute(text(
                f"ALTER TABLE {_table} ADD COLUMN IF NOT EXISTS {_col} {_type};"
            ))
            _conn.commit()
        except Exception as _e:
            pass  # column already exists – safe to ignore


# ══════════════════════════════════════════════════════════
#  PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════

class RegisterSchema(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     str = "patient"
    phone:    Optional[str] = None
    gender:   Optional[str] = None
    age:      Optional[int] = None
    weight:   Optional[str] = None
    height:   Optional[str] = None


class LoginSchema(BaseModel):
    email:    EmailStr
    password: str


class UpdateProfileSchema(BaseModel):
    name:   Optional[str] = None
    phone:  Optional[str] = None
    gender: Optional[str] = None
    age:    Optional[int] = None
    weight: Optional[str] = None
    height: Optional[str] = None


class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str


class ResetPasswordSchema(BaseModel):
    email:        EmailStr
    new_password: str


class MedicineCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    dosage:      Optional[str] = None
    category:    Optional[str] = "Other"
    stock:       int           = 0
    schedules:   List[str]     = []   # list of "hh:mm am/pm" strings
    start_date:  Optional[str] = None  # "YYYY-MM-DD"
    end_date:    Optional[str] = None  # "YYYY-MM-DD"


class MedicineUpdate(BaseModel):
    name:        Optional[str]       = None
    description: Optional[str]       = None
    dosage:      Optional[str]       = None
    category:    Optional[str]       = None
    stock:       Optional[int]       = None
    schedules:   Optional[List[str]] = None
    start_date:  Optional[str]       = None  # "YYYY-MM-DD"
    end_date:    Optional[str]       = None  # "YYYY-MM-DD"


class DoseStatusUpdate(BaseModel):
    """Used to toggle a dose between taken / missed / pending."""
    status:         str   # "taken" | "missed" | "pending"
    scheduled_time: str   # e.g. "08:30 am"
    date_str:       str   # "YYYY-MM-DD"


# ══════════════════════════════════════════════════════════
#  AUTH HELPERS
# ══════════════════════════════════════════════════════════

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_oauth2  = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_pw(p: str) -> str:        return _pwd_ctx.hash(p)
def verify_pw(p: str, h: str) -> bool: return _pwd_ctx.verify(p, h)


def make_token(data: dict) -> str:
    exp = datetime.utcnow() + timedelta(minutes=EXPIRE)
    return jwt.encode({**data, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def _user_dict(u: User) -> dict:
    return {
        "id":     u.id,
        "name":   u.name,
        "email":  u.email,
        "role":   u.role,
        "phone":  u.phone,
        "gender": u.gender,
        "age":    u.age,
        "weight": u.weight,
        "height": u.height,
    }


def get_current_user(token: str = Depends(_oauth2), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == payload.get("id")).first()
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


def _medicine_dict(m: Medicine) -> dict:
    return {
        "id":            m.id,
        "user_id":       m.user_id,
        "name":          m.name,
        "description":   m.description,
        "dosage":        m.dosage,
        "category":      m.category or "Other",
        "stock":         m.stock,
        "initial_stock": m.initial_stock,
        "start_date":    str(m.start_date) if m.start_date else None,
        "end_date":      str(m.end_date)   if m.end_date   else None,
        "created_at":    str(m.created_at),
        "schedules":     [s.time for s in m.schedules],
        "low_stock":     m.stock < 10,
    }


def _resolve_target(user: User, patient_id: Optional[int]) -> int:
    """Return the effective user_id for data access.
    Caregivers and admins may pass a patient_id to act on behalf of a patient."""
    if patient_id and user.role in ("caregiver", "admin"):
        return patient_id
    return user.id


def _day_range(day: date):
    start = datetime(day.year, day.month, day.day, 0, 0, 0)
    end   = datetime(day.year, day.month, day.day, 23, 59, 59)
    return start, end


# ══════════════════════════════════════════════════════════
#  SENDGRID EMAIL HELPER
# ══════════════════════════════════════════════════════════

def send_reminder_email(to_email: str, patient_name: str, medicine_name: str, scheduled_time: str):
    """Send a medication reminder email via SendGrid."""
    if not SENDGRID_AVAILABLE or not SENDGRID_KEY:
        logging.info(f"[REMINDER] Would email {to_email}: take {medicine_name} at {scheduled_time}")
        return
    try:
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=f"PillSync Reminder: Take {medicine_name}",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                        background:#f0fafa;border-radius:16px">
              <h2 style="color:#004346">💊 Medicine Reminder</h2>
              <p>Hi <strong>{patient_name}</strong>,</p>
              <p>It's time to take your <strong>{medicine_name}</strong> scheduled for
                 <strong>{scheduled_time}</strong>.</p>
              <p style="color:#666">Please mark it as taken in your PillSync dashboard.</p>
              <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
              <p style="font-size:11px;color:#999">PillSync – Intelligent Medicine Management</p>
            </div>
            """
        )
        sg = SendGridAPIClient(SENDGRID_KEY)
        sg.send(message)
        logging.info(f"[EMAIL] Sent reminder to {to_email}")
    except Exception as e:
        logging.error(f"[EMAIL] Failed to send to {to_email}: {e}")


def send_creation_email(to_email: str, patient_name: str, medicine_name: str, category: str, dosage: str, start_date: str, end_date: str, schedules: list):
    """Send an email confirming a new medicine has been added."""
    if not SENDGRID_AVAILABLE or not SENDGRID_KEY:
        logging.info(f"[CONFIRMATION] Would email {to_email}: added {medicine_name}")
        return
    try:
        times_str = ", ".join(schedules)
        duration_str = f"From {start_date}"
        if end_date:
            duration_str += f" to {end_date}"
        
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=f"PillSync: New Medicine Added ({medicine_name})",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                        background:#f0fafa;border-radius:16px;border:1px solid #004346">
              <h2 style="color:#004346;margin-top:0">💊 New Medicine Added</h2>
              <p>Hi <strong>{patient_name}</strong>,</p>
              <p>A new medicine has been successfully added to your PillSync schedule:</p>
              <table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:6px 0;color:#666"><strong>Medicine:</strong></td><td style="padding:6px 0;color:#111"><strong>{medicine_name}</strong></td></tr>
                {"<tr><td style='padding:6px 0;color:#666'><strong>Dosage:</strong></td><td style='padding:6px 0;color:#111'>" + dosage + "</td></tr>" if dosage else ""}
                <tr><td style="padding:6px 0;color:#666"><strong>Category:</strong></td><td style="padding:6px 0;color:#111">{category}</td></tr>
                <tr><td style="padding:6px 0;color:#666"><strong>Duration:</strong></td><td style="padding:6px 0;color:#111">{duration_str}</td></tr>
                <tr><td style="padding:6px 0;color:#666"><strong>Reminders:</strong></td><td style="padding:6px 0;color:#111">{times_str}</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
              <p style="font-size:11px;color:#999">PillSync – Intelligent Medicine Management</p>
            </div>
            """
        )
        sg = SendGridAPIClient(SENDGRID_KEY)
        sg.send(message)
        logging.info(f"[EMAIL] Sent confirmation email to {to_email}")
    except Exception as e:
        logging.error(f"[EMAIL] Failed to send confirmation to {to_email}: {e}")



# ══════════════════════════════════════════════════════════
#  APSCHEDULER – BACKGROUND REMINDER JOB
# ══════════════════════════════════════════════════════════

def run_reminder_job():
    """Runs every minute; sends email for any pending dose whose time matches now."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        now  = datetime.now()
        hh   = now.strftime("%I").lstrip("0") or "12"
        mm   = now.strftime("%M")
        ampm = now.strftime("%p").lower()
        current_slot = f"{hh.zfill(2)}:{mm} {ampm}"   # e.g. "08:30 am"

        today     = date.today()
        day_start = datetime(today.year, today.month, today.day)

        schedules = db.query(Schedule).all()
        for sch in schedules:
            if sch.time != current_slot:
                continue
            med  = sch.medicine
            # Skip soft-deleted medicines
            if med.is_deleted:
                continue
            # Respect medicine date range
            if med.start_date and today < med.start_date:
                continue
            if med.end_date and today > med.end_date:
                continue
            user = db.query(User).filter(User.id == med.user_id).first()
            if not user:
                continue
            # Skip if already logged for this slot today
            already = db.query(IntakeLog).filter(
                IntakeLog.medicine_id    == med.id,
                IntakeLog.user_id        == user.id,
                IntakeLog.scheduled_time == sch.time,
                IntakeLog.taken_at       >= day_start,
            ).first()
            if already:
                continue
            send_reminder_email(user.email, user.name, med.name, sch.time)
    except Exception as e:
        logging.error(f"[SCHEDULER] Reminder job error: {e}")
    finally:
        db.close()


# ══════════════════════════════════════════════════════════
#  FASTAPI APP
# ══════════════════════════════════════════════════════════

app = FastAPI(title="PillSync API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def start_scheduler():
    if SCHEDULER_AVAILABLE:
        scheduler = BackgroundScheduler()
        scheduler.add_job(run_reminder_job, "cron", minute="*")
        scheduler.start()
        logging.info("[SCHEDULER] APScheduler started – checking reminders every minute")


# ══════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════

@app.post("/auth/register", tags=["Auth"])
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        name=data.name, email=data.email,
        password=hash_pw(data.password),
        role=data.role, phone=data.phone,
        gender=data.gender, age=data.age,
        weight=data.weight, height=data.height,
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"token": make_token({"id": user.id}), "user": _user_dict(user)}


@app.post("/auth/login", tags=["Auth"])
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_pw(data.password, user.password):
        raise HTTPException(401, "Invalid email or password")
    return {"token": make_token({"id": user.id}), "user": _user_dict(user)}


@app.post("/auth/reset-password", tags=["Auth"])
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(404, "Email not found")
    user.password = hash_pw(data.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


# ══════════════════════════════════════════════════════════
#  USER / PROFILE ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/users/profile", tags=["Users"])
def get_profile(user: User = Depends(get_current_user)):
    return _user_dict(user)


@app.patch("/users/profile", tags=["Users"])
def update_profile(
    data: UpdateProfileSchema,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if data.name   is not None: user.name   = data.name
    if data.phone  is not None: user.phone  = data.phone
    if data.gender is not None: user.gender = data.gender
    if data.age    is not None: user.age    = data.age
    if data.weight is not None: user.weight = data.weight
    if data.height is not None: user.height = data.height
    db.commit(); db.refresh(user)
    return _user_dict(user)


@app.patch("/users/password", tags=["Users"])
def change_password(
    data: ChangePasswordSchema,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if not verify_pw(data.old_password, user.password):
        raise HTTPException(400, "Current password is incorrect")
    user.password = hash_pw(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@app.get("/users/patients", tags=["Users"])
def list_patients(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Caregiver / Admin: list all patient accounts."""
    if user.role not in ("caregiver", "admin"):
        raise HTTPException(403, "Access restricted to caregivers and admins")
    patients = db.query(User).filter(User.role == "patient", User.is_active == True).all()
    return [_user_dict(p) for p in patients]


@app.get("/users/all", tags=["Users"])
def list_all_users(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Admin only: list every user in the system."""
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    users = db.query(User).all()
    return [_user_dict(u) for u in users]


# ══════════════════════════════════════════════════════════
#  MEDICINE CRUD ROUTES
# ══════════════════════════════════════════════════════════

@app.post("/medicines", tags=["Medicines"])
def add_medicine(
    data:       MedicineCreate,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    target_id = _resolve_target(user, patient_id)
    # Parse optional date strings
    start_d = None
    end_d   = None
    if data.start_date:
        try: start_d = datetime.strptime(data.start_date, "%Y-%m-%d").date()
        except: pass
    if data.end_date:
        try: end_d = datetime.strptime(data.end_date, "%Y-%m-%d").date()
        except: pass
    med = Medicine(
        user_id=target_id,
        name=data.name, description=data.description,
        dosage=data.dosage, category=data.category or "Other",
        stock=data.stock, initial_stock=data.stock,
        start_date=start_d, end_date=end_d,
    )
    db.add(med); db.flush()
    for t in data.schedules:
        db.add(Schedule(medicine_id=med.id, time=t))
    db.commit(); db.refresh(med)
    
    # Send email notification immediately when medicine is added
    patient = db.query(User).filter(User.id == target_id).first()
    if patient:
        send_creation_email(
            to_email=patient.email,
            patient_name=patient.name,
            medicine_name=med.name,
            category=med.category,
            dosage=med.dosage,
            start_date=data.start_date or str(date.today()),
            end_date=data.end_date,
            schedules=data.schedules
        )
        
    return _medicine_dict(med)


@app.get("/medicines", tags=["Medicines"])
def list_medicines(
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    target_id = _resolve_target(user, patient_id)
    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).order_by(Medicine.created_at).all()
    return [_medicine_dict(m) for m in meds]


@app.patch("/medicines/{med_id}", tags=["Medicines"])
def update_medicine(
    med_id:     int,
    data:       MedicineUpdate,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    target_id = _resolve_target(user, patient_id)
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == target_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")
    if data.name        is not None: med.name        = data.name
    if data.description is not None: med.description = data.description
    if data.dosage      is not None: med.dosage      = data.dosage
    if data.category    is not None: med.category    = data.category
    if data.stock       is not None: med.stock       = data.stock
    if data.start_date  is not None:
        try: med.start_date = datetime.strptime(data.start_date, "%Y-%m-%d").date()
        except: pass
    if data.end_date    is not None:
        try: med.end_date   = datetime.strptime(data.end_date, "%Y-%m-%d").date()
        except: pass
    if data.schedules is not None:
        db.query(Schedule).filter(Schedule.medicine_id == med.id).delete()
        for t in data.schedules:
            db.add(Schedule(medicine_id=med.id, time=t))
    db.commit(); db.refresh(med)
    return _medicine_dict(med)


@app.delete("/medicines/{med_id}", tags=["Medicines"])
def delete_medicine(
    med_id:     int,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    target_id = _resolve_target(user, patient_id)
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == target_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")
    # Soft-delete: mark as deleted but keep in DB for history
    med.is_deleted = True
    db.commit()
    return {"message": f"{med.name} deleted successfully"}


# ══════════════════════════════════════════════════════════
#  DOSE STATUS TOGGLE (taken / missed / pending)
# ══════════════════════════════════════════════════════════

@app.post("/medicines/{med_id}/status", tags=["Doses"])
def update_dose_status(
    med_id:     int,
    data:       DoseStatusUpdate,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    """
    Toggle a dose log for a given date + scheduled_time.
    status = 'taken' | 'missed' | 'pending' (pending = delete log).
    Stock is adjusted automatically.
    """
    target_id = _resolve_target(user, patient_id)
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == target_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")

    try:
        log_day = datetime.strptime(data.date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "date_str must be YYYY-MM-DD")

    day_start, day_end = _day_range(log_day)

    existing = db.query(IntakeLog).filter(
        IntakeLog.medicine_id    == med_id,
        IntakeLog.user_id        == target_id,
        IntakeLog.scheduled_time == data.scheduled_time,
        IntakeLog.taken_at       >= day_start,
        IntakeLog.taken_at       <= day_end,
    ).first()

    old_status = existing.status if existing else "pending"
    new_status = data.status

    if old_status == new_status:
        return {"message": "No change", "remaining_stock": med.stock}

    # Stock adjustments
    if old_status == "taken" and new_status in ("missed", "pending"):
        med.stock += 1                 # restore dose
    elif old_status != "taken" and new_status == "taken":
        if med.stock > 0:
            med.stock -= 1             # consume dose

    if new_status == "pending":
        if existing:
            db.delete(existing)
    else:
        if existing:
            existing.status  = new_status
            existing.taken_at = datetime.combine(log_day, datetime.utcnow().time())
        else:
            db.add(IntakeLog(
                user_id        = target_id,
                medicine_id    = med_id,
                status         = new_status,
                scheduled_time = data.scheduled_time,
                log_date       = log_day,
                taken_at       = datetime.combine(log_day, datetime.utcnow().time()),
            ))

    db.commit(); db.refresh(med)
    return {"message": f"Status updated to {new_status}", "remaining_stock": med.stock}


# ══════════════════════════════════════════════════════════
#  SCHEDULE / ADHERENCE QUERY ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/medicines/today", tags=["Doses"])
def get_schedule_for_date(
    date_str:   str            = Query(..., description="YYYY-MM-DD"),
    patient_id: Optional[int]  = Query(None),
    db:         Session        = Depends(get_db),
    user:       User           = Depends(get_current_user),
):
    """Return every scheduled dose slot for the given date with its current status."""
    try:
        log_day = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "date_str must be YYYY-MM-DD")

    target_id         = _resolve_target(user, patient_id)
    day_start, day_end = _day_range(log_day)

    meds   = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).all()
    result = []

    for med in meds:
        # Respect medicine duration start_date/end_date
        if med.start_date and log_day < med.start_date:
            continue
        if med.end_date and log_day > med.end_date:
            continue

        for sch in med.schedules:
            log = db.query(IntakeLog).filter(
                IntakeLog.medicine_id    == med.id,
                IntakeLog.user_id        == target_id,
                IntakeLog.scheduled_time == sch.time,
                IntakeLog.taken_at       >= day_start,
                IntakeLog.taken_at       <= day_end,
            ).first()
            result.append({
                "medicine_id":    med.id,
                "name":           med.name,
                "description":    med.description,
                "dosage":         med.dosage,
                "category":       med.category,
                "stock":          med.stock,
                "low_stock":      med.stock < 10,
                "scheduled_time": sch.time,
                "status":         log.status if log else "pending",
            })

    result.sort(key=lambda x: x["scheduled_time"])
    return result


@app.get("/medicines/adherence", tags=["Doses"])
def get_adherence_for_date(
    date_str:   str           = Query(..., description="YYYY-MM-DD"),
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    try:
        log_day = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "date_str must be YYYY-MM-DD")

    target_id         = _resolve_target(user, patient_id)
    day_start, day_end = _day_range(log_day)

    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).all()
    
    active_meds = []
    for med in meds:
        if med.start_date and log_day < med.start_date:
            continue
        if med.end_date and log_day > med.end_date:
            continue
        active_meds.append(med)

    total_scheduled = sum(len(m.schedules) for m in active_meds)

    taken = 0
    missed = 0
    for med in active_meds:
        for sch in med.schedules:
            log = db.query(IntakeLog).filter(
                IntakeLog.medicine_id    == med.id,
                IntakeLog.user_id        == target_id,
                IntakeLog.scheduled_time == sch.time,
                IntakeLog.taken_at       >= day_start,
                IntakeLog.taken_at       <= day_end,
            ).first()
            if log:
                if log.status == "taken":
                    taken += 1
                elif log.status == "missed":
                    missed += 1

    pct = round((taken / total_scheduled) * 100) if total_scheduled > 0 else 0

    return {
        "total_scheduled": total_scheduled,
        "taken":           taken,
        "missed":          missed,
        "adherence_pct":   pct,
        "active_count":    len(active_meds),
        "low_stock_meds":  [_medicine_dict(m) for m in active_meds if m.stock < 10],
    }


@app.get("/medicines/history", tags=["Doses"])
def get_intake_history(
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    """Full chronological dose history (all time)."""
    target_id = _resolve_target(user, patient_id)
    logs = (
        db.query(IntakeLog)
        .filter(IntakeLog.user_id == target_id)
        .order_by(IntakeLog.taken_at.desc())
        .all()
    )
    return [
        {
            "id":             log.id,
            "medicine_name":  log.medicine.name if log.medicine else "(Deleted Medicine)",
            "medicine_id":    log.medicine_id,
            "status":         log.status,
            "scheduled_time": log.scheduled_time,
            "log_date":       str(log.log_date),
            "taken_at":       log.taken_at.strftime("%Y-%m-%d %I:%M %p"),
        }
        for log in logs
    ]


@app.patch("/users/patients/{patient_id}", tags=["Users"])
def update_patient_profile(
    patient_id: int,
    data: UpdateProfileSchema,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in ("caregiver", "admin"):
        raise HTTPException(403, "Access restricted to caregivers and admins")
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    if data.name is not None: patient.name = data.name
    if data.phone is not None: patient.phone = data.phone
    if data.gender is not None: patient.gender = data.gender
    if data.age is not None: patient.age = data.age
    if data.weight is not None: patient.weight = data.weight
    if data.height is not None: patient.height = data.height
    db.commit()
    db.refresh(patient)
    return _user_dict(patient)


@app.delete("/users/patients/{patient_id}", tags=["Users"])
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in ("caregiver", "admin"):
        raise HTTPException(403, "Access restricted to caregivers and admins")
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    db.delete(patient)
    db.commit()
    return {"message": f"Patient {patient.name} deleted successfully"}


@app.post("/medicines/{med_id}/nudge", tags=["Notifications"])
def nudge_patient(
    med_id: int,
    scheduled_time: str = Query(..., description="e.g. 08:30 am"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Manually trigger a SendGrid email reminder for a medicine."""
    med = db.query(Medicine).filter(Medicine.id == med_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")
    # Verify access
    if user.role not in ("caregiver", "admin") and user.id != med.user_id:
        raise HTTPException(403, "Forbidden")
    patient = db.query(User).filter(User.id == med.user_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    
    send_reminder_email(patient.email, patient.name, med.name, scheduled_time)
    return {"message": f"Nudge email sent to {patient.email} for {med.name} at {scheduled_time}"}


# ══════════════════════════════════════════════════════════
#  HEALTH CHECK
# ══════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
def root():
    return {
        "message":   "PillSync API running ✅",
        "version":   "2.0.0",
        "scheduler": SCHEDULER_AVAILABLE,
        "sendgrid":  SENDGRID_AVAILABLE and bool(SENDGRID_KEY),
    }


# ── HOW TO RUN ──────────────────────────────────────────
# cd backend
# venv\Scripts\activate
# uvicorn main:app --reload