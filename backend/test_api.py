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
