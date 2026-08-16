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

from dotenv import load_dotenv
from database import Base, engine, get_db
import os, logging, io, json, re
from urllib.parse import quote as url_quote
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    logging.warning("pywebpush not installed – web push disabled")

load_dotenv()

TESSERACT_EXE = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    TESSERACT_AVAILABLE = True
    if os.path.exists(TESSERACT_EXE):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE
except ImportError:
    TESSERACT_AVAILABLE = False
    logging.warning("pytesseract or PIL not installed – OCR disabled")

SECRET_KEY    = os.getenv("SECRET_KEY", "fallback-secret-change-in-production")
ALGORITHM     = "HS256"
EXPIRE        = 1440          # minutes (1 day)
SENDGRID_KEY   = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL     = os.getenv("SENDGRID_FROM_EMAIL", os.getenv("FROM_EMAIL", "noreply@pillsync.app"))
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL     = os.getenv("GROQ_MODEL", "llama-3.3-70b-specdec")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
VAPID_PUBLIC_KEY  = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS      = {"sub": "mailto:noreply@pillsync.app"}

def call_groq_with_fallback(client, **kwargs):
    """Executes a Groq completion call with model fallbacks if a model gets decommissioned."""
    models_to_try = [
        GROQ_MODEL,
        "llama-3.3-70b-specdec",
        "qwen-2.5-32b",
        "llama-3.1-8b-instant",
        "llama3-70b-8192"
    ]
    # Remove duplicates while preserving order
    models_to_try = list(dict.fromkeys(models_to_try))
    
    last_err = None
    for m in models_to_try:
        try:
            kwargs["model"] = m
            # Clean optional parameters if None
            clean_kwargs = {k: v for k, v in kwargs.items() if v is not None}
            return client.chat.completions.create(**clean_kwargs)
        except Exception as e:
            last_err = e
            logging.warning(f"[GROQ] Model {m} failed: {e}. Trying fallback model...")
    raise last_err

# ── Medicine Name Verification via RxNorm + OpenFDA (no API key needed) ──
async def verify_medicine_name_api(name: str) -> dict:
    """
    Checks a medicine name against RxNorm and OpenFDA.
    Returns {valid: bool, canonical: str|None, suggestions: list[str], source: str}
    """
    result = {"valid": False, "canonical": None, "suggestions": [], "source": "none"}
    if not HTTPX_AVAILABLE or not name or len(name.strip()) < 2:
        return result
    q = name.strip()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # 1. Try RxNorm approximate term search
            rxnorm_url = f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={url_quote(q)}&maxEntries=5"
            try:
                rx_res = await client.get(rxnorm_url)
                if rx_res.status_code == 200:
                    rx_data = rx_res.json()
                    candidates = rx_data.get("approximateGroup", {}).get("candidate", [])
                    if candidates:
                        good_candidates = []
                        q_words = [w.lower() for w in q.split() if len(w) > 1]
                        for c in candidates:
                            c_name = c.get("name", "")
                            if not c_name:
                                continue
                            try:
                                c_score = float(c.get("score", 0))
                            except Exception:
                                c_score = 0
                            # Require first word of query to match candidate, or score to be high (>= 20)
                            first_word = q_words[0] if q_words else ""
                            is_match = False
                            if first_word and (first_word in c_name.lower() or c_name.lower() in first_word):
                                is_match = True
                            if c_score >= 20 or is_match:
                                good_candidates.append(c)
                                
                        if good_candidates:
                            names = list(dict.fromkeys(c.get("name", "") for c in good_candidates))
                            if names:
                                result["valid"] = True
                                result["canonical"] = names[0]
                                result["suggestions"] = names[:5]
                                result["source"] = "rxnorm"
                                return result
            except Exception:
                pass

            # 2. Try OpenFDA brand name search
            try:
                fda_url = f'https://api.fda.gov/drug/label.json?search=openfda.brand_name:"{url_quote(q)}"&limit=3'
                fda_res = await client.get(fda_url)
                if fda_res.status_code == 200:
                    fda_data = fda_res.json()
                    if fda_data.get("results"):
                        brands = []
                        for r in fda_data["results"]:
                            brands.extend(r.get("openfda", {}).get("brand_name", []))
                        brands = list(dict.fromkeys(brands))
                        if brands:
                            result["valid"] = True
                            result["canonical"] = brands[0]
                            result["suggestions"] = brands[:5]
                            result["source"] = "openfda_brand"
                            return result
            except Exception:
                pass

            # 3. Try OpenFDA generic name search
            try:
                fda_url2 = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{url_quote(q)}"&limit=3'
                fda_res2 = await client.get(fda_url2)
                if fda_res2.status_code == 200:
                    fda_data2 = fda_res2.json()
                    if fda_data2.get("results"):
                        generics = []
                        for r in fda_data2["results"]:
                            generics.extend(r.get("openfda", {}).get("generic_name", []))
                        generics = list(dict.fromkeys(generics))
                        if generics:
                            result["valid"] = True
                            result["canonical"] = generics[0]
                            result["suggestions"] = generics[:5]
                            result["source"] = "openfda_generic"
                            return result
            except Exception:
                pass

            # 4. Try local Indian drug brands database fallback
            try:
                INDIAN_DRUG_BRANDS = [
                    "Qtil CV", "Qtil 500", "Qtil 250", "Dolo 650", "Calpol", "Crocin",
                    "Meftal Spas", "Meftal", "Combiflam", "Paracetamol", "Sizodon Plus",
                    "Sizodon", "Risperidone", "Risperdal", "Pantocid", "Pan 40", "Omez",
                    "Rantac", "Aciloc", "Augmentin", "Clavam", "Taxim O", "Monocef",
                    "Glycomet", "Janumet", "Metformin", "Glimepiride", "Telma", "Telmisartan",
                    "Amlodipine", "Amlokind", "Atorvastatin", "Rosuvas", "Cetirizine",
                    "Avil", "Allegra", "Limcee", "Becosules", "Shelcal", "Digene", "Gelusil",
                    "Pudin Hara", "Neurobion Forte", "Pan-D", "Pantocid-DSR", "Rabeprazole",
                    "Domperidone", "Levocetirizine", "Montair LC", "Montelukast", "Amoxicillin"
                ]
                q_lower = q.lower()
                local_matches = [b for b in INDIAN_DRUG_BRANDS if q_lower in b.lower() or b.lower() in q_lower]
                if local_matches:
                    result["valid"] = True
                    result["canonical"] = local_matches[0]
                    result["suggestions"] = local_matches[:5]
                    result["source"] = "local_indian_db"
                    return result
            except Exception:
                pass

            # 5. Try Groq LLaMA or Gemini LLM verification as ultimate fallback
            if GROQ_AVAILABLE and GROQ_API_KEY:
                try:
                    from groq import Groq
                    client = Groq(api_key=GROQ_API_KEY)
                    sys_prompt = (
                        "You are a clinical pharmacist assistant. Verify if the provided term is a real medication, "
                        "active pharmaceutical ingredient, or therapeutic compound (brand name or generic name, "
                        "including Indian brand names). Reply ONLY with a valid JSON object in this format: "
                        '{"valid": true/false, "canonical": "Correctly Spelled Name"}'
                    )
                    resp = call_groq_with_fallback(
                        client,
                        messages=[
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": f"Term: {q}"}
                        ],
                        response_format={"type": "json_object"},
                        timeout=4.0
                    )
                    ai_res = json.loads(resp.choices[0].message.content)
                    if ai_res.get("valid") is True:
                        result["valid"] = True
                        result["canonical"] = ai_res.get("canonical") or q.title()
                        result["suggestions"] = [result["canonical"]]
                        result["source"] = "groq_llm"
                        return result
                except Exception as ex:
                    logging.warning(f"Groq verification fallback failed: {ex}")

    except Exception:
        pass
    return result



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
    weight      = Column(String, nullable=True)
    height      = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    is_active   = Column(Boolean, default=True)
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
    formulation   = Column(String, default="pill")   # 'pill' or 'syrup'
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


