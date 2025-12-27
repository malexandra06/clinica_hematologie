from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime

from backend.database import get_db
from backend.utils import get_current_user
from backend import schemas

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

def generate_prescription_pdf(prescription_data: dict, patient_name: str, doctor_name: str) -> str:
    """Generate PDF for prescription using reportlab"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas
        from reportlab.lib.colors import HexColor
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        # Create uploads/prescriptions directory
        os.makedirs("uploads/prescriptions", exist_ok=True)
        
        # Generate unique filename
        pdf_filename = f"reteta_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = f"uploads/prescriptions/{pdf_filename}"
        
        # Create PDF
        c = canvas.Canvas(pdf_path, pagesize=A4)
        width, height = A4
        
        # Header background
        c.setFillColor(HexColor('#1e40af'))
        c.rect(0, height - 3.5*cm, width, 3.5*cm, fill=True, stroke=False)
        
        # Header text
        c.setFillColor(HexColor('#ffffff'))
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(width/2, height - 1.8*cm, "CLINICA HEMATOLOGICA")
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 2.6*cm, "Reteta Medicala")
        
        # Prescription info box
        c.setFillColor(HexColor('#f8fafc'))
        c.rect(1.5*cm, height - 9*cm, width - 3*cm, 4.5*cm, fill=True, stroke=False)
        
        c.setFillColor(HexColor('#1e293b'))
        c.setFont("Helvetica-Bold", 11)
        y_pos = height - 5*cm
        
        c.drawString(2*cm, y_pos, "PACIENT:")
        c.setFont("Helvetica", 11)
        c.drawString(5*cm, y_pos, patient_name)
        
        y_pos -= 0.7*cm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2*cm, y_pos, "MEDIC:")
        c.setFont("Helvetica", 11)
        c.drawString(5*cm, y_pos, doctor_name)
        
        y_pos -= 0.7*cm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2*cm, y_pos, "DATA:")
        c.setFont("Helvetica", 11)
        date_str = prescription_data.get('created_at', datetime.now()).strftime("%d.%m.%Y")
        c.drawString(5*cm, y_pos, date_str)
        
        y_pos -= 0.7*cm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2*cm, y_pos, "NR. RETETA:")
        c.setFont("Helvetica", 11)
        c.drawString(5*cm, y_pos, str(prescription_data.get('id', ''))[:8].upper())
        
        # Prescription content header
        c.setFillColor(HexColor('#1e40af'))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1.5*cm, height - 10.5*cm, "PRESCRIPTIE MEDICALA")
        
        # Horizontal line
        c.setStrokeColor(HexColor('#e2e8f0'))
        c.setLineWidth(1)
        c.line(1.5*cm, height - 11*cm, width - 1.5*cm, height - 11*cm)
        
        # Prescription content
        c.setFillColor(HexColor('#1e293b'))
        c.setFont("Helvetica", 11)
        
        content = prescription_data.get('content', '')
        lines = content.split('\n')
        y_pos = height - 12*cm
        
        for line in lines:
            if y_pos < 4*cm:  # Leave space for footer
                break
            # Handle long lines
            while len(line) > 85:
                c.drawString(2*cm, y_pos, line[:85])
                line = line[85:]
                y_pos -= 0.5*cm
            c.drawString(2*cm, y_pos, line)
            y_pos -= 0.6*cm
        
        # Footer
        c.setFillColor(HexColor('#64748b'))
        c.setFont("Helvetica", 9)
        c.drawCentredString(width/2, 2*cm, "Acest document este generat electronic si este valid fara semnatura.")
        c.drawCentredString(width/2, 1.4*cm, "Clinica Hematologica - Pentru sanatatea dumneavoastra")
        
        # Border
        c.setStrokeColor(HexColor('#1e40af'))
        c.setLineWidth(2)
        c.rect(0.5*cm, 0.5*cm, width - 1*cm, height - 1*cm, fill=False, stroke=True)
        
        c.save()
        return pdf_path
        
    except ImportError:
        print("reportlab not installed, PDF generation unavailable")
        return None
    except Exception as e:
        print(f"PDF generation error: {e}")
        return None

@router.post("/", response_model=schemas.PrescriptionResponse)
def create_prescription(
    prescription_data: schemas.PrescriptionCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new prescription (doctors only)"""
    from backend.models import Prescription, Appointment, User
    
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create prescriptions")
    
    # Verify appointment exists and belongs to doctor
    appointment = db.query(Appointment).filter(
        Appointment.id == prescription_data.appointment_id
    ).first()
    
    if not appointment or str(appointment.doctor_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Appointment not found or access denied")
    
    # Get patient info for PDF
    patient = db.query(User).filter(User.id == prescription_data.patient_id).first()
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Necunoscut"
    doctor_name = f"Dr. {current_user.first_name} {current_user.last_name}"
    
    # Create prescription
    new_prescription = Prescription(
        appointment_id=prescription_data.appointment_id,
        patient_id=prescription_data.patient_id,
        doctor_id=current_user.id,
        content=prescription_data.content
    )
    
    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)
    
    # Generate PDF
    pdf_data = {
        'id': new_prescription.id,
        'content': prescription_data.content,
        'created_at': new_prescription.created_at
    }
    pdf_path = generate_prescription_pdf(pdf_data, patient_name, doctor_name)
    
    if pdf_path:
        new_prescription.pdf_url = pdf_path
        db.commit()
        db.refresh(new_prescription)
    
    # Prepare response
    response = schemas.PrescriptionResponse.from_orm(new_prescription)
    response.patient_name = patient_name
    response.doctor_name = doctor_name
    
    return response

