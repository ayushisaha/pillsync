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
const TabletIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" />
  </svg>
);
const PillIcon = TabletIcon;
const CapsuleIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="20" height="6" rx="3" transform="rotate(-45 12 12)" />
    <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" />
  </svg>
);
const LiquidIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6l1 4H8L9 3z"/><path d="M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"/><path d="M10 12h4"/>
  </svg>
);
const LotionIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v4H9z" /><path d="M6 7h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /><circle cx="12" cy="14" r="2" />
  </svg>
);
const SprayIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2h4M9 6h6M8 10h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10z" /><path d="M12 2v4M16 6l3-1M19 5v3" />
  </svg>
);
const InjectionIcon = ({ c = "w-6 h-6" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 11 9 21H3v-6l10-10" /><path d="m11 8 5 5" /><path d="m7 12 5 5" /><path d="m5 15 4 4" />
  </svg>
);
const FormIcon = ({ formulation, c }) => {
  switch (formulation) {
    case "tablet": return <TabletIcon c={c} />;
    case "capsule": return <CapsuleIcon c={c} />;
    case "liquid": return <LiquidIcon c={c} />;
    case "injection": return <InjectionIcon c={c} />;
    case "lotion": return <LotionIcon c={c} />;
    case "spray": return <SprayIcon c={c} />;
    default: return <TabletIcon c={c} />;
  }
};
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
const BarChart = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/>
  </svg>
);
const ListIcon = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const TrendingUp = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const InfoIcon = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const CATS = ["Blood Pressure","Diabetes","Thyroid","Antibiotics","Vitamins","Heart Medications","Other"];

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
  const [form, setForm] = useState({ name:"", description:"", dosage:"", category:"Vitamins", stock:"", start_date:todayStr(), end_date:"", formulation:"tablet" });
  const [otherDisease, setOtherDisease] = useState("");
  const [times, setTimes] = useState([]);
  const [frequency, setFrequency] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState(null);

  const addTime = t => { if (!times.includes(t)) setTimes(p => [...p, t].sort()); };
  const rmTime  = t => setTimes(p => p.filter(x => x !== t));

  // Refill estimate: how many days the current stock will last
  const refillEstimate = () => {
    const stockNum = parseFloat(form.stock);
    const dosageNum = parseFloat(form.dosage);
    if (!stockNum || stockNum <= 0) return null;
    const dosesPerDay = times.length > 0 ? times.length : frequency;
    const doseSize = dosageNum > 0 ? dosageNum : 1;
    const daysLeft = Math.floor(stockNum / (dosesPerDay * doseSize));
    if (daysLeft <= 0) return null;
    const unit = ["liquid","lotion"].includes(form.formulation) ? "ml" : form.formulation === "spray" ? "sprays" : form.formulation === "injection" ? "doses" : "tablet(s)";
    return `${daysLeft} day(s) supply — ${dosesPerDay}x daily × ${doseSize} ${unit}/dose`;
  };

  const fetchPrediction = async (diseaseName) => {
    if (!diseaseName || diseaseName.trim().length < 3) { setPrediction(null); return; }
    try {
      const q = patientId ? `&patient_id=${patientId}` : "";
      const res = await axios.get(
        `${API}/medicines/history-predict?disease_name=${encodeURIComponent(diseaseName.trim())}${q}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrediction(res.data.recurrence_detected ? res.data : null);
    } catch { setPrediction(null); }
  };

  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat }));
    setOtherDisease("");
    setPrediction(null);
    if (cat !== "Other") fetchPrediction(cat);
  };

  const applyPrefill = () => {
    if (!prediction) return;
    setForm(f => ({
      ...f,
      name:        prediction.name        || f.name,
      description: prediction.description || f.description,
      dosage:      prediction.dosage      || f.dosage,
      stock:       prediction.stock !== undefined ? String(prediction.stock) : f.stock,
      formulation: prediction.formulation || f.formulation,
    }));
    if (prediction.schedules?.length) setTimes(prediction.schedules);
    if (prediction.duration_days) {
      const s = new Date(form.start_date || todayStr());
      s.setDate(s.getDate() + prediction.duration_days);
      setForm(f => ({ ...f, end_date: s.toISOString().split("T")[0] }));
    }
    setPrediction(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Medicine name is required"); return; }
    if (times.length === 0) { setError("Add at least one reminder time"); return; }
    if (form.category === "Other" && !otherDisease.trim()) { setError("Please specify the condition/disease"); return; }
    setLoading(true);
    try {
      const finalCategory = form.category === "Other" ? otherDisease.trim() : form.category;
      const q = patientId ? `?patient_id=${patientId}` : "";
      const res = await axios.post(`${API}/medicines${q}`, {
        ...form, category: finalCategory,
        stock: parseInt(form.stock)||0, schedules: times,
        start_date: form.start_date||todayStr(), end_date: form.end_date||null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => { if (p === "granted") scheduleNotificationsForMedicine(res.data); });
      } else scheduleNotificationsForMedicine(res.data);
      onSave(res.data); onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  const FORMULATIONS = [
    { name: "tablet", label: "Tablet", icon: <TabletIcon c="w-4 h-4" /> },
    { name: "capsule", label: "Capsule", icon: <CapsuleIcon c="w-4 h-4" /> },
    { name: "liquid", label: "Liquid", icon: <LiquidIcon c="w-4 h-4" /> },
    { name: "injection", label: "Injection", icon: <InjectionIcon c="w-4 h-4" /> },
    { name: "lotion", label: "Lotion", icon: <LotionIcon c="w-4 h-4" /> },
    { name: "spray", label: "Spray", icon: <SprayIcon c="w-4 h-4" /> },
  ];

  const stockLabel = ["liquid","lotion"].includes(form.formulation) ? "(ml)" : form.formulation === "spray" ? "(sprays)" : form.formulation === "injection" ? "(doses)" : "";
  const dosageLabel = ["liquid","lotion"].includes(form.formulation) ? "(ml/Dose)" : form.formulation === "spray" ? "(sprays)" : form.formulation === "injection" ? "(doses)" : "(Quantity)";
  const dosagePlaceholder = ["liquid","lotion"].includes(form.formulation) ? "e.g. 5 ml" : form.formulation === "spray" ? "e.g. 2 sprays" : form.formulation === "injection" ? "e.g. 1 injection" : form.formulation === "capsule" ? "e.g. 1 capsule" : "e.g. 1 tablet";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5" /></button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Add Medicine</h2>
        <p className="text-xs text-gray-400 mb-5">Set details, duration, and reminder times.</p>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2"><AlertIcon c="w-4 h-4" />{error}</div>}
        {prediction && (
          <div className="mb-4 p-4 bg-[#D6F3F4] border border-[#508991]/20 rounded-2xl flex items-start gap-3">
            <InfoIcon c="w-4 h-4 text-[#004346] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-extrabold text-[#004346]">Previous prescription detected</p>
              <p className="text-[10px] text-[#508991] mt-0.5">We found a similar medication from your history. Would you like to pre-fill?</p>
            </div>
            <button type="button" onClick={applyPrefill} className="shrink-0 px-3 py-1.5 bg-[#004346] text-white text-[10px] font-extrabold rounded-xl cursor-pointer hover:bg-[#508991] transition-all">Apply</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Medicine Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" placeholder="e.g. Metformin 500mg" required /></div>
          <div><label className="label">Instructions / Notes</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input" placeholder="e.g. Take with food" /></div>
          <div>
            <label className="label">Medicine Form</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMULATIONS.map(item => (
                <button key={item.name} type="button"
                  onClick={() => setForm(f => ({ ...f, formulation: item.name }))}
                  className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl text-[10px] font-extrabold capitalize transition-all border cursor-pointer ${form.formulation === item.name ? "bg-[#004346] text-white border-[#004346] shadow-sm" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"}`}>
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dosage {dosageLabel}</label>
              <input value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className="input" placeholder={dosagePlaceholder} />
            </div>
            <div>
              <label className="label">Stock Count {stockLabel}</label>
              <input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="input" placeholder="30" />
            </div>
          </div>
          <div><label className="label">Disease / Category</label>
            <select value={form.category} onChange={e=>handleCategoryChange(e.target.value)} className="input">
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {form.category === "Other" && (
            <div><label className="label">Specify Condition *</label>
              <input value={otherDisease} onChange={e=>setOtherDisease(e.target.value)} className="input" placeholder="e.g. Migraine" required /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className="input" /></div>
            <div><label className="label">End Date</label>
              <input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="input" /></div>
          </div>
          <div>
            <label className="label">Times Per Day</label>
            <div className="flex gap-2">
              {[1,2,3,4].map(n => (
                <button key={n} type="button" onClick={() => setFrequency(n)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    frequency === n ? "bg-[#004346] text-white border-[#004346] shadow" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                  }`}>
                  {n}x
                </button>
              ))}
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
          {refillEstimate() && (
            <div className="flex items-start gap-2.5 p-3 bg-[#D6F3F4]/60 border border-[#508991]/20 rounded-xl text-[11px] text-[#004346] font-semibold">
              <InfoIcon c="w-3.5 h-3.5 text-[#508991] shrink-0 mt-0.5"/>
              <span>Stock will last approx. <strong>{refillEstimate()}</strong></span>
            </div>
          )}
          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Adding..." : "Add Medicine"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Medicine Modal ──────────────────────────────────
function EditMedicineModal({ medicine, onClose, onSave, token, patientId }) {
  const [form, setForm] = useState({
    name: medicine.name||"", description: medicine.description||"",
    dosage: medicine.dosage||"", category: medicine.category||"Vitamins",
    stock: String(medicine.stock||0), start_date: medicine.start_date||"",
    end_date: medicine.end_date||"", formulation: medicine.formulation||"tablet"
  });
  const [times, setTimes] = useState(medicine.schedules||[]);
  const [frequency, setFrequency] = useState(medicine.schedules?.length || 1);
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
      await axios.patch(`${API}/medicines/${medicine.id}${q}`, {
        ...form, stock: parseInt(form.stock)||0, schedules: times,
        start_date: form.start_date||null, end_date: form.end_date||null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSave(); onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  const FORMULATIONS = [
    { name: "tablet", label: "Tablet", icon: <TabletIcon c="w-4 h-4" /> },
    { name: "capsule", label: "Capsule", icon: <CapsuleIcon c="w-4 h-4" /> },
    { name: "liquid", label: "Liquid", icon: <LiquidIcon c="w-4 h-4" /> },
    { name: "injection", label: "Injection", icon: <InjectionIcon c="w-4 h-4" /> },
    { name: "lotion", label: "Lotion", icon: <LotionIcon c="w-4 h-4" /> },
    { name: "spray", label: "Spray", icon: <SprayIcon c="w-4 h-4" /> },
  ];

  const stockLabel = ["liquid","lotion"].includes(form.formulation) ? "(ml)" : form.formulation === "spray" ? "(sprays)" : form.formulation === "injection" ? "(doses)" : "";
  const dosageLabel = ["liquid","lotion"].includes(form.formulation) ? "(ml/Dose)" : form.formulation === "spray" ? "(sprays)" : form.formulation === "injection" ? "(doses)" : "(Quantity)";
  const dosagePlaceholder = ["liquid","lotion"].includes(form.formulation) ? "e.g. 5 ml" : form.formulation === "spray" ? "e.g. 2 sprays" : form.formulation === "injection" ? "e.g. 1 injection" : form.formulation === "capsule" ? "e.g. 1 capsule" : "e.g. 1 tablet";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5" /></button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Edit Medicine</h2>
        <p className="text-xs text-gray-400 mb-5">Update dosage, schedule or stock details.</p>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2"><AlertIcon c="w-4 h-4"/>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Medicine Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required/></div>
          <div><label className="label">Instructions / Notes</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input"/></div>
          <div>
            <label className="label">Medicine Form</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMULATIONS.map(item => (
                <button key={item.name} type="button"
                  onClick={() => setForm(f => ({ ...f, formulation: item.name }))}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-extrabold capitalize transition-all border cursor-pointer ${form.formulation === item.name ? "bg-[#004346] text-white border-[#004346] shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dosage {dosageLabel}</label>
              <input value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className="input" placeholder={dosagePlaceholder} />
            </div>
            <div>
              <label className="label">Stock Count {stockLabel}</label>
              <input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="input" placeholder="30" />
            </div>
          </div>
          <div><label className="label">Disease / Category</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input">
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className="input" /></div>
            <div><label className="label">End Date</label>
              <input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="input" /></div>
          </div>
          <div>
            <label className="label">Times Per Day</label>
            <div className="flex gap-2">
              {[1,2,3,4].map(n => (
                <button key={n} type="button" onClick={() => setFrequency(n)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    frequency === n ? "bg-[#004346] text-white border-[#004346] shadow" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                  }`}>
                  {n}x
                </button>
              ))}
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
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
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
      if (Notification.permission === "granted") {
        new Notification("Vitals Update Saved", { body: `Vitals for ${payload.name} updated successfully.` });
      }
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
            <input type="tel" pattern="[0-9]{10}" title="Please enter a 10 digit phone number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input" placeholder="Enter your 10 digit number"/></div>
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

// ─── Add Patient Modal (Caregiver) ───────────────────────
function AddPatientModal({ onClose, onSave, token }) {
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"", gender:"female", age:"", weight:"", height:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { setError("Name, email and password are required"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: form.name, email: form.email, password: form.password,
        role: "patient", phone: form.phone || null,
        gender: form.gender,
        age: form.age ? parseInt(form.age) : null,
        weight: form.weight ? `${form.weight} kg` : null,
        height: form.height ? `${form.height} cm` : null,
      });
      onSave(res.data); onClose();
    } catch (err) { setError(err.response?.data?.detail || "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5"/></button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Add New Patient</h2>
        <p className="text-xs text-gray-400 mb-5">Create a patient account and add their details.</p>
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2"><AlertIcon c="w-4 h-4"/>{error}</div>}
        {/* autoComplete=off prevents browser from filling in saved credentials */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Hidden dummy inputs to trick browser autofill away from real fields */}
          <input type="text" name="username_fake" style={{display:"none"}} autoComplete="username" readOnly />
          <input type="password" name="password_fake" style={{display:"none"}} autoComplete="current-password" readOnly />
          <div><label className="label">Full Name *</label>
            <input autoComplete="off" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" placeholder="Patient full name" required/></div>
          <div><label className="label">Email *</label>
            <input autoComplete="off" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input" placeholder="patient@email.com" required/></div>
          <div><label className="label">Temporary Password *</label>
            <input autoComplete="new-password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="input" placeholder="Min 6 characters" required minLength={6}/></div>
          <div><label className="label">Phone</label>
            <input autoComplete="off" type="tel" pattern="[0-9]{10}" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input" placeholder="10 digit number"/></div>
          <div className="p-4 rounded-2xl bg-[#D6F3F4]/40 border border-[#508991]/15 space-y-3">
            <p className="text-[10px] font-extrabold text-[#004346] uppercase tracking-wide">Health Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Gender</label>
                <select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className="input text-xs">
                  <option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select></div>
              <div><label className="label">Age</label>
                <input autoComplete="off" type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} className="input text-xs" placeholder="Age"/></div>
              <div><label className="label">Weight (kg)</label>
                <input autoComplete="off" type="number" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} className="input text-xs" placeholder="kg"/></div>
              <div><label className="label">Height (cm)</label>
                <input autoComplete="off" type="number" value={form.height} onChange={e=>setForm({...form,height:e.target.value})} className="input text-xs" placeholder="cm"/></div>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Creating Patient..." : "Create Patient Account"}
          </button>
        </form>
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

  const role = user?.role || "patient";

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
  const [showAddPatient,   setShowAddPatient]   = useState(false);
  const [editingMedicine,  setEditingMedicine]  = useState(null);
  const [editingPatient,   setEditingPatient]   = useState(null);
  const [deleteConfirm,    setDeleteConfirm]    = useState(null);
  const [progressSubTab,   setProgressSubTab]   = useState("chart");

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

  // ─── Notification System (persisted to localStorage) ────
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("pillsync_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notif,         setNotif]         = useState(null);
  const notifIdRef = useRef(0);

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("pillsync_notifications", JSON.stringify(notifications)); } catch {}
  }, [notifications]);

  const addNotif = (message, type = "info", title = null) => {
    const id = Date.now() + Math.random();
    const ts = new Date();
    const timeStr = ts.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
    setNotifications(prev => [{ id, message, type, title: title || message, time: timeStr }, ...prev].slice(0, 50));
  };

  const dismissNotif = id => setNotifications(prev => prev.filter(n => n.id !== id));
  const unreadCount  = notifications.length;

  useEffect(() => {
    if (user) setProfileForm({
      name: user.name||"", phone: user.phone||"", gender: user.gender||"male",
      age:    user.age||"",
      weight: user.weight ? String(user.weight).replace(" kg","") : "",
      height: user.height ? String(user.height).replace(" cm","") : "",
    });
  }, [user]);

  const effectivePatientId = ["caregiver","admin"].includes(role) ? selectedPatientId : null;

  const loadPatients = useCallback(async (targetSelectId = null) => {
    if (!["caregiver","admin"].includes(role)) return;
    try {
      const res = await axios.get(`${API}/users/patients`, { headers: { Authorization: `Bearer ${token}` } });
      setPatientList(res.data);
      if (targetSelectId) {
        setSelectedPatientId(targetSelectId);
      } else if (res.data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res.data[0].id);
      }
    } catch {}
  }, [role, token, selectedPatientId]);

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

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
      const res = await axios.get(`${API}/medicines/history${q}`, { headers: { Authorization: `Bearer ${token}` } });
      setHistory(res.data);
    } catch {} finally { setHistLoading(false); }
  }, [token, effectivePatientId]);
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
        addNotif(`Time to take ${dose.name}${dose.dosage ? " — "+dose.dosage : ""}`, "warning", "Medicine Reminder");
        if (Notification.permission === "granted")
          new Notification("PillSync Reminder", { body:`Take ${dose.name}`, icon:"/favicon.ico" });
        try { const ac=new(window.AudioContext||window.webkitAudioContext)(); const osc=ac.createOscillator(); osc.type="sine"; osc.frequency.setValueAtTime(660,ac.currentTime); osc.connect(ac.destination); osc.start(); osc.stop(ac.currentTime+0.25); } catch {}
      });
    }, 15000);
    return () => clearInterval(iv);
  }, [schedule, selectedDate]);

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "medicine") {
        const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
        await axios.delete(`${API}/medicines/${deleteConfirm.id}${q}`, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`${deleteConfirm.name} removed.`);
        addNotif(`Medicine "${deleteConfirm.name}" has been removed.`, "info");
        loadSchedule();
      } else if (deleteConfirm.type === "patient") {
        await axios.delete(`${API}/users/patients/${deleteConfirm.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`${deleteConfirm.name} deleted.`);
        addNotif(`Patient "${deleteConfirm.name}" has been deleted.`, "info");
        loadPatients();
      }
    } catch { showToast("Delete failed", "error"); }
    setDeleteConfirm(null);
  };

  const toggleStatus = async (med_id, scheduled_time, currentStatus, medName) => {
    if (selectedDate === todayStr() && currentStatus === "pending") {
      const now = new Date();
      const [timePart, period] = scheduled_time.split(" ");
      let [h, m] = timePart.split(":").map(Number);
      if (period === "pm" && h !== 12) h += 12;
      if (period === "am" && h === 12) h = 0;
      const scheduled = new Date();
      scheduled.setHours(h, m, 0, 0);
      if (scheduled > now) {
        showToast(`${medName} is scheduled for ${scheduled_time} — too early to mark as taken!`, "error");
        return;
      }
    }
    const next = currentStatus === "taken" ? "pending" : "taken";
    try {
      const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
      await axios.post(`${API}/medicines/${med_id}/status${q}`,
        { status:next, scheduled_time, date_str:selectedDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`${medName}: marked as ${next}`);
      addNotif(`${medName} marked as ${next} at ${scheduled_time}`, next === "taken" ? "success" : "info");
      loadSchedule();
    } catch (err) { showToast(err.response?.data?.detail || "Failed", "error"); }
  };

  const toggleHistoryStatus = async (log) => {
    const current = log.status;
    const next = current === "taken" ? "pending" : "taken";
    try {
      await axios.post(`${API}/medicines/${log.medicine_id}/status`,
        { status: next, scheduled_time: log.scheduled_time, date_str: log.log_date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`${log.medicine_name}: ${next}`);
      addNotif(`${log.medicine_name} status updated to ${next}`, "info");
      loadHistory();
      loadSchedule();
    } catch (err) { showToast(err.response?.data?.detail || "Failed to update", "error"); }
  };

  const handleNudge = async (med_id, scheduled_time, medName) => {
    try {
      await axios.post(`${API}/medicines/${med_id}/nudge?scheduled_time=${encodeURIComponent(scheduled_time)}`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      showToast(`Reminder sent for ${medName}!`);
      addNotif(`Nudge reminder sent for ${medName}`, "info");
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
      login(token, res.data);
      showToast("Profile updated!");
      addNotif("Your vitals and profile details have been saved.", "success", "Profile Saved");
      if (Notification.permission === "granted") {
        new Notification("Vitals Update Saved", { body: "Your vitals & profile changes have been saved." });
      }
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
      showToast("Password changed!");
      addNotif("Your account password has been changed successfully.", "success", "Password Updated");
      setPwForm({old_password:"",new_password:"",confirm_password:""});
    } catch (err) { showToast(err.response?.data?.detail || "Failed","error"); }
    finally { setPwLoading(false); }
  };

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

  const vitalsPatient = role === "patient" ? user : patientList.find(p=>p.id===effectivePatientId);

  const stockDisplay = med => {
    if (["liquid","lotion"].includes(med.formulation)) return `${med.stock} ml`;
    if (med.formulation === "spray") return `${med.stock} sprays`;
    if (med.formulation === "injection") return `${med.stock} doses`;
    return `${med.stock} left`;
  };

  const refillDays = med => {
    if (!["liquid","lotion","spray","injection"].includes(med.formulation)) return null;
    if (!med.stock || !med.dosage) return null;
    const doseNum = parseFloat(med.dosage);
    if (!doseNum) return null;
    const timesPerDay = med.schedules?.length || 1;
    return Math.floor(med.stock / (doseNum * timesPerDay));
  };

  // 7-day progress helpers
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ dateStr: d.toISOString().split("T")[0], dayName: d.toLocaleDateString("en-US",{weekday:"short"}), dateNum: d.getDate() });
    }
    return days;
  };

  const getDayStatusForMed = (medId, dateStr) => {
    const dayLogs = history.filter(log => log.medicine_id === medId && log.log_date === dateStr);
    if (dayLogs.length === 0) return "pending";
    if (dayLogs.some(log => log.status === "taken")) return "taken";
    if (dayLogs.some(log => log.status === "missed")) return "missed";
    return "pending";
  };

  const last7Days = getLast7Days();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D6F3F4] via-[#f0fafa] to-[#D6F3F4] text-[#172A3A]">
      <style>{`
        .label { display:block; font-size:10px; font-weight:800; color:#004346; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .input { width:100%; padding:12px 16px; border-radius:16px; border:2px solid #f3f4f6; background:white; font-size:14px; font-weight:600; color:#1f2937; outline:none; transition:border-color .2s; }
        .input:focus { border-color:#508991; }
        @keyframes fadeIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {deleteConfirm && (
        <ConfirmModal
          title={`Delete ${deleteConfirm.type === "medicine" ? "Medicine" : "Patient"}`}
          message={`Are you sure you want to remove "${deleteConfirm.name}"? This cannot be undone.`}
          onConfirm={executeDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Medicine reminder banner */}
      {notif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-sm animate-[fadeIn_.3s_ease]">
          <div className="bg-[#004346] text-white rounded-2xl px-4 py-4 shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Bell c="w-5 h-5"/></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{notif.title}</p>
              <p className="text-xs text-white/70 mt-0.5 truncate">{notif.body}</p>
            </div>
            <button onClick={()=>setNotif(null)} className="text-white/60 hover:text-white cursor-pointer shrink-0"><X c="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {showAdd && <AddMedicineModal token={token} patientId={effectivePatientId} onClose={()=>setShowAdd(false)} onSave={(med)=>{loadSchedule();showToast("Medicine added!");addNotif(`"${med?.name||"Medicine"}" added to your schedule.`,"success","Medicine Added");}}/>}
      {editingMedicine && <EditMedicineModal medicine={editingMedicine} token={token} patientId={effectivePatientId} onClose={()=>setEditingMedicine(null)} onSave={()=>{loadSchedule();showToast("Medicine updated!");addNotif("Medicine details updated.","info");}}/>}
      {editingPatient && <EditPatientModal patient={editingPatient} token={token} onClose={()=>setEditingPatient(null)} onSave={()=>{loadPatients();loadSchedule();showToast("Patient updated!");addNotif(`Patient "${editingPatient.name}" vitals updated.`,"success");}}/>}
      {showAddPatient && <AddPatientModal token={token} onClose={()=>setShowAddPatient(false)} onSave={(newPatient)=>{loadPatients(newPatient?.id);showToast("Patient account created!");addNotif("New patient account created successfully.","success","Patient Added");}}/>}

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#004346] text-white flex items-center justify-center shadow-md"><PillIcon c="w-4 h-4"/></div>
          <span className="font-extrabold text-lg sm:text-xl text-[#004346] tracking-tight">PillSync</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[10px] font-extrabold">
            {["patient", "caregiver", "admin"].map((r) => (
              <button key={r} onClick={() => { if (role === r) return; logout(`/login?role=${r}`); }}
                className={`px-2 sm:px-3 py-1.5 rounded-lg cursor-pointer capitalize transition-all ${role === r ? "bg-[#004346] text-white shadow" : "text-gray-500 hover:text-[#004346]"}`}>
                {r}
              </button>
            ))}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(o => !o)}
              className="relative w-9 h-9 rounded-xl bg-gray-100 hover:bg-[#D6F3F4] text-[#004346] flex items-center justify-center transition-all cursor-pointer">
              <Bell c="w-4 h-4"/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-[slideDown_.2s_ease] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h4 className="font-extrabold text-sm text-[#004346]">Notifications</h4>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Bell c="w-8 h-8 text-gray-200 mb-2"/>
                      <p className="text-xs font-bold text-gray-400">No notifications yet</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">Actions will appear here</p>
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.type === "success" ? "bg-emerald-100 text-emerald-600" : n.type === "warning" ? "bg-amber-100 text-amber-600" : n.type === "error" ? "bg-red-100 text-red-600" : "bg-[#D6F3F4] text-[#004346]"}`}>
                        {n.type === "success" ? <Check c="w-3.5 h-3.5"/> : n.type === "warning" ? <AlertIcon c="w-3.5 h-3.5"/> : <InfoIcon c="w-3.5 h-3.5"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#172A3A] leading-snug">{n.title}</p>
                        {n.title !== n.message && <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{n.message}</p>}
                        <p className="text-[9px] text-gray-300 mt-1 font-semibold">{n.time}</p>
                      </div>
                      <button onClick={() => dismissNotif(n.id)} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0"><X c="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-gray-100 pl-3">
            <div className="w-9 h-9 rounded-xl bg-[#004346] text-white font-bold flex items-center justify-center uppercase shadow">{user?.name?.slice(0,2)||"PS"}</div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-[#172A3A] leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={()=>{logout("/login");}}
            className="cursor-pointer border border-[#004346]/20 hover:border-[#004346] text-[#004346] px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-[#004346]/5">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Close notification drawer on outside click */}
      {notifOpen && <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)}/>}

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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#004346]">Hi, {user?.name?.split(" ")[0]}!</h1>
              </div>
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
              {key:"progress",label:"Progress"},
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
        {(role==="patient"||["caregiver","admin"].includes(role)&&effectivePatientId) && (
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
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                  {weekDays.map(d=>(
                    <button key={d.dateStr} onClick={()=>setSelectedDate(d.dateStr)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-center cursor-pointer transition-all ${selectedDate===d.dateStr?"bg-[#004346] text-white shadow-md":d.isToday?"bg-[#D6F3F4] text-[#004346]":"hover:bg-gray-50 text-gray-500"}`}>
                      <span className="text-[9px] font-bold uppercase">{d.name}</span>
                      <span className="text-xs sm:text-sm font-extrabold">{d.dateNum}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold text-[#004346] uppercase tracking-wider">Today's Medicines</h3>
                    {medLoading && <span className="text-[10px] text-gray-400 animate-pulse">Loading...</span>}
                  </div>
                  {schedule.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <TabletIcon c="w-10 h-10 text-gray-200 mb-3"/><p className="text-sm font-bold text-gray-400">No medicines scheduled for this date.</p>
                    </div>
                  ) : schedule.map(dose=>(
                    <div key={`${dose.medicine_id}-${dose.scheduled_time}`}
                      className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border transition-all ${statusColor(dose.status)}`}>
                      <div className="w-10 h-10 rounded-xl bg-white/70 border border-white flex items-center justify-center shrink-0">
                        <FormIcon formulation={dose.formulation} c="w-5 h-5 text-[#508991]"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm text-[#004346] truncate">{dose.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold"><Clock c="w-3 h-3"/>{dose.scheduled_time}</span>
                          {dose.dosage && <span className="text-[10px] text-[#508991] font-bold px-1.5 py-0.5 bg-white/60 rounded-lg">Dosage: {dose.dosage}</span>}
                        </div>
                        {dose.description && <p className="text-[10px] text-gray-400 mt-0.5 truncate italic">Instructions: {dose.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={()=>handleNudge(dose.medicine_id, dose.scheduled_time, dose.name)}
                          className="w-8 h-8 rounded-xl bg-white/70 border border-white text-[#508991] hover:text-[#004346] flex items-center justify-center cursor-pointer transition-all" title="Send reminder">
                          <Bell c="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={()=>toggleStatus(dose.medicine_id, dose.scheduled_time, dose.status, dose.name)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all border font-bold ${
                            dose.status==="taken" ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" :
                            dose.status==="missed" ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20" :
                            "bg-white/70 text-gray-400 border-white hover:border-[#004346] hover:text-[#004346]"
                          }`}>
                          {dose.status==="taken" ? <Check c="w-4 h-4"/> : dose.status==="missed" ? <X c="w-4 h-4"/> : <span className="w-2 h-2 rounded-full bg-gray-300"/>}
                        </button>
                        <button onClick={()=>{
                          const med = medicines.find(m => m.id === dose.medicine_id);
                          if (med) setEditingMedicine(med);
                        }}
                          className="w-8 h-8 rounded-xl bg-white/70 border border-white text-[#508991] hover:text-[#004346] hover:bg-[#D6F3F4] flex items-center justify-center cursor-pointer transition-all" title="Edit medicine">
                          <Edit c="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={()=>setDeleteConfirm({type:"medicine",id:dose.medicine_id,name:dose.name})}
                          className="w-8 h-8 rounded-xl bg-white/70 border border-white text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center cursor-pointer transition-all">
                          <Trash c="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4 sm:space-y-6">
              {(role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
                <button onClick={()=>setShowAdd(true)}
                  className="w-full py-4 bg-[#004346] hover:bg-[#508991] text-white rounded-3xl font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all">
                  <Plus c="w-4 h-4"/> Add Medicine
                </button>
              )}
              {(role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
                <div className="bg-[#004346] text-white p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] shadow-lg relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5"/>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5"/>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-extrabold text-[#74B3CE] uppercase tracking-wider mb-1">Today's Adherence</p>
                        <p className="text-4xl sm:text-5xl font-extrabold">{Math.round(adherence.adherence_pct||0)}%</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><TrendingUp c="w-7 h-7 text-[#74B3CE]"/></div>
                    </div>
                    <div className="w-full bg-white/15 rounded-full h-2 mb-4">
                      <div className="bg-[#74B3CE] h-2 rounded-full transition-all duration-700" style={{width:`${Math.round(adherence.adherence_pct||0)}%`}}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 rounded-2xl p-3">
                        <p className="text-xl font-extrabold text-emerald-400">{adherence.taken}</p>
                        <p className="text-[10px] text-white/60 font-semibold">Taken</p>
                      </div>
                      <div className="bg-white/10 rounded-2xl p-3">
                        <p className="text-xl font-extrabold text-rose-400">{adherence.missed}</p>
                        <p className="text-[10px] text-white/60 font-semibold">Missed</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Logged in account card */}
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Patient List</h2>
              <button onClick={()=>setShowAddPatient(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#004346] hover:bg-[#508991] text-white rounded-2xl text-xs font-extrabold transition-all shadow cursor-pointer">
                <Plus c="w-3.5 h-3.5"/> Add Patient
              </button>
            </div>
            {patientList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                <User c="w-12 h-12 text-gray-200 mb-4"/><p className="text-sm font-bold text-gray-400">No patients registered yet.</p>
                <button onClick={()=>setShowAddPatient(true)} className="mt-4 px-5 py-2.5 bg-[#004346] text-white rounded-2xl text-xs font-extrabold cursor-pointer hover:bg-[#508991] transition-all">Add First Patient</button>
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
              {medLoading && <span className="text-xs text-gray-400 animate-pulse">Refreshing...</span>}
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
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${med.low_stock?"bg-amber-50 text-amber-500":"bg-[#D6F3F4] text-[#508991]"}`}>
                          <FormIcon formulation={med.formulation} c="w-5 h-5" />
                        </div>
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
                      <span className={`px-2 py-0.5 rounded-lg ${med.low_stock?"bg-amber-50 text-amber-600":"bg-gray-50 text-gray-500"}`}>
                        {stockDisplay(med)}{med.low_stock && " — Low Stock"}
                      </span>
                      {refillDays(med) !== null && (() => {
                        const d = refillDays(med);
                        return (
                          <span className={`px-2 py-0.5 rounded-lg ${d <= 3 ? "bg-red-50 text-red-600" : d <= 7 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                            Refill in ~{d} day{d !== 1 ? "s" : ""}
                          </span>
                        );
                      })()}
                    </div>
                    {(med.start_date||med.end_date) && (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#508991] bg-[#D6F3F4]/40 px-2.5 py-1.5 rounded-xl">
                        {med.start_date&&<span>From {med.start_date}</span>}{med.end_date&&<span>to {med.end_date}</span>}
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

        {/* ════ PROGRESS TAB ════ */}
        {tab === "progress" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Medication Progress</h2>
                <p className="text-xs text-gray-400 mt-0.5">Track adherence and view your 7-day report.</p>
              </div>
              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
                <button onClick={() => setProgressSubTab("chart")}
                  className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${progressSubTab === "chart" ? "bg-white text-[#004346] shadow-sm" : "text-gray-400 hover:text-[#004346]"}`}>
                  <BarChart c="w-3.5 h-3.5"/> Chart
                </button>
                <button onClick={() => setProgressSubTab("list")}
                  className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${progressSubTab === "list" ? "bg-white text-[#004346] shadow-sm" : "text-gray-400 hover:text-[#004346]"}`}>
                  <ListIcon c="w-3.5 h-3.5"/> List
                </button>
              </div>
            </div>

            {/* Adherence Insight */}
            {(() => {
              const takenCount = history.filter(log => log.status === "taken").length;
              const totalDoses = history.length;
              const pct = totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0;
              return (
                <div className="p-4 sm:p-5 bg-white border border-[#508991]/15 text-[#004346] rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D6F3F4] flex items-center justify-center shrink-0">
                    <TrendingUp c="w-5 h-5 text-[#004346]"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-[#004346] mb-1">Overall Adherence Rate</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full transition-all duration-700 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-500"}`} style={{width:`${pct}%`}}/>
                      </div>
                      <span className={`text-sm font-extrabold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {pct >= 80 ? "Excellent adherence! Keep it up." : pct >= 50 ? "Good progress, but some doses are being missed." : "Low adherence — consider setting more reminders."}
                    </p>
                  </div>
                </div>
              );
            })()}

            {progressSubTab === "chart" ? (
              <div className="space-y-4">
                {/* Per-medicine progress bars */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-5">
                  <h3 className="text-xs font-extrabold text-[#004346] uppercase tracking-wider border-b border-gray-50 pb-3">Per-Medicine Adherence</h3>
                  {medicines.filter(m => !m.is_deleted).length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <TabletIcon c="w-10 h-10 text-gray-200 mb-3"/>
                      <p className="text-sm font-bold text-gray-400">No medicines to track.</p>
                    </div>
                  ) : medicines.filter(m => !m.is_deleted).map(med => {
                    const medLogs = history.filter(log => log.medicine_id === med.id);
                    const taken = medLogs.filter(l => l.status === "taken").length;
                    const total = medLogs.length;
                    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
                    return (
                      <div key={med.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center shrink-0">
                              <FormIcon formulation={med.formulation} c="w-4 h-4"/>
                            </div>
                            <div>
                              <p className="font-extrabold text-[#004346] text-sm">{med.name}</p>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase">{med.category} — {taken}/{total} doses taken</p>
                            </div>
                          </div>
                          <span className={`text-sm font-extrabold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all duration-700 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-500"}`} style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 7-Day Grid */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-5">
                  <h3 className="text-xs font-extrabold text-[#004346] uppercase tracking-wider border-b border-gray-50 pb-3">7-Day Tracker</h3>
                  {medicines.filter(m => !m.is_deleted).length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <TabletIcon c="w-10 h-10 text-gray-200 mb-3"/>
                      <p className="text-sm font-bold text-gray-400">No active medicines to track.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 divide-y divide-gray-100">
                      {medicines.filter(m => !m.is_deleted).map((med, idx) => (
                        <div key={med.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${idx > 0 ? "pt-6" : ""}`}>
                          <div className="flex items-center gap-3 md:min-w-[180px]">
                            <div className="w-10 h-10 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center shrink-0">
                              <FormIcon formulation={med.formulation} c="w-5 h-5"/>
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[#004346] text-sm">{med.name}</h4>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase">{med.category} • {med.schedules?.length || 0}x daily</p>
                            </div>
                          </div>
                          <div className="flex justify-between md:justify-end gap-2 sm:gap-3 overflow-x-auto py-1">
                            {last7Days.map(day => {
                              const status = getDayStatusForMed(med.id, day.dateStr);
                              return (
                                <div key={day.dateStr} className="flex flex-col items-center gap-1 shrink-0">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{day.dayName}</span>
                                  <span className="text-[8px] font-extrabold text-gray-300">{day.dateNum}</span>
                                  <button
                                    onClick={() => toggleHistoryStatus({ medicine_id: med.id, log_date: day.dateStr, scheduled_time: med.schedules?.[0] || "08:00 am", status, medicine_name: med.name })}
                                    title={`${med.name} on ${day.dateStr}: ${status}`}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                      status === "taken" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" :
                                      status === "missed" ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" :
                                      "border-2 border-dashed border-gray-200 bg-gray-50 text-gray-300 hover:bg-gray-100"
                                    }`}>
                                    {status === "taken" ? <Check c="w-4 h-4" /> :
                                     status === "missed" ? <X c="w-4 h-4" /> :
                                     <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Progress list — summary per medicine */
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {medicines.filter(m => !m.is_deleted).length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <PillIcon c="w-12 h-12 text-gray-200 mb-4"/>
                    <p className="text-sm font-bold text-gray-400">No medicines to display.</p>
                  </div>
                ) : medicines.filter(m => !m.is_deleted).map((med, idx) => {
                  const medLogs = history.filter(log => log.medicine_id === med.id);
                  const taken   = medLogs.filter(l => l.status === "taken").length;
                  const missed  = medLogs.filter(l => l.status === "missed").length;
                  const pending = medLogs.filter(l => l.status === "pending").length;
                  const total   = medLogs.length;
                  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
                  return (
                    <div key={med.id} className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                      <div className="flex items-center gap-3 sm:min-w-[200px]">
                        <div className="w-10 h-10 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center shrink-0">
                          <FormIcon formulation={med.formulation} c="w-5 h-5"/>
                        </div>
                        <div>
                          <p className="font-extrabold text-[#004346] text-sm">{med.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">{med.category}</p>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                          <p className="text-sm font-extrabold text-emerald-700">{taken}</p>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase">Taken</p>
                        </div>
                        <div className="p-2 bg-rose-50 rounded-xl">
                          <p className="text-sm font-extrabold text-rose-700">{missed}</p>
                          <p className="text-[9px] font-bold text-rose-500 uppercase">Missed</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                          <p className="text-sm font-extrabold text-gray-600">{pending}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Pending</p>
                        </div>
                        <div className="hidden sm:block p-2 bg-[#D6F3F4] rounded-xl">
                          <p className={`text-sm font-extrabold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</p>
                          <p className="text-[9px] font-bold text-[#508991] uppercase">Adherence</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ HISTORY TAB ════ */}
        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Medication History</h2>
                <p className="text-xs text-gray-400 mt-0.5">Complete log of all taken, missed and pending doses.</p>
              </div>
              {histLoading && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
            </div>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                <Clock c="w-12 h-12 text-gray-200 mb-4"/><p className="text-sm font-bold text-gray-400">No history records yet.</p>
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
                          <button
                            onClick={() => toggleHistoryStatus(log)}
                            title="Click to toggle status"
                            className={`cursor-pointer text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full transition-all hover:opacity-70 ${
                              log.status === "taken" ? "bg-emerald-100 text-emerald-700" :
                              log.status === "missed" ? "bg-red-100 text-red-600" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                            {log.status}
                          </button>
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
                <div><label className="label">Phone</label><input type="tel" pattern="[0-9]{10}" title="Please enter a 10 digit phone number" className={inp} value={profileForm.phone} onChange={e=>setProfileForm({...profileForm,phone:e.target.value})} placeholder="Enter your 10 digit number"/></div>
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
            <button onClick={()=>setToast(null)} className="ml-2 opacity-60 hover:opacity-100 cursor-pointer shrink-0"><X c="w-3.5 h-3.5"/></button>
          </div>
        </div>
      )}
    </div>
  );
}
