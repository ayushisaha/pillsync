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
    return `${daysLeft} day(s) supply — ${dosesPerDay}x daily ├ù ${doseSize} ${unit}/dose`;
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
    blood_group: patient?.blood_group || "",
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
        blood_group: form.blood_group || null,
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
          <div><label className="label">Blood Group</label>
            <input value={form.blood_group} onChange={e=>setForm({...form,blood_group:e.target.value})} className="input" placeholder="e.g. O+, A-"/></div>
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
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"", gender:"female", age:"", weight:"", height:"", blood_group:"" });
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
        blood_group: form.blood_group || null,
      });
      const newPatientId = res.data?.user?.id;
      // Auto-link new patient to this caregiver
      if (newPatientId && token) {
        try {
          await axios.post(`${API}/users/patients/link/${newPatientId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch {}
      }
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
              <div className="col-span-2"><label className="label">Blood Group</label>
                <input autoComplete="off" value={form.blood_group} onChange={e=>setForm({...form,blood_group:e.target.value})} className="input text-xs" placeholder="e.g. O+, A-"/></div>
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

// ─── Delete Account Warning Modal ─────────────────────────
function DeleteAccountModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_.2s_ease]">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5"/></button>
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertIcon c="w-6 h-6"/>
        </div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">Delete Your Account?</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          This will <strong className="text-rose-600">permanently delete your profile</strong>, all scheduled medicines, adherence progress, and intake history. This action <strong className="text-rose-600">CANNOT</strong> be undone.
        </p>
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-800 mb-5 flex items-center gap-2">
          <Trash c="w-4 h-4 text-rose-600 shrink-0"/>
          <span>Warning: All stored medicines and health records will be lost immediately.</span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm cursor-pointer transition-all">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer transition-all shadow-md shadow-rose-600/30">
            {loading ? "Deleting..." : "Yes, Delete Account"}
          </button>
        </div>
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

// ─── Patients Tab (Search + Link + Unlink + Delete) ───────
function PatientsTab({ role, token, patientList, loadPatients, selectedPatientId, setSelectedPatientId, goTo, showToast, addNotif, setShowAddPatient, setEditingPatient, setDeleteConfirm }) {
  const [searchQ,             setSearchQ]             = useState("");
  const [searchResults,       setSearchResults]       = useState([]);
  const [searching,           setSearching]           = useState(false);
  const [showSearch,          setShowSearch]          = useState(false);
  const [localPatientSearch,  setLocalPatientSearch]  = useState("");

  const doSearch = async (q) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`${API}/users/patients/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
      setSearchResults(res.data);
    } catch {} finally { setSearching(false); }
  };

  const handleLink = async (patientId, patientName) => {
    try {
      await axios.post(`${API}/users/patients/link/${patientId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`${patientName} linked to your patients!`);
      addNotif(`Patient "${patientName}" linked to your care list.`, "success", "Patient Linked");
      loadPatients();
      // Refresh search results to update is_linked flag
      if (searchQ.trim()) doSearch(searchQ);
    } catch (err) { showToast(err.response?.data?.detail || "Failed to link", "error"); }
  };

  const handleUnlink = async (patientId, patientName) => {
    try {
      await axios.delete(`${API}/users/patients/unlink/${patientId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`${patientName} unlinked from your patients.`);
      addNotif(`Patient "${patientName}" removed from your care list.`, "info");
      loadPatients();
      if (searchQ.trim()) doSearch(searchQ);
    } catch (err) { showToast(err.response?.data?.detail || "Failed to unlink", "error"); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Patient List</h2>
        <div className="flex items-center gap-2">
          {/* Only caregivers use Find & Link — admin sees all patients by default */}
          {role === "caregiver" && (
            <button onClick={() => setShowSearch(s => !s)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow cursor-pointer border ${showSearch ? "bg-[#004346] text-white border-[#004346]" : "bg-white text-[#004346] border-gray-200 hover:border-[#508991]"}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              {showSearch ? "Hide Search" : "Find & Link Patient"}
            </button>
          )}
          <button onClick={() => setShowAddPatient(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#004346] hover:bg-[#508991] text-white rounded-2xl text-xs font-extrabold transition-all shadow cursor-pointer">
            <Plus c="w-3.5 h-3.5"/> Add Patient
          </button>
        </div>
      </div>

      {/* Search Panel (Caregiver only — admin already sees all) */}
      {role === "caregiver" && showSearch && (
        <div className="bg-white rounded-2xl border border-[#508991]/30 shadow-sm p-4 sm:p-5 space-y-3">
          <p className="text-xs font-extrabold text-[#004346] uppercase tracking-wide">Search & Link Existing Patient</p>
          <div className="relative">
            <input
              value={searchQ}
              onChange={e => doSearch(e.target.value)}
              placeholder="Type patient name or email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 outline-none focus:border-[#508991] bg-gray-50 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 animate-pulse">Searching...</span>}
          </div>
          {searchQ.trim() && searchResults.length === 0 && !searching && (
            <p className="text-xs text-gray-400 font-semibold text-center py-3">No patients found for "{searchQ}"</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(pt => (
                <div key={pt.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#508991]/30 transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-extrabold text-sm uppercase shrink-0">{pt.name?.slice(0,1)}</div>
                    <div>
                      <p className="font-bold text-[#004346] text-sm">{pt.name}</p>
                      <p className="text-[10px] text-gray-400">{pt.email}</p>
                    </div>
                  </div>
                  {pt.is_linked ? (
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-extrabold rounded-xl border border-emerald-100">Linked</span>
                  ) : (
                    <button onClick={() => handleLink(pt.id, pt.name)}
                      className="px-3 py-1.5 bg-[#004346] text-white text-xs font-extrabold rounded-xl hover:bg-[#508991] transition-all cursor-pointer shadow-sm">
                      + Link
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patient Search Bar (Admin & Caregiver) */}
      <div className="relative mb-3">
        <div className="flex items-center bg-white border-2 border-gray-100 focus-within:border-[#508991] rounded-2xl px-4 py-2.5 shadow-sm transition-all">
          <svg className="w-4 h-4 text-gray-400 shrink-0 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            value={localPatientSearch}
            onChange={e => setLocalPatientSearch(e.target.value)}
            placeholder={role === "admin" ? "Search patient list by name or email..." : "Search your linked patients..."}
            className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none placeholder:text-gray-400"
          />
          {localPatientSearch && (
            <button onClick={() => setLocalPatientSearch("")} className="text-gray-400 hover:text-gray-600 cursor-pointer ml-2">
              <X c="w-4 h-4"/>
            </button>
          )}
        </div>
      </div>

      {/* My Patients List */}
      {role === "admin" && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-semibold text-blue-700 mb-3">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Admin view: showing all registered patients. Use Edit to update vitals, Delete to remove an account.
        </div>
      )}
      {(() => {
        const displayList = localPatientSearch.trim()
          ? patientList.filter(p => (p.name||'').toLowerCase().includes(localPatientSearch.toLowerCase()) || (p.email||'').toLowerCase().includes(localPatientSearch.toLowerCase()))
          : patientList;
        return displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
            <User c="w-12 h-12 text-gray-200 mb-4"/>
            <p className="text-sm font-bold text-gray-400">{localPatientSearch ? `No patients match "${localPatientSearch}"` : role === "caregiver" ? "No linked patients yet." : "No patients registered yet."}</p>
            <p className="text-xs text-gray-300 mt-1">{role === "caregiver" && !localPatientSearch ? "Use \"Find & Link Patient\" to add existing patients, or create a new one." : ""}</p>
            {!localPatientSearch && <button onClick={() => setShowAddPatient(true)} className="mt-4 px-5 py-2.5 bg-[#004346] text-white rounded-2xl text-xs font-extrabold cursor-pointer hover:bg-[#508991] transition-all">Add Patient</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {displayList.map(pt => (
            <div key={pt.id} className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-extrabold uppercase">{pt.name.slice(0,1)}</div>
                  <div><h3 className="font-extrabold text-[#004346] text-sm">{pt.name}</h3><p className="text-xs text-gray-400">{pt.email}</p></div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <button onClick={() => { setSelectedPatientId(pt.id); goTo("overview"); showToast(`Switched to ${pt.name}`); }}
                    className="px-3 py-1.5 bg-[#004346] hover:bg-[#508991] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">Select</button>
                  <button onClick={() => setEditingPatient(pt)}
                    className="w-8 h-8 rounded-xl bg-teal-50 text-[#004346] hover:bg-teal-600 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-teal-100" title="Edit patient"><Edit c="w-3.5 h-3.5"/></button>
                  {/* Unlink only for Caregivers — admin sees all patients without linking */}
                  {role === "caregiver" && (
                    <button onClick={() => handleUnlink(pt.id, pt.name)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white text-[10px] font-extrabold transition-all cursor-pointer border border-amber-100" title="Remove from your care list (patient account preserved)">
                      Unlink
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirm({type:"patient",id:pt.id,name:pt.name})}
                    className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-red-100" title="Delete patient account"><Trash c="w-3.5 h-3.5"/></button>
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
        );
      })()}
    </div>
  );
}


// ─── Caregiver List Tab (Admin Only) ──────────────────────
function CaregiverListTab({ token, showToast, addNotif, setEditingPatient }) {
  const [caregivers,    setCaregivers]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQ,       setSearchQ]       = useState("");
  const [deleteId,      setDeleteId]      = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadCaregivers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/caregivers`, { headers: { Authorization: `Bearer ${token}` } });
      setCaregivers(res.data);
    } catch {
      showToast("Failed to load caregivers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCaregivers(); }, []);

  const handleDelete = async (cgId, cgName) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/users/caregivers/${cgId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`${cgName}'s account deleted.`);
      addNotif(`Caregiver "${cgName}" account removed.`, "info");
      setCaregivers(prev => prev.filter(c => c.id !== cgId));
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to delete", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const filtered = caregivers.filter(cg => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return (cg.name||'').toLowerCase().includes(q) || (cg.email||'').toLowerCase().includes(q) || (cg.phone||'').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Caregiver List</h2>
          <p className="text-xs text-gray-400 mt-0.5">All registered caregivers and their assigned patients.</p>
        </div>
        <span className="px-3 py-1.5 bg-[#D6F3F4] text-[#004346] text-[10px] font-extrabold rounded-xl uppercase tracking-wide">
          {caregivers.length} Caregiver{caregivers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center bg-white border-2 border-gray-100 focus-within:border-[#508991] rounded-2xl px-4 py-2.5 shadow-sm transition-all">
          <svg className="w-4 h-4 text-gray-400 shrink-0 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search caregiver by name, email or phone..."
            className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none placeholder:text-gray-400"
          />
          {searchQ && (
            <button onClick={() => setSearchQ("")} className="text-gray-400 hover:text-gray-600 cursor-pointer ml-2">
              <X c="w-4 h-4"/>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#D6F3F4] border-t-[#004346] rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
          <User c="w-12 h-12 text-gray-200 mb-4"/>
          <p className="text-sm font-bold text-gray-400">{searchQ ? `No caregivers match "${searchQ}"` : "No caregivers registered yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(cg => (
            <div key={cg.id} className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#004346] to-[#508991] text-white font-extrabold text-base flex items-center justify-center uppercase shadow">
                    {cg.name?.slice(0,1)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#004346] text-sm">{cg.name}</h3>
                    <p className="text-xs text-gray-400">{cg.email}</p>
                    {cg.phone && <p className="text-xs text-gray-400">{cg.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditingPatient({...cg, _isCaregiverEdit: true})}
                    className="w-8 h-8 rounded-xl bg-teal-50 text-[#004346] hover:bg-teal-600 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-teal-100" title="Edit caregiver">
                    <Edit c="w-3.5 h-3.5"/>
                  </button>
                  {deleteId === cg.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(cg.id, cg.name)} disabled={deleteLoading}
                        className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-extrabold cursor-pointer">
                        {deleteLoading ? "..." : "Confirm"}
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-extrabold cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(cg.id)}
                      className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-red-100" title="Delete caregiver account">
                      <Trash c="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              </div>

              {/* Linked Patients Badge List */}
              <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Assigned / Linked Patients ({cg.linked_patients?.length || 0})</p>
                {cg.linked_patients?.length === 0 ? (
                  <p className="text-xs text-gray-400 font-semibold italic">No patients linked yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cg.linked_patients.map(pt => (
                      <span key={pt.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#D6F3F4] text-[#004346] text-xs font-extrabold border border-[#508991]/15">
                        <User c="w-3 h-3 text-[#508991]"/>{pt.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── OCR Upload & AI Prescription Parser Modal (Multi-Medicine) ────────────
function OcrUploadModal({ onClose, onSave, token, patientId, showToast, addNotif }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extractedList, setExtractedList] = useState(null);
  const [rawText, setRawText] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError("");
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleScan = async () => {
    if (!file) { setError("Please select a prescription photo or document"); return; }
    setScanning(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/medicines/upload-ocr`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      const list = res.data?.medicines || [];
      setRawText(res.data?.raw_text || "");

      const formatted = list.map((m, idx) => ({
        id: idx + 1,
        name: m.name || `Medicine ${idx + 1}`,
        dosage: m.dosage || "1 tablet",
        category: m.category || m.disease_name || "Other",
        disease_name: m.disease_name || m.category || "",
        stock: m.stock ? String(m.stock) : "10",
        formulation: m.formulation || "tablet",
        start_date: m.start_date || todayStr(),
        end_date: m.end_date || "",
        times_per_day: m.times_per_day || (m.times ? m.times.length : 1),
        times: m.times && m.times.length ? m.times : ["08:00 am"],
        instructions: m.instructions || ""
      }));

      if (formatted.length === 0) {
        formatted.push({
          id: 1, name: "", dosage: "1 tablet", category: "Other", disease_name: "", stock: "10", formulation: "tablet", start_date: todayStr(), end_date: "", times_per_day: 1, times: ["08:00 am"], instructions: ""
        });
      }

      setExtractedList(formatted);
      showToast(`Prescription analyzed! Found ${formatted.length} medication(s).`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to scan prescription image");
    } finally {
      setScanning(false);
    }
  };

  const updateMedicine = (index, key, val) => {
    setExtractedList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const removeMedicine = index => {
    setExtractedList(prev => prev.filter((_, i) => i !== index));
  };

  const addEmptyMedicine = () => {
    setExtractedList(prev => [
      ...prev,
      { id: Date.now(), name: "", dosage: "1 tablet", category: "Other", disease_name: "", stock: "10", formulation: "tablet", start_date: todayStr(), end_date: "", times_per_day: 1, times: ["08:00 am"], instructions: "" }
    ]);
    setEditingIdx(extractedList ? extractedList.length : 0);
  };

  const handleSaveAll = async () => {
    if (!extractedList || extractedList.length === 0) { setError("No medicines to save"); return; }
    const invalid = extractedList.find(m => !m.name.trim());
    if (invalid) { setError("All medicines must have a name"); return; }

    setSaving(true);
    setError("");
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      let count = 0;

      for (const item of extractedList) {
        const payload = {
          name: item.name.trim(),
          dosage: item.dosage,
          category: item.category || item.disease_name || "Other",
          stock: parseInt(item.stock) || 10,
          formulation: item.formulation || "tablet",
          schedules: item.times.length ? item.times : ["08:00 am"],
          start_date: item.start_date || todayStr(),
          end_date: item.end_date || null,
          description: item.instructions || null
        };
        const res = await axios.post(`${API}/medicines${q}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (onSave) onSave(res.data);
        count++;
      }

      addNotif(`Added ${count} medication(s) from prescription scan.`, "success");
      showToast(`Successfully added ${count} medication(s)`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save prescription medicines");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"><X c="w-3.5 h-3.5"/></button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#004346]">Prescription OCR Multi-Scan</h2>
            <p className="text-xs text-gray-400">Scans all medicines in your prescription image at once</p>
          </div>
        </div>

        {error && (
          <div className="my-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertIcon c="w-4 h-4"/>{error}
          </div>
        )}

        {!extractedList ? (
          <div className="space-y-4 my-6">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#508991] transition-all bg-gray-50/50">
              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="Prescription Preview" className="max-h-52 mx-auto rounded-xl shadow-sm border border-gray-200 object-contain"/>
                  <p className="text-xs font-bold text-gray-500">{file?.name}</p>
                </div>
              ) : (
                <div className="space-y-2 py-6">
                  <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <p className="text-xs font-bold text-[#004346]">Upload prescription photo to extract all medicines</p>
                  <p className="text-[10px] text-gray-400">Supports JPG, PNG, JPEG formats</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#004346] file:text-white hover:file:bg-[#508991] cursor-pointer"/>
            </div>

            <button onClick={handleScan} disabled={!file || scanning}
              className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${!file || scanning ? "bg-gray-300" : "bg-[#004346] hover:bg-[#508991]"}`}>
              {scanning ? "Extracting all the medicines..." : "Scan & Extract All Medicines"}
            </button>
          </div>
        ) : (
          <div className="space-y-4 my-4">
            <div className="flex items-center justify-between p-3.5 bg-teal-50 border border-teal-100 rounded-2xl">
              <div className="flex items-center gap-2">
                <Check c="w-4 h-4 text-teal-600"/>
                <span className="text-xs font-bold text-[#004346]">Extracted {extractedList.length} medicine(s) from prescription. Edit any item below:</span>
              </div>
              <button type="button" onClick={addEmptyMedicine}
                className="px-3 py-1.5 rounded-xl bg-[#004346] text-white text-xs font-bold hover:bg-[#508991] transition-all cursor-pointer">
                + Add Medicine
              </button>
            </div>

            {/* List of extracted medicines */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {extractedList.map((item, idx) => (
                <div key={item.id || idx} className="p-4 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#004346] uppercase">Medicine #{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#D6F3F4] text-[#004346] text-[10px] font-extrabold uppercase">{item.formulation}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-teal-200 text-[#004346] hover:bg-teal-50 cursor-pointer">
                        {editingIdx === idx ? "Collapse" : "Edit"}
                      </button>
                      {extractedList.length > 1 && (
                        <button type="button" onClick={() => removeMedicine(idx)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer">
                          <Trash c="w-4 h-4"/>
                        </button>
                      )}
                    </div>
                  </div>

                  {editingIdx === idx ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="label">Medicine Name *</label>
                        <input value={item.name} onChange={e => updateMedicine(idx, "name", e.target.value)} className="input" placeholder="e.g. Stil CV 500mg" required/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Dosage</label>
                          <input value={item.dosage} onChange={e => updateMedicine(idx, "dosage", e.target.value)} className="input" placeholder="e.g. 1 tablet twice daily"/>
                        </div>
                        <div>
                          <label className="label">Disease / Category</label>
                          <input value={item.category} onChange={e => updateMedicine(idx, "category", e.target.value)} className="input" placeholder="e.g. Otitis Externa Left"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label">Medicine Form</label>
                          <select value={item.formulation} onChange={e => updateMedicine(idx, "formulation", e.target.value)} className="input">
                            <option value="tablet">Tablet</option>
                            <option value="capsule">Capsule</option>
                            <option value="liquid">Liquid</option>
                            <option value="ointment">Ointment</option>
                            <option value="injection">Injection</option>
                            <option value="drops">Drops</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Start Date</label>
                          <input type="date" value={item.start_date} onChange={e => updateMedicine(idx, "start_date", e.target.value)} className="input"/>
                        </div>
                        <div>
                          <label className="label">End Date</label>
                          <input type="date" value={item.end_date} onChange={e => updateMedicine(idx, "end_date", e.target.value)} className="input"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Stock Count</label>
                          <input type="number" min="0" value={item.stock} onChange={e => updateMedicine(idx, "stock", e.target.value)} className="input" placeholder="10"/>
                        </div>
                        <div>
                          <label className="label">Times Per Day</label>
                          <input type="number" min="1" max="6" value={item.times_per_day} onChange={e => updateMedicine(idx, "times_per_day", e.target.value)} className="input"/>
                        </div>
                      </div>
                      <div>
                        <label className="label">Reminder Times (comma separated)</label>
                        <input value={item.times.join(", ")} onChange={e => updateMedicine(idx, "times", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} className="input" placeholder="08:00 am, 08:00 pm"/>
                      </div>
                      <div>
                        <label className="label">Instructions / Notes</label>
                        <input value={item.instructions} onChange={e => updateMedicine(idx, "instructions", e.target.value)} className="input" placeholder="e.g. Take BD/PC after food"/>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-gray-700">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div><span className="text-gray-400 font-medium">Name:</span> <span className="font-extrabold text-[#004346]">{item.name || "—"}</span></div>
                        <div><span className="text-gray-400 font-medium">Dosage:</span> <span className="font-bold text-gray-800">{item.dosage || "1 tablet"}</span></div>
                        <div><span className="text-gray-400 font-medium">Disease / Category:</span> <span className="font-bold text-[#508991]">{item.category || "Other"}</span></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-100 text-[11px]">
                        <div><span className="text-gray-400">Start Date:</span> <span className="font-semibold text-gray-800">{item.start_date || "Today"}</span></div>
                        <div><span className="text-gray-400">End Date:</span> <span className="font-semibold text-gray-800">{item.end_date || "N/A"}</span></div>
                        <div><span className="text-gray-400">Frequency:</span> <span className="font-bold text-gray-800">{item.times_per_day || item.times.length}x daily</span></div>
                        <div><span className="text-gray-400">Stock:</span> <span className="font-extrabold text-[#004346]">{item.stock} units</span></div>
                      </div>
                      <div className="pt-1 border-t border-gray-100 text-[11px] flex flex-wrap items-center gap-3">
                        <div><span className="text-gray-400">Reminder Times:</span> <span className="font-bold text-[#004346] bg-teal-50 px-2 py-0.5 rounded-md">{item.times.join(", ")}</span></div>
                        {item.instructions && <div><span className="text-gray-400">Instructions:</span> <span className="font-medium text-gray-700 italic">{item.instructions}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {rawText && (
              <div>
                <label className="label">Raw Prescription OCR Output</label>
                <p className="text-[10px] text-gray-500 font-mono bg-gray-50 p-2.5 rounded-xl border border-gray-100 max-h-20 overflow-y-auto whitespace-pre-wrap">{rawText}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-3">
              <button type="button" onClick={() => setExtractedList(null)} className="py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer">
                Rescan Image
              </button>
              <button type="button" onClick={handleSaveAll} disabled={saving}
                className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs cursor-pointer transition-all ${saving ? "bg-[#508991]" : "bg-[#004346] hover:bg-[#508991]"}`}>
                {saving ? "Saving All Medicines..." : `Save All ${extractedList.length} Medicine(s) to Schedule`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Refill Prediction Engine ─────────────────────────
function RefillPredictionWidget({ token, patientId, showToast, loadMedicines }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refillingId, setRefillingId] = useState(null);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      const res = await axios.get(`${API}/medicines/refill-predictions${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPredictions(res.data.predictions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPredictions(); }, [patientId]);

  const handleRefillStock = async (medId, medName) => {
    setRefillingId(medId);
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      await axios.patch(`${API}/medicines/${medId}${q}`, { stock: 30 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Stock refilled for ${medName} (+30 units)`);
      fetchPredictions();
      if (loadMedicines) loadMedicines();
    } catch {
      showToast("Failed to update stock", "error");
    } finally {
      setRefillingId(null);
    }
  };

  if (loading) return null;
  if (predictions.length === 0) return null;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-[#004346] flex items-center gap-2">
            AI Refill Prediction Engine
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Automated stock depletion forecasts and recommended refill schedules</p>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 rounded-xl bg-[#D6F3F4] text-[#004346] text-xs font-extrabold uppercase">
          AI Active
        </span>
      </div>

      {/* Horizontal Multi-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map(p => (
          <div key={p.medicine_id} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            p.status === "out_of_stock" || p.status === "critical" ? "bg-rose-50/70 border-rose-200" :
            p.status === "refill_recommended" ? "bg-amber-50/70 border-amber-200" : "bg-gray-50/70 border-gray-100"
          }`}>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-extrabold text-sm text-[#004346]">{p.medicine_name}</p>
                    {p.formulation && <span className="px-1.5 py-0.5 rounded-md bg-[#D6F3F4] text-[#004346] text-[9px] font-extrabold uppercase">{p.formulation}</span>}
                  </div>
                  <p className="text-[11px] text-[#508991] font-semibold mt-0.5">{p.category}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase whitespace-nowrap ${
                  p.status === "out_of_stock" || p.status === "critical" ? "bg-rose-600 text-white shadow-xs" :
                  p.status === "refill_recommended" ? "bg-amber-600 text-white shadow-xs" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {p.status_label}
                </span>
              </div>

              <div className="space-y-1 text-xs font-medium text-gray-600 border-t border-gray-200/50 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Current Stock:</span>
                  <span className="font-extrabold text-[#004346] text-xs">{p.current_stock} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Est. Depletion:</span>
                  <span className="font-extrabold text-gray-800 text-xs">{p.depletion_date.includes('(') || p.depletion_date.includes('Depleted') ? p.depletion_date : `${p.depletion_date} (${p.days_remaining}d left)`}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Recommended Refill:</span>
                  <span className={`font-extrabold text-xs ${p.recommended_refill_date.includes('Immediate') ? 'text-rose-600 font-black' : 'text-[#508991]'}`}>{p.recommended_refill_date}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden my-2">
                <div className={`h-full rounded-full transition-all ${
                  p.days_remaining <= 2 ? "bg-rose-600" : p.days_remaining <= 5 ? "bg-amber-500" : "bg-[#004346]"
                }`} style={{ width: `${Math.min(100, (p.current_stock / 30) * 100)}%` }}/>
              </div>
            </div>

            <button onClick={() => handleRefillStock(p.medicine_id, p.medicine_name)} disabled={refillingId === p.medicine_id}
              className="w-full mt-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-[#004346] text-[#004346] font-extrabold text-xs transition-all shadow-xs cursor-pointer">
              {refillingId === p.medicine_id ? "Updating..." : "Refill Stock (+30 units)"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Medication Adherence Analytics Component ─────────────
function AdherenceAnalytics({ token, patientId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      const res = await axios.get(`${API}/analytics/adherence-reports${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, [patientId]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base text-[#004346]">Medication Adherence Analytics</h3>
          <p className="text-xs text-gray-400">7-day adherence trends and dosage consistency score</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[#D6F3F4] text-[#004346] text-xs font-extrabold uppercase">
            Score: {data.overall_pct}% ({data.consistency_grade})
          </span>
        </div>
      </div>

      {/* 7-Day Trend Bar Chart */}
      <div>
        <p className="text-xs font-extrabold text-[#004346] uppercase tracking-wider mb-3">7-Day Adherence Trend</p>
        <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4 border-b border-gray-100 pb-2">
          {data.weekly_trend.map(item => (
            <div key={item.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-extrabold text-[#004346]">{item.adherence_pct}%</span>
              <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: "70px" }}>
                <div className="bg-gradient-to-t from-[#004346] to-[#508991] w-full rounded-t-lg transition-all"
                  style={{ height: `${item.adherence_pct}%` }}/>
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">{item.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center border-t border-gray-50 pt-3">
        <div className="p-3 bg-gray-50/70 rounded-2xl">
          <p className="text-xl font-extrabold text-[#004346]">{data.total_taken}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Total Taken</p>
        </div>
        <div className="p-3 bg-gray-50/70 rounded-2xl">
          <p className="text-xl font-extrabold text-emerald-700">{data.overall_pct}%</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Adherence Score</p>
        </div>
        <div className="p-3 bg-gray-50/70 rounded-2xl">
          <p className="text-xl font-extrabold text-[#508991]">{data.consistency_grade}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Consistency</p>
        </div>
      </div>
    </div>
  );
}


// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
//  MAIN DASHBOARD
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
export default function Dashboard() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const role = user?.role || "patient";

  const [tab,        setTab]        = useState(() => localStorage.getItem("pillsync_active_tab") || "overview");
  const [tabHistory, setTabHistory] = useState([localStorage.getItem("pillsync_active_tab") || "overview"]);
  const goTo = t => { setTab(t); setTabHistory(h => [...h, t]); localStorage.setItem("pillsync_active_tab", t); };
  const goBack = () => {
    if (tabHistory.length <= 1) return;
    const h = tabHistory.slice(0, -1);
    setTabHistory(h); setTab(h[h.length - 1]);
  };
  const canGoBack = tabHistory.length > 1;

  const [showAdd,          setShowAdd]          = useState(false);
  const [showOcrModal,     setShowOcrModal]     = useState(false);
  const [showAddPatient,   setShowAddPatient]   = useState(false);
  const [editingMedicine,  setEditingMedicine]  = useState(null);
  const [editingPatient,   setEditingPatient]   = useState(null);
  const [deleteConfirm,           setDeleteConfirm]           = useState(null);
  const [showDeleteAccountModal,  setShowDeleteAccountModal]  = useState(false);
  const [deleteAccountLoading,    setDeleteAccountLoading]    = useState(false);
  const [progressSubTab,          setProgressSubTab]          = useState("chart");
  const [globalMedSearch,         setGlobalMedSearch]         = useState("");
  const [searchDropdownOpen,      setSearchDropdownOpen]      = useState(false);

  // AI Assistant states
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // Emergency Contacts state persisted in localStorage
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    try {
      const saved = localStorage.getItem("pillsync_emergency_contacts");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("pillsync_emergency_contacts", JSON.stringify(emergencyContacts));
  }, [emergencyContacts]);

  // Floating AI Chatbot auto-scroll ref and effect
  const floatingChatEndRef = useRef(null);
  useEffect(() => {
    if (aiChatOpen && floatingChatEndRef.current) {
      floatingChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, aiChatOpen]);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dateInput,    setDateInput]    = useState(todayStr());
  const [calOffset,    setCalOffset]    = useState(0);

  const [patientList,       setPatientList]       = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [medicines,   setMedicines]   = useState([]);
  const [medSearch,   setMedSearch]   = useState("");
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
    blood_group: user?.blood_group||"",
  });
  const [pwForm,      setPwForm]      = useState({ old_password:"", new_password:"", confirm_password:"" });
  const [profLoading, setProfLoading] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  const handleDeleteOwnAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      await axios.delete(`${API}/users/account`, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Your account has been deleted.", "info");
      logout("/login");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to delete account", "error");
    } finally {
      setDeleteAccountLoading(false);
      setShowDeleteAccountModal(false);
    }
  };

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
      blood_group: user.blood_group||"",
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

  const exportToCSV = () => {
    if (history.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    const headers = ["Medicine", "Date", "Scheduled Time", "Status", "Logged At"];
    const rows = history.map(log => [
      log.medicine_name || "—",
      log.log_date || log.taken_at?.slice(0, 10) || "—",
      log.scheduled_time || "—",
      log.status || "—",
      log.taken_at || "—"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pillsync_adherence_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Report exported as CSV!");
  };

  const exportToPDF = () => {
    if (history.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocked! Please allow pop-ups to export reports.", "error");
      return;
    }
    
    const patientName = vitalsPatient?.name || user?.name || "Patient";
    const patientEmail = vitalsPatient?.email || user?.email || "—";
    
    const total = history.length;
    const taken = history.filter(h => h.status === "taken").length;
    const missed = history.filter(h => h.status === "missed").length;
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

    const rowsHtml = history.map(log => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.medicine_name || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.log_date || log.taken_at?.slice(0, 10) || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.scheduled_time || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: ${log.status === "taken" ? "#065f46" : "#991b1b"};">${log.status || "—"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${log.taken_at || "—"}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>PillSync Medication Adherence Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #172a3a; margin: 40px; line-height: 1.5; }
            h1 { color: #004346; margin-bottom: 5px; }
            h2 { color: #508991; font-size: 16px; margin-top: 0; margin-bottom: 25px; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-card { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px 10px; background: #004346; color: white; font-size: 11px; text-transform: uppercase; }
            .badge { display: inline-block; padding: 12px 20px; background: #d6f3f4; color: #004346; border-radius: 12px; font-weight: bold; font-size: 16px; margin-bottom: 25px; border: 1px solid #508991/20; }
          </style>
        </head>
        <body>
          <h1>PillSync Adherence Report</h1>
          <h2>Generated on ${new Date().toLocaleDateString()}</h2>
          
          <div class="info-grid">
            <div class="info-card">
              <strong>Patient Details</strong><br/>
              Name: ${patientName}<br/>
              Email: ${patientEmail}<br/>
              Blood Group: ${vitalsPatient?.blood_group || "—"}
            </div>
            <div class="info-card">
              <strong>Report Summary</strong><br/>
              Total Logged Doses: ${total}<br/>
              Taken Doses: ${taken}<br/>
              Missed Doses: ${missed}
            </div>
          </div>
          
          <div class="badge">
            Overall Adherence Rate: ${pct}%
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Scheduled Date</th>
                <th>Scheduled Time</th>
                <th>Status</th>
                <th>Logged At</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
        payload.blood_group = profileForm.blood_group || null;
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
      {showOcrModal && (
        <OcrUploadModal
          token={token}
          patientId={effectivePatientId}
          onClose={() => setShowOcrModal(false)}
          onSave={(med) => { loadSchedule(); showToast("Medicine added via OCR scan!"); addNotif(`"${med?.name||"Medicine"}" added via prescription scan.`, "success", "OCR Scan"); }}
          showToast={showToast}
          addNotif={addNotif}
        />
      )}
      {editingMedicine && <EditMedicineModal medicine={editingMedicine} token={token} patientId={effectivePatientId} onClose={()=>setEditingMedicine(null)} onSave={()=>{loadSchedule();showToast("Medicine updated!");addNotif("Medicine details updated.","info");}}/>}
      {editingPatient && <EditPatientModal patient={editingPatient} token={token} onClose={()=>setEditingPatient(null)} onSave={()=>{loadPatients();loadSchedule();showToast("Patient updated!");addNotif(`Patient "${editingPatient.name}" vitals updated.`,"success");}}/>}
      {showAddPatient && <AddPatientModal token={token} onClose={()=>setShowAddPatient(false)} onSave={(newPatient)=>{loadPatients(newPatient?.id);showToast("Patient account created!");addNotif("New patient account created successfully.","success","Patient Added");}}/>}
      {showDeleteAccountModal && <DeleteAccountModal onClose={() => setShowDeleteAccountModal(false)} onConfirm={handleDeleteOwnAccount} loading={deleteAccountLoading} />}

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#004346] text-white flex items-center justify-center shadow-md"><PillIcon c="w-4 h-4"/></div>
          <span className="font-extrabold text-lg sm:text-xl text-[#004346] tracking-tight hidden md:inline">PillSync</span>
          
          {/* Global Medicine Search Bar (Wider, Bolder & Clean UI) */}
          <div className="relative">
            <div className="flex items-center bg-gray-50 hover:bg-white border-2 border-[#004346]/20 rounded-2xl px-3.5 py-1.5 transition-all focus-within:border-[#004346] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004346]/10 shadow-sm">
              <svg className="w-4 h-4 text-[#004346] shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                value={globalMedSearch}
                onChange={e => { setGlobalMedSearch(e.target.value); setSearchDropdownOpen(true); }}
                onFocus={() => setSearchDropdownOpen(true)}
                placeholder="Search medicine across tabs..."
                className="bg-transparent text-xs font-extrabold text-[#004346] placeholder:text-gray-400 placeholder:font-bold outline-none w-48 sm:w-72 md:w-80"
              />
              {globalMedSearch && (
                <button onClick={() => { setGlobalMedSearch(""); setSearchDropdownOpen(false); }} className="text-gray-400 hover:text-gray-700 cursor-pointer ml-1">
                  <X c="w-3.5 h-3.5"/>
                </button>
              )}
            </div>

            {/* Live Search Dropdown */}
            {searchDropdownOpen && globalMedSearch.trim() && (
              <div className="absolute left-0 top-11 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-[slideDown_.2s_ease] overflow-hidden">
                <div className="p-2 border-b border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-2">Matching Medicines</span>
                  <button onClick={() => setSearchDropdownOpen(false)} className="text-[10px] font-bold text-[#508991] hover:underline cursor-pointer px-2">Close</button>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {medicines.filter(m => !m.is_deleted && (m.name||'').toLowerCase().includes(globalMedSearch.toLowerCase())).length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400 font-semibold">No medicines match "{globalMedSearch}"</div>
                  ) : (
                    medicines.filter(m => !m.is_deleted && (m.name||'').toLowerCase().includes(globalMedSearch.toLowerCase())).map(med => (
                      <button key={med.id}
                        onClick={() => {
                          setGlobalMedSearch(med.name);
                          setSearchDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-[#D6F3F4]/50 transition-colors cursor-pointer">
                        <div className="w-7 h-7 rounded-lg bg-[#D6F3F4] text-[#004346] flex items-center justify-center shrink-0">
                          <FormIcon formulation={med.formulation} c="w-3.5 h-3.5"/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#004346] truncate">{med.name}</p>
                          <p className="text-[9px] text-gray-400 capitalize">{med.category} {med.dosage ? `• ${med.dosage}` : ''}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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

          {/* Header User Account Badge (Visible for Patient, Caregiver, Admin) */}
          <div className="flex items-center gap-2 sm:gap-2.5 border-l border-gray-200 pl-2 sm:pl-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#004346] text-white font-extrabold flex items-center justify-center uppercase shadow-sm text-xs sm:text-sm shrink-0">
              {user?.name?.slice(0,2)||"PS"}
            </div>
            <div className="block">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-extrabold text-[#004346] leading-tight truncate max-w-[110px] sm:max-w-[160px]">{user?.name}</p>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase shrink-0 ${
                  role === "admin" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                  role === "caregiver" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                  "bg-[#D6F3F4] text-[#004346] border border-[#508991]/20"
                }`}>
                  {role}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold truncate max-w-[130px] sm:max-w-[180px]">{user?.email}</p>
            </div>
            <button onClick={() => goTo("settings")}
              className="w-7 h-7 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#004346] flex items-center justify-center transition-all cursor-pointer border border-teal-100/60 ml-0.5 shrink-0" title="Edit Account Settings">
              <Edit c="w-3.5 h-3.5"/>
            </button>
          </div>

          <button onClick={()=>{logout("/login");}}
            className="cursor-pointer border border-[#004346]/20 hover:border-[#004346] text-[#004346] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-[#004346]/5 shrink-0">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Close notification drawer on outside click */}
      {notifOpen && <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)}/>}

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="hidden md:flex flex-col w-[180px] shrink-0 bg-white border-r border-gray-100 px-3 py-6 gap-1">
          <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
          {[
            {key:"overview",label:"Overview",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>},
            {key:"medicines",label:role==="patient"?"My Medicines":"Medicines",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>},
            ...(["caregiver","admin"].includes(role)?[{key:"patients",label:"Patients",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}]:[]),
            ...(role==="admin"?[{key:"caregivers",label:"Caregivers",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}]:[]),
            {key:"progress",label:"Progress",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>},
            {key:"refill",label:"Refill Predictor",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>},
            {key:"history",label:"History",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>},
            {key:"ai",label:"AI Assistant",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>},
            {key:"emergency",label:"Emergency Contacts",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>},
            {key:"settings",label:"Settings",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>},
          ].map(({key,label,icon})=>(
            <button key={key} onClick={()=>goTo(key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer w-full text-left ${tab===key?"bg-[#004346] text-white shadow-md":"text-gray-500 hover:bg-[#D6F3F4]/60 hover:text-[#004346]"}`}>
              {icon}{label}
            </button>
          ))}
          <div className="mt-auto pt-4 border-t border-gray-100 space-y-1.5">
            {(role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
              <>
                <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#004346] hover:bg-[#508991] text-white text-xs font-bold transition-all cursor-pointer"><Plus c="w-4 h-4"/>Add Medicine</button>
                <button onClick={()=>setShowOcrModal(true)} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-white hover:bg-teal-50 text-[#004346] border border-teal-200 text-xs font-bold transition-all cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Scan Medicine</button>
              </>
            )}
            <button onClick={()=>{logout("/login");}}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">

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
              <div className="grid grid-cols-5 gap-2 sm:gap-3 bg-black/15 p-3 sm:p-4 rounded-2xl border border-white/5 flex-1 sm:max-w-xs lg:max-w-sm">
                {[["Gender",vitalsPatient.gender||"—","capitalize"],["Age",vitalsPatient.age?`${vitalsPatient.age} yrs`:"—"],["Weight",vitalsPatient.weight||"—"],["Height",vitalsPatient.height||"—"],["Blood Group",vitalsPatient.blood_group||"—"]].map(([l,v,ex])=>(
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

        {/* ── HEADER ── */}
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
          {/* Mobile tab bar (visible only on small screens) */}
          <div className="flex md:hidden overflow-x-auto gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm" style={{scrollbarWidth:"none"}}>
            {[
              {key:"overview",label:"Overview"},
              ...(["caregiver","admin"].includes(role)?[{key:"patients",label:"Patients"}]:[]),
              ...(role==="admin"?[{key:"caregivers",label:"Caregivers"}]:[]),
              {key:"medicines",label:"Medicines"},
              {key:"progress",label:"Progress"},
              {key:"refill",label:"Refill"},
              {key:"history",label:"History"},
              {key:"ai",label:"AI"},
              {key:"emergency",label:"Emergency"},
              {key:"settings",label:"Settings"},
            ].map(({key,label})=>(
              <button key={key} onClick={()=>goTo(key)}
                className={`cursor-pointer px-3 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all ${tab===key?"bg-[#004346] text-white shadow":"text-gray-400 hover:text-[#004346]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── BACK BUTTON ── */}
        {canGoBack && <BackButton onBack={goBack}/>}

        {/* ── STATS CARDS (Only on Overview and Progress tabs) ── */}
        {(tab === "overview" || tab === "progress") && (role==="patient"||(["caregiver","admin"].includes(role)&&effectivePatientId)) && (
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

        {/* ΓòÉΓòÉΓòÉΓòÉ OVERVIEW TAB ΓòÉΓòÉΓòÉΓòÉ */}
        {tab === "overview" && (
          <div className="space-y-6">

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
                  {schedule.filter(dose => !globalMedSearch || (dose.name||'').toLowerCase().includes(globalMedSearch.toLowerCase())).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <TabletIcon c="w-10 h-10 text-gray-200 mb-3"/><p className="text-sm font-bold text-gray-400">No medicines scheduled for this date.</p>
                    </div>
                  ) : schedule.filter(dose => !globalMedSearch || (dose.name||'').toLowerCase().includes(globalMedSearch.toLowerCase())).map(dose=>(
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
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>setShowAdd(true)}
                      className="py-3.5 bg-[#004346] hover:bg-[#508991] text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all">
                      <Plus c="w-4 h-4"/> Add Medicine
                    </button>
                    <button onClick={()=>setShowOcrModal(true)}
                      className="py-3.5 bg-white hover:bg-teal-50 text-[#004346] border border-teal-200 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      Scan Prescription
                    </button>
                  </div>
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

              </div>
            </div>

          </div>
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉ PATIENTS TAB ΓòÉΓòÉΓòÉΓòÉ */}
        {tab === "patients" && ["caregiver","admin"].includes(role) && (
          <PatientsTab
            role={role}
            token={token}
            patientList={patientList}
            loadPatients={loadPatients}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            goTo={goTo}
            showToast={showToast}
            addNotif={addNotif}
            setShowAddPatient={setShowAddPatient}
            setEditingPatient={setEditingPatient}
            setDeleteConfirm={setDeleteConfirm}
          />
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉ CAREGIVERS TAB ΓòÉΓòÉΓòÉΓòÉ */}
        {tab === "caregivers" && role === "admin" && (
          <CaregiverListTab
            token={token}
            showToast={showToast}
            addNotif={addNotif}
            setEditingPatient={setEditingPatient}
          />
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉ MEDICINES TAB ΓòÉΓòÉΓòÉΓòÉ */}
        {tab === "medicines" && (
          <div className="space-y-4">
            {/* Urgent Low Stock Status Bar */}
            {medicines.filter(m => !m.is_deleted && m.stock < 10).length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-200/80 shadow-sm space-y-3 animate-[fadeIn_.2s_ease]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                      <AlertIcon c="w-4.5 h-4.5"/>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-rose-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                        <span>Low Stock Alert — Immediate Action Needed</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-extrabold">
                          {medicines.filter(m => !m.is_deleted && m.stock < 10).length} Item{medicines.filter(m => !m.is_deleted && m.stock < 10).length > 1 ? "s" : ""}
                        </span>
                      </h4>
                      <p className="text-[11px] text-rose-700/80 font-medium mt-0.5">
                        The following medicines are running low or out of stock. Please restore stock soon:
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-sm whitespace-nowrap">
                    Refill Needed
                  </span>
                </div>

                {/* Cleanly spaced badges */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-200/60">
                  {medicines.filter(m => !m.is_deleted && m.stock < 10).map(med => (
                    <div key={med.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-rose-200 shadow-xs text-xs">
                      <span className="font-extrabold text-gray-800">{med.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${med.stock === 0 ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                        {med.stock === 0 ? "Out of Stock" : `${med.stock} left`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">{role==="patient"?"My Medicines":"Patient Medicines"}</h2>
              <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
                <button onClick={()=>setShowOcrModal(true)}
                  className="px-4 py-2 bg-white hover:bg-teal-50 text-[#004346] border border-teal-200 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0">
                  <svg className="w-4 h-4 text-[#508991]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Scan Prescription (OCR)
                </button>
                <div className="relative flex-1">
                  <input
                    value={medSearch}
                    onChange={e=>setMedSearch(e.target.value)}
                    placeholder="Search medicines..."
                    className="w-full pl-8 pr-8 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 outline-none focus:border-[#508991] bg-white transition-all"
                  />
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  {medSearch && <button onClick={()=>setMedSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"><X c="w-3 h-3"/></button>}
                </div>
              </div>
            </div>
            {medicines.filter(m => {
              const query = (medSearch || globalMedSearch).trim().toLowerCase();
              if (!query) return true;
              return (m.name||'').toLowerCase().includes(query) || (m.category||'').toLowerCase().includes(query) || (m.description||'').toLowerCase().includes(query);
            }).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                <PillIcon c="w-12 h-12 text-gray-200 mb-4"/>
                <p className="text-sm font-bold text-gray-400">{medSearch ? `No medicines match "${medSearch}"` : "No medicines added yet."}</p>
                {medSearch && <button onClick={()=>setMedSearch("")} className="mt-3 text-xs text-[#508991] font-bold hover:underline cursor-pointer">Clear search</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {medicines.filter(m => {
                  const query = (medSearch || globalMedSearch).trim().toLowerCase();
                  if (!query) return true;
                  return (m.name||'').toLowerCase().includes(query) || (m.category||'').toLowerCase().includes(query) || (m.description||'').toLowerCase().includes(query);
                }).map(med=>(
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

        {/* ΓòÉΓòÉΓòÉΓòÉ PROGRESS TAB ΓòÉΓòÉΓòÉΓòÉ */}
        {tab === "progress" && (
          <div className="space-y-5">
            {/* Adherence Analytics Report */}
            <AdherenceAnalytics
              token={token}
              patientId={effectivePatientId}
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[24px] border border-gray-100 shadow-xs">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Medication Progress</h2>
                <p className="text-xs text-gray-400 mt-0.5">Track adherence and view your 7-day report.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                  <button onClick={() => setProgressSubTab("chart")}
                    className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${progressSubTab === "chart" ? "bg-[#004346] text-white shadow-sm" : "text-gray-500 hover:text-[#004346]"}`}>
                    <BarChart c="w-3.5 h-3.5"/> Chart
                  </button>
                  <button onClick={() => setProgressSubTab("list")}
                    className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${progressSubTab === "list" ? "bg-[#004346] text-white shadow-sm" : "text-gray-500 hover:text-[#004346]"}`}>
                    <ListIcon c="w-3.5 h-3.5"/> List
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={exportToCSV}
                    className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-200 text-[#004346] bg-teal-50/50 hover:bg-teal-50 text-xs font-extrabold transition-all">
                    CSV Export
                  </button>
                  <button onClick={exportToPDF}
                    className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004346] hover:bg-[#508991] text-white text-xs font-extrabold transition-all shadow-sm">
                    PDF Export
                  </button>
                </div>
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
                  ) : medicines.filter(m => !m.is_deleted && (!globalMedSearch || (m.name||'').toLowerCase().includes(globalMedSearch.toLowerCase()))).map(med => {
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
                      {medicines.filter(m => !m.is_deleted && (!globalMedSearch || (m.name||'').toLowerCase().includes(globalMedSearch.toLowerCase()))).map((med, idx) => (
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
                ) : medicines.filter(m => !m.is_deleted && (!globalMedSearch || (m.name||'').toLowerCase().includes(globalMedSearch.toLowerCase()))).map((med, idx) => {
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

        {/* ΓòÉΓòÉΓòÉΓòÉ HISTORY TAB ΓòÉΓòÉΓòÉΓòÉ */}
        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Medication History</h2>
                <p className="text-xs text-gray-400 mt-0.5">Complete log of all taken, missed and pending doses.</p>
              </div>
              {histLoading && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
            </div>
            {history.filter(log => !globalMedSearch || (log.medicine_name||'').toLowerCase().includes(globalMedSearch.toLowerCase())).length === 0 ? (
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
                    {history.filter(log => !globalMedSearch || (log.medicine_name||'').toLowerCase().includes(globalMedSearch.toLowerCase())).map(log=>(
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

        {/* ΓòÉΓòÉΓòÉΓòÉ SETTINGS TAB ΓòÉΓòÉΓòÉΓòÉ */}
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
                    <div className="col-span-2"><label className="label">Blood Group</label><input className={inp+" text-xs"} value={profileForm.blood_group} onChange={e=>setProfileForm({...profileForm,blood_group:e.target.value})} placeholder="e.g. O+, A-"/></div>
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

            {/* Danger Zone – Delete Account */}
            <div className="md:col-span-2 bg-rose-50/50 p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-rose-200/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-lg text-rose-700 flex items-center gap-2">
                    <Trash c="w-5 h-5 text-rose-600"/> Danger Zone — Delete Account
                  </h3>
                  <p className="text-xs text-rose-600/80 mt-1 max-w-xl">
                    Permanently delete your PillSync account. All your profile data, active schedules, adherence reports, and intake history will be permanently erased.
                  </p>
                </div>
                <button type="button" onClick={() => setShowDeleteAccountModal(true)}
                  className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer whitespace-nowrap">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ████ AI ASSISTANT TAB ████ */}
        {tab === "ai" && (
          <div className="bg-white rounded-[28px] sm:rounded-[32px] shadow-sm border border-gray-100 overflow-hidden" style={{height:"calc(100vh - 240px)"}}>
            <div className="border-b border-gray-100 px-5 sm:px-8 py-4 sm:py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#004346] to-[#508991] flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#004346]">PillSync AI Assistant</h3>
                <p className="text-xs text-gray-400">Ask me anything about your medicines, dosages, or health.</p>
              </div>
            </div>
            <div className="flex flex-col h-[calc(100%-80px)]">
              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 space-y-4" id="ai-chat-area">
                {aiMessages.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#004346] to-[#508991] flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <h4 className="text-lg font-extrabold text-[#004346] mb-1">Welcome to PillSync AI</h4>
                    <p className="text-sm text-gray-400 max-w-md mx-auto">I can help you understand your medicines, check for interactions, explain dosages, and answer health-related questions.</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      {["What are my active medicines?","When should I take my next dose?","Any refills needed soon?"].map(q=>(
                        <button key={q} onClick={()=>setAiInput(q)} className="px-4 py-2 bg-[#D6F3F4] hover:bg-[#508991]/20 text-[#004346] rounded-2xl text-xs font-bold transition-all cursor-pointer">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i)=>(
                  <div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-semibold ${msg.role==="user"?"bg-[#004346] text-white rounded-br-md":"bg-gray-100 text-gray-800 rounded-bl-md"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-500 font-semibold animate-pulse">Thinking...</div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 px-5 sm:px-8 py-4">
                <form onSubmit={async e=>{
                  e.preventDefault();
                  if(!aiInput.trim()||aiLoading) return;
                  const q=aiInput.trim(); setAiInput(""); setAiMessages(p=>[...p,{role:"user",content:q}]); setAiLoading(true);
                  try {
                    const res = await axios.post(`${API}/chat/ask`, { query: q }, { headers: { Authorization: `Bearer ${token}` } });
                    setAiMessages(p=>[...p,{role:"assistant",content:res.data?.response||res.data?.reply||"I can help with that! However, please consult your doctor for medical advice."}]);
                  } catch {
                    setAiMessages(p=>[...p,{role:"assistant",content:`Based on your profile, you have ${medicines.filter(m=>!m.is_deleted).length} active medicines with ${adherence.adherence_pct}% adherence. For specific medical questions, please consult your healthcare provider.`}]);
                  } finally { setAiLoading(false); }
                }} className="flex gap-2">
                  <input value={aiInput} onChange={e=>setAiInput(e.target.value)} placeholder="Ask PillSync AI anything..." className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm font-semibold outline-none focus:border-[#508991] transition-colors"/>
                  <button type="submit" disabled={aiLoading||!aiInput.trim()} className="px-5 py-3 rounded-2xl bg-[#004346] hover:bg-[#508991] text-white font-bold text-sm cursor-pointer transition-all disabled:opacity-50 shrink-0">Send</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ████ EMERGENCY CONTACTS TAB ████ */}
        {tab === "emergency" && (
          <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 pb-4 mb-5 sm:mb-6">
              <h3 className="font-extrabold text-lg text-[#004346] flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Emergency Contacts
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">People to contact in case of a medical emergency.</p>
            </div>
            <div className="space-y-3">
              {emergencyContacts.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  <p className="text-sm font-bold text-gray-400">No emergency contacts added yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add contacts who should be notified in emergencies.</p>
                </div>
              ) : emergencyContacts.map((c,i)=>(
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-[#D6F3F4] text-[#004346] font-extrabold flex items-center justify-center uppercase text-sm">{c.name?.slice(0,2)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#004346]">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone} • {c.relation}</p>
                  </div>
                  <button onClick={()=>setEmergencyContacts(p=>p.filter((_,j)=>j!==i))} className="text-rose-400 hover:text-rose-600 cursor-pointer"><Trash c="w-4 h-4"/></button>
                </div>
              ))}
            </div>
            <form onSubmit={e=>{
              e.preventDefault();
              const fd=new FormData(e.target);
              const name=fd.get("name"), phone=fd.get("phone"), relation=fd.get("relation");
              if(!name||!phone) return;
              setEmergencyContacts(p=>[...p,{name,phone,relation:relation||"Other"}]);
              e.target.reset();
              showToast("Emergency contact added!");
            }} className="mt-6 p-4 rounded-2xl bg-[#D6F3F4]/40 border border-[#508991]/15">
              <p className="text-[10px] font-extrabold text-[#004346] uppercase tracking-wide mb-3">Add New Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input name="name" placeholder="Full Name" className="input text-xs" required/>
                <input name="phone" placeholder="Phone Number" type="tel" className="input text-xs" required/>
                <input name="relation" placeholder="Relation (e.g. Spouse, Parent)" className="input text-xs"/>
              </div>
              <button type="submit" className="mt-3 px-5 py-2.5 rounded-2xl bg-[#004346] hover:bg-[#508991] text-white font-bold text-xs cursor-pointer transition-all">Add Contact</button>
            </form>
          </div>
        )}

        {/* ████ REFILL PREDICTOR TAB ████ */}
        {tab === "refill" && (
          <RefillPredictionWidget
            token={token}
            patientId={effectivePatientId}
            showToast={showToast}
            loadMedicines={loadSchedule}
          />
        )}

      </div>{/* end main content */}
      </div>{/* end flex layout */}

      {/* ── FLOATING AI ASSISTANT CHATBOT ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat Window */}
        {aiChatOpen && (
          <div className="mb-4 w-96 max-w-[calc(100vw-32px)] h-[500px] bg-white rounded-3xl border border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease]">
            {/* Header */}
            <div className="bg-[#004346] text-white px-5 py-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight">PillSync AI Assistant</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                    <p className="text-[10px] text-white/70 font-semibold">Ready to help</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setAiChatOpen(false)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer">
                <X c="w-4 h-4 text-white"/>
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
              {aiMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center border border-[#508991]/10">
                    <svg className="w-6 h-6 text-[#004346]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-[#004346]">Your AI Companion</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Ask me anything about your active medicines, schedules, or vitals!</p>
                  </div>
                </div>
              ) : (
                aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-xs ${
                      msg.role === "user" 
                        ? "bg-[#004346] text-white rounded-tr-none font-medium" 
                        : "bg-white text-[#172A3A] border border-gray-100 rounded-tl-none font-medium"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}/>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}/>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}/>
                  </div>
                </div>
              )}
              <div ref={floatingChatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const q = aiInput.trim();
              if (!q) return;
              setAiInput("");
              setAiMessages(p => [...p, { role: "user", content: q }]);
              setAiLoading(true);
              try {
                const res = await axios.post(`${API}/chat/ask`, { query: q }, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setAiMessages(p => [...p, { role: "assistant", content: res.data?.response || res.data?.reply || "I am here to help! Consult your doctor for medical advice." }]);
              } catch {
                setAiMessages(p => [...p, { role: "assistant", content: `Based on your profile, you have ${medicines.filter(m=>!m.is_deleted).length} active medicines. For medical advice, please consult your physician.` }]);
              } finally {
                setAiLoading(false);
              }
            }} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-[#004346] focus:bg-white rounded-2xl px-4 py-2.5 text-xs font-bold text-[#004346] outline-none transition-all placeholder:text-gray-400"
              />
              <button type="submit" disabled={aiLoading} className="w-9 h-9 rounded-xl bg-[#004346] hover:bg-[#508991] text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-55 shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Floating Bubble FAB Button */}
        <button
          onClick={() => setAiChatOpen(o => !o)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-105 border-4 border-white cursor-pointer ${
            aiChatOpen ? "bg-rose-500 hover:bg-rose-600 rotate-90 text-white" : "bg-[#004346] hover:bg-[#508991] text-white"
          }`}
          title="Ask AI Assistant"
        >
          {aiChatOpen ? (
            <X c="w-6 h-6 text-white"/>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          )}
        </button>
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
