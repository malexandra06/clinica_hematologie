from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from backend.database import get_db
from backend.utils import get_current_user
from backend import schemas

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.post("/", response_model=schemas.AppointmentResponse)
def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new appointment with validation"""
    from backend.models import Appointment, User, DoctorAvailability
    
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Doar pacienții pot crea programări")
    
    # Verify doctor exists
    doctor = db.query(User).filter(
        User.id == appointment_data.doctor_id, 
        User.role == "doctor"
    ).first()
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctorul nu a fost găsit")
    
    scheduled_time = appointment_data.scheduled_time
    
    # Check if appointment is in the past
    if scheduled_time < datetime.now():
        raise HTTPException(status_code=400, detail="Nu poți programa în trecut")
    
    # Check doctor availability for that day
    # Python weekday: 0=Monday..6=Sunday, but we store 0=Sunday, 1=Monday...
    py_weekday = scheduled_time.weekday()  # 0=Mon, 6=Sun
    day_of_week = (py_weekday + 1) % 7 if py_weekday < 6 else 0  # Convert to 0=Sun, 1=Mon...
    
    availability = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == appointment_data.doctor_id,
        DoctorAvailability.day_of_week == day_of_week
    ).all()
    
    if not availability:
        day_names = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
        raise HTTPException(
            status_code=400, 
            detail=f"Doctorul nu lucrează în {day_names[day_of_week]}"
        )
    
    # Check if time is within any availability slot
    appointment_time = scheduled_time.time()
    is_in_schedule = False
    
    for av in availability:
        if av.start_time <= appointment_time < av.end_time:
            is_in_schedule = True
            break
    
    if not is_in_schedule:
        slots = [f"{av.start_time.strftime('%H:%M')}-{av.end_time.strftime('%H:%M')}" for av in availability]
        raise HTTPException(
            status_code=400,
            detail=f"Ora selectată nu este în programul doctorului. Ore disponibile: {', '.join(slots)}"
        )
    
    # Check for conflicting appointments (within 30 minutes)
    time_window_start = scheduled_time - timedelta(minutes=29)
    time_window_end = scheduled_time + timedelta(minutes=29)
    
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == appointment_data.doctor_id,
        Appointment.status == "scheduled",
        Appointment.scheduled_time >= time_window_start,
        Appointment.scheduled_time <= time_window_end
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Această oră este deja ocupată. Te rugăm să alegi altă oră."
        )
    
    # Create appointment
    new_appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=appointment_data.doctor_id,
        scheduled_time=scheduled_time,
        status="scheduled"
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    # Prepare response with names
    response = schemas.AppointmentResponse.from_orm(new_appointment)
    response.patient_name = f"{current_user.first_name} {current_user.last_name}"
    response.doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"
    
    return response

@router.get("/", response_model=List[schemas.AppointmentResponse])
def get_appointments(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get appointments for current user"""
    from backend.models import Appointment, User
    
    if current_user.role == "patient":
        appointments = db.query(Appointment).filter(
            Appointment.patient_id == current_user.id
        ).order_by(Appointment.scheduled_time.desc()).all()
    else:
        appointments = db.query(Appointment).filter(
            Appointment.doctor_id == current_user.id
        ).order_by(Appointment.scheduled_time.desc()).all()
    
    result = []
    for apt in appointments:
        patient = db.query(User).filter(User.id == apt.patient_id).first()
        doctor = db.query(User).filter(User.id == apt.doctor_id).first()
        
        apt_response = schemas.AppointmentResponse.from_orm(apt)
        apt_response.patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Necunoscut"
        apt_response.doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Necunoscut"
        apt_response.patient_id = apt.patient_id
        result.append(apt_response)
    
    return result

@router.get("/doctor/{doctor_id}", response_model=List[schemas.AppointmentResponse])
def get_doctor_appointments(
    doctor_id: str,
    db: Session = Depends(get_db)
):
    """Get all scheduled appointments for a doctor (for conflict checking)"""
    from backend.models import Appointment, User
    
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == "scheduled"
    ).order_by(Appointment.scheduled_time).all()
    
    result = []
    for apt in appointments:
        patient = db.query(User).filter(User.id == apt.patient_id).first()
        doctor = db.query(User).filter(User.id == apt.doctor_id).first()
        
        apt_response = schemas.AppointmentResponse.from_orm(apt)
        apt_response.patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Necunoscut"
        apt_response.doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Necunoscut"
        result.append(apt_response)
    
    return result

@router.patch("/{appointment_id}")
def update_appointment(
    appointment_id: str,
    update_data: schemas.AppointmentUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update appointment status"""
    from backend.models import Appointment
    
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Programarea nu a fost găsită")
    
    if current_user.role == "patient" and str(appointment.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    if current_user.role == "doctor" and str(appointment.doctor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    appointment.status = update_data.status
    db.commit()
    
    return {"message": "Programare actualizată cu succes"}

@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel appointment"""
    from backend.models import Appointment
    
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Programarea nu a fost găsită")
    
    if current_user.role == "patient" and str(appointment.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    appointment.status = "cancelled"
    db.commit()
    
    return {"message": "Programare anulată cu succes"}