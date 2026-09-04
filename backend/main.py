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
import os, logging, io, json, re, base64, requests
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
    PIL_AVAILABLE = True
    if os.path.exists(TESSERACT_EXE):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE
except ImportError:
    TESSERACT_AVAILABLE = False
    PIL_AVAILABLE = False
    logging.warning("pytesseract or PIL not installed – OCR disabled")

SECRET_KEY    = os.getenv("SECRET_KEY", "fallback-secret-change-in-production")
ALGORITHM     = "HS256"
EXPIRE        = 1440          # minutes (1 day)
SENDGRID_KEY   = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL     = os.getenv("SENDGRID_FROM_EMAIL", os.getenv("FROM_EMAIL", "noreply@pillsync.app"))
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL     = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
VAPID_PUBLIC_KEY  = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS      = {"sub": "mailto:noreply@pillsync.app"}

def call_groq_with_fallback(client, **kwargs):
    """Executes a Groq completion call with model fallbacks if a model gets decommissioned."""
    models_to_try = [
        GROQ_MODEL,
        "qwen/qwen3.8-27b",
        "qwen/qwen3.6-27b",
        "groq/compound-mini",
        "openai/gpt-oss-120b",
        "groq/compound"
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

# ── Medicine Name Verification via Curated Global & Indian Drug Database + RxNorm + OpenFDA + AI Fallback ──
COMMON_DRUG_NAMES = {
    # Antibiotics & Antiprotozoals
    "metrogyl", "metronidazole", "flagyl", "rifagut", "rifaximin", "rcifax",
    "amoxicillin", "moxikind", "augmentin", "clavam", "novamox", "mox",
    "azithral", "azithromycin", "aziwok", "zady", "azee", "zithrox",
    "ciprobid", "ciprofloxacin", "cifran", "ciro", "ciplox",
    "ofloxacin", "oflox", "zanocin", "levofloxacin", "levomac", "levo",
    "cefixime", "zifi", "taxim-o", "ceftas", "mahacef", "omnix",
    "cefpodoxime", "gudcef", "doxcef", "mono-cef", "monocef", "taxim",
    "doxycycline", "doxy-1", "doxy", "minoz", "minocycline", "tetracycline",
    "norflox", "norfloxacin", "norbactin", "bactrim", "septran",
    "clarithromycin", "claribid", "maclar", "zoclar", "erythromycin",
    "faropenem", "farobact", "linezolid", "linid", "lizomac",

    # Antacids, PPIs, GI
    "pan", "pan 40", "pan-d", "pan 20", "pantocid", "pantocid-dsr", "pantoprazole",
    "pantop", "pantodac", "omez", "omez-d", "omeprazole", "rabeprazole",
    "rabicip", "rablet", "rabium", "rantac", "rantac 150", "rantac 300",
    "ranitidine", "aciloc", "aciloc 150", "aciloc 300", "famotidine", "facid",
    "gelusil", "gelusil mps", "digene", "mucaine", "mucaine gel", "sucralfate",
    "pudin hara", "eno", "gaviscon", "cremaffin", "dulcoflex", "bisacodyl",
    "lactulose", "duphalac", "peg", "movicol", "looz", "cremaffin plus",
    "eldoper", "loperamide", "imodium", "econorm", "darolac", "vizylac",
    "normaxin", "librax", "cyclopam", "meftal spas", "drotin", "drotin-m",
    "drotaverine", "colimex", "spasmonil", "ondem", "ondansetron", "vomikind",
    "domperidone", "domstal", "motilium", "ganaton", "itopride",

    # Pain, Fever, Anti-inflammatory
    "paracetamol", "dolo", "dolo 650", "calpol", "calpol 650", "calpol 500",
    "calpol 250", "crocin", "crocin 650", "crocin advance", "pacimol", "p-650",
    "combiflam", "ibuprofen", "brufen", "ibugesic", "ibugesic plus",
    "meftal", "mefenamic acid", "meftal-p", "aspirin", "ecosprin", "ecosprin 75",
    "ecosprin 150", "disprin", "aspin", "diclofenac", "voveran", "dynapar",
    "zerodol", "zerodol-p", "zerodol-sp", "zerodol-th", "aceclofenac",
    "naproxen", "naprosyn", "ketorolac", "ketorol", "tramadol", "tramazac",
    "ultracet", "etoricoxib", "nucoxia", "etoshine",

    # Allergy, Cough, Cold, Respiratory
    "cetirizine", "cetzine", "cetcip", "alerdiz", "okacet",
    "levocetirizine", "levocet", "l-cet", "xyzall", "teczine", "1-alm",
    "fexofenadine", "allegra", "allegra 120", "allegra 180", "fexova",
    "montelukast", "montair", "montek", "montair lc", "montek lc", "telekast-l",
    "avil", "pheniramine", "benadryl", "ascoril", "ascoril-d", "ascoril ls",
    "grilinctus", "grilinctus-bm", "alex", "alex syrup", "solvin cold", "sinarest",
    "cheston cold", "wikoryl", "maxtra", "chericof", "tusq", "tusq-d", "cough syrup",
    "asthalin", "salbutamol", "duolin", "budecort", "budesonide", "foracort",
    "seroflo", "deriphyllin", "theophylline",

    # Diabetes, Blood Pressure, Heart
    "metformin", "glycomet", "glycomet gp", "glycomet 500", "glycomet 850", "glycomet 1g",
    "glimepiride", "amaryl", "gemer", "glimestar", "gliclazide", "diamicron",
    "teneligliptin", "tenlimac", "ziten", "sitagliptin", "januvia", "janumet",
    "vildagliptin", "galvus", "galvus met", "dapagliflozin", "forxiga", "oxra",
    "empagliflozin", "jardiance", "insulin", "lantus", "novorapid", "mixtard",
    "telmisartan", "telma", "telma 40", "telma 80", "telmikind", "telpres", "telsartan",
    "amlodipine", "amlokind", "amlopres", "stamlo", "stamlo 5", "losartan", "losacar", "repace",
    "olmesartan", "olmat", "ramipril", "cardace", "enalapril", "envas",
    "atenolol", "aten", "metoprolol", "metolar", "betaloc", "propranolol", "ciplar",
    "atorvastatin", "atorva", "atorlip", "lipitor", "rosuvastatin", "rosuvas", "rosave",
    "clopidogrel", "clopilet", "plavix", "vymada", "cidmus",

    # Vitamins, Minerals, Supplements, Thyroid, Hormones
    "vitamin c", "limcee", "celin", "vitamin d", "vitamin d3", "calcirol", "uprise-d3", "d-rise",
    "vitamin e", "evion", "evion 400", "evion 600", "neurobion", "neurobion forte", "becosules",
    "supradyn", "zincovit", "a to z", "shelcal", "shelcal 500", "shelcal hd", "calcium",
    "cipcal", "gemcal", "autrin", "dexorange", "orofer xt", "feronia xt", "folvite", "folic acid",
    "thyronorm", "thyronorm 25", "thyronorm 50", "thyronorm 75", "thyronorm 100", "eltroxin", "levothyroxine",
    "duphaston", "dydrogesterone", "susten", "progesterone", "ovabless",

    # Antivirals, Antifungals, Topicals, Eye/Ear
    "acyclovir", "acivir", "zovirax", "valacyclovir", "valcivir",
    "fluconazole", "forcan", "fluka", "diflucan", "itraconazole", "canditral", "itrasys",
    "terbinafine", "tyza", "terbicip", "sofradex", "ciidex", "gentamicin", "tobramycin",
    "tobrex", "moxicip", "moxifloxacin", "vigamox", "refresh tears", "systane",
    "betadine", "povidone iodine", "t-bact", "mupirocin", "fucidin", "quadriderm",
    "candid", "clotrimazole", "candid-b", "volini", "moov", "omnigel", "relispray"
}

def clean_drug_term(name: str) -> str:
    s = re.sub(r"\b\d+(\.\d+)?\s*(?:mg|ml|mcg|gm|g|iu|%)?\b", "", name, flags=re.IGNORECASE)
    s = re.sub(r"\b(tablet|tablets|capsule|capsules|ointment|cream|gel|syrup|suspension|drops|injection|spray|solution|lotion)\b", "", s, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", s).strip()

async def verify_medicine_name_api(name: str) -> dict:
    """
    Checks a medicine name against Curated Drug DB, RxNorm, OpenFDA, and AI Fallback.
    Returns {valid: bool, canonical: str|None, suggestions: list[str], source: str}
    """
    result = {"valid": False, "canonical": None, "suggestions": [], "source": "none"}
    if not name or len(name.strip()) < 2:
        return result
    
    raw = name.strip()
    clean = clean_drug_term(raw)
    
    # 1. Direct dictionary check on clean term or raw term
    raw_lower = raw.lower()
    clean_lower = clean.lower()
    
    for term in [clean_lower, raw_lower]:
        if not term:
            continue
        if term in COMMON_DRUG_NAMES:
            result["valid"] = True
            result["canonical"] = raw.title()
            result["suggestions"] = [raw.title()]
            result["source"] = "curated_db"
            return result
        # Check exact prefix match
        matches = [d.title() for d in COMMON_DRUG_NAMES if d == term or d.startswith(term + " ") or (len(term) >= 4 and term in d)]
        if matches:
            result["valid"] = True
            result["canonical"] = raw.title()
            result["suggestions"] = matches[:5]
            result["source"] = "curated_db"
            return result

    # 2. Query RxNorm API
    query_term = clean if clean else raw
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            rx_url = f"https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={url_quote(query_term)}&maxEntries=5"
            resp = await client.get(rx_url)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("approximateGroup", {}).get("candidate", [])
                valid_candidates = []
                for c in candidates:
                    c_name = c.get("name", "")
                    try:
                        score = float(c.get("score", 0))
                    except Exception:
                        score = 0
                    c_words = [w.lower() for w in c_name.split()]
                    q_first = query_term.lower().split()[0] if query_term.split() else ""
                    if score >= 50 and (q_first in c_words or any(w.startswith(q_first) and len(q_first) >= 3 for w in c_words)):
                        valid_candidates.append(c_name)
                
                if valid_candidates:
                    result["valid"] = True
                    result["canonical"] = valid_candidates[0]
                    result["suggestions"] = list(dict.fromkeys(valid_candidates))[:5]
                    result["source"] = "rxnorm"
                    return result
    except Exception:
        pass

    # 3. Query OpenFDA API
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            fda_url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{url_quote(query_term)}"+openfda.brand_name:"{url_quote(query_term)}"&limit=3'
            resp = await client.get(fda_url)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                brands = []
                for r in results:
                    brands.extend(r.get("openfda", {}).get("brand_name", []))
                    brands.extend(r.get("openfda", {}).get("generic_name", []))
                if brands:
                    result["valid"] = True
                    result["canonical"] = brands[0].title()
                    result["suggestions"] = list(dict.fromkeys([b.title() for b in brands]))[:5]
                    result["source"] = "openfda"
                    return result
    except Exception:
        pass

    # 4. Fast Groq AI Fallback
    if GROQ_AVAILABLE and GROQ_API_KEY:
        try:
            from groq import Groq
            g_client = Groq(api_key=GROQ_API_KEY)
            sys_msg = (
                "You are an expert clinical pharmacist verifying medication authenticity. "
                "Determine if the term is an authentic medication, active pharmaceutical ingredient, or real pharmaceutical brand in global or regional markets (especially India, US, UK, EU). "
                "Reply ONLY in JSON: {\"valid\": true or false, \"canonical\": \"Standard Medication Name or null\"}"
            )
            chat_comp = g_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": f"Medication query: {raw}"}
                ],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"},
                temperature=0.0,
                timeout=3.0
            )
            content = chat_comp.choices[0].message.content
            parsed = json.loads(content)
            if parsed.get("valid") is True:
                canon = parsed.get("canonical") or raw.title()
                result["valid"] = True
                result["canonical"] = canon
                result["suggestions"] = [canon]
                result["source"] = "ai_clinical_db"
                return result
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
    previous_state = Column(String, nullable=True)   # JSON string for undoing merges
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
    ("medicines",          "previous_state", "TEXT"),
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


