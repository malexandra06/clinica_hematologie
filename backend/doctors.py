from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.utils import get_current_user
from backend import schemas

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("/", response_model=List[schemas.DoctorListItem])
def get_doctors(db: Session = Depends(get_db)):
    """Get all doctors with their profiles"""
    from backend.models import User, DoctorProfile
    
    doctors = db.query(User).join(
        DoctorProfile, 
        User.id == DoctorProfile.user_id,
        isouter=True
    ).filter(User.role == "doctor").all()
    
    result = []
    for doctor in doctors:
        specialization = "Hematolog"
        bio = None
        if doctor.doctor_profile:
            specialization = doctor.doctor_profile.specialization or "Hematolog"
            bio = doctor.doctor_profile.bio
            
        result.append(schemas.DoctorListItem(
            id=doctor.id,
            first_name=doctor.first_name,
            last_name=doctor.last_name,
            email=doctor.email,
            specialization=specialization,
            bio=bio
        ))
    
    return result

@router.get("/{doctor_id}/availability", response_model=List[schemas.AvailabilityResponse])
def get_doctor_availability(
    doctor_id: str,
    db: Session = Depends(get_db)
):
    """Get doctor's availability schedule"""
    from backend.models import DoctorAvailability, User
    
    # Verify doctor exists
    doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    availability = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id
    ).order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time).all()
    
    return availability

@router.post("/availability", response_model=schemas.AvailabilityResponse)
def create_availability(
    availability_data: schemas.AvailabilityCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create availability slot (doctors only)"""
    from backend.models import DoctorAvailability
    
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")
    
    # Check for overlapping slots
    existing = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id,
        DoctorAvailability.day_of_week == availability_data.day_of_week
    ).all()
    
    for slot in existing:
        # Check for time overlap
        if (availability_data.start_time < slot.end_time and 
            availability_data.end_time > slot.start_time):
            raise HTTPException(
                status_code=400, 
                detail="Time slot overlaps with existing availability"
            )
    
    new_availability = DoctorAvailability(
        doctor_id=current_user.id,
        day_of_week=availability_data.day_of_week,
        start_time=availability_data.start_time,
        end_time=availability_data.end_time
    )
    
    db.add(new_availability)
    db.commit()
    db.refresh(new_availability)
    
    return new_availability

@router.get("/my-availability", response_model=List[schemas.AvailabilityResponse])
def get_my_availability(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current doctor's availability"""
    from backend.models import DoctorAvailability
    
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view their availability")
    
    availability = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id
    ).order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time).all()
    
    return availability

@router.delete("/availability/{availability_id}")
def delete_availability(
    availability_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete availability slot"""
    from backend.models import DoctorAvailability
    
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can manage availability")
    
    availability = db.query(DoctorAvailability).filter(
        DoctorAvailability.id == availability_id,
        DoctorAvailability.doctor_id == current_user.id
    ).first()
    
    if not availability:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    
    db.delete(availability)
    db.commit()
    
    return {"message": "Availability slot deleted"}

@router.put("/profile")
def update_doctor_profile(
    profile_data: schemas.DoctorProfileUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update doctor's profile"""
    from backend.models import DoctorProfile
    
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update their profile")
    
    profile = db.query(DoctorProfile).filter(
        DoctorProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        # Create profile if doesn't exist
        profile = DoctorProfile(
            user_id=current_user.id,
            specialization=profile_data.specialization or "Hematolog",
            bio=profile_data.bio
        )
        db.add(profile)
    else:
        if profile_data.specialization:
            profile.specialization = profile_data.specialization
        if profile_data.bio is not None:
            profile.bio = profile_data.bio
    
    db.commit()
    db.refresh(profile)
    
    return {"message": "Profile updated successfully"}