"""
Quick diagnostic script - checks time matching logic and sends a test email
"""
import sys, logging
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# ── 1. Check the current_slot format ──────────────────────────────────────────
now = datetime.now()
hh   = now.strftime('%I').lstrip('0') or '12'
mm   = now.strftime('%M')
ampm = now.strftime('%p').lower()
current_slot = f'{hh.zfill(2)}:{mm} {ampm}'
print(f'[TIME] Now: {now.strftime("%H:%M")} -> current_slot = "{current_slot}"')

# ── 2. Show all schedule times ─────────────────────────────────────────────────
from database import SessionLocal
from main import Schedule, Medicine, User
db = SessionLocal()
try:
    schedules = db.query(Schedule).all()
    times = [(s.time, s.medicine_id) for s in schedules]
    print(f'\n[DB] {len(times)} schedule entries:')
    for t, mid in times[:10]:
        print(f'   med_id={mid}  time="{t}"')
    print(f'\n[MATCH] current_slot "{current_slot}" in schedule times? {any(t == current_slot for t, _ in times)}')

    # ── 3. Check for low stock meds (< 10 units) ──────────────────────────────
    meds = db.query(Medicine).filter(Medicine.is_deleted == False).all()
    print(f'\n[STOCK] Checking {len(meds)} medicines for low stock:')
    for med in meds:
        print(f'   {med.name}: stock={med.stock}  {"LOW" if med.stock < 10 else "OK"}')
finally:
    db.close()

# ── 4. Trigger a live test email ─────────────────────────────────────────────
print('\n[EMAIL TEST] Sending test reminder email...')
from main import send_reminder_email, send_low_stock_email
import os
test_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@pillsync.app")
send_reminder_email(test_email, 'Ayushi Test', 'Qtil CV', '09:25 am')
print('[EMAIL TEST] send_reminder_email done')
send_low_stock_email(test_email, 'Ayushi Test', 'Qtil CV', 17.0)
print('[EMAIL TEST] send_low_stock_email done')
print(f'\nDone - check {test_email} inbox!')