class CaregiverPatient(Base):
    """Association: which patients a caregiver explicitly manages."""
    __tablename__ = "caregiver_patients"
    id           = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at   = Column(DateTime, server_default=func.now())


class VerificationCode(Base):
    """Stores 6-digit verification codes for password change/forgot recovery."""
    __tablename__ = "verification_codes"
    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, index=True, nullable=False)
    code       = Column(String, nullable=False)
    purpose    = Column(String, nullable=False)  # "reset_password" | "change_password"
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)


class WaterIntake(Base):
    """Tracks daily water consumption (amount vs target) for users."""
    __tablename__ = "water_intakes"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    date_str   = Column(String, index=True, nullable=False)  # "YYYY-MM-DD"
    amount     = Column(Integer, default=0)                  # consumed in ml
    target     = Column(Integer, default=2000)               # daily goal in ml
    created_at = Column(DateTime, server_default=func.now())


class EmergencyContact(Base):
    """Stores emergency contact lists for users."""
    __tablename__ = "emergency_contacts"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    name       = Column(String, nullable=False)
    phone      = Column(String, nullable=False)
    relation   = Column(String, nullable=True)
    email      = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class PushSubscription(Base):
    """Stores Web Push subscriptions (endpoint + keys) per user."""
    __tablename__ = "push_subscriptions"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint   = Column(String, nullable=False, unique=True)
    p256dh     = Column(String, nullable=False)
    auth       = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# Create tables
Base.metadata.create_all(bind=engine)

# Auto-migrate missing columns safely (idempotent)
_MIGRATIONS = [
    ("users",       "gender",       "VARCHAR"),
    ("users",       "age",          "INTEGER"),
    ("users",       "weight",       "VARCHAR"),
    ("users",       "height",       "VARCHAR"),
    ("intake_logs",        "log_date",     "DATE"),
    ("medicines",          "start_date",   "DATE"),
    ("medicines",          "end_date",     "DATE"),
    ("users",              "blood_group",  "VARCHAR"),
    ("emergency_contacts", "email",        "VARCHAR"),
    ("push_subscriptions", "user_id",      "INTEGER"),  # trigger table creation via migration check
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
    name:        Optional[str] = None
    phone:       Optional[str] = None
    gender:      Optional[str] = None
    age:         Optional[int] = None
    weight:      Optional[str] = None
    height:      Optional[str] = None
    blood_group: Optional[str] = None


class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str


class ChangePasswordWithCodeSchema(BaseModel):
    code:         str
    new_password: str


class ResetPasswordSchema(BaseModel):
    email:        EmailStr
    code:         str
    new_password: str


class SendCodeSchema(BaseModel):
    email:        EmailStr
    purpose:      str  # "reset_password" | "change_password"


class WaterIntakeAddSchema(BaseModel):
    date_str:     str  # "YYYY-MM-DD"
    amount:       int  # amount in ml (e.g. 250)
    target:       Optional[int] = 2000


class EmergencyContactCreateSchema(BaseModel):
    name:         str
    phone:        str
    relation:     Optional[str] = "Family"
    email:        Optional[str] = None


class ChatAskSchema(BaseModel):
    query:        str


class PushSubscribeSchema(BaseModel):
    endpoint: str
    p256dh:   str
    auth:     str


class MedicineCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    dosage:      Optional[str] = None
    category:    Optional[str] = "Other"
    stock:       int           = 0
    schedules:   List[str]     = []   # list of "hh:mm am/pm" strings
    start_date:  Optional[str] = None  # "YYYY-MM-DD"
    end_date:    Optional[str] = None  # "YYYY-MM-DD"
    formulation: Optional[str] = "pill"


class MedicineUpdate(BaseModel):
    name:        Optional[str]       = None
    description: Optional[str]       = None
    dosage:      Optional[str]       = None
    category:    Optional[str]       = None
    stock:       Optional[int]       = None
    schedules:   Optional[List[str]] = None
    start_date:  Optional[str]       = None  # "YYYY-MM-DD"
    end_date:    Optional[str]       = None  # "YYYY-MM-DD"
    formulation: Optional[str]       = None


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
        "id":          u.id,
        "name":        u.name,
        "email":       u.email,
        "role":        u.role,
        "phone":       u.phone,
        "gender":      u.gender,
        "age":         u.age,
        "weight":      u.weight,
        "height":      u.height,
        "blood_group": getattr(u, "blood_group", None),
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
        "formulation":   m.formulation or "pill",
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


import re

def get_dosage_value(dosage_str: Optional[str], formulation: Optional[str]) -> float:
    if not dosage_str:
        return 1.0
    # Extract float/int from strings like "5 ml", "2.5 ml", "2 tablets", "10"
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", dosage_str)
    if match:
        return float(match.group(1))
    return 1.0

def is_scheduled_time_past(log_day: date, time_str: str) -> bool:
    today = date.today()
    if log_day < today:
        return True
    if log_day > today:
        return False
    try:
        parts = time_str.strip().split()
        if len(parts) != 2:
            return False
        h_m, period = parts
        h, m = map(int, h_m.split(':'))
        if period.lower() == 'pm' and h != 12:
            h += 12
        if period.lower() == 'am' and h == 12:
            h = 0
        now = datetime.now()
        return (now.hour, now.minute) > (h, m)
    except Exception as e:
        logging.warning(f"Error parsing scheduled time {time_str}: {e}")
        return False


# ══════════════════════════════════════════════════════════
#  SENDGRID EMAIL HELPER
# ══════════════════════════════════════════════════════════

def send_verification_email(to_email: str, code: str, purpose: str):
    purpose_text = "Resetting Password" if purpose == "reset_password" else "Changing Password"
    if not SENDGRID_AVAILABLE or not SENDGRID_KEY:
        logging.info(f"[VERIFICATION CODE] Would email {to_email}: code is {code} for {purpose}")
        return
    try:
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=f"PillSync Verification Code: {code}",
            plain_text_content=f"Your PillSync verification code for {purpose_text} is {code}. Valid for 15 minutes.",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                        background:#f0fafa;border-radius:16px;border:1px solid #004346">
              <h2 style="color:#004346;margin-top:0">Verification Code</h2>
              <p>You requested a verification code for <strong>{purpose_text}</strong> on your PillSync account.</p>
              <div style="background:#004346;color:white;padding:16px;text-align:center;border-radius:12px;font-size:24px;font-weight:bold;margin:16px 0;letter-spacing:4px">
                <span style="color:#ffffff">{code}</span>
              </div>
              <p style="color:#666;font-size:12px">This code is valid for 15 minutes. If you did not make this request, please ignore this email.</p>
              <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
              <p style="font-size:11px;color:#999">PillSync – Intelligent Medicine Management</p>
            </div>
            """
        )
        sg = SendGridAPIClient(SENDGRID_KEY)
        sg.send(message)
        logging.info(f"[EMAIL] Sent verification code to {to_email}")
    except Exception as e:
        logging.error(f"[EMAIL] Failed to send code to {to_email}: {e}")


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
            plain_text_content=f"Hi {patient_name}, it's time to take your {medicine_name} scheduled for {scheduled_time}.",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                        background:#f0fafa;border-radius:16px">
              <h2 style="color:#004346">Medicine Reminder</h2>
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
            plain_text_content=f"Hi {patient_name}, new medicine {medicine_name} ({category}, {dosage}) has been added to your PillSync schedule.",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                        background:#f0fafa;border-radius:16px;border:1px solid #004346">
              <h2 style="color:#004346;margin-top:0">New Medicine Added</h2>
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


def send_low_stock_email(to_email: str, patient_name: str, medicine_name: str, current_stock: float):
    """Send an email alert via SendGrid when medicine stock drops below threshold."""
    if not SENDGRID_AVAILABLE or not SENDGRID_KEY:
        logging.info(f"[LOW STOCK] Would email {to_email}: {medicine_name} low stock ({current_stock} left)")
        return
    try:
        stock_display = int(current_stock) if current_stock == int(current_stock) else round(current_stock, 1)
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=f"PillSync Low Stock Alert: {medicine_name} needs refill",
            plain_text_content=f"Hi {patient_name}, your medicine {medicine_name} is running low ({stock_display} left). Please refill your prescription.",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                        background:#fff5f5;border-radius:16px;border:1px solid #e53e3e">
              <h2 style="color:#c53030;margin-top:0">Low Stock / Refill Alert</h2>
              <p>Hi <strong>{patient_name}</strong>,</p>
              <p>Your medicine <strong>{medicine_name}</strong> is running low and needs to be restored immediately!</p>
              <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #fed7d7;margin:16px 0">
                <p style="margin:0;color:#9b2c2c;font-size:16px"><strong>Current Stock: {stock_display} remaining</strong></p>
                <p style="margin:6px 0 0 0;color:#718096;font-size:13px">Please refill your supply soon to stay on schedule with your daily doses.</p>
              </div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
              <p style="font-size:11px;color:#a0aec0">PillSync – Intelligent Medicine Management</p>
            </div>
            """
        )
        sg = SendGridAPIClient(SENDGRID_KEY)
        sg.send(message)
        logging.info(f"[EMAIL] Sent low stock alert to {to_email} for {medicine_name}")
    except Exception as e:
        logging.error(f"[EMAIL] Failed to send low stock alert to {to_email}: {e}")



