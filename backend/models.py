from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Enum, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    completed = "completed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    blood_analyses = relationship("BloodAnalysis", back_populates="patient", foreign_keys="BloodAnalysis.patient_id")
    doctor_availability = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    appointments_as_patient = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")
    appointments_as_doctor = relationship("Appointment", back_populates="doctor", foreign_keys="Appointment.doctor_id")
    prescriptions_as_patient = relationship("Prescription", back_populates="patient", foreign_keys="Prescription.patient_id")
    prescriptions_as_doctor = relationship("Prescription", back_populates="doctor", foreign_keys="Prescription.doctor_id")

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    specialization = Column(String(255), default="Hematolog")
    bio = Column(Text)
    
    user = relationship("User", back_populates="doctor_profile")

class BloodAnalysis(Base):
    __tablename__ = "blood_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    image_url = Column(Text, nullable=False)
    ml_classification = Column(String(100))
    ai_recommendations = Column(Text)
    status = Column(String(50), default="processed")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    patient = relationship("User", back_populates="blood_analyses", foreign_keys=[patient_id])

class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    doctor = relationship("User", back_populates="doctor_availability")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    patient = relationship("User", back_populates="appointments_as_patient", foreign_keys=[patient_id])
    doctor = relationship("User", back_populates="appointments_as_doctor", foreign_keys=[doctor_id])
    prescriptions = relationship("Prescription", back_populates="appointment", cascade="all, delete-orphan")

class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="CASCADE"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    pdf_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appointment = relationship("Appointment", back_populates="prescriptions")
    patient = relationship("User", back_populates="prescriptions_as_patient", foreign_keys=[patient_id])
    doctor = relationship("User", back_populates="prescriptions_as_doctor", foreign_keys=[doctor_id])