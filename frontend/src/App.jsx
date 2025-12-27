import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Upload, FileText, Users, Clock, CheckCircle, XCircle, User, LogOut, Home, AlertCircle, Download, Plus, ChevronRight, Pill, Stethoscope, Droplets, Leaf, X, Activity, Bell, TrendingUp, MessageCircle, Send, Bot, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const api = {
  setToken: (token) => localStorage.setItem('token', token),
  getToken: () => localStorage.getItem('token'),
  clearToken: () => localStorage.removeItem('token'),
  getHeaders: () => ({ 'Authorization': `Bearer ${api.getToken()}`, 'Content-Type': 'application/json' }),
  
  login: async (email, password) => {
    const r = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Eroare autentificare'); return d;
  },
  register: async (userData) => {
    const r = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
    const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Eroare inregistrare'); return d;
  },
  getMe: async () => {
    const r = await fetch(`${API_URL}/api/auth/me`, { headers: api.getHeaders() });
    if (!r.ok) throw new Error('Neautorizat'); return await r.json();
  },
  uploadAnalysis: async (file) => {
    const f = new FormData(); f.append('file', file);
    const r = await fetch(`${API_URL}/api/analyses/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${api.getToken()}` }, body: f });
    const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Eroare upload'); return d;
  },
  getAnalyses: async () => { const r = await fetch(`${API_URL}/api/analyses/`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  getDoctors: async () => { const r = await fetch(`${API_URL}/api/doctors/`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  getDoctorAvailability: async (id) => { const r = await fetch(`${API_URL}/api/doctors/${id}/availability`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  getDoctorAppointments: async (id) => { const r = await fetch(`${API_URL}/api/appointments/doctor/${id}`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  getMyAvailability: async () => { const r = await fetch(`${API_URL}/api/doctors/my-availability`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  createAvailability: async (day, start, end) => {
    const r = await fetch(`${API_URL}/api/doctors/availability`, { method: 'POST', headers: api.getHeaders(), body: JSON.stringify({ day_of_week: day, start_time: start, end_time: end }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Eroare'); return d;
  },
  deleteAvailability: async (id) => { await fetch(`${API_URL}/api/doctors/availability/${id}`, { method: 'DELETE', headers: api.getHeaders() }); },
  getAppointments: async () => { const r = await fetch(`${API_URL}/api/appointments/`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  createAppointment: async (doctorId, time) => {
    const r = await fetch(`${API_URL}/api/appointments/`, { method: 'POST', headers: api.getHeaders(), body: JSON.stringify({ doctor_id: doctorId, scheduled_time: time }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Eroare programare'); return d;
  },
  updateAppointmentStatus: async (id, status) => { await fetch(`${API_URL}/api/appointments/${id}`, { method: 'PATCH', headers: api.getHeaders(), body: JSON.stringify({ status }) }); },
  cancelAppointment: async (id) => { await fetch(`${API_URL}/api/appointments/${id}`, { method: 'DELETE', headers: api.getHeaders() }); },
  getPrescriptions: async () => { const r = await fetch(`${API_URL}/api/prescriptions/`, { headers: api.getHeaders() }); return r.ok ? await r.json() : []; },
  createPrescription: async (aptId, patId, content) => {
    const r = await fetch(`${API_URL}/api/prescriptions/`, { method: 'POST', headers: api.getHeaders(), body: JSON.stringify({ appointment_id: aptId, patient_id: patId, content }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Eroare'); return d;
  },
  downloadPrescription: async (id) => {
    const r = await fetch(`${API_URL}/api/prescriptions/${id}/download`, { headers: { 'Authorization': `Bearer ${api.getToken()}` } });
    if (!r.ok) throw new Error('Eroare descarcare'); return await r.blob();
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = api.getToken();
      if (token) {
        try { setUser(await api.getMe()); } 
        catch { api.clearToken(); }
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-blue-200">Se incarca...</p>
      </div>
    </div>
  );

  if (!user) return <LoginPage onLogin={(u, t) => { api.setToken(t); setUser(u); }} />;
  return user.role === 'patient' 
    ? <PatientDashboard user={user} onLogout={() => { api.clearToken(); setUser(null); }} />
    : <DoctorDashboard user={user} onLogout={() => { api.clearToken(); setUser(null); }} />;
}

// ==================== COMPONENTE COMUNE ====================
function GlassCard({ children, className = "" }) {
  return <div className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl ${className}`}>{children}</div>;
}

function ErrorMessage({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-300 text-sm">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-red-400 hover:text-red-300">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-emerald-400" />
      <p className="text-emerald-300 text-sm">{message}</p>
    </div>
  );
}

// ==================== LOGIN ====================
function LoginPage({ onLogin }) {
  const [isReg, setIsReg] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'patient', spec: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isReg) {
        await api.register({ email: form.email, password: form.password, first_name: form.firstName, last_name: form.lastName, role: form.role, specialization: form.role === 'doctor' ? form.spec : null });
        setIsReg(false);
        setForm({ ...form, password: '' });
      } else {
        const res = await api.login(form.email, form.password);
        onLogin(res.user, res.access_token);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      <GlassCard className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 mb-4">
            <Droplets className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Clinica Hematologica</h1>
          <p className="text-blue-200/80 mt-2">{isReg ? 'Creare cont nou' : 'Bine ai revenit'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isReg && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Prenume" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} 
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-blue-400/50" required />
                <input type="text" placeholder="Nume" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} 
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-blue-400/50" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({...form, role: 'patient'})}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${form.role === 'patient' ? 'bg-blue-500/20 border-blue-400/50 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`}>
                  <User className="w-4 h-4" />Pacient
                </button>
                <button type="button" onClick={() => setForm({...form, role: 'doctor'})}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${form.role === 'doctor' ? 'bg-blue-500/20 border-blue-400/50 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`}>
                  <Stethoscope className="w-4 h-4" />Doctor
                </button>
              </div>
              {form.role === 'doctor' && (
                <input type="text" placeholder="Specializare (ex: Hematolog)" value={form.spec} onChange={e => setForm({...form, spec: e.target.value})} 
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-blue-400/50" />
              )}
            </>
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-blue-400/50" required />
          <input type="password" placeholder="Parola" value={form.password} onChange={e => setForm({...form, password: e.target.value})} 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-blue-400/50" required />
          
          <ErrorMessage message={error} onClose={() => setError('')} />
          
          <button type="submit" disabled={loading} 
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25">
            {loading ? 'Se proceseaza...' : (isReg ? 'Creare cont' : 'Autentificare')}
          </button>
        </form>

        <p className="text-center mt-6">
          <button onClick={() => { setIsReg(!isReg); setError(''); }} className="text-blue-300 hover:text-blue-200 text-sm">
            {isReg ? '← Am deja cont' : 'Nu ai cont? Inregistreaza-te →'}
          </button>
        </p>
      </GlassCard>
    </div>
  );
}

// ==================== PATIENT DASHBOARD ====================
function PatientDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const tabs = [
    { id: 'home', icon: Home, label: 'Acasa' },
    { id: 'analyses', icon: Droplets, label: 'Analize' },
    { id: 'appointments', icon: Calendar, label: 'Programari' },
    { id: 'prescriptions', icon: FileText, label: 'Retete' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Portal Pacient</h1>
              <p className="text-sm text-blue-200/60">{user.first_name} {user.last_name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <LogOut className="w-5 h-5" /><span className="hidden sm:inline">Iesire</span>
          </button>
        </div>
      </header>

      <nav className="bg-white/5 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                tab === t.id 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}>
              <t.icon className="w-5 h-5" />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'home' && <PatientHome user={user} />}
        {tab === 'analyses' && <PatientAnalyses />}
        {tab === 'appointments' && <PatientAppointments />}
        {tab === 'prescriptions' && <PatientPrescriptions />}
      </main>
      
      <ChatBot />
    </div>
  );
}

function PatientHome({ user }) {
  const [stats, setStats] = useState({ analyses: 0, appointments: 0, prescriptions: 0 });
  const [recentAnalysis, setRecentAnalysis] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [analyses, appointments, prescriptions] = await Promise.all([
        api.getAnalyses(), api.getAppointments(), api.getPrescriptions()
      ]);
      setStats({ 
        analyses: analyses.length, 
        appointments: appointments.filter(a => a.status === 'scheduled').length, 
        prescriptions: prescriptions.length 
      });
      if (analyses.length > 0) setRecentAnalysis(analyses[0]);
      const upcoming = appointments.filter(a => a.status === 'scheduled' && new Date(a.scheduled_time) > new Date());
      if (upcoming.length > 0) setNextAppointment(upcoming[upcoming.length - 1]);
    };
    load();
  }, []);

  const classColors = { benign: 'text-emerald-400', early: 'text-yellow-400', pre: 'text-orange-400', pro: 'text-red-400' };
  const classLabels = { benign: 'Normal', early: 'Incipient', pre: 'Pre-leucemic', pro: 'Avansat' };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-3xl p-8">
        <h2 className="text-3xl font-bold text-white mb-2">Buna, {user.first_name}! 👋</h2>
        <p className="text-blue-200/80">Bine ai venit in portalul tau de sanatate.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Analize Efectuate', value: stats.analyses, icon: Droplets, color: 'blue' },
          { label: 'Programari Active', value: stats.appointments, icon: Calendar, color: 'emerald' },
          { label: 'Retete Primite', value: stats.prescriptions, icon: FileText, color: 'purple' }
        ].map((item, i) => (
          <GlassCard key={i} className="p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${item.color}-500/20`}>
                <item.icon className={`w-6 h-6 text-${item.color}-400`} />
              </div>
              <span className="text-3xl font-bold text-white">{item.value}</span>
            </div>
            <p className="text-slate-400">{item.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nextAppointment && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />Urmatoarea Programare
            </h3>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{nextAppointment.doctor_name}</p>
                <p className="text-slate-400 text-sm">{new Date(nextAppointment.scheduled_time).toLocaleString('ro-RO')}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {recentAnalysis && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />Ultima Analiza
            </h3>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <Droplets className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className={`font-medium ${classColors[recentAnalysis.ml_classification] || 'text-white'}`}>
                  {classLabels[recentAnalysis.ml_classification] || recentAnalysis.ml_classification}
                </p>
                <p className="text-slate-400 text-sm">{new Date(recentAnalysis.created_at).toLocaleDateString('ro-RO')}</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function PatientAnalyses() {
  const [analyses, setAnalyses] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { api.getAnalyses().then(setAnalyses); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError('');
    try {
      const res = await api.uploadAnalysis(file);
      setResult(res);
      setAnalyses(await api.getAnalyses());
    } catch (e) { setError(e.message); }
    setUploading(false);
    e.target.value = '';
  };

  const classColors = {
    benign: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    early: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pre: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    pro: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  const classLabels = { benign: 'Normal', early: 'Incipient', pre: 'Pre-leucemic', pro: 'Avansat' };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />Incarca Analiza Noua
        </h2>
        <div className={`border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-blue-400/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <label className="cursor-pointer">
            <span className="text-blue-400 hover:text-blue-300 font-semibold text-lg">Click pentru a selecta imaginea</span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          <p className="text-slate-500 text-sm mt-2">Formate acceptate: JPG, PNG</p>
        </div>

        {uploading && (
          <div className="mt-6 text-center">
            <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-400">Se analizeaza imaginea...</p>
          </div>
        )}

        {error && <div className="mt-4"><ErrorMessage message={error} onClose={() => setError('')} /></div>}

        {result && (
          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500 p-2 rounded-full"><CheckCircle className="w-5 h-5 text-white" /></div>
              <h3 className="font-semibold text-emerald-400 text-lg">Analiza Completa!</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-1">Clasificare</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${classColors[result.classification]}`}>
                  {classLabels[result.classification] || result.classification}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-1">Incredere</p>
                <span className="text-white font-medium">{(result.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Leaf className="w-4 h-4" />Recomandari Nutritie & Stil de Viata</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{result.recommendations}</p>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />Istoricul Analizelor
        </h2>
        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <Droplets className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nu ai analize incarcate inca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map(a => (
              <div key={a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-xl"><Droplets className="w-5 h-5 text-blue-400" /></div>
                    <div>
                      <p className="text-white font-medium">{new Date(a.created_at).toLocaleDateString('ro-RO')}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${classColors[a.ml_classification]}`}>
                        {classLabels[a.ml_classification] || a.ml_classification}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${expanded === a.id ? 'rotate-90' : ''}`} />
                </div>
                {expanded === a.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{a.ai_recommendations}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availability, setAvailability] = useState([]);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

  useEffect(() => {
    api.getAppointments().then(setAppointments);
    api.getDoctors().then(setDoctors);
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      setSelectedDate('');
      setSelectedTime('');
      setError('');
      api.getDoctorAvailability(selectedDoctor).then(setAvailability);
      api.getDoctorAppointments(selectedDoctor).then(setDoctorAppointments);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    setSelectedTime('');
    setError('');
  }, [selectedDate]);

  // Genereaza sloturi de 30 min bazate pe disponibilitatea doctorului
  const getAvailableSlots = () => {
    if (!selectedDoctor || !selectedDate || availability.length === 0) return [];
    
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
    
    if (dayAvailability.length === 0) return [];

    const slots = [];
    const now = new Date();

    dayAvailability.forEach(av => {
      const [startH, startM] = av.start_time.split(':').map(Number);
      const [endH, endM] = av.end_time.split(':').map(Number);
      
      let currentH = startH;
      let currentM = startM;
      
      while (currentH < endH || (currentH === endH && currentM < endM)) {
        const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
        const slotDateTime = new Date(`${selectedDate}T${timeStr}:00`);
        
        // Verifica daca e in trecut
        const isPast = slotDateTime <= now;
        
        // Verifica daca e ocupat (interval de 30 min)
        const isBooked = doctorAppointments.some(apt => {
          const aptTime = new Date(apt.scheduled_time);
          return Math.abs(aptTime.getTime() - slotDateTime.getTime()) < 30 * 60 * 1000;
        });

        slots.push({ time: timeStr, booked: isBooked, past: isPast });
        
        currentM += 30;
        if (currentM >= 60) { currentM = 0; currentH++; }
      }
    });
    
    return slots;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      setError('Te rugam sa selectezi doctorul, data si ora');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.createAppointment(selectedDoctor, `${selectedDate}T${selectedTime}:00`);
      setSuccess('Programare creata cu succes!');
      setShowForm(false);
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedTime('');
      setAppointments(await api.getAppointments());
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleCancel = async (id) => {
    if (!confirm('Sigur doresti sa anulezi programarea?')) return;
    await api.cancelAppointment(id);
    setAppointments(await api.getAppointments());
  };

  const statusColors = {
    scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  const statusLabels = { scheduled: 'Programata', completed: 'Finalizata', cancelled: 'Anulata' };

  const availableSlots = getAvailableSlots();
  const selectedDayOfWeek = selectedDate ? new Date(selectedDate).getDay() : null;
  const selectedDayAvailability = selectedDayOfWeek !== null ? availability.filter(a => a.day_of_week === selectedDayOfWeek) : [];
  const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);

  return (
    <div className="space-y-6">
      {success && <SuccessMessage message={success} />}
      
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />Programarile Mele
          </h2>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25">
            <Plus className="w-5 h-5" />Programare Noua
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-400" />Programeaza o Consultatie
            </h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Selectare Doctor */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Selecteaza Doctorul</label>
                <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-400/50">
                  <option value="" className="bg-slate-800">Alege un doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id} className="bg-slate-800">
                      Dr. {d.first_name} {d.last_name} - {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programul Doctorului */}
              {selectedDoctor && (
                <div className={`p-4 rounded-xl border ${availability.length > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  {availability.length > 0 ? (
                    <>
                      <p className="text-sm text-blue-300 font-medium mb-2">📅 Programul Dr. {selectedDoctorData?.first_name} {selectedDoctorData?.last_name}:</p>
                      <div className="flex flex-wrap gap-2">
                        {availability.map((a, i) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-white/10 text-slate-200 text-sm">
                            {dayNames[a.day_of_week]}: {a.start_time.slice(0,5)} - {a.end_time.slice(0,5)}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-yellow-300">⚠️ Acest doctor nu si-a setat inca programul de lucru. Te rugam sa alegi alt doctor sau sa revii mai tarziu.</p>
                  )}
                </div>
              )}

              {/* Selectare Data */}
              {selectedDoctor && availability.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Selecteaza Data</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-400/50" />
                </div>
              )}

              {/* Mesaj daca ziua nu e disponibila */}
              {selectedDate && selectedDayAvailability.length === 0 && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-300">⚠️ Doctorul nu lucreaza in ziua de {dayNames[selectedDayOfWeek]}. Te rugam sa alegi alta data.</p>
                </div>
              )}

              {/* Selectare Ora - Sloturi disponibile */}
              {selectedDate && selectedDayAvailability.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Selecteaza Ora</label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                      {availableSlots.map((slot, i) => (
                        <button key={i} type="button" disabled={slot.booked || slot.past}
                          onClick={() => { setSelectedTime(slot.time); setError(''); }}
                          className={`p-2.5 rounded-xl text-sm font-medium transition-all ${
                            slot.booked || slot.past
                              ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                              : selectedTime === slot.time
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}>
                          {slot.time}
                          {slot.booked && <span className="block text-xs text-slate-500">Ocupat</span>}
                          {slot.past && !slot.booked && <span className="block text-xs text-slate-500">Trecut</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">Nu sunt sloturi disponibile pentru aceasta zi</p>
                  )}
                </div>
              )}

              {/* Eroare */}
              {error && <ErrorMessage message={error} onClose={() => setError('')} />}

              {/* Butoane */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading || !selectedTime}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700 transition-all">
                  {loading ? 'Se programeaza...' : 'Confirma Programarea'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="px-6 py-3 bg-white/10 text-slate-300 rounded-xl font-medium hover:bg-white/20 transition-all">
                  Anuleaza
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista Programari */}
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nu ai programari</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(apt => (
              <div key={apt.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      apt.status === 'scheduled' ? 'bg-blue-500/20' : apt.status === 'completed' ? 'bg-emerald-500/20' : 'bg-slate-600/50'
                    }`}>
                      {apt.status === 'scheduled' ? <Clock className="w-6 h-6 text-blue-400" /> :
                       apt.status === 'completed' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> :
                       <XCircle className="w-6 h-6 text-slate-500" />}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{apt.doctor_name}</p>
                      <p className="text-slate-400 text-sm">{new Date(apt.scheduled_time).toLocaleString('ro-RO')}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[apt.status]}`}>
                        {statusLabels[apt.status]}
                      </span>
                    </div>
                  </div>
                  {apt.status === 'scheduled' && (
                    <button onClick={() => handleCancel(apt.id)}
                      className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all">
                      Anuleaza
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { 
    api.getPrescriptions().then(data => { setPrescriptions(data); setLoading(false); }); 
  }, []);

  const handleDownload = async (id) => {
    setDownloading(id);
    setError('');
    try {
      const blob = await api.downloadPrescription(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reteta_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Eroare la descarcarea retetei: ' + e.message);
    }
    setDownloading(null);
  };

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-400" />Retetele Mele
      </h2>

      {error && <div className="mb-4"><ErrorMessage message={error} onClose={() => setError('')} /></div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Nu ai retete</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 p-3 rounded-xl">
                    <Pill className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{p.doctor_name}</p>
                    <p className="text-slate-400 text-sm">{new Date(p.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
                <button onClick={() => handleDownload(p.id)} disabled={downloading === p.id}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shadow-lg shadow-purple-500/25 transition-all">
                  {downloading === p.id ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Descarcare...</>
                  ) : (
                    <><Download className="w-4 h-4" />Descarca PDF</>
                  )}
                </button>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans">{p.content}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ==================== DOCTOR DASHBOARD ====================
function DoctorDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('appointments');
  const tabs = [
    { id: 'appointments', icon: Calendar, label: 'Programari' },
    { id: 'patients', icon: Users, label: 'Pacienti' },
    { id: 'prescriptions', icon: FileText, label: 'Retete' },
    { id: 'availability', icon: Clock, label: 'Program' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Portal Doctor</h1>
              <p className="text-sm text-emerald-200/60">Dr. {user.first_name} {user.last_name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <LogOut className="w-5 h-5" /><span className="hidden sm:inline">Iesire</span>
          </button>
        </div>
      </header>

      <nav className="bg-white/5 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                tab === t.id 
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}>
              <t.icon className="w-5 h-5" />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'appointments' && <DoctorAppointments />}
        {tab === 'patients' && <DoctorPatients />}
        {tab === 'prescriptions' && <DoctorPrescriptions />}
        {tab === 'availability' && <DoctorAvailability />}
      </main>
    </div>
  );
}

function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { 
    api.getAppointments().then(data => { setAppointments(data); setLoading(false); }); 
  }, []);

  const handleStatus = async (id, status) => {
    await api.updateAppointmentStatus(id, status);
    setAppointments(await api.getAppointments());
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
  const counts = {
    all: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length
  };

  const statusColors = {
    scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />Programari
        </h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Toate' },
            { key: 'scheduled', label: 'Active' },
            { key: 'completed', label: 'Finalizate' },
            { key: 'cancelled', label: 'Anulate' }
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.key 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}>
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Nu exista programari</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(apt => (
            <div key={apt.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    apt.status === 'scheduled' ? 'bg-blue-500/20' : apt.status === 'completed' ? 'bg-emerald-500/20' : 'bg-slate-600/50'
                  }`}>
                    <User className={`w-6 h-6 ${apt.status === 'scheduled' ? 'text-blue-400' : apt.status === 'completed' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{apt.patient_name}</p>
                    <p className="text-slate-400 text-sm">{new Date(apt.scheduled_time).toLocaleString('ro-RO')}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[apt.status]}`}>
                      {apt.status === 'scheduled' ? 'Programata' : apt.status === 'completed' ? 'Finalizata' : 'Anulata'}
                    </span>
                  </div>
                </div>
                {apt.status === 'scheduled' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleStatus(apt.id, 'completed')}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 transition-all">
                      <CheckCircle className="w-4 h-4" />Finalizeaza
                    </button>
                    <button onClick={() => handleStatus(apt.id, 'cancelled')}
                      className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all">
                      <XCircle className="w-4 h-4" />Anuleaza
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function DoctorPatients() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { 
    api.getAnalyses().then(data => { setAnalyses(data); setLoading(false); }); 
  }, []);

  const classColors = {
    benign: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    early: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pre: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    pro: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Droplets className="w-5 h-5 text-cyan-400" />Analize Pacienti
      </h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-12">
          <Droplets className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Nu exista analize</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map(a => (
            <div key={a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-500/20 p-3 rounded-xl">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">{new Date(a.created_at).toLocaleDateString('ro-RO')}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${classColors[a.ml_classification]}`}>
                      {a.ml_classification}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${expanded === a.id ? 'rotate-90' : ''}`} />
              </div>
              {expanded === a.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{a.ai_recommendations}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedApt, setSelectedApt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getPrescriptions().then(setPrescriptions);
    api.getAppointments().then(all => setAppointments(all.filter(a => a.status === 'completed')));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedApt || !content.trim()) {
      setError('Te rugam sa completezi toate campurile');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const apt = appointments.find(a => a.id === selectedApt);
      await api.createPrescription(selectedApt, apt.patient_id, content);
      setSuccess('Reteta emisa cu succes!');
      setShowForm(false);
      setSelectedApt('');
      setContent('');
      setPrescriptions(await api.getPrescriptions());
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {success && <SuccessMessage message={success} />}
      
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />Retete Emise
          </h2>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25">
            <Plus className="w-5 h-5" />Reteta Noua
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-400" />Emite Reteta Noua
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Selecteaza Consultatia Finalizata</label>
                <select value={selectedApt} onChange={e => setSelectedApt(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-purple-400/50">
                  <option value="" className="bg-slate-800">Alege o consultatie...</option>
                  {appointments.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-800">
                      {a.patient_name} - {new Date(a.scheduled_time).toLocaleDateString('ro-RO')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Continut Reteta</label>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-purple-400/50 resize-none"
                  rows={6} placeholder="Medicament:&#10;Doza:&#10;Frecventa:&#10;Durata:" />
              </div>
              
              {error && <ErrorMessage message={error} onClose={() => setError('')} />}
              
              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 hover:from-emerald-600 hover:to-emerald-700 transition-all">
                  {loading ? 'Se emite...' : 'Emite Reteta'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="px-6 py-3 bg-white/10 text-slate-300 rounded-xl font-medium hover:bg-white/20 transition-all">
                  Anuleaza
                </button>
              </div>
            </form>
          </div>
        )}

        {prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nu ai emis retete</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Pill className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{p.patient_name}</p>
                    <p className="text-slate-400 text-sm">{new Date(p.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans">{p.content}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function DoctorAvailability() {
  const [availability, setAvailability] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];

  useEffect(() => {
    api.getMyAvailability().then(data => { setAvailability(data); setLoading(false); });
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (startTime >= endTime) {
      setError('Ora de inceput trebuie sa fie inainte de ora de sfarsit');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await api.createAvailability(day, startTime, endTime);
      setSuccess('Interval adaugat cu succes!');
      setShowForm(false);
      setAvailability(await api.getMyAvailability());
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sigur doresti sa stergi acest interval?')) return;
    await api.deleteAvailability(id);
    setAvailability(await api.getMyAvailability());
  };

  // Grupeaza pe zile
  const byDay = {};
  availability.forEach(a => {
    if (!byDay[a.day_of_week]) byDay[a.day_of_week] = [];
    byDay[a.day_of_week].push(a);
  });

  return (
    <div className="space-y-6">
      {success && <SuccessMessage message={success} />}
      
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />Programul Meu de Lucru
          </h2>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25">
            <Plus className="w-5 h-5" />Adauga Interval
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-6">
          Seteaza orele in care esti disponibil pentru consultatii. Pacientii vor putea programa doar in aceste intervale.
        </p>

        {showForm && (
          <div className="mb-6 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">Adauga Interval Orar</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ziua</label>
                <select value={day} onChange={e => setDay(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400/50">
                  {dayNames.map((d, i) => <option key={i} value={i} className="bg-slate-800">{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ora Inceput</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ora Sfarsit</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-amber-400/50" />
                </div>
              </div>
              
              {error && <ErrorMessage message={error} onClose={() => setError('')} />}
              
              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 hover:from-emerald-600 hover:to-emerald-700 transition-all">
                  {loading ? 'Se salveaza...' : 'Salveaza'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="px-6 py-3 bg-white/10 text-slate-300 rounded-xl font-medium hover:bg-white/20 transition-all">
                  Anuleaza
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && availability.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
          </div>
        ) : availability.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">Nu ai setat programul de lucru</p>
            <p className="text-slate-600 text-sm">Adauga intervale orare pentru a permite pacientilor sa se programeze</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(byDay).sort(([a], [b]) => Number(a) - Number(b)).map(([dayNum, slots]) => (
              <div key={dayNum} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  {dayNames[Number(dayNum)]}
                </h4>
                <div className="space-y-2">
                  {slots.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-slate-300 text-sm">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                      <button onClick={() => handleDelete(s.id)} className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-all">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ==================== CHATBOT ASISTENT VIRTUAL ====================
const chatbotData = {
  greetings: [
    "Buna! Sunt asistentul virtual al Clinicii Hematologice. Cu ce te pot ajuta?",
    "Salut! Sunt aici sa te ajut cu informatii despre analize, programari sau sanatate. Ce intrebare ai?",
    "Bine ai venit! Intreaba-ma orice despre serviciile clinicii sau sanatatea ta."
  ],
  
  qa: [
    // === ANALIZE SANGE ===
    {
      keywords: ["benign", "rezultat benign", "ce inseamna benign", "normal"],
      answer: "🟢 **Rezultat Benign** inseamna ca analiza ta arata valori normale. Celulele sanguine sunt sanatoase si nu exista semne de ingrijorare. Continua cu un stil de viata sanatos si controale regulate!"
    },
    {
      keywords: ["early", "incipient", "ce inseamna early", "stadiu incipient"],
      answer: "🟡 **Rezultat Early/Incipient** indica modificari minore care necesita monitorizare. Nu e motiv de panica, dar e important sa programezi o consultatie cu medicul pentru evaluare suplimentara si recomandari personalizate."
    },
    {
      keywords: ["pre", "pre-leucemic", "ce inseamna pre", "preleucemic"],
      answer: "🟠 **Rezultat Pre-leucemic** indica modificari care necesita atentie medicala. Te rugam sa programezi cat mai curand o consultatie cu medicul hematolog pentru investigatii suplimentare si un plan de tratament."
    },
    {
      keywords: ["pro", "avansat", "ce inseamna pro", "stadiu avansat"],
      answer: "🔴 **Rezultat Pro/Avansat** indica modificari semnificative care necesita atentie medicala imediata. Este foarte important sa contactezi medicul cat mai curand pentru evaluare si tratament. Nu amana!"
    },
    {
      keywords: ["cat dureaza", "durata analiza", "timp analiza", "cand primesc rezultat"],
      answer: "⏱️ Analiza imaginii dureaza doar cateva secunde! Rezultatul cu clasificarea si recomandarile de nutritie apar imediat dupa incarcare. Pentru analize de laborator clasice, rezultatele vin in 24-48 ore."
    },
    {
      keywords: ["cum incarc", "upload", "cum fac analiza", "incarcare imagine"],
      answer: "📤 Pentru a incarca o analiza:\n1. Mergi la tab-ul 'Analize'\n2. Click pe 'Incarca Analiza Noua'\n3. Selecteaza imaginea (JPG sau PNG)\n4. Asteapta cateva secunde pentru rezultat\n\nVei primi clasificarea si recomandari personalizate!"
    },
    {
      keywords: ["ce analize", "tipuri analize", "ce pot incarca"],
      answer: "🔬 Poti incarca imagini cu:\n• Frotiuri de sange periferic\n• Imagini microscopice ale celulelor sanguine\n• Rezultate scanate ale analizelor\n\nSistemul AI analizeaza imaginea si ofera clasificare + recomandari de nutritie."
    },
    
    // === PROGRAMARI ===
    {
      keywords: ["cum ma programez", "programare", "fac programare", "consultatie"],
      answer: "📅 Pentru a te programa:\n1. Mergi la tab-ul 'Programari'\n2. Click pe 'Programare Noua'\n3. Selecteaza doctorul dorit\n4. Alege data (vezi programul doctorului)\n5. Selecteaza ora din sloturile disponibile\n6. Confirma programarea\n\nVei vedea doar orele libere!"
    },
    {
      keywords: ["anulare", "anulez programare", "renunt", "sterg programare"],
      answer: "❌ Pentru a anula o programare:\n1. Mergi la 'Programari'\n2. Gaseste programarea dorita\n3. Click pe butonul 'Anuleaza'\n\nTe rugam sa anulezi cu cel putin 24h inainte daca e posibil."
    },
    {
      keywords: ["ora ocupata", "nu pot programa", "nu merge ora"],
      answer: "⚠️ Daca o ora e ocupata, inseamna ca alt pacient s-a programat deja. Alege alta ora din cele disponibile (colorate). Orele gri sunt ocupate sau in trecut."
    },
    {
      keywords: ["program doctor", "cand lucreaza", "ore disponibile"],
      answer: "🕐 Cand selectezi un doctor, vei vedea automat programul lui de lucru (zilele si orele). Poti alege doar din intervalele in care doctorul e disponibil."
    },
    
    // === RETETE ===
    {
      keywords: ["reteta", "unde gasesc reteta", "descarc reteta", "pdf reteta"],
      answer: "💊 Retetele tale sunt in tab-ul 'Retete'. Pentru fiecare reteta poti:\n• Vedea continutul direct in aplicatie\n• Descarca PDF-ul pentru farmacie\n\nClick pe 'Descarca PDF' pentru a salva reteta."
    },
    {
      keywords: ["cine emite", "cum primesc reteta", "de unde reteta"],
      answer: "📝 Retetele sunt emise doar de medic dupa o consultatie finalizata. Dupa consultatie, medicul va emite reteta care va aparea automat in contul tau, la sectiunea 'Retete'."
    },
    
    // === SIMPTOME SI SANATATE ===
    {
      keywords: ["anemie", "simptome anemie", "sunt anemic"],
      answer: "🩸 **Simptomele anemiei** pot include:\n• Oboseala si slabiciune\n• Paloare (piele, buze, unghii)\n• Ameteli, dureri de cap\n• Bataile inimii accelerate\n• Dificultati de concentrare\n\nDaca ai aceste simptome, programeaza o consultatie!"
    },
    {
      keywords: ["leucemie", "simptome leucemie", "semne leucemie"],
      answer: "⚠️ **Simptomele leucemiei** pot include:\n• Oboseala persistenta\n• Febra, infectii frecvente\n• Vanatai usoare, sangerari\n• Dureri osoase\n• Pierdere in greutate\n• Ganglioni marit\n\nAceste simptome pot avea multe cauze. Consulta un medic pentru diagnostic!"
    },
    {
      keywords: ["fier", "deficit fier", "fier scazut"],
      answer: "🥩 **Deficitul de fier** se combate cu:\n\n**Alimente bogate in fier:**\n• Carne rosie, ficat\n• Spanac, broccoli\n• Linte, fasole\n• Fructe uscate\n\n**Sfaturi:**\n• Vitamina C ajuta absorbtia fierului\n• Evita ceaiul/cafeaua la mese\n• Gateste in vase de fonta"
    },
    
    // === NUTRITIE ===
    {
      keywords: ["nutritie", "ce sa mananc", "alimentatie sanatoasa", "dieta"],
      answer: "🥗 **Alimentatie pentru sanatatea sangelui:**\n\n• **Fier**: carne, spanac, linte\n• **B12**: peste, oua, lactate\n• **Acid folic**: legume verzi, citrice\n• **Vitamina C**: portocale, ardei, rosii\n\nEvita: alcool excesiv, alimente procesate, zahar rafinat."
    },
    {
      keywords: ["apa", "hidratare", "cat sa beau"],
      answer: "💧 **Hidratarea e esentiala!**\n\n• Bea minim 2 litri de apa zilnic\n• Mai mult daca faci sport sau e cald\n• Evita bauturile carbogazoase\n• Ceaiurile de plante sunt ok\n• Apa ajuta la circulatia sangelui"
    },
    {
      keywords: ["sport", "exercitii", "activitate fizica", "miscare"],
      answer: "🏃 **Activitatea fizica recomandata:**\n\n• 30 min mers pe jos zilnic\n• Inot, ciclism, yoga\n• Evita efortul excesiv daca ai anemie\n• Stretching dimineata\n• Pauze active la birou\n\nMiscarea ajuta circulatia si oxigenarea!"
    },
    
    // === DESPRE CLINICA ===
    {
      keywords: ["contact", "telefon", "adresa", "unde sunteti"],
      answer: "📍 **Contact Clinica Hematologica:**\n\n• Program: Luni-Vineri, 08:00-18:00\n• Pentru urgente foloseste numarul de garda\n• Programari online: prin aceasta aplicatie\n\nPentru detalii exacte, contacteaza receptia."
    },
    {
      keywords: ["pret", "cost", "cat costa", "tarife"],
      answer: "💰 Tarifele depind de tipul serviciului. Pentru informatii exacte despre preturi, te rugam sa contactezi receptia clinicii sau sa intrebi medicul la consultatie."
    },
    {
      keywords: ["asigurare", "cas", "decontat"],
      answer: "🏥 Clinica lucreaza atat cu pacienti asigurati CAS cat si privat. Pentru decontare prin Casa de Asigurari, e nevoie de bilet de trimitere de la medicul de familie. Intreaba la receptie pentru detalii."
    },
    
    // === GENERAL ===
    {
      keywords: ["multumesc", "mersi", "thanks"],
      answer: "😊 Cu placere! Daca mai ai intrebari, sunt aici sa te ajut. Sanatate multa!"
    },
    {
      keywords: ["salut", "buna", "hello", "hey"],
      answer: "👋 Salut! Cu ce te pot ajuta astazi? Poti sa ma intrebi despre analize, programari, retete sau sanatate in general."
    },
    {
      keywords: ["ajutor", "help", "ce poti face", "cum functionezi"],
      answer: "🤖 Sunt asistentul virtual si te pot ajuta cu:\n\n• **Analize** - explicatii rezultate, cum incarci\n• **Programari** - cum te programezi, anulezi\n• **Retete** - unde le gasesti, descarcare\n• **Sanatate** - simptome, nutritie, sfaturi\n• **Clinica** - informatii generale\n\nScrie-mi intrebarea ta!"
    }
  ],
  
  defaultAnswer: "🤔 Nu am gasit un raspuns exact pentru intrebarea ta. Incearca sa reformulezi sau alege una din sugestiile de mai jos. Pentru probleme medicale specifice, te rog sa consulti medicul.",
  
  suggestions: [
    "Ce inseamna rezultat benign?",
    "Cum ma programez?",
    "Unde gasesc retetele?",
    "Ce alimente sunt bune pentru anemie?",
    "Care sunt simptomele leucemiei?",
    "Cum incarc o analiza?"
  ]
};

function findAnswer(question) {
  const q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const item of chatbotData.qa) {
    for (const keyword of item.keywords) {
      const k = keyword.toLowerCase();
      if (q.includes(k) || k.split(" ").every(word => q.includes(word))) {
        return item.answer;
      }
    }
  }
  
  // Fuzzy match - check if at least 2 words match
  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  for (const item of chatbotData.qa) {
    for (const keyword of item.keywords) {
      const kWords = keyword.toLowerCase().split(/\s+/);
      const matches = kWords.filter(kw => qWords.some(qw => qw.includes(kw) || kw.includes(qw)));
      if (matches.length >= 2 || (matches.length === 1 && kWords.length === 1)) {
        return item.answer;
      }
    }
  }
  
  return chatbotData.defaultAnswer;
}

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = chatbotData.greetings[Math.floor(Math.random() * chatbotData.greetings.length)];
      setMessages([{ type: 'bot', text: greeting }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    
    const userMsg = { type: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const answer = findAnswer(text);
      setMessages(prev => [...prev, { type: 'bot', text: answer }]);
      setIsTyping(false);
    }, 500 + Math.random() * 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen 
            ? 'bg-slate-700 hover:bg-slate-600 rotate-0' 
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/30'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Asistent Virtual</h3>
                <p className="text-xs text-white/70">Online - raspund instant</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.type === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white/10 text-slate-200 rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 p-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-slate-500 mb-2">Sugestii rapide:</p>
              <div className="flex flex-wrap gap-1.5">
                {chatbotData.suggestions.slice(0, 3).map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)}
                    className="text-xs px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scrie intrebarea ta..."
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-blue-400/50 text-sm"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="p-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}