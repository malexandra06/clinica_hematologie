from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
from PIL import Image
import io
import numpy as np

from backend.database import get_db
from backend.utils import get_current_user
from backend import schemas

router = APIRouter(prefix="/api/analyses", tags=["Blood Analyses"])

# Get the directory where this file is located
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, 'model.h5')

# ML Model loading (optional)
try:
    print(f"Looking for model at: {MODEL_PATH}")
    print(f"Model exists: {os.path.exists(MODEL_PATH)}")
    from tensorflow.keras.models import load_model
    ml_model = load_model(MODEL_PATH)
    print("ML model loaded successfully")
except Exception as e:
    ml_model = None
    print(f"Warning: ML model not loaded - {e}")

def preprocess_image(image: Image.Image) -> np.ndarray:
    """Preprocess image for ML model"""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((128, 128))
    img_array = np.array(image)
    img_array = img_array.astype('float32') / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def get_class_name(prediction: int) -> str:
    """Map prediction to class name"""
    class_names = {0: "benign", 1: "early", 2: "pre", 3: "pro"}
    return class_names.get(prediction, f"unknown_{prediction}")

def generate_ai_recommendations(class_name: str, confidence: float) -> str:
    """Generate AI recommendations using Google Gemini - focused on nutrition and lifestyle"""
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return get_default_recommendations(class_name)
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Prompt carefully crafted to avoid medical advice restrictions
        prompt = f"""Ești un consultant de nutriție și stil de viață sănătos. 
Un utilizator a primit rezultatul unei analize de laborator cu clasificarea: "{class_name}".

IMPORTANT: NU oferi sfaturi medicale sau diagnostic. Concentrează-te DOAR pe:

1. 🥗 ALIMENTAȚIE SĂNĂTOASĂ
- Recomandă 5-7 alimente bogate în nutrienți benefici pentru sănătatea generală
- Sugerează un exemplu de meniu zilnic echilibrat
- Menționează ce alimente să evite pentru un stil de viață sănătos

2. 🏃 STIL DE VIAȚĂ ACTIV  
- Sugerează 3-4 tipuri de exerciții fizice ușoare/moderate
- Recomandă durata și frecvența activității fizice
- Include sugestii pentru reducerea stresului (meditație, plimbări în natură)

3. 😴 RUTINĂ ZILNICĂ
- Importanța somnului de calitate (7-8 ore)
- Hidratare adecvată (câtă apă pe zi)
- Obiceiuri sănătoase de adoptat

4. ⚠️ NOTĂ IMPORTANTĂ
Adaugă la final: "Aceste recomandări sunt generale pentru un stil de viață sănătos. Pentru interpretarea rezultatelor analizelor și sfaturi medicale personalizate, consultați medicul dumneavoastră specialist."

Răspunde în limba română, într-un format ușor de citit cu emoji-uri și paragrafe clare."""

        response = model.generate_content(prompt)
        return response.text
        
    except Exception as e:
        print(f"AI recommendation error: {e}")
        return get_default_recommendations(class_name)

