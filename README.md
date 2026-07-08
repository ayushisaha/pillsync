# PillSync

PillSync is an Intelligent Medicine Reminder & Tracking Platform built for patients, caregivers, and administrators. It helps manage medication schedules, monitor adherence, and send smart reminders, ensuring patients never miss a dose.

## Technology Stack

### Backend Environment
- **Python 3.11** — Main programming language
- **FastAPI** — Web framework for building high-performance REST APIs
- **Uvicorn** — ASGI server to run the FastAPI application
- **SQLAlchemy** — SQL Toolkit and ORM to connect Python with PostgreSQL
- **python-jose** — JWT token creation, signing, and verification for authentication
- **passlib + bcrypt** — Secure password hashing and verification
- **pydantic** — Data validation and settings management using Python type annotations
- **python-dotenv** — Library to load environment variables from a `.env` file
- **psycopg2-binary** — PostgreSQL database adapter for Python
- **python-multipart** — Form data parser to handle file uploads
- **Virtual environment (`venv`)** — Isolated Python environment for dependency management

### Frontend Environment
- **Node.js v22** — JavaScript runtime environment
- **React.js** — Component-based UI library
- **Vite** — High-performance frontend build tool and dev server
- **Tailwind CSS v3** — Utility-first CSS framework for styling
- **React Router DOM** — Declarative routing for page navigation
- **Axios** — Promise-based HTTP client for making API requests to the backend
- **Plus Jakarta Sans** — Modern sans-serif typography (Google Fonts)

### Database
- **PostgreSQL 17** — Robust production-grade relational database
- **pgAdmin** — Web-based administration and management GUI for PostgreSQL
- Connected securely via `DATABASE_URL` in the environment configuration (`.env`)

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
