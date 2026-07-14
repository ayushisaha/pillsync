import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./App";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000";

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayStr = () => fmtDate(new Date());

// ─── Icons ───────────────────────────────────────────────
const PillIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" />
  </svg>
);
const Check = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const X = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const Clock = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const Plus = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const Trash = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const Bell = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const AlertIcon = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const User = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const Shield = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const Heart = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const HistoryIcon = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 0 .5-4.5" /><polyline points="3 2 3 7 8 7" />
  </svg>
);
const Lock = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const Edit = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const ChevronLeft = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const ArrowLeft = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const CATS = ["Blood Pressure","Diabetes","Thyroid","Antibiotics","Vitamins","Heart Medications","Painkillers","Other"];

// ─── Custom Delete Confirm Modal ─────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm p-7 animate-[fadeIn_.2s_ease]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertIcon c="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-extrabold text-[#172A3A] mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-100 text-[#004346] font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm cursor-pointer transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AM/PM Time Picker ───────────────────────────────────
function AmPmTimePicker({ onAdd }) {
  const [hour, setHour] = useState("08");
  const [min,  setMin]  = useState("00");
  const [ampm, setAmpm] = useState("am");
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const mins  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
      <select value={hour} onChange={e => setHour(e.target.value)}
        className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#004346] bg-white outline-none cursor-pointer">
        {hours.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="font-bold text-gray-400">:</span>
      <select value={min} onChange={e => setMin(e.target.value)}
        className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#004346] bg-white outline-none cursor-pointer">
        {mins.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={ampm} onChange={e => setAmpm(e.target.value)}
        className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#004346] bg-white outline-none cursor-pointer">
        <option value="am">AM</option>
        <option value="pm">PM</option>
      </select>
      <button type="button" onClick={() => onAdd(`${hour}:${min} ${ampm}`)}
        className="ml-auto px-3.5 py-2 rounded-xl bg-[#004346] text-white font-bold text-[10px] uppercase cursor-pointer hover:bg-[#508991] transition-all flex items-center gap-1">
        <Plus c="w-3 h-3" /> Add Time
      </button>
    </div>
  );
}

function scheduleNotificationsForMedicine(med) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  (med.schedules || []).forEach(timeStr => {
    const parts = timeStr.trim().split(" ");
    if (parts.length < 2) return;
    const [timePart, ampm] = parts;
    let [h, m] = timePart.split(":").map(Number);
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    const fire = new Date(); fire.setHours(h, m, 0, 0);
    const diff = fire - new Date();
    if (diff > 0 && diff < 86400000) {
      setTimeout(() => {
        new Notification("PillSync Reminder", {
          body: `Time to take ${med.name}${med.dosage ? " — " + med.dosage : ""} at ${timeStr}`,
          icon: "/favicon.ico",
        });
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ac.createOscillator();
          osc.type = "sine"; osc.frequency.setValueAtTime(660, ac.currentTime);
          osc.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.35);
        } catch {}
      }, diff);
    }
  });
}

