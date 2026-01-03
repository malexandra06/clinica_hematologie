# HEMOCLINIC - Hematology Clinic Management Platform

![Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)

Click on this link to view the application: https://clinica-hematologie-frontend.onrender.com/

A full-stack medical platform for hematology clinics featuring ML-powered blood analysis, AI-generated nutritional recommendations, intelligent appointment scheduling, and automated PDF prescription generation.

### Patient Features

* **Blood Analysis Upload:** Upload microscopy images for automatic ML classification
* **ML Classification:** AI model detects cell types (benign/early/pre/pro stages)
* **AI Recommendations:** Personalized nutrition advice powered by Google Gemini
* **Smart Appointments:** Book doctors, view availability, select time slots
* **Conflict Prevention:** Automatic validation for double-bookings and schedule conflicts
* **Digital Prescriptions:** View prescriptions and download as PDF
* **Virtual Assistant:** Chatbot with FAQ responses for common questions

### Doctor Features

* **Appointment Management:** View, complete, or cancel patient consultations
* **Patient Analysis Access:** Review all patient blood analyses with AI insights
* **Prescription System:** Issue prescriptions with automatic PDF generation
* **Availability Settings:** Configure working hours and available time slots

## Project Structure

```
hemoclinic/
├── backend/
│   ├── main.py                 # FastAPI entry point & router config
│   ├── database.py             # PostgreSQL/SQLAlchemy configuration
│   ├── models.py               # SQLAlchemy models (User, Appointment, etc.)
│   ├── schemas.py              # Pydantic schemas for validation
│   ├── auth.py                 # JWT authentication, register, login
│   ├── analyses.py             # Image upload, ML classification, AI recommendations
│   ├── appointments.py         # CRUD appointments with conflict validation
│   ├── prescriptions.py        # CRUD prescriptions + PDF generation
│   ├── doctors.py              # Doctor availability management
│   ├── utils.py                # JWT decode, get_current_user helper
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component (all UI)
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```

## Setup

### Backend

1. Clone the repository

2. Create virtual environment and install dependencies
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # Linux/Mac
   pip install -r requirements.txt
   ```

3. Environment Configuration - Create `.env` file in backend directory:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   SECRET_KEY=your-secret-key-minimum-32-characters
   GEMINI_API_KEY=your-google-gemini-api-key
   ```

4. Database Setup - Run SQL scripts in Supabase SQL Editor:
   - First run `schema.sql` to create tables
   - Then run `seed_data.sql` for test data

5. Start the server
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend

1. Install dependencies
   ```bash
   cd frontend
   npm install
   ```

2. Environment Configuration - Update `API_URL` in `App.jsx`:
   ```javascript
   const API_URL = 'http://localhost:8000';  // or your deployed backend URL
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

## Technologies

### Frontend

* **React 18** - UI library with hooks
* **Vite** - Build tool and dev server
* **TailwindCSS** - Utility-first styling
* **Lucide React** - Icon library
* **JWT** - Token-based authentication

### Backend

* **FastAPI** - Modern Python web framework
* **SQLAlchemy** - ORM for PostgreSQL
* **Pydantic** - Data validation
* **python-jose** - JWT token handling
* **bcrypt** - Password hashing
* **ReportLab** - PDF generation
* **TensorFlow/Keras** - ML model for blood analysis
* **Google Generative AI** - Gemini API for recommendations

### Database

* **PostgreSQL** - Relational database
* **Supabase** - Hosted PostgreSQL service

## Key Features

### 1. Blood Analysis with ML & AI

* Upload blood microscopy images
* Automatic classification using trained ML model
* AI-generated nutritional recommendations via Google Gemini
* Analysis history with expandable details

### 2. Smart Appointment System

* View doctor's complete schedule when booking
* Visual time slot grid (available/booked/past)
* Real-time conflict detection
* Automatic validation:
  - Cannot book in the past
  - Cannot book outside doctor's working hours
  - Cannot double-book same time slot
  - 30-minute buffer between appointments

### 3. Prescription Management

* Doctors issue prescriptions after completed appointments
* Automatic PDF generation with clinic branding
* Patients can view and download prescriptions
* Full prescription history

### 4. Virtual Assistant (Chatbot)

* Floating chat button for patients
* Hardcoded Q&A for common questions:
  - Analysis results explanation
  - Appointment booking help
  - Prescription information
  - Health & nutrition tips
  - Clinic information
* Fuzzy matching for flexible question recognition
* Quick suggestion buttons

## Database Schema

```sql
-- Users table (patients & doctors)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL,  -- 'patient' or 'doctor'
    created_at TIMESTAMP
);

-- Doctor profiles with specialization
CREATE TABLE doctor_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    specialization VARCHAR(255),
    bio TEXT
);

-- Doctor availability (working hours)
CREATE TABLE doctor_availability (
    id UUID PRIMARY KEY,
    doctor_id UUID REFERENCES users(id),
    day_of_week INT,  -- 0=Sunday, 1=Monday, etc.
    start_time TIME,
    end_time TIME
);

-- Blood analyses with ML results
CREATE TABLE blood_analyses (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES users(id),
    image_url TEXT,
    ml_classification VARCHAR(100),
    ai_recommendations TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES users(id),
    doctor_id UUID REFERENCES users(id),
    scheduled_time TIMESTAMP,
    status VARCHAR(50),  -- 'scheduled', 'completed', 'cancelled'
    created_at TIMESTAMP
);

-- Prescriptions
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY,
    appointment_id UUID REFERENCES appointments(id),
    patient_id UUID REFERENCES users(id),
    doctor_id UUID REFERENCES users(id),
    content TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP
);
```

## Security Features

* **JWT Authentication:** Secure token-based auth with 7-day expiration
* **Role-based Access:** Separate patient and doctor permissions
* **Password Hashing:** bcrypt for secure password storage
* **Input Validation:** Server-side validation with Pydantic
* **CORS Protection:** Configured allowed origins

## Future Improvements

* Email notifications for appointments
* Doctor rating system
* Real-time patient-doctor chat
* Complete medical history PDF export
* Advanced analytics dashboard
* Google/Outlook calendar integration
* Mobile app (React Native)
