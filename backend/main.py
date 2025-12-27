from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend import models
from backend.database import engine
from backend.auth import router as auth_router
from backend.analyses import router as analyses_router
from backend.appointments import router as appointments_router
from backend.prescriptions import router as prescriptions_router
from backend.doctors import router as doctors_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Hematology Clinic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000","https://clinica-hematologie-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth are nevoie de prefix (nu are în fișier)
app.include_router(auth_router, prefix="/api/auth")

# Celelalte NU au nevoie de prefix (au deja în fișiere)
app.include_router(analyses_router)
app.include_router(appointments_router)
app.include_router(prescriptions_router)
app.include_router(doctors_router)

@app.get("/")
def root():
    return {"message": "Hematology Clinic API"}