// ─── Add Medicine Modal ──────────────────────────────────
function AddMedicineModal({ onClose, onSave, token, patientId }) {
  const [form, setForm] = useState({ name:"", description:"", dosage:"", category:"Vitamins", stock:"", start_date:todayStr(), end_date:"" });
  const [times, setTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addTime = t => { if (!times.includes(t)) setTimes(p => [...p, t].sort()); };
  const rmTime  = t => setTimes(p => p.filter(x => x !== t));
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Medicine name is required"); return; }
    if (times.length === 0)  { setError("Add at least one reminder time"); return; }
    setLoading(true);
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      const res = await axios.post(`${API}/medicines${q}`, {
        ...form, stock: parseInt(form.stock)||0, schedules: times,
        start_date: form.start_date||null, end_date: form.end_date||null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => { if (p === "granted") scheduleNotificationsForMedicine(res.data); });
      } else scheduleNotificationsForMedicine(res.data);
      onSave(res.data); onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5" /></button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Add Medicine</h2>
        <p className="text-xs text-gray-400 mb-5">Set details, duration, and reminder times.</p>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2"><AlertIcon c="w-4 h-4" />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Medicine Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" placeholder="e.g. Metformin 500mg" required /></div>
          <div><label className="label">Instructions / Notes</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input" placeholder="e.g. Take with food" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Dosage</label>
              <input value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className="input" placeholder="1 pill" /></div>
            <div><label className="label">Stock Count</label>
              <input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="input" placeholder="30" /></div>
          </div>
          <div><label className="label">Category</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input">
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="p-4 rounded-2xl bg-[#D6F3F4]/30 border border-[#508991]/15 space-y-3">
            <p className="text-[10px] font-extrabold text-[#004346] uppercase tracking-wider">Treatment Duration</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Start Date</label>
                <input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className="input text-xs" /></div>
              <div><label className="label">End Date <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <input type="date" value={form.end_date} min={form.start_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="input text-xs" /></div>
            </div>
            {form.start_date && form.end_date && (
              <p className="text-[10px] text-[#508991] font-semibold">
                Duration: {Math.ceil((new Date(form.end_date)-new Date(form.start_date))/86400000)} days
              </p>
            )}
          </div>
          <div>
            <label className="label">Reminder Times *</label>
            <AmPmTimePicker onAdd={addTime} />
            {times.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
              {times.map(t=><span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#004346] text-white text-xs font-bold">
                <Clock c="w-3 h-3"/>{t}
                <button type="button" onClick={()=>rmTime(t)} className="ml-1 hover:text-red-300 cursor-pointer"><X c="w-3 h-3"/></button>
              </span>)}</div>}
            {times.length === 0 && <p className="text-[10px] text-gray-400 mt-1">Select a time above and click "Add Time".</p>}
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Adding..." : <><Plus c="w-4 h-4"/>Add Medicine</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Medicine Modal ─────────────────────────────────
function EditMedicineModal({ medicine, onClose, onSave, token, patientId }) {
  const [form, setForm] = useState({
    name:        medicine?.name        || "",
    description: medicine?.description || "",
    dosage:      medicine?.dosage      || "",
    category:    medicine?.category    || "Vitamins",
    stock:       medicine?.stock !== undefined ? String(medicine.stock) : "",
    start_date:  medicine?.start_date  || todayStr(),
    end_date:    medicine?.end_date    || "",
  });
  const [times, setTimes] = useState(medicine?.schedules || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addTime = t => { if (!times.includes(t)) setTimes(p => [...p, t].sort()); };
  const rmTime  = t => setTimes(p => p.filter(x => x !== t));
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Medicine name is required"); return; }
    if (times.length === 0) { setError("Add at least one reminder time"); return; }
    setLoading(true);
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      const res = await axios.patch(`${API}/medicines/${medicine.id}${q}`, {
        ...form, stock: parseInt(form.stock)||0, schedules: times,
        start_date: form.start_date||null, end_date: form.end_date||null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave(res.data); onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5"/></button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Edit Medicine</h2>
        <p className="text-xs text-gray-400 mb-5">Modify {medicine.name}</p>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2"><AlertIcon c="w-4 h-4"/>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Medicine Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required/></div>
          <div><label className="label">Instructions / Notes</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Dosage</label>
              <input value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className="input"/></div>
            <div><label className="label">Stock Count</label>
              <input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="input"/></div>
          </div>
          <div><label className="label">Category</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input">
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="p-4 rounded-2xl bg-[#D6F3F4]/30 border border-[#508991]/15 space-y-3">
            <p className="text-[10px] font-extrabold text-[#004346] uppercase tracking-wider">Treatment Duration</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Start Date</label>
                <input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className="input text-xs"/></div>
              <div><label className="label">End Date</label>
                <input type="date" value={form.end_date} min={form.start_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="input text-xs"/></div>
            </div>
          </div>
          <div>
            <label className="label">Reminder Times *</label>
            <AmPmTimePicker onAdd={addTime}/>
            {times.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
              {times.map(t=><span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#004346] text-white text-xs font-bold">
                <Clock c="w-3 h-3"/>{t}
                <button type="button" onClick={()=>rmTime(t)} className="ml-1 hover:text-red-300 cursor-pointer"><X c="w-3 h-3"/></button>
              </span>)}</div>}
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Patient Modal ──────────────────────────────────
function EditPatientModal({ patient, onClose, onSave, token }) {
  const [form, setForm] = useState({
    name:   patient?.name   || "",
    phone:  patient?.phone  || "",
    gender: patient?.gender || "male",
    age:    patient?.age !== undefined ? String(patient.age) : "",
    weight: patient?.weight ? String(patient.weight).replace(" kg","") : "",
    height: patient?.height ? String(patient.height).replace(" cm","") : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name, phone: form.phone||null, gender: form.gender,
        age:    form.age    ? parseInt(form.age)   : null,
        weight: form.weight ? `${form.weight} kg`  : null,
        height: form.height ? `${form.height} cm`  : null,
      };
      const res = await axios.patch(`${API}/users/patients/${patient.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSave(res.data); onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5"/></button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Edit Patient Details</h2>
        <p className="text-xs text-gray-400 mb-5">Update vitals for {patient.name}</p>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2"><AlertIcon c="w-4 h-4"/>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Full Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required/></div>
          <div><label className="label">Phone</label>
            <input type="tel" pattern="[0-9]{10}" title="Please enter a 10 digit phone number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input" placeholder="enter ur 10 digit number"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Gender</label>
              <select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="input">
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select></div>
            <div><label className="label">Age</label>
              <input type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} className="input" placeholder="25"/></div>
            <div><label className="label">Weight (kg)</label>
              <input type="number" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} className="input" placeholder="70"/></div>
            <div><label className="label">Height (cm)</label>
              <input type="number" value={form.height} onChange={e=>setForm({...form,height:e.target.value})} className="input" placeholder="170"/></div>
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Saving..." : "Save Patient Info"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── In-App Notification Banner ──────────────────────────
function NotifBanner({ notif, onDismiss }) {
  if (!notif) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-sm animate-[fadeIn_.3s_ease]">
      <div className="bg-[#004346] text-white rounded-2xl px-4 py-4 shadow-2xl flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Bell c="w-5 h-5"/></div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{notif.title}</p>
          <p className="text-xs text-white/70 mt-0.5 truncate">{notif.body}</p>
        </div>
        <button onClick={onDismiss} className="text-white/60 hover:text-white cursor-pointer shrink-0"><X c="w-4 h-4"/></button>
      </div>
    </div>
  );
}

// ─── Back Button ─────────────────────────────────────────
function BackButton({ onBack }) {
  return (
    <button onClick={onBack}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-[#004346] text-sm font-bold hover:bg-[#D6F3F4] hover:border-[#508991] transition-all cursor-pointer shadow-sm mb-5">
      <ArrowLeft c="w-4 h-4"/> Back
    </button>
  );
}

// ════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Role comes directly from the logged-in account's token — no switcher
  const role = user?.role || "patient";

  // Tab history for Back button
  const [tab,        setTab]        = useState("overview");
  const [tabHistory, setTabHistory] = useState(["overview"]);
  const goTo = t => { setTab(t); setTabHistory(h => [...h, t]); };
  const goBack = () => {
    if (tabHistory.length <= 1) return;
    const h = tabHistory.slice(0, -1);
    setTabHistory(h); setTab(h[h.length - 1]);
  };
  const canGoBack = tabHistory.length > 1;

  const [showAdd,          setShowAdd]          = useState(false);
  const [editingMedicine,  setEditingMedicine]  = useState(null);
  const [editingPatient,   setEditingPatient]   = useState(null);
  const [deleteConfirm,    setDeleteConfirm]    = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dateInput,    setDateInput]    = useState(todayStr());
  const [calOffset,    setCalOffset]    = useState(0);

  const [patientList,       setPatientList]       = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [medicines,   setMedicines]   = useState([]);
  const [schedule,    setSchedule]    = useState([]);
  const [adherence,   setAdherence]   = useState({ total_scheduled:0, taken:0, missed:0, adherence_pct:0, active_count:0, low_stock_meds:[] });
  const [history,     setHistory]     = useState([]);
  const [medLoading,  setMedLoading]  = useState(false);
  const [histLoading, setHistLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name||"", phone: user?.phone||"", gender: user?.gender||"male",
    age:    user?.age||"",
    weight: user?.weight ? String(user.weight).replace(" kg","") : "",
    height: user?.height ? String(user.height).replace(" cm","") : "",
  });
  const [pwForm,      setPwForm]      = useState({ old_password:"", new_password:"", confirm_password:"" });
  const [profLoading, setProfLoading] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (message, type="success") => { setToast({message,type}); setTimeout(()=>setToast(null),4000); };

  const [notif, setNotif] = useState(null);

  useEffect(() => {
    if (user) setProfileForm({
      name: user.name||"", phone: user.phone||"", gender: user.gender||"male",
      age:    user.age||"",
      weight: user.weight ? String(user.weight).replace(" kg","") : "",
      height: user.height ? String(user.height).replace(" cm","") : "",
    });
  }, [user]);

  const effectivePatientId = ["caregiver","admin"].includes(role) ? selectedPatientId : null;

  // Load patients
  const loadPatients = useCallback(async () => {
    if (!["caregiver","admin"].includes(role)) return;
    try {
      const res = await axios.get(`${API}/users/patients`, { headers: { Authorization: `Bearer ${token}` } });
      setPatientList(res.data);
      if (res.data.length > 0 && !selectedPatientId) setSelectedPatientId(res.data[0].id);
    } catch {}
  }, [role, token, selectedPatientId]);

  // Load schedule/adherence
  const loadSchedule = useCallback(async () => {
    if (!(role === "patient" || (["caregiver","admin"].includes(role) && selectedPatientId))) return;
    setMedLoading(true);
    try {
      const pid = effectivePatientId ? `&patient_id=${effectivePatientId}` : "";
      const pidQ = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
      const [schRes, advRes, medRes] = await Promise.all([
        axios.get(`${API}/medicines/today?date_str=${selectedDate}${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/medicines/adherence?date_str=${selectedDate}${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/medicines${pidQ}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setSchedule(schRes.data); setAdherence(advRes.data); setMedicines(medRes.data);
    } catch {} finally { setMedLoading(false); }
  }, [selectedDate, token, role, effectivePatientId, selectedPatientId]);

  useEffect(() => { loadPatients(); }, [loadPatients]);
  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (tab !== "history") return;
    setHistLoading(true);
    try {
      const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
      const res = await axios.get(`${API}/medicines/history${q}`, { headers: { Authorization: `Bearer ${token}` } });
      setHistory(res.data);
    } catch {} finally { setHistLoading(false); }
  }, [tab, token, effectivePatientId]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Minute-by-minute reminder check
  const notifSent = useRef(new Set());
  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
    const iv = setInterval(() => {
      const now = new Date();
      const h12 = now.getHours() % 12 || 12;
      const ampm = now.getHours() < 12 ? "am" : "pm";
      const slot = `${String(h12).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} ${ampm}`;
      schedule.forEach(dose => {
        if (dose.scheduled_time !== slot || dose.status === "taken") return;
        const key = `${dose.medicine_id}-${slot}-${selectedDate}`;
        if (notifSent.current.has(key)) return;
        notifSent.current.add(key);
        setNotif({ title:"Time for your medicine!", body:`${dose.name} — ${dose.dosage||slot}` });
        if (Notification.permission === "granted")
          new Notification("PillSync Reminder", { body:`Take ${dose.name}`, icon:"/favicon.ico" });
        try { const ac=new(window.AudioContext||window.webkitAudioContext)(); const osc=ac.createOscillator(); osc.type="sine"; osc.frequency.setValueAtTime(660,ac.currentTime); osc.connect(ac.destination); osc.start(); osc.stop(ac.currentTime+0.25); } catch {}
      });
    }, 15000);
    return () => clearInterval(iv);
  }, [schedule, selectedDate]);

  // Confirm delete handler
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "medicine") {
        const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
        await axios.delete(`${API}/medicines/${deleteConfirm.id}${q}`, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`${deleteConfirm.name} removed.`);
        loadSchedule();
      } else if (deleteConfirm.type === "patient") {
        await axios.delete(`${API}/users/patients/${deleteConfirm.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`${deleteConfirm.name} deleted.`);
        loadPatients();
      }
    } catch { showToast("Delete failed", "error"); }
    setDeleteConfirm(null);
  };

  const toggleStatus = async (med_id, scheduled_time, currentStatus, medName) => {
    const next = currentStatus === "pending" ? "taken" : currentStatus === "taken" ? "missed" : "pending";
    try {
      const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
      await axios.post(`${API}/medicines/${med_id}/status${q}`,
        { status:next, scheduled_time, date_str:selectedDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`${medName}: ${next}`);
      loadSchedule();
    } catch (err) { showToast(err.response?.data?.detail || "Failed", "error"); }
  };

  const handleNudge = async (med_id, scheduled_time, medName) => {
    try {
      await axios.post(`${API}/medicines/${med_id}/nudge?scheduled_time=${encodeURIComponent(scheduled_time)}`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      showToast(`Reminder sent for ${medName}!`);
    } catch (err) { showToast(err.response?.data?.detail || "Nudge failed", "error"); }
  };

  const handleProfileUpdate = async e => {
    e.preventDefault();
    if (!profileForm.name.trim()) { showToast("Name cannot be empty","error"); return; }
    setProfLoading(true);
    try {
      const payload = { name:profileForm.name, phone:profileForm.phone||null };
      if (role === "patient") {
        payload.gender = profileForm.gender;
        payload.age    = profileForm.age ? parseInt(profileForm.age) : null;
        payload.weight = profileForm.weight ? `${profileForm.weight} kg` : null;
        payload.height = profileForm.height ? `${profileForm.height} cm` : null;
      }
      const res = await axios.patch(`${API}/users/profile`, payload, { headers: { Authorization: `Bearer ${token}` } });
      login(token, res.data); showToast("Profile updated!");
    } catch (err) { showToast(err.response?.data?.detail || "Update failed","error"); }
    finally { setProfLoading(false); }
  };

  const handlePwChange = async e => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) { showToast("Passwords don't match","error"); return; }
    setPwLoading(true);
    try {
      await axios.patch(`${API}/users/password`,
        { old_password:pwForm.old_password, new_password:pwForm.new_password },
        { headers: { Authorization: `Bearer ${token}` } });
      showToast("Password changed!"); setPwForm({old_password:"",new_password:"",confirm_password:""});
    } catch (err) { showToast(err.response?.data?.detail || "Failed","error"); }
    finally { setPwLoading(false); }
  };

  // Calendar helpers
  const getWeekDays = (offset=0) => {
    const today = new Date(); const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + offset*7);
    return Array.from({length:7},(_,i)=>{
      const d=new Date(start); d.setDate(start.getDate()+i);
      return { name:d.toLocaleDateString("en-US",{weekday:"short"}), dateNum:d.getDate(), dateStr:fmtDate(d), isToday:fmtDate(d)===todayStr() };
    });
  };
  const weekDays = getWeekDays(calOffset);
  const monthLabel = new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"});

  const statusColor = s => s==="taken"?"bg-emerald-50 border-emerald-200":s==="missed"?"bg-red-50 border-red-200":"bg-gray-50 border-gray-100";
  const inp = "w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#508991] outline-none text-sm font-semibold text-gray-800 transition-all bg-white";

  // Current patient for vitals card
  const vitalsPatient = role === "patient" ? user : patientList.find(p=>p.id===effectivePatientId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D6F3F4] via-[#f0fafa] to-[#D6F3F4] text-[#172A3A]">
      {/* Custom CSS classes via style tag for simplicity */}
      <style>{`
        .label { display:block; font-size:10px; font-weight:800; color:#004346; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .input { width:100%; padding:12px 16px; border-radius:16px; border:2px solid #f3f4f6; background:white; font-size:14px; font-weight:600; color:#1f2937; outline:none; transition:border-color .2s; }
        .input:focus { border-color:#508991; }
        @keyframes fadeIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Confirm modal */}
      {deleteConfirm && (
        <ConfirmModal
          title={`Delete ${deleteConfirm.type === "medicine" ? "Medicine" : "Patient"}`}
          message={`Are you sure you want to remove "${deleteConfirm.name}"? This cannot be undone.`}
          onConfirm={executeDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <NotifBanner notif={notif} onDismiss={()=>setNotif(null)}/>
      {showAdd && <AddMedicineModal token={token} patientId={effectivePatientId} onClose={()=>setShowAdd(false)} onSave={()=>{loadSchedule();showToast("Medicine added!");}}/>}
      {editingMedicine && <EditMedicineModal medicine={editingMedicine} token={token} patientId={effectivePatientId} onClose={()=>setEditingMedicine(null)} onSave={()=>{loadSchedule();showToast("Medicine updated!");}}/>}
      {editingPatient && <EditPatientModal patient={editingPatient} token={token} onClose={()=>setEditingPatient(null)} onSave={()=>{loadPatients();loadSchedule();showToast("Patient updated!");}}/>}

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#004346] text-white flex items-center justify-center shadow-md"><PillIcon c="w-4 h-4"/></div>
          <span className="font-extrabold text-lg sm:text-xl text-[#004346] tracking-tight">PillSync</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Switcher Toggle — logs out and redirects to correct login portal */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[10px] font-extrabold">
            {["patient", "caregiver", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (role === r) return;
                  logout();
                  navigate(`/login?role=${r}`);
                }}
                className={`px-2 sm:px-3 py-1.5 rounded-lg cursor-pointer capitalize transition-all ${
                  role === r
                    ? "bg-[#004346] text-white shadow"
                    : "text-gray-500 hover:text-[#004346]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-2 border-l border-gray-100 pl-3">
            <div className="w-9 h-9 rounded-xl bg-[#004346] text-white font-bold flex items-center justify-center uppercase shadow">{user?.name?.slice(0,2)||"PS"}</div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-[#172A3A] leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={()=>{logout();navigate("/login");}}
            className="cursor-pointer border border-[#004346]/20 hover:border-[#004346] text-[#004346] px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-[#004346]/5">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">

        {/* ── PATIENT VITALS BANNER ── */}
        {vitalsPatient && (
          <div className="mb-5 sm:mb-7 p-4 sm:p-6 rounded-[24px] bg-gradient-to-r from-[#004346] to-[#508991] text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none"/>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center font-extrabold text-2xl uppercase border border-white/10 shrink-0">{vitalsPatient.name?.slice(0,1)}</div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#74B3CE] uppercase tracking-wider">Patient Vitals</p>
                  <h2 className="text-lg sm:text-xl font-extrabold leading-snug">{vitalsPatient.name}</h2>
                  <p className="text-xs text-white/75">{vitalsPatient.email}{vitalsPatient.phone ? ` • ${vitalsPatient.phone}` : ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 bg-black/15 p-3 sm:p-4 rounded-2xl border border-white/5 flex-1 sm:max-w-xs lg:max-w-sm">
                {[["Gender",vitalsPatient.gender||"—","capitalize"],["Age",vitalsPatient.age?`${vitalsPatient.age} yrs`:"—"],["Weight",vitalsPatient.weight||"—"],["Height",vitalsPatient.height||"—"]].map(([l,v,ex])=>(
                  <div key={l}><p className="text-[9px] font-extrabold text-[#74B3CE] uppercase">{l}</p><p className={`text-xs sm:text-sm font-bold ${ex||""}`}>{v}</p></div>
                ))}
              </div>
              <button onClick={()=>role==="patient"?goTo("settings"):setEditingPatient(vitalsPatient)}
                className="self-start sm:self-auto px-3 py-2 bg-white text-[#004346] hover:bg-[#74B3CE] hover:text-white rounded-xl text-xs font-extrabold transition-all shadow flex items-center gap-1.5 shrink-0 cursor-pointer">
                <Edit c="w-3.5 h-3.5"/> Edit Vitals
              </button>
            </div>
          </div>
        )}

        {/* ── HEADER + TABS ── */}
        <div className="flex flex-col gap-3 mb-5 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-[#508991] uppercase tracking-widest mb-0.5">Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#004346]">Hi, {user?.name?.split(" ")[0]}!</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your health companion, always by your side.</p>
            </div>
            {["caregiver","admin"].includes(role) && patientList.length > 0 && (
              <select value={selectedPatientId||""} onChange={e=>setSelectedPatientId(Number(e.target.value))}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-[#004346] bg-white outline-none cursor-pointer">
                {patientList.map(p=><option key={p.id} value={p.id}>{p.name} — {p.email}</option>)}
              </select>
            )}
          </div>
          {/* Tab bar */}
          <div className="flex overflow-x-auto gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm" style={{scrollbarWidth:"none"}}>
            {[
              {key:"overview",label:"Overview"},
              ...(["caregiver","admin"].includes(role)?[{key:"patients",label:"Patient List"}]:[]),
              {key:"medicines",label:role==="patient"?"My Medicines":"Patient Medicines"},
              {key:"history",label:"History"},
              {key:"settings",label:"Settings"},
            ].map(({key,label})=>(
              <button key={key} onClick={()=>goTo(key)}
                className={`cursor-pointer px-3 sm:px-5 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition-all ${tab===key?"bg-[#004346] text-white shadow":"text-gray-400 hover:text-[#004346]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── BACK BUTTON ── */}
        {canGoBack && <BackButton onBack={goBack}/>}

        {/* ── STATS CARDS ── */}
        {(role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8">
            {[
              {label:"Active Medicines",val:adherence.active_count,col:"text-[#004346]"},
              {label:"Doses Taken",val:adherence.taken,col:"text-emerald-700"},
              {label:"Doses Missed",val:adherence.missed,col:"text-rose-700"},
              {label:"Refills Needed",val:adherence.low_stock_meds?.length||0,col:"text-amber-700"},
            ].map(({label,val,col})=>(
              <div key={label} className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
                <p className={`text-2xl sm:text-3xl font-extrabold ${col}`}>{val}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase leading-snug">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ════ OVERVIEW TAB ════ */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Low stock alerts */}
              {adherence.low_stock_meds?.length > 0 && (
                <div className="space-y-2">
                  {adherence.low_stock_meds.map(med=>(
                    <div key={med.id} className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
                      <AlertIcon c="w-5 h-5 text-amber-500 shrink-0"/>
                      <p className="text-xs font-semibold"><span className="font-extrabold">{med.name}</span> is low — only <span className="font-extrabold">{med.stock}</span> left.</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Calendar */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-[#004346]">{monthLabel}</span>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateInput}
                      onChange={e=>{setDateInput(e.target.value);setSelectedDate(e.target.value);}}
                      className="px-2 py-1.5 rounded-xl border border-gray-200 text-[10px] sm:text-xs font-bold text-[#004346] outline-none bg-white cursor-pointer"/>
                    <button onClick={()=>setCalOffset(p=>p-1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><ChevronLeft/></button>
                    <button onClick={()=>setCalOffset(p=>p+1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><ChevronRight/></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {weekDays.map(day=>(
                    <button key={day.dateStr} onClick={()=>{setSelectedDate(day.dateStr);setDateInput(day.dateStr);}}
                      className={`flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${selectedDate===day.dateStr?"bg-[#004346] text-white shadow":day.isToday?"bg-[#508991]/20 text-[#004346] ring-2 ring-[#508991]/40":"bg-[#D6F3F4]/50 hover:bg-[#D6F3F4] text-gray-500"}`}>
                      <span className="text-[9px] sm:text-[10px] font-bold opacity-75">{day.name}</span>
                      <span className="text-sm sm:text-lg font-extrabold mt-0.5">{day.dateNum}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Today's medicines */}
              {(role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pl-1">
                    <h3 className="font-extrabold text-[#004346] text-base sm:text-lg">
                      {selectedDate===todayStr()?"Today's Medicines":`Medicines — ${selectedDate}`}
                    </h3>
                    {medLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
                  </div>
                  {schedule.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 sm:p-14 bg-white rounded-2xl sm:rounded-3xl border border-dashed border-gray-200 text-center">
                      <PillIcon c="w-10 h-10 text-gray-200 mb-3"/><p className="text-sm font-bold text-gray-400">No medicines scheduled for this date.</p>
                    </div>
                  ) : schedule.map((dose,i)=>(
                    <div key={i} className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border shadow-sm transition-all ${statusColor(dose.status)}`}>
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${dose.status==="taken"?"bg-emerald-100 text-emerald-600":dose.status==="missed"?"bg-red-100 text-red-500":"bg-[#D6F3F4] text-[#74B3CE]"}`}>
                          <PillIcon c="w-5 h-5 sm:w-6 sm:h-6"/>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] sm:text-[10px] text-gray-400 font-semibold">{dose.category}</p>
                          <h4 className="font-extrabold text-[#004346] text-sm sm:text-base truncate">{dose.name}</h4>
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock c="w-3 h-3 text-gray-400"/>{dose.scheduled_time}{dose.dosage&&<><span className="text-gray-300">•</span>{dose.dosage}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {role==="caregiver"&&(
                          <button onClick={()=>handleNudge(dose.medicine_id,dose.scheduled_time,dose.name)} title="Send reminder email"
                            className="cursor-pointer w-8 h-8 rounded-full bg-white border border-gray-100 text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          </button>
                        )}
                        <button onClick={()=>{const m=medicines.find(m=>m.id===dose.medicine_id);if(m)setEditingMedicine(m);}} title="Edit"
                          className="cursor-pointer w-8 h-8 rounded-full bg-white border border-gray-100 text-[#004346] hover:bg-[#D6F3F4] flex items-center justify-center transition-all shadow-sm">
                          <Edit c="w-3.5 h-3.5"/>
                        </button>
                        <span className={`hidden sm:inline text-[9px] font-extrabold uppercase px-2 py-1 rounded-full ${dose.status==="taken"?"bg-emerald-500 text-white":dose.status==="missed"?"bg-red-500 text-white":"bg-gray-200 text-gray-600"}`}>{dose.status}</span>
                        <button onClick={()=>toggleStatus(dose.medicine_id,dose.scheduled_time,dose.status,dose.name)}
                          className={`cursor-pointer w-8 h-8 rounded-full border flex items-center justify-center transition-all ${dose.status==="taken"?"bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200":dose.status==="missed"?"bg-red-50 text-red-500 border-red-200 hover:bg-gray-50 hover:text-gray-400 hover:border-gray-200":"bg-[#D6F3F4] text-gray-400 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"}`}>
                          {dose.status==="taken"?<Check c="w-3.5 h-3.5"/>:dose.status==="missed"?<X c="w-3.5 h-3.5"/>:<Clock c="w-3.5 h-3.5"/>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {["caregiver","admin"].includes(role) && !effectivePatientId && (
                <div className="flex flex-col items-center justify-center p-14 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                  <User c="w-12 h-12 text-gray-200 mb-3"/><p className="text-sm font-bold text-gray-400">No patient selected.</p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4 sm:space-y-6">
              {(role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
                <div className="bg-[#004346] text-white p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] shadow-lg relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5"/>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5"/>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-extrabold">{selectedDate===todayStr()?"Today's Adherence":"Adherence"}</h3>
                      <button onClick={()=>setShowAdd(true)}
                        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#004346] hover:bg-[#74B3CE] hover:text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md shrink-0">
                        <Plus c="w-3 h-3"/> Add Medicine
                      </button>
                    </div>
                    <p className="text-xs text-white/60 mb-4">{selectedDate}</p>
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-4xl sm:text-5xl font-extrabold">{adherence.adherence_pct}%</span>
                      <span className="text-xs text-white/60 pb-2">{adherence.taken}/{adherence.total_scheduled} doses</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-[#74B3CE] transition-all duration-700" style={{width:`${adherence.adherence_pct}%`}}/>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xs font-extrabold text-[#004346] uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">Logged In Account</h3>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-extrabold text-lg uppercase">{user?.name?.slice(0,1)}</div>
                  <div>
                    <h4 className="font-extrabold text-[#004346] text-sm">{user?.name}</h4>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    <p className="text-[9px] text-[#74B3CE] font-bold uppercase mt-1 flex items-center gap-1">
                      {role==="admin"?<Shield c="w-2.5 h-2.5"/>:role==="caregiver"?<Heart c="w-2.5 h-2.5"/>:<User c="w-2.5 h-2.5"/>}
                      {role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ PATIENTS TAB ════ */}
        {tab === "patients" && ["caregiver","admin"].includes(role) && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Patient List</h2>
            {patientList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                <User c="w-12 h-12 text-gray-200 mb-4"/><p className="text-sm font-bold text-gray-400">No patients registered yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {patientList.map(pt=>(
                  <div key={pt.id} className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-extrabold uppercase">{pt.name.slice(0,1)}</div>
                        <div><h3 className="font-extrabold text-[#004346] text-sm">{pt.name}</h3><p className="text-xs text-gray-400">{pt.email}</p></div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button onClick={()=>{setSelectedPatientId(pt.id);goTo("overview");showToast(`Switched to ${pt.name}`);}}
                          className="px-3 py-1.5 bg-[#004346] hover:bg-[#508991] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">Select</button>
                        <button onClick={()=>setEditingPatient(pt)}
                          className="w-8 h-8 rounded-xl bg-teal-50 text-[#004346] hover:bg-teal-600 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-teal-100"><Edit c="w-3.5 h-3.5"/></button>
                        <button onClick={()=>setDeleteConfirm({type:"patient",id:pt.id,name:pt.name})}
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-red-100"><Trash c="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-gray-500 border-t border-gray-50 pt-3">
                      <div>Gender: <span className="text-[#004346] capitalize">{pt.gender||"—"}</span></div>
                      <div>Age: <span className="text-[#004346]">{pt.age?`${pt.age} yrs`:"—"}</span></div>
                      <div>Height: <span className="text-[#004346]">{pt.height||"—"}</span></div>
                      <div>Weight: <span className="text-[#004346]">{pt.weight||"—"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ MEDICINES TAB ════ */}
        {tab === "medicines" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">{role==="patient"?"My Medicines":"Patient Medicines"}</h2>
              {medLoading && <span className="text-xs text-gray-400 animate-pulse">Refreshing…</span>}
            </div>
            {medicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                <PillIcon c="w-12 h-12 text-gray-200 mb-4"/><p className="text-sm font-bold text-gray-400">No medicines added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {medicines.map(med=>(
                  <div key={med.id} className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${med.low_stock?"bg-amber-50 text-amber-500":"bg-[#D6F3F4] text-[#508991]"}`}><PillIcon c="w-5 h-5"/></div>
                        <div><p className="font-extrabold text-[#004346] text-sm">{med.name}</p><p className="text-[10px] text-gray-400 font-semibold">{med.category}</p></div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={()=>setEditingMedicine(med)} className="cursor-pointer w-7 h-7 rounded-lg bg-[#D6F3F4] text-[#004346] hover:bg-[#004346] hover:text-white flex items-center justify-center transition-all"><Edit c="w-3.5 h-3.5"/></button>
                        <button onClick={()=>setDeleteConfirm({type:"medicine",id:med.id,name:med.name})} className="cursor-pointer w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"><Trash c="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                    {med.description && <p className="text-xs text-gray-500">{med.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      {med.dosage && <span className="px-2 py-0.5 rounded-lg bg-[#D6F3F4] text-[#004346]">{med.dosage}</span>}
                      <span className={`px-2 py-0.5 rounded-lg ${med.low_stock?"bg-amber-50 text-amber-600":"bg-gray-50 text-gray-500"}`}>{med.stock} left{med.low_stock&&" ⚠"}</span>
                    </div>
                    {(med.start_date||med.end_date) && (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#508991] bg-[#D6F3F4]/40 px-2.5 py-1.5 rounded-xl">
                        {med.start_date&&<span>From {med.start_date}</span>}{med.end_date&&<span>→ {med.end_date}</span>}
                      </div>
                    )}
                    {med.schedules?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {med.schedules.map(t=><span key={t} className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#004346]/8 text-[#004346] text-[10px] font-bold"><Clock c="w-2.5 h-2.5"/>{t}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ HISTORY TAB ════ */}
        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Complete Dose History</h2>
              {histLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">Every medicine dose — all time, most recent first.</p>
            {!histLoading && history.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                <HistoryIcon c="w-12 h-12 text-gray-200 mb-4"/><p className="text-sm font-bold text-gray-400">No history yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead><tr className="bg-[#004346]/5 text-[#004346]">
                    {["Medicine","Date","Scheduled","Status","Logged At"].map(h=>(
                      <th key={h} className="text-left px-4 sm:px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map(log=>(
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-5 py-3 font-bold text-[#004346]">{log.medicine_name}</td>
                        <td className="px-4 sm:px-5 py-3 text-gray-500 text-xs">{log.log_date||log.taken_at?.slice(0,10)}</td>
                        <td className="px-4 sm:px-5 py-3 text-gray-500 text-xs">{log.scheduled_time||"—"}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${log.status==="taken"?"bg-emerald-100 text-emerald-700":log.status==="missed"?"bg-red-100 text-red-600":"bg-gray-100 text-gray-500"}`}>{log.status}</span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-gray-400 text-xs">{log.taken_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ SETTINGS TAB ════ */}
        {tab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] shadow-sm border border-gray-100">
              <div className="border-b border-gray-100 pb-4 mb-5 sm:mb-6">
                <h3 className="font-extrabold text-lg text-[#004346] flex items-center gap-2"><User c="w-5 h-5"/> Profile Details</h3>
                <p className="text-xs text-gray-400 mt-0.5">Update your name, phone and health stats.</p>
              </div>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div><label className="label">Full Name</label><input className={inp} value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})} required/></div>
                <div><label className="label">Phone</label><input type="tel" pattern="[0-9]{10}" title="Please enter a 10 digit phone number" className={inp} value={profileForm.phone} onChange={e=>setProfileForm({...profileForm,phone:e.target.value})} placeholder="enter ur 10 digit number"/></div>
                {role==="patient"&&(
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#D6F3F4]/40 border border-[#508991]/15">
                    <div className="col-span-2 text-[10px] font-extrabold text-[#004346] uppercase tracking-wide pb-1 border-b border-[#508991]/10">Health Stats</div>
                    <div><label className="label">Gender</label>
                      <select className={inp+" text-xs"} value={profileForm.gender} onChange={e=>setProfileForm({...profileForm,gender:e.target.value})}>
                        <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select></div>
                    <div><label className="label">Age</label><input type="number" className={inp+" text-xs"} value={profileForm.age} onChange={e=>setProfileForm({...profileForm,age:e.target.value})} placeholder="25"/></div>
                    <div><label className="label">Weight (kg)</label><input type="number" className={inp+" text-xs"} value={profileForm.weight} onChange={e=>setProfileForm({...profileForm,weight:e.target.value})} placeholder="70"/></div>
                    <div><label className="label">Height (cm)</label><input type="number" className={inp+" text-xs"} value={profileForm.height} onChange={e=>setProfileForm({...profileForm,height:e.target.value})} placeholder="170"/></div>
                  </div>
                )}
                <div><label className="label">Email (read-only)</label><input className={inp+" cursor-not-allowed text-gray-400"} value={user?.email||""} disabled/></div>
                <button type="submit" disabled={profLoading} className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${profLoading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
                  {profLoading?"Saving...":"Save Changes"}
                </button>
              </form>
            </div>
            <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] shadow-sm border border-gray-100">
              <div className="border-b border-gray-100 pb-4 mb-5 sm:mb-6">
                <h3 className="font-extrabold text-lg text-[#004346] flex items-center gap-2"><Lock c="w-5 h-5"/> Security</h3>
                <p className="text-xs text-gray-400 mt-0.5">Change your password. Min. 6 characters.</p>
              </div>
              <form onSubmit={handlePwChange} className="space-y-4">
                <div><label className="label">Current Password</label><input type="password" className={inp} value={pwForm.old_password} onChange={e=>setPwForm({...pwForm,old_password:e.target.value})} placeholder="••••••••" required autoComplete="current-password"/></div>
                <div><label className="label">New Password</label><input type="password" className={inp} value={pwForm.new_password} onChange={e=>setPwForm({...pwForm,new_password:e.target.value})} placeholder="••••••••" required autoComplete="new-password"/></div>
                <div><label className="label">Confirm New Password</label><input type="password" className={inp} value={pwForm.confirm_password} onChange={e=>setPwForm({...pwForm,confirm_password:e.target.value})} placeholder="••••••••" required autoComplete="new-password"/></div>
                <button type="submit" disabled={pwLoading} className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${pwLoading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
                  {pwLoading?"Updating...":"Update Password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-50 animate-[fadeIn_.2s_ease] max-w-[calc(100vw-24px)] sm:max-w-xs">
          <div className={`flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl border shadow-xl ${toast.type==="success"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-red-50 border-red-200 text-red-800"}`}>
            {toast.type==="success"?<Check c="w-4 h-4 text-emerald-500 shrink-0"/>:<AlertIcon c="w-4 h-4 text-red-500 shrink-0"/>}
            <p className="font-semibold text-xs sm:text-sm">{toast.message}</p>
            <button onClick={()=>setToast(null)} className="ml-2 opacity-60 hover:opacity-100 cursor-pointer shrink-0 text-xs font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