class GoogleAuthSchema(BaseModel):
    credential: Optional[str] = None
    email:      Optional[EmailStr] = None
    name:       Optional[str] = None
    role:       Optional[str] = "patient"


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
    prev_parsed = None
    if m.previous_state:
        try: prev_parsed = json.loads(m.previous_state)
        except: pass

    return {
        "id":                 m.id,
        "user_id":            m.user_id,
        "name":               m.name,
        "description":        m.description,
        "dosage":             m.dosage,
        "category":           m.category or "Other",
        "formulation":        m.formulation or "pill",
        "stock":              m.stock,
        "initial_stock":      m.initial_stock,
        "start_date":         str(m.start_date) if m.start_date else None,
        "end_date":           str(m.end_date)   if m.end_date   else None,
        "created_at":         str(m.created_at),
        "schedules":          [s.time for s in m.schedules],
        "low_stock":          m.stock < 10,
        "has_previous_state": bool(m.previous_state),
        "previous_state":     prev_parsed,
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

_SENDGRID_ACTIVE = bool(SENDGRID_AVAILABLE and SENDGRID_KEY and SENDGRID_KEY.startswith("SG."))

def send_verification_email(to_email: str, code: str, purpose: str):
    global _SENDGRID_ACTIVE
    purpose_text = "Resetting Password" if purpose == "reset_password" else "Changing Password"
    if not _SENDGRID_ACTIVE:
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
        if "401" in str(e) or "Unauthorized" in str(e):
            _SENDGRID_ACTIVE = False
            logging.debug(f"[EMAIL] SendGrid unauthorized, disabling email notifications.")
        else:
            logging.error(f"[EMAIL] Failed to send code to {to_email}: {e}")


def send_reminder_email(to_email: str, patient_name: str, medicine_name: str, scheduled_time: str):
    """Send a medication reminder email via SendGrid."""
    global _SENDGRID_ACTIVE
    if not _SENDGRID_ACTIVE:
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
        if "401" in str(e) or "Unauthorized" in str(e):
            _SENDGRID_ACTIVE = False
            logging.debug(f"[EMAIL] SendGrid unauthorized, disabling email notifications.")
        else:
            logging.error(f"[EMAIL] Failed to send to {to_email}: {e}")


def send_creation_email(to_email: str, patient_name: str, medicine_name: str, category: str, dosage: str, start_date: str, end_date: str, schedules: list):
    """Send an email confirming a new medicine has been added."""
    global _SENDGRID_ACTIVE
    if not _SENDGRID_ACTIVE:
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
        if "401" in str(e) or "Unauthorized" in str(e):
            _SENDGRID_ACTIVE = False
            logging.debug(f"[EMAIL] SendGrid unauthorized, disabling email notifications.")
        else:
            logging.error(f"[EMAIL] Failed to send confirmation to {to_email}: {e}")


def send_low_stock_email(to_email: str, patient_name: str, medicine_name: str, current_stock: float):
    """Send an email alert via SendGrid when medicine stock drops below threshold."""
    global _SENDGRID_ACTIVE
    if not _SENDGRID_ACTIVE:
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
        if "401" in str(e) or "Unauthorized" in str(e):
            _SENDGRID_ACTIVE = False
            logging.debug(f"[EMAIL] SendGrid unauthorized, disabling email notifications.")
        else:
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


@app.post("/auth/google", tags=["Auth"])
def google_auth(data: GoogleAuthSchema, db: Session = Depends(get_db)):
    """
    Authenticate or register a user directly with Google OAuth account.
    """
    email = data.email
    name = data.name

    if data.credential:
        try:
            r = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={data.credential}", timeout=5)
            if r.status_code == 200:
                payload = r.json()
                email = payload.get("email") or email
                name = payload.get("name") or payload.get("given_name") or name
            else:
                try:
                    parts = data.credential.split(".")
                    if len(parts) >= 2:
                        import base64, json
                        padding = "=" * (4 - len(parts[1]) % 4)
                        decoded = json.loads(base64.urlsafe_b64decode(parts[1] + padding).decode("utf-8"))
                        email = decoded.get("email") or email
                        name = decoded.get("name") or name
                except:
                    pass
        except Exception:
            pass

    if not email:
        raise HTTPException(400, "Could not resolve valid email from Google credentials")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        import secrets
        user = User(
            name=name or email.split("@")[0].capitalize(),
            email=email,
            password=hash_pw(secrets.token_urlsafe(16)),
            role=data.role or "patient",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

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

    # ── Smart Upsert & Duplicate Prevention ───────────────────────
    # If medicine with the same name already exists for this patient, update & restock it!
    clean_name = data.name.strip().lower()
    existing_med = db.query(Medicine).filter(
        Medicine.user_id == target_id,
        Medicine.is_deleted == False,
        func.lower(Medicine.name) == clean_name
    ).first()

    if not existing_med:
        # Check base name matching (e.g. 'qtil cv' matching 'qtil cv 500mg')
        base_name = re.sub(r"\b\d+\s*(?:mg|ml|mcg|gm|g|iu)\b", "", clean_name).strip()
        if len(base_name) >= 3:
            existing_med = db.query(Medicine).filter(
                Medicine.user_id == target_id,
                Medicine.is_deleted == False,
                func.lower(Medicine.name).ilike(f"{base_name}%")
            ).first()

    if existing_med:
        existing_med.name = data.name.strip()
        if data.dosage: existing_med.dosage = data.dosage
        if data.category: existing_med.category = data.category
        if data.formulation: existing_med.formulation = data.formulation
        if data.description: existing_med.description = data.description
        if start_d: existing_med.start_date = start_d
        if end_d: existing_med.end_date = end_d
        
        # Restock: Add new stock to existing stock count
        existing_med.stock = (existing_med.stock or 0) + (data.stock or 0)
        existing_med.initial_stock = max(existing_med.initial_stock or 0, existing_med.stock)
        
        if data.schedules:
            db.query(Schedule).filter(Schedule.medicine_id == existing_med.id).delete()
            for t in data.schedules:
                db.add(Schedule(medicine_id=existing_med.id, time=t))
        
        db.commit()
        db.refresh(existing_med)
        return _medicine_dict(existing_med)

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
    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).order_by(Medicine.created_at.desc()).all()
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


@app.post("/medicines/{med_id}/undo-merge", tags=["Medicines"])
def undo_medicine_merge(
    med_id:     int,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    """Reverts a merged/updated medicine back to its previous dosage, schedules, and stock."""
    target_id = _resolve_target(user, patient_id)
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == target_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")
    if not med.previous_state:
        raise HTTPException(400, "No previous state recorded for this medicine.")

    try:
        prev = json.loads(med.previous_state)
    except Exception:
        raise HTTPException(400, "Invalid previous state format.")

    if "dosage" in prev: med.dosage = prev["dosage"]
    if "category" in prev: med.category = prev["category"]
    if "formulation" in prev: med.formulation = prev["formulation"]
    if "stock" in prev: med.stock = prev["stock"]
    if "start_date" in prev and prev["start_date"]:
        try: med.start_date = datetime.strptime(prev["start_date"], "%Y-%m-%d").date()
        except: pass
    if "end_date" in prev:
        try: med.end_date = datetime.strptime(prev["end_date"], "%Y-%m-%d").date() if prev["end_date"] else None
        except: pass

    if "schedules" in prev and isinstance(prev["schedules"], list):
        db.query(Schedule).filter(Schedule.medicine_id == med.id).delete()
        for t in prev["schedules"]:
            db.add(Schedule(medicine_id=med.id, time=t))

    med.previous_state = None  # consumed
    db.commit()
    db.refresh(med)
    return {"message": f"Successfully reverted {med.name} to previous dosage and schedule.", "medicine": _medicine_dict(med)}


@app.post("/medicines/{med_id}/skip-dose", tags=["Doses"])
def skip_dose(
    med_id:     int,
    data:       DoseStatusUpdate,
    patient_id: Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
    user:       User          = Depends(get_current_user),
):
    """
    Skip / delete a specific dose slot for a single day (e.g. today)
    without deleting the entire medicine from the patient's schedule.
    """
    target_id = _resolve_target(user, patient_id)
    med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.user_id == target_id).first()
    if not med:
        raise HTTPException(404, "Medicine not found")

    try:
        log_day = datetime.strptime(data.date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "date_str must be YYYY-MM-DD")

    existing = db.query(IntakeLog).filter(
        IntakeLog.medicine_id    == med_id,
        IntakeLog.user_id        == target_id,
        IntakeLog.scheduled_time == data.scheduled_time,
        IntakeLog.log_date       == log_day,
    ).first()

    if existing:
        existing.status = "skipped"
    else:
        db.add(IntakeLog(
            user_id        = target_id,
            medicine_id    = med_id,
            status         = "skipped",
            scheduled_time = data.scheduled_time,
            log_date       = log_day,
            taken_at       = datetime.combine(log_day, datetime.utcnow().time()),
        ))

    db.commit()
    return {"message": f"Dose for {data.scheduled_time} removed for {data.date_str}"}


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
        # If start_date is set, medicine is active from start_date onwards
        if med.start_date and log_day < med.start_date:
            continue
        # If end_date is set, medicine is active until end_date (if no end_date, it is ongoing)
        if med.end_date and log_day > med.end_date:
            continue

        for sch in med.schedules:
            log = db.query(IntakeLog).filter(
                IntakeLog.medicine_id    == med.id,
                IntakeLog.user_id        == target_id,
                IntakeLog.scheduled_time == sch.time,
                IntakeLog.log_date       == log_day,
            ).first()
            
            # If dose was skipped/deleted for this day, don't show it in today's active schedule
            if log and log.status == "skipped":
                continue

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

    def _parse_time_sort(t_str):
        try:
            h_m, period = t_str.strip().split()
            h, m = map(int, h_m.split(':'))
            if period.lower() == 'pm' and h != 12:
                h += 12
            if period.lower() == 'am' and h == 12:
                h = 0
            return f"{h:02d}:{m:02d}"
        except:
            return "00:00"

    result.sort(key=lambda x: _parse_time_sort(x["scheduled_time"]))
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
            start_d = med.created_at.date() if med.created_at else (today - timedelta(days=7))
            
        end_d = med.end_date
        effective_end = end_d if end_d else today
        last_d = today
        if effective_end and effective_end < last_d:
            last_d = effective_end
            
        if start_d > last_d:
            start_d = last_d
            
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



def generate_default_schedule(times_per_day: int) -> List[str]:
    """Generates standard spaced reminder times in HH:MM am/pm format matching times_per_day."""
    schedules = {
        1: ["08:00 am"],
        2: ["08:00 am", "08:00 pm"],
        3: ["08:00 am", "02:00 pm", "08:00 pm"],
        4: ["08:00 am", "12:00 pm", "04:00 pm", "08:00 pm"],
        5: ["08:00 am", "11:00 am", "02:00 pm", "06:00 pm", "10:00 pm"],
        6: ["06:00 am", "10:00 am", "02:00 pm", "06:00 pm", "10:00 pm", "02:00 am"]
    }
    if times_per_day in schedules:
        return schedules[times_per_day]
    # Fallback for other counts: generate evenly spaced or repeat
    if times_per_day <= 0:
        return ["08:00 am"]
    base_hours = [8 + int(i * (14 / max(1, times_per_day - 1))) for i in range(times_per_day)]
    result = []
    for h in base_hours:
        hh = h % 24
        period = "am" if hh < 12 else "pm"
        display_h = hh if 1 <= hh <= 12 else (hh - 12 if hh > 12 else 12)
        result.append(f"{display_h:02d}:00 {period}")
    return result


def sanitize_and_normalize_medicines(raw_list: list, today_str: str) -> List[dict]:
    """Cleans, normalizes, and strictly aligns times_per_day with times array length."""
    sanitized = []
    for med in raw_list:
        if not isinstance(med, dict):
            continue
        name = str(med.get("name") or "").strip()
        if not name or name.lower() in ["none", "null", "n/a", "no medicines"]:
            continue

        category = str(med.get("category") or med.get("disease_name") or "Other").strip()
        
        times_per_day = med.get("times_per_day")
        try:
            times_per_day = int(times_per_day)
            if times_per_day < 1:
                times_per_day = 1
        except (ValueError, TypeError):
            times_per_day = 1

        raw_times = med.get("times")
        times = []
        if isinstance(raw_times, list) and raw_times:
            for t in raw_times:
                t_str = str(t).strip()
                if t_str:
                    times.append(t_str)

        # STRICT GUARANTEE: times array length must match times_per_day count exactly
        if len(times) != times_per_day:
            times = generate_default_schedule(times_per_day)

        formulation = str(med.get("formulation") or "tablet").strip().lower()
        if not any(f in formulation for f in ["tablet", "capsule", "liquid", "ointment", "injection", "drops", "spray", "cream", "gel"]):
            if "cap" in name.lower():
                formulation = "capsule"
            elif any(k in name.lower() for k in ["syr", "susp", "liquid"]):
                formulation = "liquid"
            elif any(k in name.lower() for k in ["oint", "cream", "gel"]):
                formulation = "ointment"
            elif any(k in name.lower() for k in ["drop", "eye drop", "ear drop"]):
                formulation = "drops"
            elif any(k in name.lower() for k in ["inj", "vial", "ampoule"]):
                formulation = "injection"
            elif any(k in name.lower() for k in ["spray", "inhaler"]):
                formulation = "spray"
            else:
                formulation = "tablet"

        start_date = str(med.get("start_date") or today_str).strip()
        end_date = str(med.get("end_date") or "").strip()
        if not end_date or end_date == start_date:
            try:
                end_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
            except Exception:
                end_date = ""

        # Stock calculation: 1 tube/unit for ointments/creams/drops/sprays; tablets/capsules calculate total units
        if formulation in ["ointment", "cream", "gel", "drops", "spray", "lotion", "inhaler"]:
            stock = 1
        else:
            stock = med.get("stock")
            try:
                stock = int(stock)
                if stock <= 0:
                    stock = max(1, times_per_day * 7) if formulation in ["tablet", "capsule"] else 1
            except (ValueError, TypeError):
                stock = max(1, times_per_day * 7) if formulation in ["tablet", "capsule"] else 1

        dosage = str(med.get("dosage") or f"1 {formulation}").strip()
        instructions = str(med.get("instructions") or "").strip()

        sanitized.append({
            "name": name,
            "dosage": dosage,
            "formulation": formulation,
            "category": category,
            "disease_name": category,
            "start_date": start_date,
            "end_date": end_date,
            "times_per_day": times_per_day,
            "times": times,
            "instructions": instructions,
            "stock": stock
        })
    return sanitized



@app.post("/medicines/upload-ocr", tags=["OCR & AI"])
async def upload_prescription_ocr(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
    user: User       = Depends(get_current_user),
):
    """
    State-of-the-art dual-tier prescription extraction engine:
    1. Primary Tier: Direct Multimodal Medical Vision (Gemini 3.6/3.7 Flash) on prescription image bytes.
       Accurately deciphers complex doctor handwriting, Roman numeral markers, clinical diagnoses vs medications.
    2. Secondary Fallback Tier: Multi-pass Tesseract OCR + Groq LLaMA/Qwen clinical parser.
    3. Verification: RxNorm and OpenFDA canonical name mapping.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Uploaded file is empty.")

    today_str = date.today().strftime("%Y-%m-%d")
    extracted_medicines = []
    raw_text_display = ""

    # ═════════════════════════════════════════════════════════════════════
    # TIER 1: DIRECT MULTIMODAL MEDICAL VISION (High Accuracy on Handwriting)
    # ═════════════════════════════════════════════════════════════════════
    if GEMINI_API_KEY and HTTPX_AVAILABLE:
        try:
            mime_type = file.content_type or "image/jpeg"
            if "pdf" in mime_type.lower():
                mime_type = "application/pdf"
                img_b64 = base64.b64encode(contents).decode("utf-8")
            else:
                if PIL_AVAILABLE:
                    try:
                        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
                        pil_img.thumbnail((1600, 1600), Image.LANCZOS)
                        buf = io.BytesIO()
                        pil_img.save(buf, format="JPEG", quality=85, optimize=True)
                        img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                        mime_type = "image/jpeg"
                    except Exception:
                        img_b64 = base64.b64encode(contents).decode("utf-8")
                        mime_type = "image/jpeg"
                else:
                    img_b64 = base64.b64encode(contents).decode("utf-8")
                    mime_type = "image/jpeg"

            vision_prompt = f"""You are an elite clinical pharmacist and AI medical specialist.
Decipher and extract ALL PRESCRIBED MEDICATIONS from this doctor's prescription image (printed or handwritten).

TODAY'S DATE: {today_str}

=== CLINICAL EXTRACTION PROTOCOL ===
1. DISTINGUISH DIAGNOSIS / CLINICAL FINDINGS FROM MEDICINES:
   - Diagnoses, complaints, symptoms, vitals, or clinical notes are NOT medicines.
   - Examples of Non-Medicines: 'c/o Pain in left ear', 'O/E vesicles over left pinna', 'Herpes Zoster Oticus', 'Shingles', 'BP: 120/80', 'Temp: 98.2', 'Pulse: 70', 'SPO2: 99%'.
   - Assign the primary diagnosis/condition to the 'category' and 'disease_name' field for all extracted medicines.

2. EXTRACT PRESCRIBED MEDICINES:
   - Identify every prescribed medicine (e.g., Acyclovir, Sofradex Ointment, Amoxicillin, Paracetamol, etc.).
   - Include strength if present (e.g. '800mg', '500mg', '10mg', '2mg').
   - Determine formulation: 'tablet' | 'capsule' | 'liquid' | 'ointment' | 'injection' | 'drops' | 'spray'.

3. PARSE DOSAGE, FREQUENCY & REMINDER TIMES:
   - '5 times a day' / 'Q4H' -> times_per_day: 5, times: ['08:00 am', '11:00 am', '02:00 pm', '06:00 pm', '10:00 pm']
   - 'BD' / 'BID' / '1-0-1' / '1 - x - 1' / 'Twice daily' -> times_per_day: 2, times: ['08:00 am', '08:00 pm']
   - 'TDS' / 'TID' / '1-1-1' / 'Three times daily' -> times_per_day: 3, times: ['08:00 am', '02:00 pm', '08:00 pm']
   - 'OD' / '1-0-0' / 'Once daily in morning' -> times_per_day: 1, times: ['08:00 am']
   - 'HS' / '0-0-1' / 'Night only / Bedtime' -> times_per_day: 1, times: ['09:00 pm']
   - 'QID' / '1-1-1-1' / '4 times daily' -> times_per_day: 4, times: ['08:00 am', '12:00 pm', '04:00 pm', '08:00 pm']
   - 'PRN' / 'SOS' / 'As needed' -> times_per_day: 1, times: ['08:00 am']
   - CRITICAL: The length of the 'times' array MUST EXACTLY EQUAL 'times_per_day'.

4. DURATION & STOCK:
   - Extract duration (e.g. '7 DAYS', 'x 7 DAYS' -> 7 days, '5 days' -> 5 days, '1 month' -> 30 days).
   - Set end_date = start_date + duration in days.
   - Calculate stock = times_per_day * duration_days (e.g. 5 * 7 = 35; for ointments/drops if not unit count default to 1).

Respond ONLY with a valid JSON object in this exact schema (no markdown, no extra explanation):
{{
  "medicines": [
    {{
      "name": "Medicine Name and Strength (e.g. Acyclovir 800mg)",
      "dosage": "800mg 5 times a day / as directed",
      "formulation": "tablet|capsule|liquid|ointment|injection|drops|spray",
      "category": "Herpes Zoster Oticus / Shingles",
      "disease_name": "Herpes Zoster Oticus / Shingles",
      "start_date": "{today_str}",
      "end_date": "YYYY-MM-DD",
      "times_per_day": 5,
      "times": ["08:00 am", "11:00 am", "02:00 pm", "06:00 pm", "10:00 pm"],
      "instructions": "Take orally with water / Apply topically to affected area",
      "stock": 35
    }}
  ]
}}"""

            vision_models = ["gemini-3.5-flash"]
            for vm in vision_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{vm}:generateContent?key={GEMINI_API_KEY}"
                    payload = {
                        "contents": [{
                            "parts": [
                                {"text": vision_prompt},
                                {"inline_data": {"mime_type": mime_type, "data": img_b64}}
                            ]
                        }]
                    }
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidate = data.get("candidates", [{}])[0]
                            parts_list = candidate.get("content", {}).get("parts", [])
                            raw_txt = "".join([p.get("text", "") for p in parts_list if p.get("text")]).strip()
                            f_idx = raw_txt.find('{')
                            l_idx = raw_txt.rfind('}')
                            if f_idx != -1 and l_idx != -1:
                                parsed = json.loads(raw_txt[f_idx:l_idx+1])
                                if isinstance(parsed, dict) and parsed.get("medicines"):
                                    extracted_medicines = sanitize_and_normalize_medicines(parsed["medicines"], today_str)
                                    if extracted_medicines:
                                        raw_text_display = f"Deciphered via Clinical Multimodal Vision ({vm})"
                                        break
                except Exception as ex_vm:
                    pass
        except Exception as vision_err:
            pass

    # ═════════════════════════════════════════════════════════════════════
    # TIER 2: HIGH-SPEED TESSERACT OCR + GROQ LLM (Fallback)
    # ═════════════════════════════════════════════════════════════════════
    if not extracted_medicines:
        raw_text_combined = ""
        if TESSERACT_AVAILABLE:
            try:
                image = Image.open(io.BytesIO(contents)).convert("RGB")
                if max(image.size) > 1600:
                    image.thumbnail((1600, 1600), Image.LANCZOS)
                gray = image.convert("L")
                raw_text_combined = pytesseract.image_to_string(gray)
                raw_text_display = raw_text_combined
            except Exception as tess_err:
                logging.warning(f"[Tesseract OCR Error]: {tess_err}")

        if raw_text_combined and GROQ_AVAILABLE and GROQ_API_KEY:
            try:
                groq_client = Groq(api_key=GROQ_API_KEY)
                groq_prompt = f"""You are an expert clinical pharmacist and AI prescription parser. Extract ALL PRESCRIBED MEDICATIONS from this OCR text:

RAW OCR TEXT FROM PRESCRIPTION:
{raw_text_combined}

TODAY'S DATE: {today_str}

=== CLINICAL PARSING INSTRUCTIONS ===
1. DECODE NOISY HANDWRITTEN OCR TEXT:
   - 'OAcyerovie GOMG Stmwa day MF DAYS' / 'Atyrovie' -> 'Acyclovir 800mg' (formulation: tablet, frequency: 5 times a day, duration: 7 days)
   - 'Soreay eye O1OT MENT' / 'SOPRADEX' -> 'Sofradex Ointment' (formulation: ointment, frequency: BD/twice daily, duration: 7 days)
   - 'Zoclar 500' -> 'Zoclar 500'
   - 'Sizodon Plus' -> 'Sizodon Plus'
   - 'Qutipin 200mg' -> 'Qutipin 200mg'

2. NEVER EXTRACT DIAGNOSES AS MEDICATIONS:
   - Diagnoses like 'Herpes Zoster Oticus', 'Shingles', 'Malaria', 'Otitis Externa', 'Fever' belong in 'category' and 'disease_name'.

3. PARSE FREQUENCY & REMINDER SCHEDULE:
   - '5 times a day' -> times_per_day: 5, times: ['08:00 am', '11:00 am', '02:00 pm', '06:00 pm', '10:00 pm']
   - 'BD' / '1-0-1' -> times_per_day: 2, times: ['08:00 am', '08:00 pm']
   - 'TDS' / '1-1-1' -> times_per_day: 3, times: ['08:00 am', '02:00 pm', '08:00 pm']
   - 'OD' / '1-0-0' -> times_per_day: 1, times: ['08:00 am']
   - 'HS' / '0-0-1' -> times_per_day: 1, times: ['09:00 pm']
   - 'QID' -> times_per_day: 4, times: ['08:00 am', '12:00 pm', '04:00 pm', '08:00 pm']
   - Length of 'times' array MUST MATCH times_per_day count.

4. CALCULATE DURATION & STOCK:
   - 'x 7 DAYS' / '7 days' -> duration: 7 days, end_date = start_date + 7 days.
   - stock = times_per_day * duration_days.

Respond ONLY with valid JSON (no markdown):
{{
  "medicines": [
    {{
      "name": "Medicine Name and Strength",
      "dosage": "800mg 5 times a day / as directed",
      "formulation": "tablet|capsule|liquid|ointment|injection|drops|spray",
      "category": "Diagnosis / Condition",
      "disease_name": "Diagnosis / Condition",
      "start_date": "{today_str}",
      "end_date": "YYYY-MM-DD",
      "times_per_day": 2,
      "times": ["08:00 am", "08:00 pm"],
      "instructions": "Take after food / as directed",
      "stock": 14
    }}
  ]
}}"""
                completion = call_groq_with_fallback(
                    groq_client,
                    messages=[{"role": "user", "content": groq_prompt}],
                    temperature=0.05
                )
                resp_str = completion.choices[0].message.content.strip()
                f_idx = resp_str.find('{')
                l_idx = resp_str.rfind('}')
                if f_idx != -1 and l_idx != -1:
                    resp_str = resp_str[f_idx:l_idx+1]
                parsed = json.loads(resp_str)
                raw_list = parsed.get("medicines", []) if isinstance(parsed, dict) else (parsed if isinstance(parsed, list) else [])
                extracted_medicines = sanitize_and_normalize_medicines(raw_list, today_str)
            except Exception as groq_err:
                logging.warning(f"[Tier 2 Groq OCR Extraction Error]: {groq_err}")

    # ═════════════════════════════════════════════════════════════════════
    # TIER 3: HEURISTIC LINE PARSER (Ultimate Offline Fallback)
    # ═════════════════════════════════════════════════════════════════════
    if not extracted_medicines and raw_text_display:
        non_empty = [l.strip() for l in raw_text_display.split("\n") if len(l.strip()) > 3]
        clean_lines = [l for l in non_empty if not is_line_blacklisted(l, user.name)]
        valid_med_lines = []
        for cl in clean_lines:
            has_marker = any(mk in cl.lower() for mk in ["tab", "cap", "syr", "oint", "inj", "drop", "mg", "ml", "tablet", "capsule", "syrup", "ointment", "injection"])
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

        fallback_raw = []
        for name in valid_med_lines[:5]:
            form = "capsule" if "cap" in name.lower() else "liquid" if any(k in name.lower() for k in ["syr", "liquid"]) else "ointment" if "oint" in name.lower() else "tablet"
            fallback_raw.append({
                "name": name,
                "dosage": f"1 {form}",
                "formulation": form,
                "category": "Other",
                "disease_name": "Other",
                "start_date": today_str,
                "end_date": (date.today() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "times_per_day": 1,
                "times": ["08:00 am"],
                "instructions": "Take as directed",
                "stock": 7
            })
        extracted_medicines = sanitize_and_normalize_medicines(fallback_raw, today_str)

    # ═════════════════════════════════════════════════════════════════════
    # POST-PROCESSING: RXNORM / OPENFDA CANONICAL VERIFICATION
    # ═════════════════════════════════════════════════════════════════════
    verified_medicines = []
    for med in extracted_medicines:
        orig_name = med.get("name", "").strip()
        form = med.get("formulation", "").lower()
        if len(orig_name) >= 3:
            try:
                vres = await verify_medicine_name_api(orig_name)
                if vres.get("valid") and vres.get("canonical"):
                    canonical = vres["canonical"]
                    dose_in_canonical = bool(re.search(r"\b\d+\s*(?:mg|ml|mcg|gm|g|iu)\b", canonical, re.IGNORECASE))
                    dose_match = re.search(r"\b\d+\s*(?:mg|ml|mcg|gm|g|iu)\b", orig_name, re.IGNORECASE)
                    
                    if not dose_in_canonical and dose_match and dose_match.group(0).lower() not in canonical.lower():
                        med["name"] = f"{canonical} {dose_match.group(0)}"
                    else:
                        med["name"] = canonical
                    
                    med["_verified_source"] = vres.get("source", "verified")
                else:
                    med["_verified_source"] = "unverified"
            except Exception:
                med["_verified_source"] = "unverified"
        
        # Keep formulation keyword in name if present in original (e.g. 'Sofradex Ointment')
        form_keywords = ["ointment", "cream", "drops", "gel", "spray", "inhaler", "syrup", "suspension"]
        for kw in form_keywords:
            if kw in orig_name.lower() and kw not in med["name"].lower():
                med["name"] = f"{med['name']} {kw.capitalize()}"

        # Clean repeated strength tokens
        if med.get("name"):
            med["name"] = re.sub(r"\b(\d+\s*(?:mg|ml|mcg|gm|g|iu))\s+\1\b", r"\1", med["name"], flags=re.IGNORECASE).strip()
            med["name"] = re.sub(r"\b(\d+)\s*mg\s+\1\s*mg\b", r"\1 mg", med["name"], flags=re.IGNORECASE).strip()

        verified_medicines.append(med)

    # Unify diagnosis across all medicines from the same prescription
    primary_diag = next((m.get("category") for m in verified_medicines if m.get("category") and m.get("category").lower() not in ["other", "general", "otitis externa", "infection"]), None)
    if primary_diag:
        for m in verified_medicines:
            if not m.get("category") or m.get("category").lower() in ["other", "general", "otitis externa"]:
                m["category"] = primary_diag
                m["disease_name"] = primary_diag

    return {
        "success": True,
        "medicines": verified_medicines,
        "raw_text": raw_text_display,
        "count": len(verified_medicines)
    }


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
    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).order_by(Medicine.created_at.desc()).all()
    
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
    Calculates precise 7-Day Weekly and 30-Day Monthly adherence trends,
    accurate missed dose tracking, ratio breakdowns, and stock depletion status.
    """
    target_id = _resolve_target(user, patient_id)
    today = date.today()
    
    # Active patient medicines and schedules
    meds = db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_deleted == False).all()
    all_logs = db.query(IntakeLog).filter(IntakeLog.user_id == target_id).all()
    
    log_map = {}
    for log in all_logs:
        log_map[(log.medicine_id, log.log_date, log.scheduled_time)] = log

    def get_day_stats(day_date: date):
        day_str = day_date.strftime("%Y-%m-%d")
        day_taken = 0
        day_missed = 0
        day_scheduled = 0

        for med in meds:
            # Check if med was active on this day
            start_d = med.start_date or (med.created_at.date() if med.created_at else today)
            end_d = med.end_date
            if day_date < start_d or (end_d and day_date > end_d):
                continue

            for sch in med.schedules:
                day_scheduled += 1
                key = (med.id, day_date, sch.time)
                log = log_map.get(key)
                if log and log.status == "taken":
                    day_taken += 1
                else:
                    if is_scheduled_time_past(day_date, sch.time):
                        day_missed += 1

        pct = round((day_taken / day_scheduled) * 100) if day_scheduled > 0 else 0
        return {
            "date": day_str,
            "day": day_date.strftime("%a"),
            "taken": day_taken,
            "missed": day_missed,
            "total": day_scheduled,
            "adherence_pct": pct
        }

    # 1. 7-Day Weekly Trend
    weekly_trend = []
    for i in range(6, -1, -1):
        d_date = today - timedelta(days=i)
        weekly_trend.append(get_day_stats(d_date))

    weekly_taken = sum(d["taken"] for d in weekly_trend)
    weekly_missed = sum(d["missed"] for d in weekly_trend)
    weekly_scheduled = sum(d["total"] for d in weekly_trend)
    weekly_pct = round((weekly_taken / weekly_scheduled) * 100) if weekly_scheduled > 0 else 0

    # 2. 30-Day Monthly Trend (4 Weekly Blocks)
    monthly_trend = []
    monthly_taken = 0
    monthly_missed = 0
    monthly_scheduled = 0

    for w in range(3, -1, -1):
        w_start = today - timedelta(days=(w + 1) * 7 - 1)
        w_end = today - timedelta(days=w * 7)
        
        block_taken = 0
        block_missed = 0
        block_total = 0
        
        curr = w_start
        while curr <= w_end:
            st = get_day_stats(curr)
            block_taken += st["taken"]
            block_missed += st["missed"]
            block_total += st["total"]
            curr += timedelta(days=1)

        b_pct = round((block_taken / block_total) * 100) if block_total > 0 else 0
        monthly_taken += block_taken
        monthly_missed += block_missed
        monthly_scheduled += block_total

        monthly_trend.append({
            "label": f"Wk {4 - w}",
            "period": f"{w_start.strftime('%b %d')} - {w_end.strftime('%b %d')}",
            "taken": block_taken,
            "missed": block_missed,
            "total": block_total,
            "adherence_pct": b_pct
        })

    monthly_pct = round((monthly_taken / monthly_scheduled) * 100) if monthly_scheduled > 0 else 0

    # Refill Stock Overview
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

    overall_pct = weekly_pct
    if not meds or weekly_scheduled == 0:
        consistency_grade = "No Active Medicines"
    elif overall_pct >= 85:
        consistency_grade = "High Adherence"
    elif overall_pct >= 60:
        consistency_grade = "Moderate Adherence"
    else:
        consistency_grade = "Needs Attention"

    return {
        "overall_pct": overall_pct,
        "weekly_pct": weekly_pct,
        "weekly_taken": weekly_taken,
        "weekly_missed": weekly_missed,
        "weekly_scheduled": weekly_scheduled,
        "monthly_pct": monthly_pct,
        "monthly_taken": monthly_taken,
        "monthly_missed": monthly_missed,
        "monthly_scheduled": monthly_scheduled,
        "total_taken": weekly_taken,
        "total_scheduled": weekly_scheduled,
        "total_missed_30": monthly_missed,
        "consistency_grade": consistency_grade,
        "weekly_trend": weekly_trend,
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

def clean_ai_response(text: str) -> str:
    """Removes all hidden thinking tags, reasoning processes, XML, and markdown formatting symbols."""
    if not text:
        return ""
    # If </think> exists in the text, take everything after the last </think>
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
    # If <think> tag exists without closing tag, remove everything from <think>
    if "<think>" in text:
        text = re.sub(r"<think>[\s\S]*", "", text).strip()
    # Remove any stray XML/HTML tags
    text = re.sub(r"<[^>]+>", "", text).strip()
    # Remove common preamble phrases
    text = re.sub(r"^(?:Here(?:'s| is) a thinking process:?|Thinking:?|Analysis:?)[^\n]*\n*", "", text, flags=re.IGNORECASE).strip()
    # Strip markdown bold/italic asterisks, headers, backticks, and bullet symbols
    text = text.replace("***", "").replace("**", "").replace("*", "")
    text = text.replace("###", "").replace("##", "").replace("#", "")
    text = text.replace("`", "")
    text = re.sub(r'"+', '"', text)  # clean excessive quotation marks
    # Enforce 12-hour AM/PM format
    text = re.sub(r'\(use 24-hour format[^)]*\)', '(in 12-hour AM/PM format, e.g. 08:00 AM, 02:30 PM)', text, flags=re.IGNORECASE)
    text = re.sub(r'\b24-hour\b', '12-hour AM/PM', text, flags=re.IGNORECASE)
    return text.strip()


@app.post("/chat/ask", tags=["AI Chat"])
def ask_chatbot(
    data: ChatAskSchema,
    user: User = Depends(get_current_user),
    db:   Session = Depends(get_db)
):
    # Query live user data so the assistant knows active medicines, stock, schedule & contacts
    meds = db.query(Medicine).filter(Medicine.user_id == user.id, Medicine.is_deleted == False).all()
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
    
    med_lines = []
    for m in meds:
        scheds = [s.time for s in m.schedules] if m.schedules else []
        med_lines.append(f"- {m.name} ({m.dosage or 'standard dose'}, {m.formulation or 'tablet'}, Category: {m.category or 'General'}, Stock: {m.stock} units, Schedule: {', '.join(scheds) if scheds else 'As needed'})")
    
    contact_lines = [f"- {c.name} ({getattr(c, 'relation', 'Contact')}): {c.phone or c.email}" for c in contacts]
    
    context_str = f"""
USER PROFILE & LIVE DATA:
- Name: {user.name}
- Email: {user.email}
- Role: {user.role}
- Vitals: Age {user.age or 'N/A'}, Gender {user.gender or 'N/A'}, Weight {user.weight or 'N/A'}, Height {user.height or 'N/A'}, Blood Group: {getattr(user, 'blood_group', 'N/A')}
- Active Medications ({len(meds)} active):
{chr(10).join(med_lines) if med_lines else 'No active medications currently registered.'}
- Emergency Contacts ({len(contacts)} listed):
{chr(10).join(contact_lines) if contact_lines else 'No emergency contacts added.'}
"""

    system_prompt = f"""You are PillSync AI, an intelligent, helpful, and professional personal health & medication assistant for {user.name}.
You have access to the user's background details if relevant:
{context_str}

CONVERSATION & RESPONSE GUIDELINES:
1. GREETINGS & CASUAL CHAT (e.g. "hey", "hi", "hello", "good morning", "how are you"):
   - Respond with a brief, friendly, professional 1-sentence greeting asking how you can help.
   - Example: "Hello Ayushi! How can I assist you with your medications, schedules, or refills today?"
   - NEVER dump their medication list, contacts, or vitals for casual greetings or small talk.

2. SPECIFIC QUESTIONS (e.g. "what are my medicines?", "what is my schedule?", "how do I add a medicine?"):
   - Answer directly, concisely, and accurately based strictly on what they asked for.
   - Keep answers short, helpful, and focused (1 to 3 sentences, or a clean short list if specifically asked to list).

3. PILLSYNC PLATFORM RULES:
   - TIME FORMAT: PillSync STRICTLY uses 12-hour AM/PM format (e.g. 08:00 AM, 02:00 PM). Never use 24-hour time.
   - Output in clean, natural, plain text only. Do NOT use markdown symbols like asterisks (** or *), hashtags (#), or bullet stars.
   - For medical questions: Give concise, accurate facts and remind: "Please consult your doctor or pharmacist for personalized medical advice."
"""

    response_text = ""
    # 1. Try Groq AI
    if GROQ_AVAILABLE and GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            completion = call_groq_with_fallback(
                client,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": data.query}
                ],
                temperature=0.3,
                max_tokens=350
            )
            raw = completion.choices[0].message.content or ""
            response_text = clean_ai_response(raw)
        except Exception as err:
            logging.warning(f"[AI Chatbot Groq Error]: {err}")

    # 2. Try Gemini fallback if Groq failed or wasn't configured
    if not response_text and GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
            g_payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Question: {data.query}"}]}
                ]
            }
            r = requests.post(url, json=g_payload, timeout=10)
            if r.status_code == 200:
                g_res = r.json()
                raw = g_res["candidates"][0]["content"]["parts"][0]["text"]
                response_text = clean_ai_response(raw)
        except Exception as g_err:
            logging.warning(f"[AI Chatbot Gemini Error]: {g_err}")

    if not response_text:
        # Smart context-aware fallback if external AI APIs are offline
        q_lower = data.query.lower()
        if "emergency" in q_lower or "contact" in q_lower:
            if "add" in q_lower or "how" in q_lower:
                response_text = "To add an emergency contact, open the Emergency Contacts tab on the left navigation menu, fill in the Name, Phone number, and Relationship, then click Add Contact."
            elif contacts:
                contact_str = ", ".join([f"{c.name} ({getattr(c, 'relation', 'Contact')}: {c.phone})" for c in contacts])
                response_text = f"Your emergency contacts are: {contact_str}."
            else:
                response_text = "You currently have no emergency contacts saved. Go to the Emergency Contacts tab to add one."
        elif "active" in q_lower or "what are my" in q_lower or "list" in q_lower:
            if meds:
                med_list_str = ", ".join([f"{m.name} ({m.dosage or 'standard dose'})" for m in meds])
                response_text = f"You currently have {len(meds)} active medicines: {med_list_str}."
            else:
                response_text = "You currently have no active medicines registered. You can add one by clicking + Add Medicine."
        elif "add" in q_lower and "med" in q_lower:
            response_text = "To add a medicine, click + Add Medicine on your dashboard, enter the name, dosage, schedule, and stock, then click Save."
        elif "scan" in q_lower or "ocr" in q_lower or "prescription" in q_lower:
            response_text = "To scan a prescription, click Scan Prescription (OCR) on your dashboard and upload an image of your prescription."
        elif "refill" in q_lower or "stock" in q_lower:
            response_text = "You can view stock depletion forecasts and refill recommendations under the Refill Predictor tab."
        elif "tracker" in q_lower or "adherence" in q_lower or "progress" in q_lower:
            response_text = "You can view your 7-day adherence tracker and daily dose records under the Progress tab."
        else:
            response_text = f"Hi {user.name}! I am PillSync AI. You have {len(meds)} active medicines. You can ask me about your medicines, schedules, refills, or how to navigate the website."

    return {"response": response_text}


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