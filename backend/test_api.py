import pytest
import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "running" in response.json()["message"].lower()

def test_user_registration_and_login():
    uid = uuid.uuid4().hex[:6]
    email = f"user_{uid}@example.com"
    reg_payload = {
        "name": f"Test User {uid}",
        "email": email,
        "password": "Password123!",
        "role": "patient",
        "phone": "+919876543210"
    }
    res_reg = client.post("/auth/register", json=reg_payload)
    assert res_reg.status_code == 200
    assert "token" in res_reg.json()

    login_payload = {
        "email": email,
        "password": "Password123!"
    }
    res_login = client.post("/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "token" in res_login.json()
    token = res_login.json()["token"]

    res_me = client.get("/users/profile", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email

def test_send_code():
    uid = uuid.uuid4().hex[:6]
    email = f"reset_{uid}@example.com"
    client.post("/auth/register", json={
        "name": f"Reset User {uid}",
        "email": email,
        "password": "Password123!",
        "role": "patient"
    })
    res = client.post("/auth/send-code", json={"email": email, "purpose": "reset_password"})
    assert res.status_code == 200
    assert res.json().get("success") is True

def test_medicines_crud():
    uid = uuid.uuid4().hex[:6]
    email = f"meds_{uid}@example.com"
    reg_res = client.post("/auth/register", json={
        "name": f"Med User {uid}",
        "email": email,
        "password": "Pass123!",
        "role": "patient"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    med_payload = {
        "name": f"Paracetamol_{uid}",
        "dosage": "500 mg",
        "category": "Fever",
        "stock": 20,
        "formulation": "tablet",
        "schedules": ["08:00 am", "08:00 pm"],
        "start_date": "2026-08-16"
    }
    create_res = client.post("/medicines", json=med_payload, headers=headers)
    assert create_res.status_code == 200
    med_id = create_res.json()["id"]

    get_res = client.get("/medicines", headers=headers)
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

    del_res = client.delete(f"/medicines/{med_id}", headers=headers)
    assert del_res.status_code == 200

def test_emergency_contacts_crud():
    uid = uuid.uuid4().hex[:6]
    email = f"contact_{uid}@example.com"
    reg_res = client.post("/auth/register", json={
        "name": f"Contact User {uid}",
        "email": email,
        "password": "Pass123!",
        "role": "patient"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    contact_payload = {
        "name": "Dr. Smith",
        "relation": "Consultant / Doctor",
        "phone": "+919876543210",
        "email": "drsmith@clinic.com"
    }
    create_res = client.post("/emergency-contacts", json=contact_payload, headers=headers)
    assert create_res.status_code == 200
    contact_id = create_res.json()["id"]

    get_res = client.get("/emergency-contacts", headers=headers)
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

    patch_res = client.patch(f"/emergency-contacts/{contact_id}", json={"name": "Dr. Smith Updated", "relation": "Consultant / Doctor", "phone": "+919876543210", "email": "drsmith@clinic.com"}, headers=headers)
    assert patch_res.status_code == 200

def test_refill_predictions_and_adherence():
    uid = uuid.uuid4().hex[:6]
    email = f"analytics_{uid}@example.com"
    reg_res = client.post("/auth/register", json={
        "name": f"Analytics User {uid}",
        "email": email,
        "password": "Pass123!",
        "role": "patient"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/medicines", json={
        "name": f"Amoxicillin_{uid}",
        "dosage": "1 capsule",
        "category": "Infection",
        "stock": 5,
        "formulation": "capsule",
        "schedules": ["08:00 am", "02:00 pm"],
        "start_date": "2026-08-16"
    }, headers=headers)

    pred_res = client.get("/medicines/refill-predictions", headers=headers)
    assert pred_res.status_code == 200
    assert "predictions" in pred_res.json()

    adh_res = client.get("/analytics/adherence-reports?date_str=2026-08-16", headers=headers)
    assert adh_res.status_code == 200

def test_prescription_ocr():
    uid = uuid.uuid4().hex[:6]
    email = f"ocr_{uid}@example.com"
    reg_res = client.post("/auth/register", json={
        "name": f"OCR User {uid}",
        "email": email,
        "password": "Pass123!",
        "role": "patient"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    import io
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10, 10), "Tab Paracetamol 500mg 1-0-1 x 5 days", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("prescription.jpg", buf.getvalue(), "image/jpeg")}
    ocr_res = client.post("/medicines/upload-ocr", files=files, headers=headers)
    assert ocr_res.status_code == 200
    assert ocr_res.json().get("success") is True
    assert "medicines" in ocr_res.json()


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_users():
    """Runs after all tests complete to remove any test users created during test execution."""
    yield
    from database import SessionLocal
    from main import User, Medicine, Schedule, IntakeLog, EmergencyContact, PushSubscription, VerificationCode, WaterIntake
    db = SessionLocal()
    try:
        test_users = db.query(User).filter(User.email.like("%@example.com")).all()
        test_user_ids = [u.id for u in test_users]
        if test_user_ids:
            med_ids = [m.id for m in db.query(Medicine).filter(Medicine.user_id.in_(test_user_ids)).all()]
            if med_ids:
                db.query(Schedule).filter(Schedule.medicine_id.in_(med_ids)).delete(synchronize_session=False)
                db.query(IntakeLog).filter(IntakeLog.medicine_id.in_(med_ids)).delete(synchronize_session=False)
                db.query(Medicine).filter(Medicine.id.in_(med_ids)).delete(synchronize_session=False)
            db.query(IntakeLog).filter(IntakeLog.user_id.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(EmergencyContact).filter(EmergencyContact.user_id.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(PushSubscription).filter(PushSubscription.user_id.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(WaterIntake).filter(WaterIntake.user_id.in_(test_user_ids)).delete(synchronize_session=False)
            db.query(VerificationCode).filter(VerificationCode.email.like("%@example.com")).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
            db.commit()
    finally:
        db.close()

