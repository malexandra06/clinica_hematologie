from pydantic import BaseModel, EmailStr
from datetime import datetime, time
from typing import Optional, List
from uuid import UUID

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str
    specialization: Optional[str] = None
    bio: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Doctor Schemas
class DoctorProfileResponse(BaseModel):
    id: UUID
    specialization: str
    bio: Optional[str]
    
    class Config:
        from_attributes = True

class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    bio: Optional[str] = None

class DoctorListItem(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str
    specialization: str
    bio: Optional[str] = None
    
    class Config:
        from_attributes = True

# Blood Analysis Schemas
class BloodAnalysisResponse(BaseModel):
    id: UUID
    patient_id: UUID
    image_url: str
    ml_classification: Optional[str]
    ai_recommendations: Optional[str]
    status: str
    created_at: datetime
    patient_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentCreate(BaseModel):
    doctor_id: UUID
    scheduled_time: datetime

class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    scheduled_time: datetime
    status: str
    created_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class AppointmentUpdate(BaseModel):
    status: str

# Prescription Schemas
class PrescriptionCreate(BaseModel):
    appointment_id: UUID
    patient_id: UUID
    content: str

class PrescriptionResponse(BaseModel):
    id: UUID
    appointment_id: UUID
    patient_id: UUID
    doctor_id: UUID
    content: str
    pdf_url: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Availability Schemas
class AvailabilityCreate(BaseModel):
    day_of_week: int  # 0=Sunday, 1=Monday, etc.
    start_time: time
    end_time: time

class AvailabilityResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    
    class Config:
        from_attributes = True

# Statistics Schemas (for dashboard)
class PatientStats(BaseModel):
    total_analyses: int
    total_appointments: int
    total_prescriptions: int
    upcoming_appointments: int

class DoctorStats(BaseModel):
    total_patients: int
    total_appointments: int
    total_prescriptions: int
    pending_appointments: int
    completed_appointments: int