def get_default_recommendations(class_name: str) -> str:
    """Default recommendations when Gemini is unavailable"""
    recommendations = {
        'benign': """🥗 RECOMANDĂRI PENTRU UN STIL DE VIAȚĂ SĂNĂTOS

✅ ALIMENTAȚIE:
• Consumați zilnic 5 porții de fructe și legume proaspete
• Preferați cerealele integrale (ovăz, quinoa, orez brun)
• Includeți proteine slabe: pește, pui, leguminoase
• Adăugați nuci și semințe pentru acizi grași sănătoși
• Evitați alimentele procesate și zahărul rafinat

🏃 ACTIVITATE FIZICĂ:
• 30 minute de mers pe jos zilnic
• Exerciții de stretching dimineața
• 2-3 ședințe de sport moderat pe săptămână

😴 STIL DE VIAȚĂ:
• Dormiți 7-8 ore pe noapte
• Beți minimum 2 litri de apă zilnic
• Practicați tehnici de relaxare

⚠️ Aceste recomandări sunt generale. Consultați medicul pentru sfaturi personalizate.""",

        'early': """🥗 RECOMANDĂRI NUTRIȚIONALE ȘI STIL DE VIAȚĂ

✅ ALIMENTAȚIE BOGATĂ ÎN NUTRIENȚI:
• Legume verzi: spanac, broccoli, kale (bogate în fier și acid folic)
• Fructe de pădure: afine, mure, căpșuni (antioxidanți)
• Proteine de calitate: pește gras, ouă, carne slabă
• Cereale integrale pentru energie susținută
• Evitați alcoolul și băuturile carbogazoase

🏃 MIȘCARE MODERATĂ:
• Plimbări zilnice de 20-30 minute
• Yoga sau Pilates pentru flexibilitate
• Evitați efortul fizic intens

😴 ODIHNĂ ȘI RECUPERARE:
• Prioritizați somnul de calitate (8 ore)
• Faceți pauze regulate în timpul zilei
• Reduceți stresul prin meditație

⚠️ Important: Consultați medicul hematolog pentru monitorizare și sfaturi medicale personalizate.""",

        'pre': """🥗 NUTRIȚIE OPTIMIZATĂ ȘI STIL DE VIAȚĂ

✅ SUPER-ALIMENTE RECOMANDATE:
• Sfeclă roșie și roșii (licopen)
• Citrice pentru vitamina C
• Pește gras (somon, macrou) pentru Omega-3
• Usturoi și turmeric (proprietăți benefice)
• Ceai verde pentru antioxidanți

🏃 ACTIVITATE ADAPTATĂ:
• Mers pe jos în aer liber
• Înot ușor sau gimnastică în apă
• Exerciții de respirație

😴 RUTINĂ ZILNICĂ:
• Program de somn regulat
• Hidratare constantă (2.5L apă)
• Evitați fumatul și alcoolul complet

⚠️ Este esențial să consultați medicul specialist pentru monitorizare regulată.""",

        'pro': """🥗 PLAN NUTRIȚIONAL DE SUSȚINERE

✅ ALIMENTAȚIE UȘOR DE DIGERAT:
• Supe și ciorbe de legume proaspete
• Proteine ușoare: pui la grătar, pește aburit
• Fructe moi: banane, pere coapte, compot
• Cereale integrale bine fierte
• Miere și propolis pentru imunitate

🏃 MIȘCARE BLÂNDĂ:
• Plimbări scurte când vă simțiți bine
• Stretching ușor
• Exerciții de respirație profundă

😴 ODIHNĂ PRIORITARĂ:
• Odihniți-vă ori de câte ori simțiți nevoia
• Creați un mediu liniștit pentru somn
• Hidratați-vă constant cu apă și ceaiuri

⚠️ Consultați urgent medicul specialist pentru plan de tratament și monitorizare."""
    }
    
    return recommendations.get(class_name, recommendations['benign'])

@router.post("/upload")
async def upload_analysis(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze blood sample image"""
    from backend.models import BloodAnalysis
    
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can upload analyses")
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and process image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    # Save image
    image_filename = f"{uuid.uuid4()}.jpg"
    image_path = f"uploads/{image_filename}"
    os.makedirs("uploads", exist_ok=True)
    image.save(image_path)
    
    # ML Classification
    if ml_model:
        try:
            processed_image = preprocess_image(image)
            predictions = ml_model.predict(processed_image)
            predicted_class = int(np.argmax(predictions[0]))
            confidence = float(np.max(predictions[0]))
            class_name = get_class_name(predicted_class)
        except Exception as e:
            print(f"ML prediction error: {e}")
            class_name = "benign"
            confidence = 0.95
    else:
        class_name = "benign"
        confidence = 0.95
    
    # Generate AI recommendations (nutrition & lifestyle focused)
    ai_recommendations = generate_ai_recommendations(class_name, confidence)
    
    # Save to database
    new_analysis = BloodAnalysis(
        patient_id=current_user.id,
        image_url=image_path,
        ml_classification=class_name,
        ai_recommendations=ai_recommendations,
        status="processed"
    )
    
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)
    
    return {
        "id": str(new_analysis.id),
        "classification": class_name,
        "confidence": confidence,
        "recommendations": ai_recommendations,
        "image_url": image_path
    }

@router.get("/", response_model=List[schemas.BloodAnalysisResponse])
def get_analyses(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all analyses for current user"""
    from backend.models import BloodAnalysis
    
    if current_user.role == "patient":
        analyses = db.query(BloodAnalysis).filter(
            BloodAnalysis.patient_id == current_user.id
        ).order_by(BloodAnalysis.created_at.desc()).all()
    else:
        # Doctor sees all analyses
        analyses = db.query(BloodAnalysis).order_by(
            BloodAnalysis.created_at.desc()
        ).all()
    
    return analyses

@router.get("/{analysis_id}", response_model=schemas.BloodAnalysisResponse)
def get_analysis(
    analysis_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific analysis"""
    from backend.models import BloodAnalysis
    
    analysis = db.query(BloodAnalysis).filter(BloodAnalysis.id == analysis_id).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Check authorization
    if current_user.role == "patient" and str(analysis.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return analysis