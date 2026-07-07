# PillSync

PillSync is an Intelligent Medicine Reminder & Tracking Platform built for patients, caregivers, and administrators. It helps manage medication schedules, monitor adherence, and send smart reminders, ensuring patients never miss a dose.

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS (Teal/Navy Health & Wellness Theme), Axios
- **Backend**: Python 3.11, FastAPI, SQLAlchemy ORM
- **Database**: PostgreSQL (Development & Production)
- **Authentication**: JWT (JSON Web Tokens) with secure password hashing (passlib/bcrypt)

## Structure

- `/frontend`: React application containing Auth forms, Dashboard, and UI styles.
- `/backend`: FastAPI service handling user registration, authentication, and profile updates.

## Development Setup

### Backend Setup
1. Navigate to `/backend`
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to `/frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