def send_web_push(subscription_info: dict, payload_data: dict) -> bool:
    """Send a Web Push notification to a subscribed client browser."""
    if not WEBPUSH_AVAILABLE:
        return False
    try:
        priv_key = (VAPID_PRIVATE_KEY or "").replace('\\n', '\n').strip()
        if not priv_key:
            return False

        from py_vapid import Vapid
        vapid_obj = Vapid.from_pem(priv_key.encode('utf-8'))
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload_data),
            vapid_private_key=vapid_obj,
            vapid_claims=VAPID_CLAIMS,
        )
        logging.info("[WEB PUSH] Push alert delivered successfully")
        return True
    except WebPushException as ex:
        logging.debug(f"[WEB PUSH] Subscription delivery result: {ex}")
        return False
    except Exception as ex:
        logging.debug(f"[WEB PUSH] Push skipped: {ex}")
        return False




def run_refill_warning_check():
    """Daily check for stock levels and refill depletion forecasts under 5 days."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        today = date.today()
        medicines = db.query(Medicine).filter(Medicine.is_deleted == False).all()
        for med in medicines:
            if med.stock <= 0:
                continue
            freq = len(med.schedules) if med.schedules else 1
            qty = get_dosage_value(med.dosage, med.formulation)
            daily = freq * qty
            if daily <= 0:
                daily = 1.0
            days_left = med.stock / daily
            if days_left <= 5:
                user = db.query(User).filter(User.id == med.user_id).first()
                if user:
                    # 1. Send low stock email
                    send_low_stock_email(user.email, user.name, med.name, med.stock)
                    # 2. Trigger web push alert
                    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
                    for sub in subs:
                        sub_info = {
                            "endpoint": sub.endpoint,
                            "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                        }
                        payload = {
                            "title": "⚠️ Refill Needed Soon",
                            "body": f"Your medicine '{med.name}' has {int(med.stock)} left (lasts ~{round(days_left, 1)} days). Please refill!",
                            "url": "/dashboard?tab=refills"
                        }
                        send_web_push(sub_info, payload)
    except Exception as e:
        logging.error(f"[REFILL CHECK] Failed: {e}")
    finally:
        db.close()


# ══════════════════════════════════════════════════════════
#  APSCHEDULER – BACKGROUND REMINDER JOB
# ══════════════════════════════════════════════════════════

def run_reminder_job():
    """Runs every minute; sends email & web push alerts for pending doses."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        now  = datetime.now()
        hh   = now.strftime("%I").lstrip("0") or "12"
        mm   = now.strftime("%M")
        ampm = now.strftime("%p").lower()
        current_slot = f"{hh.zfill(2)}:{mm} {ampm}"

        today     = date.today()
        day_start = datetime(today.year, today.month, today.day)

        schedules = db.query(Schedule).all()
        for sch in schedules:
            if sch.time != current_slot:
                continue
            med  = sch.medicine
            if med.is_deleted:
                continue
            if med.start_date and today < med.start_date:
                continue
            if med.end_date and today > med.end_date:
                continue
            user = db.query(User).filter(User.id == med.user_id).first()
            if not user:
                continue
            already = db.query(IntakeLog).filter(
                IntakeLog.medicine_id    == med.id,
                IntakeLog.user_id        == user.id,
                IntakeLog.scheduled_time == sch.time,
                IntakeLog.taken_at       >= day_start,
            ).first()
            if already:
                continue

            # 1. Send Email Reminder
            send_reminder_email(user.email, user.name, med.name, sch.time)

            # 2. Send Web Push Alert
            subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
            for sub in subs:
                sub_info = {
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                }
                payload = {
                    "title": "⏰ PillSync Reminder",
                    "body": f"Time to take your dose of '{med.name}' ({sch.time}).",
                    "url": "/dashboard?tab=overview"
                }
                # If subscription is invalid (returns False), delete it
                success = send_web_push(sub_info, payload)
                if not success and not WEBPUSH_AVAILABLE:
                    pass  # only cleanup if actually failed endpoint
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
        scheduler.add_job(run_refill_warning_check, "cron", hour="*")  # Check stock level predictions hourly
        scheduler.start()
        logging.info("[SCHEDULER] APScheduler started – checking reminders every minute and refills hourly")
        
        # Run an initial check for refills on start
        try:
            run_refill_warning_check()
        except Exception as e:
            logging.error(f"[STARTUP] Initial refill check failed: {e}")


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


@app.post("/auth/send-code", tags=["Auth"])
def send_code(data: SendCodeSchema, db: Session = Depends(get_db)):
    import random
    if data.purpose == "reset_password":
        user = db.query(User).filter(User.email == data.email).first()
        if not user:
            raise HTTPException(404, "Email not found")
            
    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Delete old codes
    db.query(VerificationCode).filter(
        VerificationCode.email == data.email,
        VerificationCode.purpose == data.purpose
    ).delete()
    
    db_code = VerificationCode(
        email=data.email,
        code=code,
        purpose=data.purpose,
        expires_at=expires_at
    )
    db.add(db_code)
    db.commit()
    
    send_verification_email(data.email, code, data.purpose)
    return {"success": True, "message": "Verification code sent successfully"}


@app.post("/auth/reset-password", tags=["Auth"])
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    # Check verification code
    db_code = db.query(VerificationCode).filter(
        VerificationCode.email == data.email,
        VerificationCode.code == data.code,
        VerificationCode.purpose == "reset_password",
        VerificationCode.expires_at > datetime.utcnow()
    ).first()
    if not db_code:
        raise HTTPException(400, "Invalid or expired verification code")
        
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(404, "Email not found")
        
    user.password = hash_pw(data.new_password)
    db.delete(db_code)  # consume code
    db.commit()
    return {"success": True, "message": "Password updated successfully"}


@app.post("/users/change-password-with-code", tags=["Users"])
def change_password_with_code(
    data: ChangePasswordWithCodeSchema,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user)
):
    # Check verification code
    db_code = db.query(VerificationCode).filter(
        VerificationCode.email == user.email,
        VerificationCode.code == data.code,
        VerificationCode.purpose == "change_password",
        VerificationCode.expires_at > datetime.utcnow()
    ).first()
    if not db_code:
        raise HTTPException(400, "Invalid or expired verification code")
        
    user.password = hash_pw(data.new_password)
    db.delete(db_code)  # consume code
    db.commit()
    return {"success": True, "message": "Password updated successfully"}