@router.get("/", response_model=List[schemas.PrescriptionResponse])
def get_prescriptions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get prescriptions for current user - FILTERED by role"""
    from backend.models import Prescription, User
    
    if current_user.role == "patient":
        # Patient sees only their prescriptions
        prescriptions = db.query(Prescription).filter(
            Prescription.patient_id == current_user.id
        ).order_by(Prescription.created_at.desc()).all()
    else:
        # Doctor sees ONLY prescriptions they created (not all)
        prescriptions = db.query(Prescription).filter(
            Prescription.doctor_id == current_user.id
        ).order_by(Prescription.created_at.desc()).all()
    
    # Add patient and doctor names
    result = []
    for presc in prescriptions:
        patient = db.query(User).filter(User.id == presc.patient_id).first()
        doctor = db.query(User).filter(User.id == presc.doctor_id).first()
        
        presc_response = schemas.PrescriptionResponse.from_orm(presc)
        presc_response.patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Necunoscut"
        presc_response.doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Necunoscut"
        result.append(presc_response)
    
    return result

@router.get("/{prescription_id}/download")
def download_prescription_pdf(
    prescription_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download prescription PDF"""
    from backend.models import Prescription, User
    
    prescription = db.query(Prescription).filter(
        Prescription.id == prescription_id
    ).first()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Check authorization - only patient or prescribing doctor can download
    if current_user.role == "patient" and str(prescription.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if current_user.role == "doctor" and str(prescription.doctor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if PDF exists
    if not prescription.pdf_url or not os.path.exists(prescription.pdf_url):
        # Try to regenerate PDF
        patient = db.query(User).filter(User.id == prescription.patient_id).first()
        doctor = db.query(User).filter(User.id == prescription.doctor_id).first()
        
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Necunoscut"
        doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Necunoscut"
        
        pdf_data = {
            'id': prescription.id,
            'content': prescription.content,
            'created_at': prescription.created_at
        }
        pdf_path = generate_prescription_pdf(pdf_data, patient_name, doctor_name)
        
        if pdf_path:
            prescription.pdf_url = pdf_path
            db.commit()
        else:
            raise HTTPException(status_code=500, detail="Could not generate PDF")
    
    return FileResponse(
        prescription.pdf_url,
        media_type="application/pdf",
        filename=f"reteta_{str(prescription.id)[:8]}.pdf"
    )

@router.get("/{prescription_id}", response_model=schemas.PrescriptionResponse)
def get_prescription(
    prescription_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific prescription"""
    from backend.models import Prescription, User
    
    prescription = db.query(Prescription).filter(
        Prescription.id == prescription_id
    ).first()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Check authorization
    if current_user.role == "patient" and str(prescription.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if current_user.role == "doctor" and str(prescription.doctor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    patient = db.query(User).filter(User.id == prescription.patient_id).first()
    doctor = db.query(User).filter(User.id == prescription.doctor_id).first()
    
    response = schemas.PrescriptionResponse.from_orm(prescription)
    response.patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Necunoscut"
    response.doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Necunoscut"
    
    return response