@app.delete("/users/account", tags=["Users"])
def delete_own_account(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Delete the currently logged in user's account and associated data."""
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}


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
    if data.name        is not None: user.name   = data.name
    if data.phone       is not None: user.phone  = data.phone
    if data.gender      is not None: user.gender = data.gender
    if data.age         is not None: user.age    = data.age
    if data.weight      is not None: user.weight = data.weight
    if data.height      is not None: user.height = data.height
    if data.blood_group is not None:
        try: user.blood_group = data.blood_group
        except Exception: pass
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
    """Caregiver: list only explicitly linked patients. Admin: list all patients."""
    if user.role not in ("caregiver", "admin"):
        raise HTTPException(403, "Access restricted to caregivers and admins")
    if user.role == "admin":
        patients = db.query(User).filter(User.role == "patient", User.is_active == True).all()
    else:
        # Caregiver sees ONLY their explicitly linked patients
        links = db.query(CaregiverPatient).filter(CaregiverPatient.caregiver_id == user.id).all()
        patient_ids = [lnk.patient_id for lnk in links]
        patients = db.query(User).filter(User.id.in_(patient_ids), User.is_active == True).all() if patient_ids else []
    return [_user_dict(p) for p in patients]


@app.get("/users/patients/search", tags=["Users"])
def search_patients(
    q:    str     = Query("", description="Name or email to search"),
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Caregiver / Admin: search all patients by name or email. Returns is_linked flag."""
    if user.role not in ("caregiver", "admin"):
        raise HTTPException(403, "Access restricted to caregivers and admins")
    query = db.query(User).filter(User.role == "patient", User.is_active == True)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter((User.name.ilike(like)) | (User.email.ilike(like)))
    patients = query.limit(20).all()
    # Determine which ones are already linked to this caregiver
    if user.role == "caregiver":
        links = db.query(CaregiverPatient).filter(CaregiverPatient.caregiver_id == user.id).all()
        linked_ids = {lnk.patient_id for lnk in links}
    else:
        linked_ids = set()
    result = []
    for p in patients:
        d = _user_dict(p)
        d["is_linked"] = p.id in linked_ids
        result.append(d)
    return result


@app.post("/users/patients/link/{patient_id}", tags=["Users"])
def link_patient(
    patient_id: int,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Caregiver: link an existing patient to their care list."""
    if user.role != "caregiver":
        raise HTTPException(403, "Only caregivers can link patients")
    patient = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    existing = db.query(CaregiverPatient).filter(
        CaregiverPatient.caregiver_id == user.id,
        CaregiverPatient.patient_id == patient_id
    ).first()
    if existing:
        return {"message": "Already linked"}
    link = CaregiverPatient(caregiver_id=user.id, patient_id=patient_id)
    db.add(link); db.commit()
    return {"message": "Patient linked successfully"}


@app.delete("/users/patients/unlink/{patient_id}", tags=["Users"])
def unlink_patient(
    patient_id: int,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Caregiver: unlink a patient from their care list (patient account is preserved)."""
    if user.role != "caregiver":
        raise HTTPException(403, "Only caregivers can unlink patients")
    link = db.query(CaregiverPatient).filter(
        CaregiverPatient.caregiver_id == user.id,
        CaregiverPatient.patient_id == patient_id
    ).first()
    if not link:
        raise HTTPException(404, "Link not found")
    db.delete(link); db.commit()
    return {"message": "Patient unlinked successfully"}


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


@app.get("/users/caregivers", tags=["Users"])
def list_caregivers(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Admin only: list all caregivers with their linked patients."""
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    caregivers = db.query(User).filter(User.role == "caregiver", User.is_active == True).all()
    result = []
    for cg in caregivers:
        d = _user_dict(cg)
        # Fetch linked patient IDs
        links = db.query(CaregiverPatient).filter(CaregiverPatient.caregiver_id == cg.id).all()
        patient_ids = [lnk.patient_id for lnk in links]
        linked_patients = db.query(User).filter(User.id.in_(patient_ids), User.is_active == True).all() if patient_ids else []
        d["linked_patients"] = [{"id": p.id, "name": p.name, "email": p.email} for p in linked_patients]
        result.append(d)
    return result


@app.delete("/users/caregivers/{caregiver_id}", tags=["Users"])
def delete_caregiver(
    caregiver_id: int,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    """Admin only: delete a caregiver account."""
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    caregiver = db.query(User).filter(User.id == caregiver_id, User.role == "caregiver").first()
    if not caregiver:
        raise HTTPException(404, "Caregiver not found")
    db.delete(caregiver)
    db.commit()
    return {"message": f"Caregiver {caregiver.name} deleted successfully"}


# ══════════════════════════════════════════════════════════
#  MEDICINE CRUD ROUTES
# ══════════════════════════════════════════════════════════

@app.post("/medicines", tags=["Medicines"])
async def add_medicine(
    data:       MedicineCreate,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    # Validate medicine name
    if data.name:
        vres = await verify_medicine_name_api(data.name)
        if not vres["valid"]:
            raise HTTPException(400, f"'{data.name}' is not recognized as a valid medicine brand or generic name.")
            
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
        formulation=data.formulation or "pill",
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


@app.get("/medicines/history-predict", tags=["Medicines"])
def history_predict(
    disease_name: Optional[str] = Query(None),
    patient_id:   Optional[int] = Query(None),
    db:           Session       = Depends(get_db),
    user:         User          = Depends(get_current_user),
):
    target_id = _resolve_target(user, patient_id)
    if not disease_name:
        raise HTTPException(400, "disease_name parameter is required")
    # Search for any past medicine matching this category/disease (even if soft-deleted)
    med = db.query(Medicine).filter(
        Medicine.user_id == target_id,
        func.lower(Medicine.category) == disease_name.strip().lower()
    ).order_by(Medicine.created_at.desc()).first()
    if not med:
        return {"recurrence_detected": False}
    duration_days = None
    if med.start_date and med.end_date:
        duration_days = (med.end_date - med.start_date).days
    return {
        "recurrence_detected": True,
        "name":                med.name,
        "description":         med.description,
        "dosage":              med.dosage,
        "category":            med.category,
        "formulation":         med.formulation or "pill",
        "stock":               med.stock,
        "schedules":           [s.time for s in med.schedules],
        "duration_days":       duration_days,
        "is_deleted":          med.is_deleted
    }



@app.patch("/medicines/{med_id}", tags=["Medicines"])
async def update_medicine(
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
    if data.name is not None:
        vres = await verify_medicine_name_api(data.name)
        if not vres["valid"]:
            raise HTTPException(400, f"'{data.name}' is not recognized as a valid medicine brand or generic name.")
        med.name = data.name

    if data.description is not None: med.description = data.description
    if data.dosage      is not None: med.dosage      = data.dosage
    if data.category    is not None: med.category    = data.category
    if data.formulation is not None: med.formulation = data.formulation
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
        IntakeLog.log_date       == log_day,
    ).first()

    old_status = existing.status if existing else "pending"
    new_status = data.status

    if old_status == new_status:
        return {"message": "No change", "remaining_stock": med.stock}

    # Formulation-based stock adjustments
    dosage_val = get_dosage_value(med.dosage, med.formulation)
    if old_status == "taken" and new_status in ("missed", "pending"):
        med.stock += dosage_val                 # restore dose stock
    elif old_status != "taken" and new_status == "taken":
        if med.stock >= dosage_val:
            med.stock -= dosage_val             # consume dose stock
        else:
            # Consume whatever is left, down to 0
            med.stock = 0.0

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

    # Check if stock is low (< 10) and send low stock email alert
    if new_status == "taken" and med.stock < 10:
        patient = db.query(User).filter(User.id == target_id).first()
        if patient and patient.email:
            send_low_stock_email(patient.email, patient.name, med.name, med.stock)

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
        # If end_date is not set, medicine only shows on start_date (single-day)
        effective_end = med.end_date if med.end_date else med.start_date
        if med.start_date and log_day < med.start_date:
            continue
        if effective_end and log_day > effective_end:
            continue

        for sch in med.schedules:
            log = db.query(IntakeLog).filter(
                IntakeLog.medicine_id    == med.id,
                IntakeLog.user_id        == target_id,
                IntakeLog.scheduled_time == sch.time,
                IntakeLog.log_date       == log_day,
            ).first()
            
            # Default to missed if time has passed
            status_val = "pending"
            if log:
                status_val = log.status
            elif is_scheduled_time_past(log_day, sch.time):
                status_val = "missed"

            result.append({
                "medicine_id":    med.id,
                "name":           med.name,
                "description":    med.description,
                "dosage":         med.dosage,
                "category":       med.category,
                "formulation":    med.formulation or "pill",
                "stock":          med.stock,
                "low_stock":      med.stock < 10,
                "scheduled_time": sch.time,
                "status":         status_val,
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
        effective_end = med.end_date if med.end_date else med.start_date
        if med.start_date and log_day < med.start_date:
            continue
        if effective_end and log_day > effective_end:
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
                IntakeLog.log_date       == log_day,
            ).first()
            
            status_val = "pending"
            if log:
                status_val = log.status
            elif is_scheduled_time_past(log_day, sch.time):
                status_val = "missed"

            if status_val == "taken":
                taken += 1
            elif status_val == "missed":
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
    target_id = _resolve_target(user, patient_id)
    meds = db.query(Medicine).filter(Medicine.user_id == target_id).all()
    logs = db.query(IntakeLog).filter(IntakeLog.user_id == target_id).all()
    
    log_map = {}
    for log in logs:
        log_map[(log.medicine_id, log.log_date, log.scheduled_time)] = log
        
    today = date.today()
    history_items = []
    
    for med in meds:
        start_d = med.start_date
        if not start_d:
            start_d = med.created_at.date() if med.created_at else today
            
        end_d = med.end_date
        effective_end = end_d if end_d else start_d
        last_d = today
        if effective_end and effective_end < last_d:
            last_d = effective_end
            
        if start_d > last_d:
            continue
            
        curr_d = start_d
        while curr_d <= last_d:
            for sch in med.schedules:
                key = (med.id, curr_d, sch.time)
                log = log_map.get(key)
                
                if log:
                    history_items.append({
                        "id":             log.id,
                        "medicine_name":  med.name + (" (Deleted)" if med.is_deleted else ""),
                        "medicine_id":    med.id,
                        "status":         log.status,
                        "scheduled_time": log.scheduled_time,
                        "log_date":       str(log.log_date),
                        "taken_at":       log.taken_at.strftime("%Y-%m-%d %I:%M %p") if log.taken_at else "—",
                    })
                else:
                    if med.is_deleted:
                        continue
                    
                    status_val = "pending"
                    if is_scheduled_time_past(curr_d, sch.time):
                        status_val = "missed"
                        
                    history_items.append({
                        "id":             f"temp-{med.id}-{curr_d}-{sch.time}",
                        "medicine_name":  med.name,
                        "medicine_id":    med.id,
                        "status":         status_val,
                        "scheduled_time": sch.time,
                        "log_date":       str(curr_d),
                        "taken_at":       "—",
                    })
            curr_d += timedelta(days=1)
            
    def parse_time(item):
        t_str = item["scheduled_time"]
        try:
            h_m, period = t_str.split()
            h, m = map(int, h_m.split(':'))
            if period.lower() == 'pm' and h != 12:
                h += 12
            if period.lower() == 'am' and h == 12:
                h = 0
            return f"{h:02d}:{m:02d}"
        except:
            return "00:00"
            
    history_items.sort(key=lambda x: (x["log_date"], parse_time(x)), reverse=True)
    return history_items


@app.get("/notifications/vapid-key", tags=["Notifications"])
def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}


@app.post("/notifications/subscribe", tags=["Notifications"])
def subscribe_push(data: PushSubscribeSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Check if subscription already exists
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint).first()
    if existing:
        existing.user_id = user.id
        existing.p256dh = data.p256dh
        existing.auth = data.auth
    else:
        new_sub = PushSubscription(
            user_id=user.id,
            endpoint=data.endpoint,
            p256dh=data.p256dh,
            auth=data.auth
        )
        db.add(new_sub)
    db.commit()
    
    # Send a friendly test welcome notification
    sub_info = {
        "endpoint": data.endpoint,
        "keys": {
            "p256dh": data.p256dh,
            "auth": data.auth
        }
    }
    payload = {
        "title": "🎉 PillSync Notifications Active",
        "body": "You will now receive smart reminders and low-stock alerts!",
        "url": "/dashboard"
    }
    send_web_push(sub_info, payload)
    
    return {"message": "Subscription registered successfully"}


@app.post("/notifications/test-push", tags=["Notifications"])
def test_push_notification(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
    if not subs:
        raise HTTPException(400, "No push subscriptions found for this account. Please enable notifications in your browser first.")
    
    success_count = 0
    for sub in subs:
        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth
            }
        }
        payload = {
            "title": "⚡ PillSync Test Push",
            "body": "Congratulations! Web Push notifications are working perfectly on this device.",
            "url": "/dashboard"
        }
        if send_web_push(sub_info, payload):
            success_count += 1
            
    return {"message": f"Test push sent to {success_count} device(s)"}


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
    if data.blood_group is not None: patient.blood_group = data.blood_group
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


# --- Prescription OCR & AI Extraction ---

from fastapi import UploadFile, File

def is_line_blacklisted(line: str, user_name: str) -> bool:
    lower_line = line.lower()
    
    # 1. Base keyword blacklist (hospital details, patient demographics, vitals labels)
    header_blacklist = [
        "hospital", "memorial", "chowmuhani", "ak road", "agartala", "tripura",
        "abha no", "abha address", "token no", "room no", "father/husband",
        "nursing desk", "opd physician", "gandhighat", "visit:",
        "ipd", "demographics", "chief complaint", "clinical finding",
        "name of consultant", "follow up", "substitute with",
        "please go to", "nursing desk", "check up done",
        "your registration is done",
        "weight", "bmi", "temp", "bp ", "bp:", "rr ", "spo2", "spo,", "pulse", "fee", "token",
        "height", "gender", "age ", "years", "yrs", "kg", "cm", "doctor", "physician", "patient",
        "sex", "receipt", "charge", "bill", "payment", "date", "time"
    ]
    if any(bad in lower_line for bad in header_blacklist):
        return True
        
    # 2. Dynamic user name parts blacklist (skip short words like "Dr", "Mr")
    if user_name:
        name_parts = [part.strip().lower() for part in user_name.split() if len(part.strip()) > 2]
        # Only block if user's name appears AND line does NOT contain medicine keywords
        med_keywords = ["tab", "cap", "syr", "oint", "inj", "drop", "mg", "ml", "dose"]
        if name_parts and any(part in lower_line for part in name_parts):
            if not any(mk in lower_line for mk in med_keywords):
                return True
            
    # 3. Pattern match for Age / Gender (e.g., 21y/Female, 35 y/m)
    if re.search(r"\d+\s*y\s*/\s*(female|male|f|m)\b", lower_line):
        return True
        
    # 4. Pattern match for ABHA / email
    if "abdm" in lower_line:
        return True
    if re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", lower_line):
        return True
    # Masked phone numbers (with X patterns like 94XXXXXX72)
    if re.search(r"\d{2,}[xX]{4,}\d{0,4}", lower_line):
        return True
        
    # 5. Lines that are ONLY numbers/symbols with no useful text
    strip_alpha = re.sub(r"[^a-zA-Z]", "", lower_line)
    if len(strip_alpha) < 2:
        return True
        
    return False



@app.post("/medicines/upload-ocr", tags=["OCR & AI"])
async def upload_prescription_ocr(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
    user: User       = Depends(get_current_user),
):
    """
    Multi-pass Tesseract OCR with handwriting-optimised image preprocessing,
    filtered to ignore hospital header/address noise, then Groq LLaMA 3.3
    extracts ALL medications with complete clinical fields.
    """
    if not TESSERACT_AVAILABLE:
        raise HTTPException(500, "Tesseract OCR engine is not installed on the server.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # ── Pass 1: upscale 3x for better handwriting resolution ──────────
        w, h = image.size
        large = image.resize((w * 3, h * 3), Image.LANCZOS)

        # ── Pass 2: grayscale + high contrast + sharpen ───────────────────
        gray = large.convert("L")
        gray = ImageEnhance.Contrast(gray).enhance(2.5)
        gray = ImageEnhance.Sharpness(gray).enhance(2.2)
        gray = gray.filter(ImageFilter.SHARPEN)

        custom_config_1 = r"--oem 3 --psm 6"   # uniform block of text
        custom_config_2 = r"--oem 3 --psm 4"   # single column
        custom_config_3 = r"--oem 3 --psm 3"   # fully automatic

        texts = []
        for cfg in [custom_config_1, custom_config_2, custom_config_3]:
            t = pytesseract.image_to_string(gray, config=cfg)
            if t.strip():
                texts.append(t.strip())

        # Also try on original image
        t_orig = pytesseract.image_to_string(image)
        if t_orig.strip():
            texts.append(t_orig.strip())

        seen_lines = set()
        combined_lines = []
        for block in texts:
            for line in block.split("\n"):
                clean = line.strip()
                if not clean:
                    continue
                # Skip header/address/demographics
                if is_line_blacklisted(clean, user.name):
                    continue
                if clean not in seen_lines:
                    seen_lines.add(clean)
                    combined_lines.append(clean)

        raw_text_combined = "\n".join(combined_lines)
        raw_text_display  = "\n".join([l.strip() for l in (t_orig.strip() or (texts[0] if texts else "")).split("\n") if l.strip() and not is_line_blacklisted(l.strip(), user.name)])

    except Exception as e:
        raise HTTPException(400, f"Could not process image file: {str(e)}")

    extracted_medicines = []
    today_str = date.today().strftime("%Y-%m-%d")

    if not raw_text_combined:
        return {"success": True, "medicines": [], "raw_text": "", "message": "No text detected in image"}

    if GROQ_AVAILABLE and GROQ_API_KEY:
        try:
            client = Groq(api_key=GROQ_API_KEY)
            prompt = f"""You are an expert clinical pharmacist and AI prescription parser. Your ONLY job is to extract the PRESCRIBED MEDICINES from the provided OCR text.

RAW OCR TEXT FROM PRESCRIPTION:
{raw_text_combined}

TODAY'S DATE: {today_str}

=== STRICT CLINICAL PARSING INSTRUCTIONS ===

1. IDENTIFY THE PRESCRIPTION LAYOUT STYLE:
   - STYLE A (Grid/Table): Look for rows with columns mapping "Medicine Name", "Dosage", "Duration" (e.g. "TAB. ABCIXIMAB  1 Morning  8 Days (Tot:8 Tab)").
   - STYLE B (Handwritten List): Look for items numbered with 1), (1), ①, or bullet points, often followed by shorthand dosages (e.g., "1 -- x -- 1", "BD/PC", "5 times a day").
   - STYLE C (Free-form text): Any listing of medicine names following an "Rx", "R", "Plan", or "Advice" marker.

2. EXTRACT MEDICINE NAME & FORMULATION:
   - Extract the core medicine name and strength. Remove formulation prefixes like "TAB.", "TAB", "CAP.", "CAP", "SYR.", "SYR", "OINT", "INJ" from the name field, but keep modifiers/dosages like "500", "10/SR", "800mg".
   - Map formulation:
     - Contains "tab", "tablet", "ab" → "tablet"
     - Contains "cap", "capsule" → "capsule"
     - Contains "syr", "syrup", "suspension", "liquid" → "liquid"
     - Contains "oint", "ointment", "cream", "gel" → "ointment"
     - Contains "inj", "injection", "vial", "ampoule" → "injection"
     - Contains "drop", "drops", "eye drop", "ear drop" → "drops"
     - Contains "spray", "inhaler" → "spray"
   - Correct OCR typos using medical knowledge:
     - "SOPRAD" / "SOFRADEX" / "Sofradex" → "Sofradex Ointment" (formulation: ointment)
     - "Atyrovie" / "ACYCLOVIR" / "Acyclovir" → "Acyclovir"
     - "Zoclar 500" / "ZOCLAR 500" → "Zoclar 500"
     - "Sizodon Plus" / "SizodonPlus" → "Sizodon Plus"
     - "Qutipin 200mg" / "Quetipin" → "Qutipin 200mg"
     - "Ativan 2mg" / "Lorazepam" → "Ativan 2mg"
     - "Rivotril 0.5mg" / "Clonazepam" → "Rivotril 0.5mg"
     - "Serta 50mg" / "Sertraline" → "Serta 50mg"

3. NEVER EXTRACT THE DIAGNOSIS/DISEASE AS A MEDICINE:
   - DIAGNOSES are NOT medicines. NEVER add them to the list of medicines.
   - Examples of diagnosis lines to skip: "Malaria", "Herpes Zoster Oticus", "Shingles", "Chr. Schizophrenia", "Otitis Externa Left", "DM", "HTN", "Headache", "Fever".
   - Put this diagnosis into the "category" and "disease_name" field for all extracted medicines. If no diagnosis is found, use "Other".

4. PARSE FREQUENCY & DOSAGE:
   - Translate frequency into `times_per_day` and standard daily `times`:
     - Shorthand dashes:
       - `1-0-1` or `1 - x - 1` or `1 -- 0 -- 1` (Morning & Night) → times_per_day: 2, times: ["08:00 am", "08:00 pm"]
       - `1-1-1` or `1 - 1 - 1` or `1 -- 1 -- 1` (Morning, Afternoon, Night) → times_per_day: 3, times: ["08:00 am", "02:00 pm", "08:00 pm"]
       - `1-0-0` or `1 - x - x` or `1 -- x -- x` (Morning only) → times_per_day: 1, times: ["08:00 am"]
       - `0-0-1` or `x - x - 1` or `x -- x -- 1` (Night only) → times_per_day: 1, times: ["09:00 pm"]
     - Text instructions:
       - "1 Morning, 1 Night" / "BD" / "twice daily" → times_per_day: 2, times: ["08:00 am", "08:00 pm"]
       - "1 Morning" / "OD" / "once daily" → times_per_day: 1, times: ["08:00 am"]
       - "1 Night" / "once daily at night" / "bedtime" / "HS" → times_per_day: 1, times: ["09:00 pm"]
       - "5 times a day" → times_per_day: 5, times: ["08:00 am", "11:00 am", "02:00 pm", "06:00 pm", "10:00 pm"]
       - "PRN" / "as needed" → times_per_day: 1, times: ["08:00 am"] (dosage: "As needed")

5. CALCULATE DATES AND STOCK:
   - start_date is always "{today_str}".
   - Parse duration: "8 Days" = 8 days, "3 Days" = 3 days, "4 Days" = 4 days, "6 months" = 180 days, "x 7 DAYS" = 7 days.
   - Set end_date = start_date + duration in days.
   - Stock calculation:
     - Look for total tablets in text (e.g. "Tot: 16 Tab" → stock: 16; "Tot:8 Tab" → stock: 8; "10" in a circle → stock: 10).
     - Otherwise, calculate stock = times_per_day * duration_days.
     - If duration is not specified, default stock = 14.

6. FORMAT INSTRUCTIONS:
   - Extract food instructions: "After Food" / "PC" → "Take after meals", "Before Breakfast" / "BBF" / "AC" → "Take before meals".

Respond ONLY with this exact JSON format (no markdown, no extra text, no explanation):
{{
  "medicines": [
    {{
      "name": "Medicine Name (e.g. Abciximab or Sizodon Plus)",
      "dosage": "1 tablet once daily in the morning / as directed",
      "formulation": "tablet|capsule|liquid|ointment|injection|drops|spray",
      "category": "Malaria / Chr. Schizophrenia / Otitis Externa / etc.",
      "disease_name": "Malaria / Chr. Schizophrenia / Otitis Externa / etc.",
      "start_date": "{today_str}",
      "end_date": "YYYY-MM-DD",
      "times_per_day": 2,
      "times": ["08:00 am", "08:00 pm"],
      "instructions": "Take after food / Take before breakfast / etc.",
      "stock": 16
    }}
  ]
}}"""
            completion = call_groq_with_fallback(
                client,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.05
            )
            resp_str = completion.choices[0].message.content.strip()
            
            # Robust JSON extraction by finding first '{' and last '}'
            first_idx = resp_str.find('{')
            last_idx = resp_str.rfind('}')
            if first_idx != -1 and last_idx != -1:
                resp_str = resp_str[first_idx:last_idx+1]
                
            parsed = json.loads(resp_str)

            raw_list = []
            if isinstance(parsed, dict) and "medicines" in parsed and isinstance(parsed["medicines"], list):
                raw_list = parsed["medicines"]
            elif isinstance(parsed, list):
                raw_list = parsed
                
            # Sanitize all items to prevent breakouts/crashes
            sanitized = []
            for med in raw_list:
                if not isinstance(med, dict):
                    continue
                category = med.get("category") or med.get("disease_name") or "Other"
                
                times_per_day = med.get("times_per_day")
                try:
                    times_per_day = int(times_per_day)
                except (ValueError, TypeError):
                    times_per_day = 1
                
                times = med.get("times")
                if not isinstance(times, list) or not times:
                    times = ["08:00 am"]
                else:
                    times = [str(t) for t in times]
                
                stock = med.get("stock")
                try:
                    stock = int(stock)
                except (ValueError, TypeError):
                    stock = 14
                    
                sanitized.append({
                    "name": str(med.get("name") or "Prescribed Medicine").strip(),
                    "dosage": str(med.get("dosage") or "As directed").strip(),
                    "formulation": str(med.get("formulation") or "tablet").strip().lower(),
                    "category": str(category).strip(),
                    "disease_name": str(category).strip(),
                    "start_date": str(med.get("start_date") or today_str).strip(),
                    "end_date": str(med.get("end_date") or "").strip(),
                    "times_per_day": times_per_day,
                    "times": times,
                    "instructions": str(med.get("instructions") or "").strip(),
                    "stock": stock
                })
            extracted_medicines = sanitized

            # ── Post-process: verify each medicine name via RxNorm/OpenFDA ──
            verified_medicines = []
            for med in extracted_medicines:
                med_name = med.get("name", "").strip()
                # Skip very short or obviously non-medicine strings
                if len(med_name) < 3:
                    verified_medicines.append(med)
                    continue
                try:
                    vres = await verify_medicine_name_api(med_name)
                    if vres.get("valid") and vres.get("canonical"):
                        canonical = vres["canonical"]
                        # Only replace if the canonical is meaningfully different (not just casing)
                        if canonical.lower() != med_name.lower():
                            med["name"] = canonical
                            med["_verified_source"] = vres["source"]
                        else:
                            med["_verified_source"] = vres["source"]
                    else:
                        med["_verified_source"] = "unverified"
                except Exception:
                    med["_verified_source"] = "unverified"
                verified_medicines.append(med)
            extracted_medicines = verified_medicines
        except Exception as err:
            logging.warning(f"[OCR Multi-Medicine AI Error] Fallback: {err}")

    # Fallback: line parser ignoring blacklist
    if not extracted_medicines:
        non_empty = [l.strip() for l in raw_text_display.split("\n") if len(l.strip()) > 3]
        clean_lines = [l for l in non_empty if not is_line_blacklisted(l, user.name)]
        
        valid_med_lines = []
        for cl in clean_lines:
            # Check if it has clear medicine markers
            has_marker = any(mk in cl.lower() for mk in ["tab", "cap", "syr", "oint", "inj", "drop", "mg", "ml", "tablet", "capsule", "syrup", "ointment", "injection"])
            
            # Check if RxNorm/OpenFDA recognizes it
            is_valid_med = False
            try:
                vres = await verify_medicine_name_api(cl)
                if vres.get("valid"):
                    is_valid_med = True
                    if vres.get("canonical"):
                        cl = vres["canonical"]
            except Exception:
                pass
                
            if is_valid_med or (has_marker and len(re.sub(r"[^a-zA-Z]", "", cl)) >= 3):
                valid_med_lines.append(cl)

        if valid_med_lines:
            extracted_medicines = []
            for name in valid_med_lines[:3]:  # Limit to top 3
                form = "capsule" if "cap" in name.lower() else "liquid" if "syr" in name.lower() or "liquid" in name.lower() else "tablet"
                extracted_medicines.append({
                    "name": name,
                    "dosage": "1 capsule" if form == "capsule" else "1 tsp" if form == "liquid" else "1 tablet",
                    "formulation": form,
                    "category": "Other",
                    "disease_name": "",
                    "start_date": today_str,
                    "end_date": "",
                    "times_per_day": 1,
                    "times": ["08:00 am"],
                    "instructions": "",
                    "stock": 14
                })
        else:
            extracted_medicines = []

    return {"success": True, "medicines": extracted_medicines, "raw_text": raw_text_display}


@app.get("/medicines/verify-name", tags=["Medicine Verification"])
async def verify_medicine_endpoint(
    name: str = Query(..., min_length=2),
    user: User = Depends(get_current_user)
):
    """
    Validates a medicine name against free global databases (RxNorm NIH & OpenFDA).
    Returns canonical name, match status, and suggestions to prevent non-medicine entry.
    """
    return await verify_medicine_name_api(name)



@app.get("/medicines/refill-predictions", tags=["Milestone 3 - Refill Engine"])
def get_refill_predictions(
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    """
    AI Refill Prediction Engine: Calculates daily consumption rates,
    estimated stock depletion dates, and refill status.
    """
    target_id = _resolve_target(user, patient_id)
    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).all()
    
    predictions = []
    today = date.today()

    for med in meds:
        schedules = db.query(Schedule).filter(Schedule.medicine_id == med.id).all()
        daily_frequency = max(len(schedules), 1)
        units_per_day = daily_frequency
        current_stock = max(med.stock, 0)
        
        if current_stock == 0:
            status = "out_of_stock"
            status_label = "Out of Stock"
            days_remaining = 0
            depletion_str = "Depleted Today"
            recommended_refill_str = "Immediate Refill Required"
        else:
            days_remaining = current_stock // units_per_day if units_per_day > 0 else 30
            depletion_date = today + timedelta(days=days_remaining)
            depletion_str = f"{depletion_date.strftime('%Y-%m-%d')} ({days_remaining}d left)"
            
            refill_date = depletion_date - timedelta(days=5)
            if refill_date <= today:
                recommended_refill_str = "Immediate Refill Required"
            else:
                recommended_refill_str = refill_date.strftime("%Y-%m-%d")

            if days_remaining <= 2:
                status = "critical"
                status_label = "Critical Low Stock"
            elif days_remaining <= 5:
                status = "refill_recommended"
                status_label = "Refill Recommended"
            else:
                status = "healthy"
                status_label = "Healthy Stock"

        predictions.append({
            "medicine_id": med.id,
            "medicine_name": med.name,
            "category": med.category or "Other",
            "formulation": med.formulation or "tablet",
            "current_stock": current_stock,
            "daily_consumption": units_per_day,
            "days_remaining": days_remaining,
            "depletion_date": depletion_str,
            "recommended_refill_date": recommended_refill_str,
            "status": status,
            "status_label": status_label
        })

    return {"predictions": predictions}



@app.get("/analytics/adherence-reports", tags=["Milestone 3 - Analytics"])
def get_adherence_analytics(
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    """
    Calculates REAL 7-day adherence trends, overall consistency score,
    and missed dose analysis based on actual database logs and active schedules.
    """
    target_id = _resolve_target(user, patient_id)
    today = date.today()
    
    # Active patient schedules
    active_med_ids = [m.id for m in db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).all()]
    total_daily_schedules = db.query(Schedule).filter(Schedule.medicine_id.in_(active_med_ids)).count() if active_med_ids else 0

    trend = []
    total_taken = 0
    total_scheduled = 0

    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_str = day_date.strftime("%Y-%m-%d")
        day_label = day_date.strftime("%a")
        
        logs = db.query(IntakeLog).filter(IntakeLog.user_id == target_id, IntakeLog.log_date == day_str).all()
        day_taken = sum(1 for l in logs if l.status == "taken")
        day_missed = sum(1 for l in logs if l.status == "missed")
        
        # Expected doses for the day: max of actual logged entries or daily scheduled count
        expected_doses = max(len(logs), total_daily_schedules)
        
        if expected_doses > 0:
            pct = round((day_taken / expected_doses) * 100)
        else:
            pct = 0
            
        total_taken += day_taken
        total_scheduled += expected_doses
        
        trend.append({
            "date": day_str,
            "day": day_label,
            "taken": day_taken,
            "missed": day_missed,
            "total": expected_doses,
            "adherence_pct": pct
        })

    # 30-Day Monthly Trend (4 Weekly Blocks)
    monthly_trend = []
    total_missed_30 = 0
    for w in range(3, -1, -1):
        w_start = today - timedelta(days=(w + 1) * 7 - 1)
        w_end = today - timedelta(days=w * 7)
        w_logs = db.query(IntakeLog).filter(
            IntakeLog.user_id == target_id,
            IntakeLog.log_date >= w_start.strftime("%Y-%m-%d"),
            IntakeLog.log_date <= w_end.strftime("%Y-%m-%d")
        ).all()
        w_taken = sum(1 for l in w_logs if l.status == "taken")
        w_missed = sum(1 for l in w_logs if l.status == "missed")
        total_missed_30 += w_missed
        w_total = max(len(w_logs), total_daily_schedules * 7)
        w_pct = round((w_taken / w_total * 100)) if w_total > 0 else 0
        monthly_trend.append({
            "label": f"Wk {4 - w}",
            "period": f"{w_start.strftime('%b %d')} - {w_end.strftime('%b %d')}",
            "taken": w_taken,
            "missed": w_missed,
            "adherence_pct": w_pct
        })

    # Refill Stock Overview
    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).all()
    full_stock_count = 0
    refill_needed_count = 0
    out_of_stock_count = 0
    for m in meds:
        if m.stock <= 0:
            out_of_stock_count += 1
        elif m.stock <= 10:
            refill_needed_count += 1
        else:
            full_stock_count += 1

    if not active_med_ids or total_scheduled == 0:
        overall_pct = 0
        consistency_grade = "No Active Medicines"
    else:
        overall_pct = round((total_taken / total_scheduled * 100))
        if overall_pct >= 85:
            consistency_grade = "High Adherence"
        elif overall_pct >= 60:
            consistency_grade = "Moderate Adherence"
        else:
            consistency_grade = "Needs Attention"

    return {
        "overall_pct": overall_pct,
        "total_taken": total_taken,
        "total_scheduled": total_scheduled,
        "total_missed_30": total_missed_30,
        "consistency_grade": consistency_grade,
        "weekly_trend": trend,
        "monthly_trend": monthly_trend,
        "stock_overview": {
            "full_stock": full_stock_count,
            "refill_recommended": refill_needed_count,
            "out_of_stock": out_of_stock_count
        }
    }


# ══════════════════════════════════════════════════════════
#  WATER INTAKE ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/water/today", tags=["Water Intake"])
def get_water_intake(
    date_str: str = Query(...),
    db:       Session = Depends(get_db),
    user:     User    = Depends(get_current_user)
):
    log = db.query(WaterIntake).filter(WaterIntake.user_id == user.id, WaterIntake.date_str == date_str).first()
    if not log:
        log = WaterIntake(user_id=user.id, date_str=date_str, amount=0, target=2000)
        db.add(log)
        db.commit()
        db.refresh(log)
    return {"amount": log.amount, "target": log.target}


@app.post("/water/add", tags=["Water Intake"])
def add_water_intake(
    data: WaterIntakeAddSchema,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user)
):
    log = db.query(WaterIntake).filter(WaterIntake.user_id == user.id, WaterIntake.date_str == data.date_str).first()
    if not log:
        log = WaterIntake(user_id=user.id, date_str=data.date_str, amount=data.amount, target=data.target or 2000)
        db.add(log)
    else:
        log.amount += data.amount
        if data.target:
            log.target = data.target
    db.commit()
    db.refresh(log)
    return {"amount": log.amount, "target": log.target}


# ══════════════════════════════════════════════════════════
#  EMERGENCY CONTACTS ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/emergency-contacts", tags=["Emergency Contacts"])
def get_emergency_contacts(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user)
):
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
    return [{"id": c.id, "name": c.name, "phone": c.phone, "relation": c.relation, "email": getattr(c, "email", None)} for c in contacts]


@app.post("/emergency-contacts", tags=["Emergency Contacts"])
def add_emergency_contact(
    data: EmergencyContactCreateSchema,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user)
):
    contact = EmergencyContact(
        user_id=user.id,
        name=data.name,
        phone=data.phone,
        relation=data.relation,
        email=data.email
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return {"id": contact.id, "name": contact.name, "phone": contact.phone, "relation": contact.relation, "email": getattr(contact, "email", None)}


@app.delete("/emergency-contacts/{contact_id}", tags=["Emergency Contacts"])
def delete_emergency_contact(
    contact_id: int,
    db:         Session = Depends(get_db),
    user:       User    = Depends(get_current_user)
):
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id, EmergencyContact.user_id == user.id).first()
    if not contact:
        raise HTTPException(404, "Emergency contact not found")
    db.delete(contact)
    db.commit()
    return {"success": True, "message": "Emergency contact deleted"}


@app.patch("/emergency-contacts/{contact_id}", tags=["Emergency Contacts"])
def update_emergency_contact(
    contact_id: int,
    data:       EmergencyContactCreateSchema,
    db:         Session = Depends(get_db),
    user:       User    = Depends(get_current_user)
):
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id, EmergencyContact.user_id == user.id).first()
    if not contact:
        raise HTTPException(404, "Emergency contact not found")
    contact.name = data.name
    contact.phone = data.phone
    contact.relation = data.relation
    contact.email = data.email
    db.commit()
    db.refresh(contact)
    return {"id": contact.id, "name": contact.name, "phone": contact.phone, "relation": contact.relation, "email": getattr(contact, "email", None)}



# ══════════════════════════════════════════════════════════
#  AI CHATBOT ASSISTANT
# ══════════════════════════════════════════════════════════

@app.post("/chat/ask", tags=["AI Chat"])
def ask_chatbot(data: ChatAskSchema, user: User = Depends(get_current_user)):
    if not GROQ_AVAILABLE or not GROQ_API_KEY:
        return {"response": "Hi! I am PillSync Assistant. Unfortunately, my AI brain (Groq) is currently offline on this server, but I am still here to help you manage your daily medications!"}
    
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        
        system_prompt = (
            "You are PillSync AI, a concise clinical health assistant. "
            "Answer in 2-3 short sentences max. Be direct and accurate. "
            "No lengthy explanations. If about dosage changes, add: 'Consult your doctor before changing doses.'"
        )
        
        completion = call_groq_with_fallback(
            client,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.query}
            ],
            temperature=0.6,
            max_tokens=150
        )
        response_text = completion.choices[0].message.content.strip()
        return {"response": response_text}
    except Exception as err:
        logging.error(f"[AI Chatbot Error]: {err}")
        return {"response": "Sorry, I encountered an issue processing that query. Please try again shortly!"}


# ══════════════════════════════════════════════════════════
#  HEALTH CHECK
# ══════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
def root():
    return {
        "message":   "PillSync API running",
        "version":   "3.0.0",
        "scheduler": SCHEDULER_AVAILABLE,
        "sendgrid":  SENDGRID_AVAILABLE and bool(SENDGRID_KEY),
        "tesseract": TESSERACT_AVAILABLE,
        "groq":      GROQ_AVAILABLE and bool(GROQ_API_KEY),
    }


# ── HOW TO RUN ──────────────────────────────────────────
# cd backend
# venv\Scripts\activate
# uvicorn main:app --reload