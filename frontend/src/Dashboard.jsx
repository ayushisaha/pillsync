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

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "PS";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const parsePhone = (fullPhone) => {
  if (!fullPhone) return { code: "+91", num: "" };
  const match = String(fullPhone).match(/^(\+\d{1,4})(\d{10})$/);
  if (match) {
    return { code: match[1], num: match[2] };
  }
  return { code: "+91", num: String(fullPhone).replace(/\D/g, "").slice(-10) };
};

const getDefaultTimesForFrequency = (n) => {
  const count = Math.max(1, Math.min(6, parseInt(n) || 1));
  const presets = {
    1: ["08:00 am"],
    2: ["08:00 am", "08:00 pm"],
    3: ["08:00 am", "02:00 pm", "08:00 pm"],
    4: ["08:00 am", "12:00 pm", "04:00 pm", "08:00 pm"],
    5: ["08:00 am", "11:00 am", "02:00 pm", "05:00 pm", "08:00 pm"],
    6: ["06:00 am", "09:00 am", "12:00 pm", "03:00 pm", "06:00 pm", "09:00 pm"]
  };
  return presets[count] || ["08:00 am"];
};

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


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
const EditIcon = ({ c = "w-4 h-4" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

const Bell = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const AlertIcon = ({ c = "w-5 h-5" }) => (
  <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
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

  const handleAdd = () => {
    onAdd(`${hour}:${min} ${ampm}`);
    setHour("08");
    setMin("00");
    setAmpm("am");
  };

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
      <button type="button" onClick={handleAdd}
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
  const [nameStatus, setNameStatus] = useState({ state: "idle", valid: false, canonical: null, suggestions: [] });

  const addTime = t => {
    if (times.length >= frequency) {
      setError(`Cannot add more than ${frequency} reminder time(s) for a ${frequency}x daily dose.`);
      return;
    }
    setError("");
    if (!times.includes(t)) setTimes(p => [...p, t].sort());
  };
  const rmTime  = t => setTimes(p => p.filter(x => x !== t));

  const handleFrequencyChange = n => {
    setFrequency(n);
    if (times.length > n) setTimes(prev => prev.slice(0, n));
  };

  // Real-time debounced medicine name verification
  useEffect(() => {
    const trimmed = form.name.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameStatus({ state: "idle", valid: false, canonical: null, suggestions: [] });
      return;
    }
    setNameStatus(s => ({ ...s, state: "checking" }));
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/medicines/verify-name?name=${encodeURIComponent(trimmed)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.valid) {
          setNameStatus({
            state: "valid",
            valid: true,
            canonical: res.data.canonical,
            suggestions: res.data.suggestions || []
          });
        } else {
          setNameStatus({
            state: "invalid",
            valid: false,
            canonical: null,
            suggestions: res.data.suggestions || []
          });
        }
      } catch {
        setNameStatus({ state: "invalid", valid: false, canonical: null, suggestions: [] });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.name, token]);

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
    return `${daysLeft} day(s) supply — ${dosesPerDay}x daily x ${doseSize} ${unit}/dose`;
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
    if (!nameStatus.valid) {
      setError(`"${form.name}" is not recognized as a valid medicine. Only verified medications can be added.`);
      return;
    }
    if (times.length !== frequency) { setError(`Please add exactly ${frequency} reminder time(s) to match ${frequency}x daily dose.`); return; }
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Medicine Name *</label>
              {nameStatus.state === "checking" && (
                <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                  <svg className="animate-spin w-3 h-3 text-[#508991]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Checking drug database...
                </span>
              )}
              {nameStatus.state === "valid" && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold border border-emerald-200 flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified Medicine
                </span>
              )}
              {nameStatus.state === "invalid" && (
                <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-extrabold border border-rose-200 flex items-center gap-1">
                  <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  Unrecognized Medicine Name
                </span>
              )}
            </div>
            <input 
              value={form.name} 
              onChange={e=>setForm({...form,name:e.target.value})} 
              className={`input transition-all ${
                nameStatus.state === "invalid" 
                  ? "border-rose-300 focus:border-rose-500 bg-rose-50/20" 
                  : nameStatus.state === "valid" 
                  ? "border-emerald-300 focus:border-emerald-500 bg-emerald-50/10" 
                  : ""
              }`} 
              placeholder="e.g. Metformin 500mg, Pan 40, Dolo 650" 
              required 
            />
            {nameStatus.state === "invalid" && form.name.trim().length >= 2 && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 ml-1">
                This name was not found in the pharmaceutical drug database. Only authentic medicines can be added.
              </p>
            )}
            {nameStatus.suggestions && nameStatus.suggestions.length > 0 && nameStatus.suggestions[0]?.toLowerCase() !== form.name.trim().toLowerCase() && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggestions:</span>
                {nameStatus.suggestions.slice(0, 4).map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, name: sug }))}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#D6F3F4] text-[#004346] hover:bg-[#74B3CE]/40 font-bold transition-all border border-[#508991]/20 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
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
                <button key={n} type="button" onClick={() => handleFrequencyChange(n)}
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
          <button 
            type="submit" 
            disabled={loading || nameStatus.state === "invalid" || nameStatus.state === "checking" || !form.name.trim()}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              loading || nameStatus.state === "invalid" || nameStatus.state === "checking" || !form.name.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none" 
                : "bg-[#004346] hover:bg-[#508991] shadow-lg shadow-[#004346]/15 cursor-pointer"
            }`}
          >
            {loading ? "Adding..." : nameStatus.state === "checking" ? "Checking Medicine..." : nameStatus.state === "invalid" ? "Enter Valid Medicine" : "Add Medicine"}
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
  const [nameStatus, setNameStatus] = useState({ state: "valid", valid: true, canonical: medicine.name, suggestions: [] });

  const addTime = t => {
    if (times.length >= frequency) {
      setError(`Cannot add more than ${frequency} reminder time(s) for a ${frequency}x daily dose.`);
      return;
    }
    setError("");
    if (!times.includes(t)) setTimes(p => [...p, t].sort());
  };
  const rmTime  = t => setTimes(p => p.filter(x => x !== t));

  const handleFrequencyChange = n => {
    setFrequency(n);
    if (times.length > n) setTimes(prev => prev.slice(0, n));
  };

  // Real-time debounced medicine name verification
  useEffect(() => {
    const trimmed = form.name.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameStatus({ state: "idle", valid: false, canonical: null, suggestions: [] });
      return;
    }
    if (trimmed.toLowerCase() === (medicine.name || "").trim().toLowerCase()) {
      setNameStatus({ state: "valid", valid: true, canonical: trimmed, suggestions: [] });
      return;
    }
    setNameStatus(s => ({ ...s, state: "checking" }));
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/medicines/verify-name?name=${encodeURIComponent(trimmed)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.valid) {
          setNameStatus({
            state: "valid",
            valid: true,
            canonical: res.data.canonical,
            suggestions: res.data.suggestions || []
          });
        } else {
          setNameStatus({
            state: "invalid",
            valid: false,
            canonical: null,
            suggestions: res.data.suggestions || []
          });
        }
      } catch {
        setNameStatus({ state: "invalid", valid: false, canonical: null, suggestions: [] });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.name, medicine.name, token]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Medicine name is required"); return; }
    if (!nameStatus.valid) {
      setError(`"${form.name}" is not recognized as a valid medicine. Only verified medications can be saved.`);
      return;
    }
    if (times.length !== frequency) { setError(`Please add exactly ${frequency} reminder time(s) to match ${frequency}x daily dose.`); return; }
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Medicine Name *</label>
              {nameStatus.state === "checking" && (
                <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                  <svg className="animate-spin w-3 h-3 text-[#508991]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Checking drug database...
                </span>
              )}
              {nameStatus.state === "valid" && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold border border-emerald-200 flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified Medicine
                </span>
              )}
              {nameStatus.state === "invalid" && (
                <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-extrabold border border-rose-200 flex items-center gap-1">
                  <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  Unrecognized Medicine Name
                </span>
              )}
            </div>
            <input 
              value={form.name} 
              onChange={e=>setForm({...form,name:e.target.value})} 
              className={`input transition-all ${
                nameStatus.state === "invalid" 
                  ? "border-rose-300 focus:border-rose-500 bg-rose-50/20" 
                  : nameStatus.state === "valid" 
                  ? "border-emerald-300 focus:border-emerald-500 bg-emerald-50/10" 
                  : ""
              }`} 
              required
            />
            {nameStatus.state === "invalid" && form.name.trim().length >= 2 && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 ml-1">
                This name was not found in the pharmaceutical drug database. Only authentic medicines can be saved.
              </p>
            )}
            {nameStatus.suggestions && nameStatus.suggestions.length > 0 && nameStatus.suggestions[0]?.toLowerCase() !== form.name.trim().toLowerCase() && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggestions:</span>
                {nameStatus.suggestions.slice(0, 4).map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, name: sug }))}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#D6F3F4] text-[#004346] hover:bg-[#74B3CE]/40 font-bold transition-all border border-[#508991]/20 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
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
                <button key={n} type="button" onClick={() => handleFrequencyChange(n)}
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
          <button 
            type="submit" 
            disabled={loading || nameStatus.state === "invalid" || nameStatus.state === "checking" || !form.name.trim()}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              loading || nameStatus.state === "invalid" || nameStatus.state === "checking" || !form.name.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none" 
                : "bg-[#004346] hover:bg-[#508991] shadow-lg shadow-[#004346]/15 cursor-pointer"
            }`}
          >
            {loading ? "Updating..." : nameStatus.state === "checking" ? "Checking Medicine..." : nameStatus.state === "invalid" ? "Enter Valid Medicine" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Patient Modal ──────────────────────────────────
function EditPatientModal({ patient, onClose, onSave, token }) {
  const initialPhone = parsePhone(patient?.phone);
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phoneNum, setPhoneNum] = useState(initialPhone.num);
  const [form, setForm] = useState({
    name:   patient?.name   || "",
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
        name: form.name, phone: phoneNum ? `${countryCode}${phoneNum}` : null, gender: form.gender,
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
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
              <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} className="px-2 bg-transparent text-xs font-bold border-r border-gray-200 outline-none">
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+971">+971</option>
              </select>
              <input type="tel" value={phoneNum} onChange={e=>setPhoneNum(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1 px-3 py-2 text-xs outline-none border-none focus:ring-0" placeholder="10 digit number" maxLength={10}/>
            </div>
          </div>

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
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNum, setPhoneNum] = useState("");
  const [form, setForm] = useState({ name:"", email:"", password:"", gender:"female", age:"", weight:"", height:"", blood_group:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { setError("Name, email and password are required"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: form.name, email: form.email, password: form.password,
        role: "patient", phone: phoneNum ? `${countryCode}${phoneNum}` : null,
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
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
              <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} className="px-2 bg-transparent text-xs font-bold border-r border-gray-200 outline-none">
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+971">+971</option>
              </select>
              <input autoComplete="off" type="tel" value={phoneNum} onChange={e=>setPhoneNum(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1 px-3 py-2 text-xs outline-none border-none focus:ring-0" placeholder="10 digit number" maxLength={10}/>
            </div>
          </div>

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

// ─── Edit Emergency Contact Modal ─────────────────────────
function EditEmergencyContactModal({ contact, onClose, onSave, token }) {
  const initialPhone = parsePhone(contact?.phone);
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phoneNum, setPhoneNum] = useState(initialPhone.num);
  const [form, setForm] = useState({
    name: contact?.name || "",
    email: contact?.email || "",
    relation: contact?.relation || "Family",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!phoneNum) { setError("Phone number is required"); return; }
    setLoading(true);
    try {
      const res = await axios.patch(`${API}/emergency-contacts/${contact.id}`, {
        name: form.name,
        phone: `${countryCode}${phoneNum}`,
        relation: form.relation,
        email: form.email || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSave(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update emergency contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
          <X c="w-3.5 h-3.5"/>
        </button>
        <h2 className="text-xl font-extrabold text-[#004346] mb-1">Edit Emergency Contact</h2>
        <p className="text-xs text-gray-400 mb-5">Update details for this emergency contact.</p>
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertIcon c="w-4 h-4"/>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input" required/>
          </div>
          <div>
            <label className="label">Phone</label>
            <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
              <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} className="px-2 bg-transparent text-xs font-bold border-r border-gray-200 outline-none">
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+971">+971</option>
              </select>
              <input type="tel" value={phoneNum} onChange={e=>setPhoneNum(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1 px-3 py-2 text-xs outline-none border-none focus:ring-0" placeholder="10 digit number" maxLength={10} required/>
            </div>
          </div>
          <div>
            <label className="label">Gmail Address</label>
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" className="input text-xs" placeholder="gmail@email.com"/>
          </div>
          <div>
            <label className="label">Relation</label>
            <select value={form.relation} onChange={e=>setForm({...form,relation:e.target.value})} className="input text-xs" required>
              <option value="Family">Family</option>
              <option value="Friend">Friend</option>
              <option value="Consultant/Doctor">Consultant/Doctor</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${loading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Saving..." : "Save Changes"}
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
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extractedList, setExtractedList] = useState(null);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);

  const handleFileChange = e => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;
    setFiles(prev => [...prev, ...selected]);
    setError("");
    
    const newPreviews = selected.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null).filter(Boolean);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleScan = async () => {
    if (files.length === 0) { setError("Please select at least one prescription photo or document"); return; }
    setScanning(true);
    setError("");
    try {
      let allFormatted = [];
      let masterIndex = 0;
      for (const fileItem of files) {
        const formData = new FormData();
        formData.append("file", fileItem);
        const res = await axios.post(`${API}/medicines/upload-ocr`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });

        const list = res.data?.medicines || [];
        list.forEach((m) => {
          allFormatted.push({
            id: ++masterIndex,
            name: m.name || `Medicine ${masterIndex}`,
            dosage: m.dosage || "1 tablet",
            category: m.category || m.disease_name || "Other",
            disease_name: m.disease_name || m.category || "",
            stock: m.stock ? String(m.stock) : "10",
            formulation: m.formulation || "tablet",
            start_date: m.start_date || todayStr(),
            end_date: m.end_date || "",
            times_per_day: m.times_per_day || (m.times ? m.times.length : 1),
            times: m.times && m.times.length ? m.times : [],
            instructions: m.instructions || ""
          });
        });
      }

      if (allFormatted.length === 0) {
        allFormatted.push({
          id: 1, name: "", dosage: "1 tablet", category: "Other", disease_name: "", stock: "10", formulation: "tablet", start_date: todayStr(), end_date: "", times_per_day: 1, times: [], instructions: ""
        });
      }

      setExtractedList(allFormatted);
      showToast(`Prescription analyzed! Found ${allFormatted.length} medication(s) in ${files.length} pages.`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to scan prescription images");
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
      { id: Date.now(), name: "", dosage: "1 tablet", category: "Other", disease_name: "", stock: "10", formulation: "tablet", start_date: todayStr(), end_date: "", times_per_day: 1, times: [], instructions: "" }
    ]);
    setIsEditingAll(true);
  };


  const handleSaveAll = async () => {
    if (!extractedList || extractedList.length === 0) { setError("No medicines to save"); return; }
    const invalid = extractedList.find(m => !m.name.trim());
    if (invalid) { setError("All medicines must have a name"); return; }

    for (let i = 0; i < extractedList.length; i++) {
      const item = extractedList[i];
      const reqFreq = parseInt(item.times_per_day) || (item.times.length || 1);
      if (item.times.length !== reqFreq) {
        setError(`Medicine #${i + 1} (${item.name || 'Unnamed'}): Times Per Day is set to ${reqFreq}, but you have ${item.times.length} reminder time(s). Please add matching reminder times.`);
        return;
      }
    }

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
          schedules: item.times,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className={`bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl w-full flex flex-col max-h-[92vh] sm:max-h-[88vh] p-4 sm:p-6 relative animate-[fadeIn_.2s_ease] ${extractedList ? "max-w-5xl h-[88vh]" : "max-w-2xl"}`}>
        <button onClick={onClose} className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer z-20"><X c="w-3.5 h-3.5"/></button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-bold shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Prescription OCR Multi-Scan</h2>
            <p className="text-[11px] sm:text-xs text-gray-400">Scans all medicines in your prescription image at once</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertIcon c="w-4 h-4"/>{error}
          </div>
        )}

        {!extractedList ? (
          <div className="space-y-4 my-auto overflow-y-auto p-1">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#508991] transition-all bg-gray-50/50">
              {previews.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto">
                    {previews.map((url, idx) => (
                      <div key={idx} className="relative group w-20 h-20 border rounded-xl overflow-hidden shadow-xs">
                        <img src={url} className="w-full h-full object-cover"/>
                        <button type="button" onClick={() => {
                          setFiles(p => p.filter((_, i) => i !== idx));
                          setPreviews(p => p.filter((_, i) => i !== idx));
                        }} className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600 transition-colors cursor-pointer">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-[#004346]">{files.length} prescription file(s) selected</p>
                </div>
              ) : (
                <div className="space-y-2 py-6">
                  <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <p className="text-xs font-bold text-[#004346]">Upload prescription photo(s) to extract all medicines</p>
                  <p className="text-[10px] text-gray-400">Supports multi-page prescription images (JPG, PNG, JPEG)</p>
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#004346] file:text-white hover:file:bg-[#508991] cursor-pointer"/>
            </div>

            <button onClick={handleScan} disabled={files.length === 0 || scanning}
              className={`w-full py-3 rounded-2xl text-white font-bold text-xs sm:text-sm cursor-pointer transition-all ${files.length === 0 || scanning ? "bg-gray-300" : "bg-[#004346] hover:bg-[#508991]"}`}>
              {scanning ? "Extracting all the medicines..." : files.length > 1 ? "Scan And Extract All (Multi-Page)" : "Scan And Extract All Medicines"}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-2.5">
            {/* Top info toolbar */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-teal-50 border border-teal-100 rounded-xl shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Check c="w-4 h-4 text-teal-600 shrink-0"/>
                <span className="text-xs font-bold text-[#004346] truncate">Extracted {extractedList.length} medicine(s) from prescription.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setIsEditingAll(!isEditingAll)}
                  className="px-2.5 py-1 rounded-lg border border-teal-200 text-[#004346] text-xs font-extrabold hover:bg-teal-100/60 transition-all cursor-pointer">
                  {isEditingAll ? "Done Editing" : "Edit Details"}
                </button>
                <button type="button" onClick={addEmptyMedicine}
                  className="px-2.5 py-1 rounded-lg bg-[#004346] text-white text-xs font-bold hover:bg-[#508991] transition-all cursor-pointer">
                  + Add
                </button>
              </div>
            </div>

            {/* Main side-by-side work area */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
              {/* Left Column: Prescription Image Preview */}
              <div className="md:col-span-5 bg-gray-50 border border-gray-200 rounded-2xl p-2.5 flex flex-col min-h-0 overflow-hidden gap-2">
                <div className="flex items-center justify-between shrink-0 px-1">
                  <span className="text-[11px] font-extrabold text-[#004346] uppercase tracking-wide flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#508991]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Prescription Preview
                  </span>
                  {previews.length > 1 && (
                    <span className="text-[10px] text-gray-500 font-bold">{activePreviewIdx + 1} of {previews.length}</span>
                  )}
                </div>

                {previews.length > 0 ? (
                  <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-gray-200 bg-white group flex items-center justify-center">
                    <img
                      src={previews[activePreviewIdx] || previews[0]}
                      alt="Scanned Prescription"
                      className="w-full h-full object-contain rounded-xl p-1"
                    />
                    <a
                      href={previews[activePreviewIdx] || previews[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-[#004346]/85 hover:bg-[#004346] text-white text-[10px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      Full Size
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">No image preview available</div>
                )}

                {previews.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 shrink-0">
                    {previews.map((pUrl, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setActivePreviewIdx(pIdx)}
                        className={`w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${activePreviewIdx === pIdx ? "border-[#004346] shadow-sm" : "border-gray-200 opacity-60 hover:opacity-100"}`}
                      >
                        <img src={pUrl} className="w-full h-full object-cover"/>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Extracted Medicines List */}
              <div className="md:col-span-7 space-y-2.5 min-h-0 overflow-y-auto pr-1">
                {extractedList.map((item, idx) => (
                  <div key={item.id || idx} className="p-3.5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#004346] uppercase">Medicine #{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#D6F3F4] text-[#004346] text-[10px] font-extrabold uppercase">{item.formulation}</span>
                      </div>
                      {extractedList.length > 1 && (
                        <button type="button" onClick={() => removeMedicine(idx)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer">
                          <Trash c="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>

                    {isEditingAll ? (
                      <div className="space-y-2.5 pt-0.5">
                        <div>
                          <label className="label">Medicine Name *</label>
                          <input value={item.name} onChange={e => updateMedicine(idx, "name", e.target.value)} className="input text-xs" placeholder="e.g. Acyclovir 800mg" required/>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Dosage</label>
                            <input value={item.dosage} onChange={e => updateMedicine(idx, "dosage", e.target.value)} className="input text-xs" placeholder="e.g. 800mg 5 times a day"/>
                          </div>
                          <div>
                            <label className="label">Disease / Category</label>
                            <input value={item.category} onChange={e => updateMedicine(idx, "category", e.target.value)} className="input text-xs" placeholder="e.g. Herpes Zoster Oticus"/>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="label">Formulation</label>
                            <select value={item.formulation} onChange={e => updateMedicine(idx, "formulation", e.target.value)} className="input text-xs">
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
                            <input type="date" value={item.start_date} onChange={e => updateMedicine(idx, "start_date", e.target.value)} className="input text-xs"/>
                          </div>
                          <div>
                            <label className="label">End Date</label>
                            <input type="date" value={item.end_date} onChange={e => updateMedicine(idx, "end_date", e.target.value)} className="input text-xs"/>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Stock Count</label>
                            <input type="number" min="0" value={item.stock} onChange={e => updateMedicine(idx, "stock", e.target.value)} className="input text-xs" placeholder="10"/>
                          </div>
                          <div>
                            <label className="label">Times Per Day</label>
                            <input type="number" min="1" max="6" value={item.times_per_day} onChange={e => {
                              const val = e.target.value;
                              updateMedicine(idx, "times_per_day", val);
                              const n = parseInt(val);
                              if (n > 0 && item.times.length > n) {
                                updateMedicine(idx, "times", item.times.slice(0, n));
                              }
                            }} className="input text-xs"/>
                          </div>
                        </div>
                        <div>
                          <label className="label">Reminder Times *</label>
                          <AmPmTimePicker onAdd={(newTime) => {
                            const maxAllowed = parseInt(item.times_per_day) || 1;
                            if (item.times.length >= maxAllowed) {
                              setError(`Cannot add more than ${maxAllowed} reminder time(s) for a ${maxAllowed}x daily dose on Medicine #${idx + 1}.`);
                              return;
                            }
                            setError("");
                            if (!item.times.includes(newTime)) {
                              updateMedicine(idx, "times", [...item.times, newTime].sort());
                            }
                          }}/>
                          {item.times.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.times.map(t => (
                                <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#004346] text-white text-[11px] font-bold">
                                  <Clock c="w-3 h-3"/>{t}
                                  <button type="button" onClick={() => updateMedicine(idx, "times", item.times.filter(x => x !== t))}
                                    className="ml-1 hover:text-red-300 cursor-pointer">
                                    <X c="w-3 h-3"/>
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="label">Instructions / Notes</label>
                          <input value={item.instructions} onChange={e => updateMedicine(idx, "instructions", e.target.value)} className="input text-xs" placeholder="e.g. Take after food"/>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-xs text-gray-700">
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
            </div>

            {/* Pinned Modal Footer */}
            <div className="flex items-center gap-3 pt-2.5 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => { setExtractedList(null); setFiles([]); setPreviews([]); }} className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer">
                Rescan Image
              </button>
              <button type="button" onClick={handleSaveAll} disabled={saving}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs cursor-pointer transition-all ${saving ? "bg-[#508991]" : "bg-[#004346] hover:bg-[#508991]"}`}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const getFormulationUnit = (formulation) => {
  const f = (formulation || "").toLowerCase();
  if (["liquid", "lotion"].includes(f)) return "ml";
  if (f === "spray") return "sprays";
  if (f === "injection") return "doses";
  if (f === "capsule") return "capsules";
  return "tablets";
};

function RefillStockModal({ item, onClose, onSave }) {
  const unit = getFormulationUnit(item.formulation);
  const [quantity, setQuantity] = useState("30");
  const [loading, setLoading] = useState(false);

  const num = parseFloat(quantity) || 0;
  const newTotal = item.current_stock + num;
  const doseSize = parseFloat(item.dosage) || 1;
  const dailyCons = item.daily_consumption || 1;
  const dailyUnits = dailyCons * doseSize;
  const estDaysLeft = dailyUnits > 0 ? Math.floor(newTotal / dailyUnits) : Math.floor(newTotal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (num <= 0) return;
    setLoading(true);
    try {
      await onSave(item.medicine_id, item.medicine_name, newTotal, num, "add", unit);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[95vh] overflow-y-auto relative animate-[fadeIn_.2s_ease]">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
          <X c="w-3.5 h-3.5"/>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#D6F3F4] text-[#004346] flex items-center justify-center font-bold">
            <Plus c="w-4 h-4" />
          </div>
          <h2 className="text-xl font-extrabold text-[#004346]">Restock Medicine</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">Update stock count for <strong className="text-gray-700">{item.medicine_name}</strong>.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 font-semibold block">Current Available Stock</span>
              <span className="font-extrabold text-[#004346] text-sm">{item.current_stock} {unit}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 font-semibold block">Formulation</span>
              <span className="font-bold text-gray-700 uppercase text-[11px] bg-gray-200/60 px-2 py-0.5 rounded-md">{item.formulation || "tablet"}</span>
            </div>
          </div>

          <div>
            <label className="label">QUANTITY TO ADD ({unit.toUpperCase()}) *</label>
            <div className="relative">
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="input text-sm pr-20 font-bold" placeholder="e.g. 30" required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">{unit}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#D6F3F4]/50 border border-[#508991]/20 space-y-2 text-xs">
            <div className="flex justify-between items-center text-gray-600 font-medium">
              <span>New Total Stock:</span>
              <span className="font-extrabold text-[#004346] text-sm">{newTotal} {unit}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600 font-medium">
              <span>Re-estimated Supply:</span>
              <span className="font-extrabold text-[#004346] text-sm">~{estDaysLeft > 0 ? estDaysLeft : 0} day(s)</span>
            </div>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all ${loading ? "bg-[#508991]" : "bg-[#004346] hover:bg-[#508991]"}`}>
            {loading ? "Updating Stock..." : "Confirm Restock"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── AI Refill Prediction Engine ─────────────────────────
function RefillPredictionWidget({ token, patientId, showToast, loadMedicines }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [refillFilter, setRefillFilter] = useState("all");

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

  const handleConfirmRefill = async (medId, medName, newTotalStock, addedQty, mode, unit) => {
    try {
      const q = patientId ? `?patient_id=${patientId}` : "";
      await axios.patch(`${API}/medicines/${medId}${q}`, { stock: newTotalStock }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Stock refilled for ${medName} (+${addedQty} ${unit})`);
      fetchPredictions();
      if (loadMedicines) loadMedicines();
    } catch {
      showToast("Failed to update stock", "error");
    }
  };

  if (loading) return null;
  if (predictions.length === 0) return null;

  const filteredPredictions = predictions.filter(p => {
    if (refillFilter === "healthy") return p.status === "healthy";
    if (refillFilter === "refill_recommended") return p.status === "refill_recommended" || p.status === "critical";
    if (refillFilter === "out_of_stock") return p.status === "out_of_stock";
    return true;
  });

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-4">
      {activeModalItem && (
        <RefillStockModal
          item={activeModalItem}
          token={token}
          patientId={patientId}
          onClose={() => setActiveModalItem(null)}
          onSave={handleConfirmRefill}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-[#004346] flex items-center gap-2">
            AI Refill Prediction Engine
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Automated stock depletion forecasts and recommended refill schedules</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select value={refillFilter} onChange={e => setRefillFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#004346] outline-none cursor-pointer">
            <option value="all">All Predictions</option>
            <option value="healthy">Full Stock</option>
            <option value="refill_recommended">Refill Recommendation</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <span className="px-3 py-1 rounded-xl bg-[#D6F3F4] text-[#004346] text-xs font-extrabold uppercase">
            AI Active
          </span>
        </div>
      </div>

      {/* Horizontal Multi-Column Grid */}
      {filteredPredictions.length === 0 ? (
        <div className="text-center py-8 text-xs font-bold text-gray-400">
          No refill predictions matching "{refillFilter.replace('_', ' ')}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPredictions.map(p => {
            const unit = getFormulationUnit(p.formulation);
            return (
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
                      <span className="font-extrabold text-[#004346] text-xs">{p.current_stock} {unit}</span>
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
                    }`} style={{ width: `${Math.min(100, (p.current_stock / (p.daily_consumption * 14 || 30)) * 100)}%` }}/>
                  </div>
                </div>

                <button onClick={() => setActiveModalItem(p)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[#004346] hover:bg-[#508991] text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5">
                  <Plus c="w-3.5 h-3.5"/> Restock Medicine
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SVG Line Chart Component ─────────────────────────────
function SVGLineChart({ dataTrend }) {
  if (!dataTrend || dataTrend.length === 0) return null;

  const width = 500;
  const height = 120;
  const paddingX = 30;
  const paddingY = 20;

  const pointsCount = dataTrend.length;
  const stepX = pointsCount > 1 ? (width - paddingX * 2) / (pointsCount - 1) : 0;

  const coords = dataTrend.map((item, idx) => {
    const pct = Math.min(100, Math.max(0, item.adherence_pct || 0));
    const x = paddingX + idx * stepX;
    const y = height - paddingY - (pct / 100) * (height - paddingY * 2);
    return { x, y, pct, label: item.day || item.label || "" };
  });

  const linePath = coords.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - 10} L ${coords[0].x.toFixed(1)} ${height - 10} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004346" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#004346" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill="url(#lineGrad)" />
        {/* Main smooth stroke */}
        <path d={linePath} fill="none" stroke="#004346" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {coords.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#004346" strokeWidth="2.5" />
            <text x={pt.x} y={pt.y - 8} textAnchor="middle" className="text-[9px] font-extrabold fill-[#004346]">{pt.pct}%</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── SVG Pie / Donut Chart Component ──────────────────────
function SVGPieChart({ taken, missed, totalScheduled }) {
  const total = Math.max(1, totalScheduled || (taken + missed));
  const pending = Math.max(0, total - (taken + missed));

  const pTaken = taken / total;
  const pMissed = missed / total;
  const pPending = pending / total;

  const circumference = 251.32; // 2 * pi * r (r=40)

  const dashTaken = (pTaken * circumference).toFixed(1);
  const dashMissed = (pMissed * circumference).toFixed(1);
  const dashPending = (pPending * circumference).toFixed(1);

  const offsetTaken = 0;
  const offsetMissed = -(pTaken * circumference);
  const offsetPending = -((pTaken + pMissed) * circumference);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 p-4 bg-gray-50/70 border border-gray-100 rounded-2xl">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E5E7EB" strokeWidth="14" />
          {/* Taken Slice (Emerald) */}
          {pTaken > 0 && (
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#10B981"
              strokeWidth="14"
              strokeDasharray={`${dashTaken} ${circumference}`}
              strokeDashoffset={offsetTaken}
            />
          )}
          {/* Missed Slice (Amber/Rose) */}
          {pMissed > 0 && (
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#F59E0B"
              strokeWidth="14"
              strokeDasharray={`${dashMissed} ${circumference}`}
              strokeDashoffset={offsetMissed}
            />
          )}
          {/* Pending Slice (Teal) */}
          {pPending > 0 && (
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#004346"
              strokeWidth="14"
              strokeDasharray={`${dashPending} ${circumference}`}
              strokeDashoffset={offsetPending}
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xs font-black text-[#004346]">{Math.round(pTaken * 100)}%</span>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Adherence</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          <span className="font-bold text-gray-700">Doses Taken:</span>
          <span className="font-extrabold text-[#004346]">{taken}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          <span className="font-bold text-gray-700">Missed Doses:</span>
          <span className="font-extrabold text-amber-700">{missed}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#004346] inline-block" />
          <span className="font-bold text-gray-700">Scheduled Doses:</span>
          <span className="font-extrabold text-teal-800">{totalScheduled}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Medication Adherence Analytics Component ─────────────
function AdherenceAnalytics({ token, patientId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("weekly"); // "weekly" | "monthly"

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

  if (loading || !data) return null;

  const currentTrend = timeframe === "weekly" ? (data.weekly_trend || []) : (data.monthly_trend || []);
  const currentTaken = timeframe === "weekly" ? (data.weekly_taken ?? data.total_taken ?? 0) : (data.monthly_taken ?? data.total_taken ?? 0);
  const currentMissed = timeframe === "weekly" ? (data.weekly_missed ?? 0) : (data.monthly_missed ?? data.total_missed_30 ?? 0);
  const currentScheduled = timeframe === "weekly" ? (data.weekly_scheduled ?? data.total_scheduled ?? 0) : (data.monthly_scheduled ?? data.total_scheduled ?? 0);
  const currentPct = timeframe === "weekly" ? (data.weekly_pct ?? data.overall_pct ?? 0) : (data.monthly_pct ?? data.overall_pct ?? 0);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-extrabold text-base text-[#004346]">Medication Adherence Analytics</h3>
          <p className="text-xs text-gray-400">Track adherence trends, dosage consistency, and stock depletion forecasts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTimeframe("weekly")}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                timeframe === "weekly" ? "bg-[#004346] text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              7-Day Weekly
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("monthly")}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                timeframe === "monthly" ? "bg-[#004346] text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              30-Day Monthly
            </button>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-[#D6F3F4] text-[#004346] text-xs font-extrabold uppercase">
            Score: {currentPct}% ({data.consistency_grade})
          </span>
        </div>
      </div>

      {/* Visual Analytics Grid: Line Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SVG Line Chart */}
        <div className="p-4 bg-gray-50/60 border border-gray-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#004346] uppercase">Adherence Line Chart</p>
            <span className="text-[10px] font-bold text-gray-400">{timeframe === "weekly" ? "7-Day" : "30-Day"} Trend</span>
          </div>
          <SVGLineChart dataTrend={currentTrend} />
        </div>

        {/* SVG Pie Chart */}
        <div className="p-4 bg-gray-50/60 border border-gray-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#004346] uppercase">Dose Distribution Pie Chart</p>
            <span className="text-[10px] font-bold text-gray-400">{timeframe === "weekly" ? "7-Day Breakdown" : "30-Day Breakdown"}</span>
          </div>
          <SVGPieChart taken={currentTaken} missed={currentMissed} totalScheduled={currentScheduled} />
        </div>
      </div>

      {/* Dynamic Adherence Bar Graph */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold text-[#004346] uppercase tracking-wider">
            {timeframe === "weekly" ? "7-Day Adherence Trend" : "30-Day Adherence Trend (Weekly Blocks)"}
          </p>
          <span className="text-[10px] font-bold text-gray-400">Target: 85%+ Adherence</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 items-end h-36 pt-4 border-b border-gray-100 pb-3">
          {currentTrend.map((item, idx) => (
            <div key={item.date || item.label || idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-extrabold text-[#004346]">{item.adherence_pct}%</span>
              <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: "80px" }}>
                <div
                  className="bg-gradient-to-t from-[#004346] to-[#508991] w-full rounded-t-lg transition-all duration-300"
                  style={{ height: `${Math.max(5, item.adherence_pct)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-full">
                {item.day || item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
        <div className="p-3.5 bg-teal-50/60 border border-teal-100 rounded-2xl">
          <p className="text-xl font-extrabold text-[#004346]">{currentTaken}</p>
          <p className="text-[10px] text-[#004346] font-bold uppercase mt-0.5">{timeframe === "weekly" ? "Taken (7 Days)" : "Total Doses Taken"}</p>
        </div>
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
          <p className="text-xl font-extrabold text-emerald-700">{currentPct}%</p>
          <p className="text-[10px] text-emerald-700 font-bold uppercase mt-0.5">{timeframe === "weekly" ? "7-Day Score" : "30-Day Score"}</p>
        </div>
        <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
          <p className="text-xl font-extrabold text-amber-700">{currentMissed}</p>
          <p className="text-[10px] text-amber-700 font-bold uppercase mt-0.5">{timeframe === "weekly" ? "Missed Doses (7 Days)" : "Missed Doses (30 Days)"}</p>
        </div>
        <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl">
          <p className="text-xl font-extrabold text-[#508991] truncate">{data.consistency_grade}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Consistency Status</p>
        </div>
      </div>

      {/* Stock Depletion Gauges Overview */}
      {data.stock_overview && (
        <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#004346] uppercase">Stock Depletion Status Gauges</p>
            <span className="text-[10px] font-bold text-gray-400">Automated Refill Engine</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2.5 bg-white rounded-xl border border-gray-100">
              <span className="text-base font-extrabold text-emerald-600">{data.stock_overview.full_stock}</span>
              <p className="text-[10px] text-gray-500 font-bold">Full Stock</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100">
              <span className="text-base font-extrabold text-amber-600">{data.stock_overview.refill_recommended}</span>
              <p className="text-[10px] text-gray-500 font-bold">Low Stock Alert</p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-gray-100">
              <span className="text-base font-extrabold text-rose-600">{data.stock_overview.out_of_stock}</span>
              <p className="text-[10px] text-gray-500 font-bold">Out of Stock</p>
            </div>
          </div>
        </div>
      )}
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

  const registerPushNotifications = useCallback(async () => {
    if (!token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported by browser");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Notification permission denied");
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        let vapidPublicKey = "";
        try {
          const keyRes = await axios.get(`${API}/notifications/vapid-key`);
          vapidPublicKey = keyRes.data?.public_key || "";
        } catch {}
        if (!vapidPublicKey) return;
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }
      const subInfo = sub.toJSON();
      const payload = {
        endpoint: subInfo.endpoint,
        p256dh: subInfo.keys?.p256dh,
        auth: subInfo.keys?.auth
      };
      await axios.post(`${API}/notifications/subscribe`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Subscribed to push notifications successfully!");
    } catch (err) {
      console.warn("Failed to subscribe push notifications:", err);
    }
  }, [token]);

  useEffect(() => {
    registerPushNotifications();
  }, [registerPushNotifications]);


  const [tab, setTab] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const urlTab = p.get("tab");
    const storedTab = localStorage.getItem("pillsync_active_tab");
    return urlTab || storedTab || "overview";
  });
  const [tabHistory, setTabHistory] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const initialTab = p.get("tab") || localStorage.getItem("pillsync_active_tab") || "overview";
    return [initialTab];
  });

  const goTo = t => {
    if (!t) return;
    setTab(t);
    setTabHistory(h => (h[h.length - 1] === t ? h : [...h, t]));
    localStorage.setItem("pillsync_active_tab", t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

  const goBack = () => {
    if (tabHistory.length <= 1) return;
    const h = tabHistory.slice(0, -1);
    const prevTab = h[h.length - 1];
    setTabHistory(h);
    setTab(prevTab);
    localStorage.setItem("pillsync_active_tab", prevTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", prevTab);
    window.history.replaceState(null, "", url.toString());
  };
  const canGoBack = tabHistory.length > 1;

  useEffect(() => {
    if (tab) {
      localStorage.setItem("pillsync_active_tab", tab);
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== tab) {
        url.searchParams.set("tab", tab);
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [tab]);

  const [showAdd,          setShowAdd]          = useState(false);
  const [showOcrModal,     setShowOcrModal]     = useState(false);
  const [showAddPatient,   setShowAddPatient]   = useState(false);
  const [editingMedicine,  setEditingMedicine]  = useState(null);
  const [editingPatient,   setEditingPatient]   = useState(null);
  const [editingContact,   setEditingContact]   = useState(null);
  const [deleteConfirm,           setDeleteConfirm]           = useState(null);
  const [showDeleteAccountModal,  setShowDeleteAccountModal]  = useState(false);
  const [deleteAccountLoading,    setDeleteAccountLoading]    = useState(false);
  const [progressSubTab,          setProgressSubTab]          = useState(() => localStorage.getItem("pillsync_progress_subtab") || "chart");
  const [globalMedSearch,         setGlobalMedSearch]         = useState("");
  const [searchDropdownOpen,      setSearchDropdownOpen]      = useState(false);
  const [historyFilter,           setHistoryFilter]           = useState("all");

  useEffect(() => {
    if (progressSubTab) {
      localStorage.setItem("pillsync_progress_subtab", progressSubTab);
    }
  }, [progressSubTab]);


  // AI Assistant states
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState([]);

  const loadEmergencyContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/emergency-contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencyContacts(res.data);
    } catch {}
  }, [token]);

  useEffect(() => {
    loadEmergencyContacts();
  }, [loadEmergencyContacts]);


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
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const pid = p.get("patient_id") || localStorage.getItem("pillsync_selected_patient_id");
    return pid ? Number(pid) : null;
  });

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem("pillsync_selected_patient_id", String(selectedPatientId));
    }
  }, [selectedPatientId]);

  const [medicines,   setMedicines]   = useState([]);
  const [medSearch,   setMedSearch]   = useState("");
  const [schedule,    setSchedule]    = useState([]);
  const [adherence,   setAdherence]   = useState({ total_scheduled:0, taken:0, missed:0, adherence_pct:0, active_count:0, low_stock_meds:[] });
  const [history,     setHistory]     = useState([]);
  const [medLoading,  setMedLoading]  = useState(false);
  const [histLoading, setHistLoading] = useState(false);

  const initialProfilePhone = parsePhone(user?.phone);
  const [profileCountryCode, setProfileCountryCode] = useState(initialProfilePhone.code);
  const [profilePhoneNum, setProfilePhoneNum] = useState(initialProfilePhone.num);
  const [profileForm, setProfileForm] = useState({
    name: user?.name||"", gender: user?.gender||"male",
    age:    user?.age||"",
    weight: user?.weight ? String(user.weight).replace(" kg","") : "",
    height: user?.height ? String(user.height).replace(" cm","") : "",
    blood_group: user?.blood_group||"",
  });

  const [pwForm,      setPwForm]      = useState({ new_password:"", confirm_password:"", code:"" });
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [profLoading, setProfLoading] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  // ─── Extended App Settings State ───
  const [appSettings, setAppSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("pillsync_app_settings");
      return saved ? JSON.parse(saved) : {
        pushNotifs: true,
        emailNotifs: true,
        smsNotifs: false,
        caregiverAlerts: true,
        refillLeadDays: 5,
        snoozeEnabled: true,
        snoozeDuration: 15,
        escalateEnabled: true,
        escalateThreshold: 2,
        quietHoursEnabled: false,
        quietStart: "23:00",
        quietEnd: "06:00",
        darkMode: false,
        highContrast: false,
        fontSize: "normal",
        timeFormat: "12h",
        timeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Kolkata",
        allowAnalytics: true,
        compactMode: false
      };
    } catch {
      return {
        pushNotifs: true, emailNotifs: true, smsNotifs: false, caregiverAlerts: true,
        refillLeadDays: 5, snoozeEnabled: true, snoozeDuration: 15, escalateEnabled: true, escalateThreshold: 2,
        quietHoursEnabled: false, quietStart: "23:00", quietEnd: "06:00",
        darkMode: false, highContrast: false, fontSize: "normal",
        timeFormat: "12h", timeZone: "Asia/Kolkata", allowAnalytics: true, compactMode: false
      };
    }
  });

  // ─── Apply Active App Settings to DOM (Theme, High Contrast, Font Scaling) ───
  useEffect(() => {
    // 1. Dark Mode
    if (appSettings.darkMode) {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#090C08";
      document.body.style.color = "#F3F4F6";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#FAFBFB";
      document.body.style.color = "#1F2937";
    }

    // 2. High Contrast
    if (appSettings.highContrast) {
      document.documentElement.classList.add("high-contrast");
      document.body.style.fontWeight = "700";
    } else {
      document.documentElement.classList.remove("high-contrast");
      document.body.style.fontWeight = "normal";
    }

    // 3. Font Size Scaling
    if (appSettings.fontSize === "large") {
      document.documentElement.style.fontSize = "18px";
    } else if (appSettings.fontSize === "xlarge") {
      document.documentElement.style.fontSize = "20px";
    } else {
      document.documentElement.style.fontSize = "16px";
    }
  }, [appSettings.darkMode, appSettings.highContrast, appSettings.fontSize]);

  const toggleSetting = async (key) => {
    const updated = { ...appSettings, [key]: !appSettings[key] };
    setAppSettings(updated);
    try { localStorage.setItem("pillsync_app_settings", JSON.stringify(updated)); } catch(e){}
    
    if (key === "pushNotifs" && updated.pushNotifs && "Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        try {
          new Notification("PillSync Notifications Enabled", {
            body: "You will receive dose reminders and alerts.",
          });
        } catch(e) {}
      }
    }
    showToast("Setting updated", "success");
  };

  const setSettingValue = (key, val) => {
    const updated = { ...appSettings, [key]: val };
    setAppSettings(updated);
    try { localStorage.setItem("pillsync_app_settings", JSON.stringify(updated)); } catch(e){}
    showToast("Setting saved", "success");
  };

  const handleExportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Medicine Name,Category,Dosage,Formulation,Current Stock,Frequency,Scheduled Times\n";
      medicines.filter(m => !m.is_deleted).forEach(m => {
        const times = (m.schedules || []).join(" | ");
        csvContent += `"${m.name || ""}","${m.category || ""}","${m.dosage || ""}","${m.formulation || ""}","${m.stock || 0}","${m.schedules?.length || 1} times/day","${times}"\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `pillsync_medications_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("Medication list exported as CSV!", "success");
    } catch(e) {
      showToast("Failed to export CSV", "error");
    }
  };

  const handleExportPDF = () => {
    try {
      const printWin = window.open("", "_blank");
      if (!printWin) {
        showToast("Please allow popups to generate PDF report", "error");
        return;
      }
      const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PillSync Medical Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #1f2937; line-height: 1.5; }
            .header { border-bottom: 2px solid #004346; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #004346; }
            .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #004346; color: white; text-align: left; padding: 10px; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            .badge { background: #d6f3f4; color: #004346; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PillSync Medical Summary Report</div>
            <div class="subtitle">Generated on ${dateStr} for ${user?.name || "Patient"} (${user?.email || ""})</div>
          </div>
          <h3>Active Prescription & Medication List</h3>
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Dosage</th>
                <th>Formulation</th>
                <th>Stock Left</th>
                <th>Schedules</th>
              </tr>
            </thead>
            <tbody>
              ${medicines.filter(m => !m.is_deleted).map(m => `
                <tr>
                  <td><strong>${m.name || "N/A"}</strong></td>
                  <td>${m.category || "N/A"}</td>
                  <td>${m.dosage || "N/A"}</td>
                  <td><span class="badge">${m.formulation || "pill"}</span></td>
                  <td>${m.stock ?? "N/A"}</td>
                  <td>${(m.schedules || []).join(", ") || "None"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `;
      printWin.document.write(html);
      printWin.document.close();
      showToast("PDF report generated successfully!", "success");
    } catch(e) {
      showToast("Failed to generate PDF report", "error");
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem("pillsync_notifications");
      showToast("Local offline cache cleared", "info");
    } catch(e) {
      showToast("Failed to clear cache", "error");
    }
  };


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
    if (user) {
      setProfileForm({
        name: user.name||"", gender: user.gender||"male",
        age:    user.age||"",
        weight: user.weight ? String(user.weight).replace(" kg","") : "",
        height: user.height ? String(user.height).replace(" cm","") : "",
        blood_group: user.blood_group||"",
      });
      const parsed = parsePhone(user.phone);
      setProfileCountryCode(parsed.code);
      setProfilePhoneNum(parsed.num);
    }
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

  const handleUndoMerge = async (medId, medName) => {
    try {
      const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
      const res = await axios.post(`${API}/medicines/${medId}/undo-merge${q}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(res.data?.message || `Reverted ${medName} to previous dosage.`);
      addNotif(`Reverted "${medName}" to previous dosage and schedule.`, "info", "Dosage Reverted");
      loadSchedule();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to undo merge", "error");
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "dose") {
        const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
        await axios.post(`${API}/medicines/${deleteConfirm.medicine_id}/skip-dose${q}`, {
          date_str: deleteConfirm.date_str,
          scheduled_time: deleteConfirm.time,
          status: "skipped"
        }, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`Dose for ${deleteConfirm.name} (${deleteConfirm.time}) removed for ${deleteConfirm.date_str}.`);
        addNotif(`Dose for "${deleteConfirm.name}" at ${deleteConfirm.time} removed for ${deleteConfirm.date_str}.`, "info");
        loadSchedule();
      } else if (deleteConfirm.type === "medicine") {
        const q = effectivePatientId ? `?patient_id=${effectivePatientId}` : "";
        await axios.delete(`${API}/medicines/${deleteConfirm.id}${q}`, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`${deleteConfirm.name} removed from active medicines.`);
        addNotif(`Medicine "${deleteConfirm.name}" has been removed.`, "info");
        loadSchedule();
      } else if (deleteConfirm.type === "patient") {
        await axios.delete(`${API}/users/patients/${deleteConfirm.id}`, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`${deleteConfirm.name} deleted.`);
        addNotif(`Patient "${deleteConfirm.name}" has been deleted.`, "info");
        loadPatients();
      }
    } catch { showToast("Action failed", "error"); }
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
      const payload = { name:profileForm.name, phone:profilePhoneNum ? `${profileCountryCode}${profilePhoneNum}` : null };
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

  const handleSendPasswordCode = async () => {
    if (!user?.email) return;
    try {
      await axios.post(`${API}/auth/send-code`, {
        email: user.email,
        purpose: "change_password"
      });
      showToast("Verification code sent to your email!");
      setCodeCooldown(60);
      const timer = setInterval(() => {
        setCodeCooldown(c => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to send code", "error");
    }
  };

  const handlePwChange = async e => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) { showToast("Passwords don't match","error"); return; }
    if (!pwForm.code) { showToast("Please enter the verification code", "error"); return; }
    setPwLoading(true);
    try {
      await axios.post(`${API}/users/change-password-with-code`,
        { code: pwForm.code, new_password: pwForm.new_password },
        { headers: { Authorization: `Bearer ${token}` } });
      showToast("Password changed!");
      addNotif("Your account password has been changed successfully.", "success", "Password Updated");
      setPwForm({new_password:"",confirm_password:"",code:""});
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

  const isTimePastToday = (timeStr) => {
    if (!timeStr) return false;
    try {
      const parts = timeStr.trim().split(" ");
      if (parts.length !== 2) return false;
      const [h_m, period] = parts;
      let [h, m] = h_m.split(":").map(Number);
      if (period.toLowerCase() === "pm" && h !== 12) h += 12;
      if (period.toLowerCase() === "am" && h === 12) h = 0;
      const now = new Date();
      const sched = new Date();
      sched.setHours(h, m, 0, 0);
      return now > sched;
    } catch {
      return false;
    }
  };

  const getDayStatusDetailForMed = (medId, dateStr) => {
    const med = medicines.find(m => m.id === medId);
    const dayLogs = history.filter(log => log.medicine_id === medId && log.log_date === dateStr);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const schedules = (med && med.schedules && med.schedules.length > 0) ? med.schedules : ["08:00 am"];
    const totalDoses = schedules.length;

    // If medicine has a start_date, and dateStr is before start_date: it was not active yet (blank)
    const medStart = med?.start_date || (med?.created_at ? med.created_at.split("T")[0].split(" ")[0] : null);
    if (medStart && dateStr < medStart) {
      return {
        type: "not_started",
        takenCount: 0,
        missedCount: 0,
        pendingCount: totalDoses,
        totalDoses,
        label: `Not assigned for this day (Started on ${medStart})`
      };
    }

    // Past date (before today)
    if (dateStr < todayStr) {
      // If no logs exist for this past date, medicine was not assigned for this day -> Blank
      if (dayLogs.length === 0) {
        return {
          type: "not_started",
          takenCount: 0,
          missedCount: 0,
          pendingCount: totalDoses,
          totalDoses,
          label: `Not assigned for ${dateStr}`
        };
      }

      const takenCount = dayLogs.filter(l => l.status === "taken").length;
      const missedCount = dayLogs.filter(l => l.status === "missed").length;
      const totalLogged = dayLogs.length;

      if (takenCount === totalLogged && totalLogged > 0) {
        return {
          type: "taken",
          takenCount,
          missedCount: 0,
          pendingCount: 0,
          totalDoses: totalLogged,
          label: totalLogged === 1 ? "1/1 dose taken" : `All ${totalLogged}/${totalLogged} doses taken`
        };
      }

      if (missedCount === totalLogged && totalLogged > 0) {
        return {
          type: "missed",
          takenCount: 0,
          missedCount,
          pendingCount: 0,
          totalDoses: totalLogged,
          label: totalLogged === 1 ? "0/1 dose taken (Missed)" : `0/${totalLogged} doses taken (All missed)`
        };
      }

      const breakdown = [];
      if (takenCount > 0) breakdown.push(`${takenCount} taken`);
      if (missedCount > 0) breakdown.push(`${missedCount} missed`);

      return {
        type: "partial",
        takenCount,
        missedCount,
        pendingCount: 0,
        totalDoses: totalLogged,
        label: `${takenCount}/${totalLogged} doses taken (${breakdown.join(", ")})`
      };
    }

    // Future date (after today): upcoming blank
    if (dateStr > todayStr) {
      return {
        type: "pending",
        takenCount: 0,
        missedCount: 0,
        pendingCount: totalDoses,
        totalDoses,
        label: `${totalDoses} doses scheduled (Upcoming)`
      };
    }

    // Today (dateStr === todayStr)
    let takenCount = 0;
    let missedCount = 0;
    let pendingCount = 0;

    for (const schTime of schedules) {
      const isTaken = dayLogs.some(l => l.scheduled_time === schTime && l.status === "taken");
      if (isTaken) {
        takenCount++;
      } else {
        if (isTimePastToday(schTime)) {
          missedCount++;
        } else {
          pendingCount++;
        }
      }
    }

    let type = "partial";
    if (takenCount === totalDoses && totalDoses > 0) {
      type = "taken";
    } else if (missedCount === totalDoses && totalDoses > 0) {
      type = "missed";
    } else if (pendingCount === totalDoses && totalDoses > 0) {
      type = "pending";
    }

    let label = "";
    if (type === "taken") {
      label = totalDoses === 1 ? "1/1 dose taken" : `All ${totalDoses}/${totalDoses} doses taken`;
    } else if (type === "missed") {
      label = totalDoses === 1 ? "0/1 dose taken (Missed)" : `0/${totalDoses} doses taken (All missed)`;
    } else if (type === "pending") {
      label = totalDoses === 1 ? `Scheduled for ${schedules[0]} (Upcoming)` : `${totalDoses} doses scheduled (Upcoming)`;
    } else {
      const breakdown = [];
      if (takenCount > 0) breakdown.push(`${takenCount} taken`);
      if (missedCount > 0) breakdown.push(`${missedCount} missed`);
      if (pendingCount > 0) breakdown.push(`${pendingCount} upcoming`);
      label = `${takenCount}/${totalDoses} doses taken (${breakdown.join(", ")})`;
    }

    return {
      type,
      takenCount,
      missedCount,
      pendingCount,
      totalDoses,
      label
    };
  };

  const getDayStatusForMed = (medId, dateStr) => {
    const detail = getDayStatusDetailForMed(medId, dateStr);
    return detail.type;
  };

  const last7Days = getLast7Days();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      appSettings.darkMode 
        ? "bg-[#090C08] text-gray-100" 
        : "bg-gradient-to-br from-[#D6F3F4] via-[#f0fafa] to-[#D6F3F4] text-[#172A3A]"
    }`}>
      <style>{`
        .label { display:block; font-size:10px; font-weight:800; color:#004346; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .input { width:100%; padding:12px 16px; border-radius:16px; border:2px solid #f3f4f6; background:white; font-size:14px; font-weight:600; color:#1f2937; outline:none; transition:border-color .2s; }
        .input:focus { border-color:#508991; }
        @keyframes fadeIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {deleteConfirm && (
        <ConfirmModal
          title={
            deleteConfirm.type === "dose"
              ? "Remove Dose for Today"
              : `Delete ${deleteConfirm.type === "medicine" ? "Medicine" : "Patient"}`
          }
          message={
            deleteConfirm.type === "dose"
              ? `Remove the ${deleteConfirm.time} dose of "${deleteConfirm.name}" for ${deleteConfirm.date_str}? This only removes this single dose slot for this date without deleting the medicine from your list.`
              : `Are you sure you want to remove "${deleteConfirm.name}"? This cannot be undone.`
          }
          confirmLabel={deleteConfirm.type === "dose" ? "Remove Dose" : "Delete"}
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
      {editingContact && (
        <EditEmergencyContactModal 
          contact={editingContact} 
          token={token} 
          onClose={() => setEditingContact(null)} 
          onSave={(updated) => {
            setEmergencyContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            showToast("Emergency contact updated!");
          }}
        />
      )}


      {/* ── NAVBAR ── */}
      <nav className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between shadow-sm transition-colors duration-300 ${
        appSettings.darkMode ? "bg-[#121814]/95 border-gray-800 text-white" : "bg-white/90 border-gray-100 text-gray-800"
      }`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#004346] text-white flex items-center justify-center shadow-md"><PillIcon c="w-4 h-4"/></div>
          <span className={`font-extrabold text-lg sm:text-xl tracking-tight hidden md:inline ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}>PillSync</span>
          
          {/* Global Medicine Search Bar (Wider, Bolder & Clean UI) */}
          <div className="relative">
            <div className={`flex items-center border-2 rounded-2xl px-3.5 py-1.5 transition-all focus-within:border-[#004346] focus-within:ring-2 focus-within:ring-[#004346]/10 shadow-sm ${
              appSettings.darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-[#004346]/20"
            }`}>
              <svg className={`w-4 h-4 shrink-0 mr-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                value={globalMedSearch}
                onChange={e => { setGlobalMedSearch(e.target.value); setSearchDropdownOpen(true); }}
                onFocus={() => setSearchDropdownOpen(true)}
                placeholder="Search medicine across tabs..."
                className={`bg-transparent text-xs font-extrabold outline-none w-48 sm:w-72 md:w-80 ${appSettings.darkMode ? "text-white placeholder:text-gray-500" : "text-[#004346] placeholder:text-gray-400"}`}
              />
              {globalMedSearch && (
                <button onClick={() => { setGlobalMedSearch(""); setSearchDropdownOpen(false); }} className="text-gray-400 hover:text-gray-700 cursor-pointer ml-1">
                  <X c="w-3.5 h-3.5"/>
                </button>
              )}
            </div>

            {/* Live Search Dropdown */}
            {searchDropdownOpen && globalMedSearch.trim() && (
              <div className={`absolute left-0 top-11 w-64 sm:w-72 rounded-2xl shadow-2xl border z-50 animate-[slideDown_.2s_ease] overflow-hidden ${
                appSettings.darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-800"
              }`}>
                <div className="p-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-2">Matching Medicines</span>
                  <button onClick={() => setSearchDropdownOpen(false)} className="text-[10px] font-bold text-[#508991] hover:underline cursor-pointer px-2">Close</button>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
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
          <div className={`flex items-center gap-1 p-1 rounded-xl text-[10px] font-extrabold ${appSettings.darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
            {["patient", "caregiver", "admin"].map((r) => (
              <button key={r} onClick={() => { if (role === r) return; logout(`/login?role=${r}`); }}
                className={`px-2 sm:px-3 py-1.5 rounded-lg cursor-pointer capitalize transition-all ${role === r ? "bg-[#004346] text-white shadow" : "text-gray-400 hover:text-[#004346]"}`}>
                {r}
              </button>
            ))}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(o => !o)}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                appSettings.darkMode ? "bg-gray-800 text-teal-300 hover:bg-gray-700" : "bg-gray-100 hover:bg-[#D6F3F4] text-[#004346]"
              }`}>
              <Bell c="w-4 h-4"/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {notifOpen && (
              <div className={`absolute right-0 top-11 w-80 rounded-2xl shadow-2xl border z-50 animate-[slideDown_.2s_ease] overflow-hidden ${
                appSettings.darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-800"
              }`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h4 className={`font-extrabold text-sm ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Notifications</h4>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 font-semibold">No notifications right now</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#004346] flex items-center justify-center shrink-0 mt-0.5">
                          <Bell c="w-3.5 h-3.5"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>{n.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                          <span className="text-[9px] text-gray-400 mt-1 block font-medium">{n.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Summary Header */}
          <div className={`flex items-center gap-2 sm:gap-2.5 border-l pl-2 sm:pl-3 ${appSettings.darkMode ? "border-gray-800" : "border-gray-200"}`}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#004346] text-white font-extrabold flex items-center justify-center uppercase shadow-sm text-xs sm:text-sm shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="block">
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-extrabold leading-tight truncate max-w-[110px] sm:max-w-[160px] ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>{user?.name}</p>
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
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border ml-0.5 shrink-0 ${
                appSettings.darkMode ? "bg-gray-800 border-gray-700 text-teal-300 hover:bg-gray-700" : "bg-teal-50 border-teal-100/60 text-[#004346] hover:bg-teal-100"
              }`} title="Edit Account Settings">
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

      <div className="flex h-[calc(100vh-65px)] overflow-hidden w-full">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="hidden md:flex flex-col w-[180px] shrink-0 bg-white border-r border-gray-100 px-3 py-4 gap-0.5 h-full overflow-y-auto">
          <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
          {[
            {key:"overview",label:"Overview",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>},
            {key:"medicines",label:role==="patient"?"My Medicines":"Medicines",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>},
            ...(["caregiver","admin"].includes(role)?[{key:"patients",label:"Patients",icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}]:[]),
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
          <div className="mt-auto pt-4 border-t border-gray-100 space-y-1.5 shrink-0">
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
        <div className="flex-1 h-full overflow-y-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">
          <div className="max-w-[1200px] mx-auto w-full">


        {/* ── PATIENT VITALS BANNER ── */}
        {vitalsPatient && (
          <div className="mb-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#004346] to-[#508991] text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none"/>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center font-extrabold text-xl uppercase border border-white/10 shrink-0">{vitalsPatient.name?.slice(0,1)}</div>
                <div>
                  <p className="text-[9px] font-extrabold text-[#74B3CE] uppercase tracking-wider">Patient Vitals</p>
                  <h2 className="text-base sm:text-lg font-extrabold leading-tight">{vitalsPatient.name}</h2>
                  <p className="text-[11px] text-white/75">{vitalsPatient.email}{vitalsPatient.phone ? ` • ${vitalsPatient.phone}` : ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 bg-black/15 p-2 sm:p-3 rounded-xl border border-white/5 flex-1 sm:max-w-md lg:max-w-lg">
                {[["Gender",vitalsPatient.gender||"—","capitalize"],["Age",vitalsPatient.age?`${vitalsPatient.age} yrs`:"—"],["Weight",vitalsPatient.weight||"—"],["Height",vitalsPatient.height||"—"],["Blood Group",vitalsPatient.blood_group||"—"]].map(([l,v,ex])=>(
                  <div key={l}><p className="text-[8px] sm:text-[9px] font-extrabold text-[#74B3CE] uppercase tracking-wider whitespace-nowrap">{l}</p><p className={`text-xs font-bold ${ex||""}`}>{v}</p></div>
                ))}
              </div>
              <button onClick={()=>role==="patient"?goTo("settings"):setEditingPatient(vitalsPatient)}
                className="self-start sm:self-auto px-2.5 py-1.5 bg-white text-[#004346] hover:bg-[#74B3CE] hover:text-white rounded-xl text-xs font-extrabold transition-all shadow flex items-center gap-1 shrink-0 cursor-pointer">
                <Edit c="w-3 h-3"/> Edit Vitals
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
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
                          <button onClick={()=>setDeleteConfirm({type:"dose",medicine_id:dose.medicine_id,time:dose.scheduled_time,name:dose.name,date_str:selectedDate})}
                            className="w-8 h-8 rounded-xl bg-white/70 border border-white text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center cursor-pointer transition-all" title="Remove this dose for today">
                            <Trash c="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/10 rounded-2xl p-2.5 sm:p-3 text-center">
                          <p className="text-lg sm:text-xl font-extrabold text-emerald-400">{adherence.taken || 0}</p>
                          <p className="text-[10px] text-white/70 font-semibold">Taken</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-2.5 sm:p-3 text-center">
                          <p className="text-lg sm:text-xl font-extrabold text-rose-400">{adherence.missed || 0}</p>
                          <p className="text-[10px] text-white/70 font-semibold">Missed</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-2.5 sm:p-3 text-center">
                          <p className="text-lg sm:text-xl font-extrabold text-amber-300">
                            {Math.max(0, (adherence.total_scheduled || 0) - ((adherence.taken || 0) + (adherence.missed || 0)))}
                          </p>
                          <p className="text-[10px] text-white/70 font-semibold">Pending</p>
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
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-50/90 via-red-50/40 to-white border border-rose-200/90 shadow-sm space-y-3.5 animate-[fadeIn_.2s_ease]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-rose-400 opacity-20"></span>
                      <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 ring-4 ring-rose-100">
                        <AlertIcon c="w-5 h-5 drop-shadow-xs" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-rose-950 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                        <span>Low Stock Alert — Immediate Action Needed</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-extrabold">
                          {medicines.filter(m => !m.is_deleted && m.stock < 10).length} Item{medicines.filter(m => !m.is_deleted && m.stock < 10).length > 1 ? "s" : ""}
                        </span>
                      </h4>
                      <p className="text-[11px] text-rose-700/90 font-medium mt-0.5">
                        The following medicines are running low or out of stock. Please restore stock soon:
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold text-xs shadow-sm whitespace-nowrap">
                    <AlertIcon c="w-3.5 h-3.5" />
                    Refill Needed
                  </span>
                </div>

                {/* Cleanly spaced badges */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-100">
                  {medicines.filter(m => !m.is_deleted && m.stock < 10).map(med => (
                    <div key={med.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-rose-200/80 shadow-xs text-xs">
                      <span className="font-extrabold text-[#004346]">{med.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${
                        med.stock === 0 ? "bg-rose-600 text-white shadow-xs" : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
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
                    {med.has_previous_state && (
                      <button
                        type="button"
                        onClick={() => handleUndoMerge(med.id, med.name)}
                        className="mt-1 w-full py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                        title="Revert to previous dosage and schedule"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
                        </svg>
                        Undo Merge (Revert to Previous Dosage)
                      </button>
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
                              const detail = getDayStatusDetailForMed(med.id, day.dateStr);
                              const { type, takenCount, missedCount, pendingCount, totalDoses, label } = detail;

                              const takenPct = (takenCount / totalDoses) * 100;
                              const missedPct = (missedCount / totalDoses) * 100;
                              const pendingPct = (pendingCount / totalDoses) * 100;
                              const conicBg = `conic-gradient(#10b981 0% ${takenPct}%, #f43f5e ${takenPct}% ${takenPct + missedPct}%, #e5e7eb ${takenPct + missedPct}% 100%)`;

                              return (
                                <div key={day.dateStr} className="flex flex-col items-center gap-1 shrink-0">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{day.dayName}</span>
                                  <span className="text-[8px] font-extrabold text-gray-300">{day.dateNum}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      showToast(`${med.name} (${day.dateStr}): ${label}`);
                                    }}
                                    title={`${med.name} on ${day.dateStr}: ${label}`}
                                    style={type === "partial" ? { background: conicBg } : undefined}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${
                                      type === "taken" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" :
                                      type === "missed" ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" :
                                      type === "not_started" || type === "pending" ? "border-2 border-dashed border-gray-200 bg-gray-50 text-gray-300 hover:bg-gray-100" :
                                      "p-0.5 shadow-sm"
                                    }`}>
                                    {type === "taken" ? <Check c="w-4 h-4" /> :
                                     type === "missed" ? <X c="w-4 h-4" /> :
                                     type === "not_started" || type === "pending" ? <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> :
                                     <span className="w-5 h-5 rounded-full bg-white text-[9px] font-black text-gray-800 flex items-center justify-center shadow-xs">
                                       {takenCount}/{totalDoses}
                                     </span>}
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

        {/* ════ HISTORY TAB ════ */}
        {tab === "history" && (() => {
          const filteredHistory = history.filter(log => {
            const matchesSearch = !globalMedSearch || (log.medicine_name || '').toLowerCase().includes(globalMedSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (historyFilter === "taken") return log.status === "taken";
            if (historyFilter === "pending") return log.status === "pending" || log.status === "scheduled";
            if (historyFilter === "missed") return log.status === "missed";
            return true;
          });

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#004346]">Medication History</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Complete log of all taken, missed and pending doses.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#004346] outline-none cursor-pointer">
                    <option value="all">All Statuses</option>
                    <option value="taken">Taken</option>
                    <option value="pending">Pending</option>
                    <option value="missed">Missed</option>
                  </select>
                  {histLoading && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
                </div>
              </div>
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-14 sm:p-16 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                  <Clock c="w-12 h-12 text-gray-200 mb-4"/><p className="text-sm font-bold text-gray-400">No history records matching "{historyFilter}".</p>
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
                      {filteredHistory.map(log=>(
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
          );
        })()}


        {/* ════════ SETTINGS TAB ════════ */}
        {tab === "settings" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">

              {/* 1. NOTIFICATION SETTINGS */}
              <div className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border flex flex-col justify-between transition-all ${
                appSettings.darkMode ? "bg-[#121814] border-gray-800 text-white shadow-lg" : "bg-white border-gray-100 text-gray-800 shadow-sm"
              }`}>
                <div>
                  <div className={`border-b pb-4 mb-5 sm:mb-6 ${appSettings.darkMode ? "border-gray-800" : "border-gray-100"}`}>
                    <h3 className={`font-extrabold text-lg flex items-center gap-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}>
                      <Bell c="w-5 h-5 text-[#508991]"/> Notification Settings
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Control notifications, reminders, and caregiver alerts.</p>
                  </div>
                  <div className="space-y-4">
                    {/* Push Notifications */}
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div>
                        <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Push Notifications</p>
                        <p className="text-[10px] text-gray-400 font-medium">Browser dose reminders and instant alerts</p>
                      </div>
                      <button type="button" onClick={() => toggleSetting("pushNotifs")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.pushNotifs ? "bg-[#004346]" : "bg-gray-300"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.pushNotifs ? "translate-x-5" : "translate-x-0"}`}/>
                      </button>
                    </div>
                    {/* SMS Notifications (Disabled / Not Supported) */}
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border opacity-60 ${
                      appSettings.darkMode ? "bg-gray-800/30 border-gray-800" : "bg-gray-50/80 border-gray-100"
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-gray-300" : "text-[#004346]"}`}>SMS Notifications</p>
                          <span className="text-[9px] font-extrabold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md">Not Available</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">SMS gateway service not supported on this platform</p>
                      </div>
                      <button type="button" disabled className="w-11 h-6 rounded-full p-1 bg-gray-200 cursor-not-allowed">
                        <div className="w-4 h-4 rounded-full bg-gray-400 translate-x-0"/>
                      </button>
                    </div>
                    {/* Email Notifications */}
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div>
                        <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Email Notifications</p>
                        <p className="text-[10px] text-gray-400 font-medium">Weekly reports and refill alerts</p>
                      </div>
                      <button type="button" onClick={() => toggleSetting("emailNotifs")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.emailNotifs ? "bg-[#004346]" : "bg-gray-300"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.emailNotifs ? "translate-x-5" : "translate-x-0"}`}/>
                      </button>
                    </div>
                    {/* Caregiver Alerts */}
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div>
                        <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Caregiver Alerts</p>
                        <p className="text-[10px] text-gray-400 font-medium">Notify caregivers after missed doses</p>
                      </div>
                      <button type="button" onClick={() => toggleSetting("caregiverAlerts")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.caregiverAlerts ? "bg-[#004346]" : "bg-gray-300"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.caregiverAlerts ? "translate-x-5" : "translate-x-0"}`}/>
                      </button>
                    </div>
                    {/* Refill Alert Lead Time */}
                    <div className={`p-3.5 rounded-2xl border ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Refill Alert Lead Time</p>
                        <span className="text-[11px] font-extrabold text-[#004346] dark:text-teal-300 bg-teal-50 dark:bg-teal-900/40 px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-700 shrink-0">{appSettings.refillLeadDays} {appSettings.refillLeadDays === 1 ? "Day" : "Days"} Before</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium mb-2.5">Set how many days before medicine runs out to receive a refill warning alert.</p>
                      
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-gray-500">Alert me:</span>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={appSettings.refillLeadDays}
                          onChange={e => setSettingValue("refillLeadDays", Math.max(1, parseInt(e.target.value) || 1))}
                          className={`w-24 px-3 py-1.5 rounded-xl text-xs font-extrabold border outline-none text-center ${
                            appSettings.darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-200 text-[#004346]"
                          }`}
                        />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">days before stock reaches 0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. REMINDER PREFERENCES */}
              <div className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border flex flex-col justify-between transition-all ${
                appSettings.darkMode ? "bg-[#121814] border-gray-800 text-white shadow-lg" : "bg-white border-gray-100 text-gray-800 shadow-sm"
              }`}>
                <div>
                  <div className={`border-b pb-4 mb-5 sm:mb-6 ${appSettings.darkMode ? "border-gray-800" : "border-gray-100"}`}>
                    <h3 className={`font-extrabold text-lg flex items-center gap-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}>
                      <Clock c="w-5 h-5 text-[#508991]"/> Reminder Preferences
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Adjust snooze, quiet hours, and time formatting.</p>
                  </div>
                  <div className="space-y-4">
                    {/* Enable Snooze & Snooze Duration */}
                    <div className={`p-3.5 rounded-2xl border space-y-2 ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Enable Snooze Alarms</p>
                          <p className="text-[10px] text-gray-500 font-medium">Pauses an active alarm and rings again after your chosen snooze time</p>
                        </div>
                        {/* Standard ON/OFF Toggle Switch Pill */}
                        <button type="button" onClick={() => toggleSetting("snoozeEnabled")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.snoozeEnabled !== false ? "bg-[#004346]" : "bg-gray-300 dark:bg-gray-600"}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.snoozeEnabled !== false ? "translate-x-5" : "translate-x-0"}`}/>
                        </button>
                      </div>

                      {appSettings.snoozeEnabled !== false && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                          <span className="text-xs font-bold text-gray-500">Snooze Duration:</span>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={appSettings.snoozeDuration}
                            onChange={e => setSettingValue("snoozeDuration", Math.max(1, parseInt(e.target.value) || 1))}
                            className={`w-20 px-3 py-1.5 rounded-xl text-xs font-extrabold border outline-none text-center ${
                              appSettings.darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-200 text-[#004346]"
                            }`}
                          />
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">minutes</span>
                        </div>
                      )}
                    </div>

                    {/* Safety Escalation After Missed Doses */}
                    <div className={`p-3.5 rounded-2xl border space-y-2 ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Escalate After Missed Doses</p>
                          <p className="text-[10px] text-gray-500 font-medium">Automatically notifies your linked caregiver or emergency contact if you miss this many doses in a row.</p>
                        </div>
                        {/* Standard ON/OFF Toggle Switch Pill */}
                        <button type="button" onClick={() => toggleSetting("escalateEnabled")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer shrink-0 ml-2 ${appSettings.escalateEnabled !== false ? "bg-[#004346]" : "bg-gray-300 dark:bg-gray-600"}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.escalateEnabled !== false ? "translate-x-5" : "translate-x-0"}`}/>
                        </button>
                      </div>

                      {appSettings.escalateEnabled !== false && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                          <span className="text-xs font-bold text-gray-500">Escalate after:</span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={appSettings.escalateThreshold}
                            onChange={e => setSettingValue("escalateThreshold", Math.max(1, parseInt(e.target.value) || 1))}
                            className={`w-20 px-3 py-1.5 rounded-xl text-xs font-extrabold border outline-none text-center ${
                              appSettings.darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-200 text-[#004346]"
                            }`}
                          />
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">missed {appSettings.escalateThreshold === 1 ? "dose" : "doses"} in a row</span>
                        </div>
                      )}
                    </div>
                    {/* Quiet Hours */}
                    <div className={`p-3.5 rounded-2xl border space-y-2 ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Quiet Hours</p>
                          <p className="text-[10px] text-gray-400 font-medium">Mute alarms during rest time</p>
                        </div>
                        <button type="button" onClick={() => toggleSetting("quietHoursEnabled")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.quietHoursEnabled ? "bg-[#004346]" : "bg-gray-300"}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.quietHoursEnabled ? "translate-x-5" : "translate-x-0"}`}/>
                        </button>
                      </div>
                      {appSettings.quietHoursEnabled && (
                        <div className={`flex items-center justify-between gap-2 pt-2 border-t ${appSettings.darkMode ? "border-gray-700" : "border-gray-200"}`}>
                          <span className="text-[11px] font-bold text-gray-400">Time range:</span>
                          <div className="flex items-center gap-2">
                            <input type="time" value={appSettings.quietStart} onChange={e => setSettingValue("quietStart", e.target.value)} className={`px-2.5 py-1 rounded-xl text-xs font-bold border outline-none ${appSettings.darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-200 text-[#004346]"}`}/>
                            <span className="text-xs text-gray-400">to</span>
                            <input type="time" value={appSettings.quietEnd} onChange={e => setSettingValue("quietEnd", e.target.value)} className={`px-2.5 py-1 rounded-xl text-xs font-bold border outline-none ${appSettings.darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-200 text-[#004346]"}`}/>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Time Format */}
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                    }`}>
                      <div>
                        <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Time Format</p>
                        <p className="text-[10px] text-gray-400 font-medium">12-Hour (AM/PM) vs 24-Hour clock</p>
                      </div>
                      <div className={`flex gap-1 p-1 rounded-xl border ${appSettings.darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                        <button type="button" onClick={() => setSettingValue("timeFormat", "12h")} className={`px-3 py-1 rounded-lg text-[10px] font-extrabold ${appSettings.timeFormat === "12h" ? "bg-[#004346] text-white shadow-sm" : "text-gray-400"}`}>12-Hour</button>
                        <button type="button" onClick={() => setSettingValue("timeFormat", "24h")} className={`px-3 py-1 rounded-lg text-[10px] font-extrabold ${appSettings.timeFormat === "24h" ? "bg-[#004346] text-white shadow-sm" : "text-gray-400"}`}>24-Hour</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. APPEARANCE & ACCESSIBILITY */}
              <div className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border transition-all ${
                appSettings.darkMode ? "bg-[#121814] border-gray-800 text-white shadow-lg" : "bg-white border-gray-100 text-gray-800 shadow-sm"
              }`}>
                <div className={`border-b pb-4 mb-5 sm:mb-6 ${appSettings.darkMode ? "border-gray-800" : "border-gray-100"}`}>
                  <h3 className={`font-extrabold text-lg flex items-center gap-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}>
                    <svg className="w-5 h-5 text-[#508991]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                    Appearance & Accessibility
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Control dark theme, contrast, and font size.</p>
                </div>
                <div className="space-y-4">
                  {/* Dark Mode */}
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div>
                      <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Dark Mode</p>
                      <p className="text-[10px] text-gray-400 font-medium">Switch between light and dark theme across all tabs</p>
                    </div>
                    <button type="button" onClick={() => toggleSetting("darkMode")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.darkMode ? "bg-[#004346]" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.darkMode ? "translate-x-5" : "translate-x-0"}`}/>
                    </button>
                  </div>
                  {/* High Contrast Mode */}
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div>
                      <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>High Contrast Mode</p>
                      <p className="text-[10px] text-gray-400 font-medium">Increase contrast for easier reading</p>
                    </div>
                    <button type="button" onClick={() => toggleSetting("highContrast")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.highContrast ? "bg-[#004346]" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.highContrast ? "translate-x-5" : "translate-x-0"}`}/>
                    </button>
                  </div>
                  {/* Font Size */}
                  <div className={`p-3.5 rounded-2xl border ${
                    appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Font Size</span>
                      <span className="text-[11px] font-bold text-[#508991] capitalize bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">{appSettings.fontSize}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {["normal", "large", "xlarge"].map(sz => (
                        <button key={sz} type="button" onClick={() => setSettingValue("fontSize", sz)} className={`py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer ${appSettings.fontSize === sz ? "bg-[#004346] text-white shadow-sm" : appSettings.darkMode ? "bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}>
                          {sz === "normal" ? "Normal" : sz === "large" ? "Large" : "Extra Large"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. DATA & EXPORT */}
              <div className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border transition-all ${
                appSettings.darkMode ? "bg-[#121814] border-gray-800 text-white shadow-lg" : "bg-white border-gray-100 text-gray-800 shadow-sm"
              }`}>
                <div className={`border-b pb-4 mb-5 sm:mb-6 ${appSettings.darkMode ? "border-gray-800" : "border-gray-100"}`}>
                  <h3 className={`font-extrabold text-lg flex items-center gap-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}>
                    <svg className="w-5 h-5 text-[#508991]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                    Data & Export Options
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Export medication records in CSV or PDF format.</p>
                </div>
                <div className="space-y-4">
                  {/* Export Health Data (CSV & PDF Buttons) */}
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div>
                      <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Export Health & Medication Data</p>
                      <p className="text-[10px] text-gray-400 font-medium">Download your active prescriptions and schedules in CSV or printable PDF format</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={handleExportCSV} className="flex-1 py-2 rounded-xl bg-teal-50 border border-teal-200 text-[#004346] font-extrabold text-xs hover:bg-teal-100 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                        <svg className="w-4 h-4 text-[#004346]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Export CSV
                      </button>
                      <button type="button" onClick={handleExportPDF} className="flex-1 py-2 rounded-xl bg-[#004346] text-white font-extrabold text-xs hover:bg-[#508991] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        Export PDF Report
                      </button>
                    </div>
                  </div>
                  {/* Clear Cache */}
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div>
                      <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Clear Cache</p>
                      <p className="text-[10px] text-gray-400 font-medium">Clear offline memory and reload fresh data</p>
                    </div>
                    <button type="button" onClick={handleClearCache} className="px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 font-extrabold text-xs hover:bg-gray-200 transition-all cursor-pointer">
                      Clear Cache
                    </button>
                  </div>
                  {/* Usage Diagnostics */}
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    appSettings.darkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div>
                      <p className={`text-xs font-extrabold ${appSettings.darkMode ? "text-white" : "text-[#004346]"}`}>Usage Diagnostics</p>
                      <p className="text-[10px] text-gray-400 font-medium">Allow diagnostic reporting to improve app quality</p>
                    </div>
                    <button type="button" onClick={() => toggleSetting("allowAnalytics")} className={`w-11 h-6 rounded-full p-1 transition-all cursor-pointer ${appSettings.allowAnalytics ? "bg-[#004346]" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.allowAnalytics ? "translate-x-5" : "translate-x-0"}`}/>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. PROFILE DETAILS */}
              <div className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border transition-all ${
                appSettings.darkMode ? "bg-[#121814] border-gray-800 text-white shadow-lg" : "bg-white border-gray-100 text-gray-800 shadow-sm"
              }`}>
                <div className={`border-b pb-4 mb-5 sm:mb-6 ${appSettings.darkMode ? "border-gray-800" : "border-gray-100"}`}>
                  <h3 className={`font-extrabold text-lg flex items-center gap-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}><User c="w-5 h-5 text-[#508991]"/> Profile Details</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Update your name, phone and health stats.</p>
                </div>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div><label className="label">Full Name</label><input className={inp} value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})} required/></div>
                  <div><label className="label">Phone</label>
                    <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
                      <select value={profileCountryCode} onChange={e=>setProfileCountryCode(e.target.value)} className="px-2.5 bg-gray-50 text-xs font-extrabold border-r border-gray-200 outline-none text-[#004346]">
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+61">+61</option>
                        <option value="+971">+971</option>
                      </select>
                      <input type="tel" value={profilePhoneNum} onChange={e=>setProfilePhoneNum(e.target.value.replace(/\D/g, "").slice(0, 10))} className="flex-1 px-3 py-2 text-xs outline-none border-none focus:ring-0" placeholder="10 digit number" maxLength={10}/>
                    </div>
                  </div>
                  {role==="patient"&&(
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#D6F3F4]/30 border border-[#508991]/20">
                      <div className="col-span-2 text-[10px] font-extrabold text-[#004346] uppercase tracking-wider pb-1 border-b border-[#508991]/15">Health Stats</div>
                      <div><label className="label">Gender</label>
                        <select className={inp+" text-xs font-bold"} value={profileForm.gender} onChange={e=>setProfileForm({...profileForm,gender:e.target.value})}>
                          <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                        </select></div>
                      <div><label className="label">Age</label><input type="number" className={inp+" text-xs font-bold"} value={profileForm.age} onChange={e=>setProfileForm({...profileForm,age:e.target.value})} placeholder="25"/></div>
                      <div><label className="label">Weight (kg)</label><input type="number" className={inp+" text-xs font-bold"} value={profileForm.weight} onChange={e=>setProfileForm({...profileForm,weight:e.target.value})} placeholder="70"/></div>
                      <div><label className="label">Height (cm)</label><input type="number" className={inp+" text-xs font-bold"} value={profileForm.height} onChange={e=>setProfileForm({...profileForm,height:e.target.value})} placeholder="170"/></div>
                      <div className="col-span-2"><label className="label">Blood Group</label><input className={inp+" text-xs font-bold"} value={profileForm.blood_group} onChange={e=>setProfileForm({...profileForm,blood_group:e.target.value})} placeholder="e.g. O+, A-"/></div>
                    </div>
                  )}
                  <div><label className="label">Email (read-only)</label><input className={inp+" cursor-not-allowed text-gray-400"} value={user?.email||""} disabled/></div>
                  <button type="submit" disabled={profLoading} className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-sm cursor-pointer transition-all shadow-sm ${profLoading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
                    {profLoading?"Saving...":"Save Changes"}
                  </button>
                </form>
              </div>

              {/* 6. SECURITY */}
              <div className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] border transition-all ${
                appSettings.darkMode ? "bg-[#121814] border-gray-800 text-white shadow-lg" : "bg-white border-gray-100 text-gray-800 shadow-sm"
              }`}>
                <div className={`border-b pb-4 mb-5 sm:mb-6 ${appSettings.darkMode ? "border-gray-800" : "border-gray-100"}`}>
                  <h3 className={`font-extrabold text-lg flex items-center gap-2 ${appSettings.darkMode ? "text-teal-300" : "text-[#004346]"}`}><Lock c="w-5 h-5 text-[#508991]"/> Security</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Change your password with Gmail OTP verification.</p>
                </div>
                <form onSubmit={handlePwChange} className="space-y-4">
                  <div><label className="label">New Password</label><input type="password" className={inp} value={pwForm.new_password} onChange={e=>setPwForm({...pwForm,new_password:e.target.value})} placeholder="••••••••" required autoComplete="new-password" minLength={6}/></div>
                  <div><label className="label">Confirm New Password</label><input type="password" className={inp} value={pwForm.confirm_password} onChange={e=>setPwForm({...pwForm,confirm_password:e.target.value})} placeholder="••••••••" required autoComplete="new-password" minLength={6}/></div>
                  
                  <div>
                    <label className="label">Verification Code (Gmail)</label>
                    <div className="flex gap-2">
                      <input type="text" className={inp + " flex-1"} value={pwForm.code} onChange={e=>setPwForm({...pwForm,code:e.target.value.slice(0,6)})} placeholder="6-digit code" required maxLength={6}/>
                      <button type="button" onClick={handleSendPasswordCode} disabled={codeCooldown > 0} className={`px-4 rounded-2xl text-xs font-extrabold transition-all cursor-pointer border ${codeCooldown > 0 ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-teal-50 border-teal-200 text-[#004346] hover:bg-teal-100"}`}>
                        {codeCooldown > 0 ? `Resend (${codeCooldown}s)` : "Get Code"}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={pwLoading} className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-sm cursor-pointer transition-all shadow-sm ${pwLoading?"bg-[#508991]":"bg-[#004346] hover:bg-[#508991]"}`}>
                    {pwLoading?"Updating...":"Update Password"}
                  </button>
                </form>
              </div>

              {/* DANGER ZONE */}
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
                <div key={c.id || i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-[#D6F3F4] text-[#004346] font-extrabold flex items-center justify-center uppercase text-sm">{getInitials(c.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#004346]">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.phone} • {c.relation} {c.email ? `• ${c.email}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingContact(c)} className="text-gray-400 hover:text-[#004346] cursor-pointer" title="Edit Contact"><EditIcon c="w-4 h-4"/></button>
                    <button onClick={async () => {
                      if (c.id) {
                        try {
                          await axios.delete(`${API}/emergency-contacts/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
                          setEmergencyContacts(p => p.filter(x => x.id !== c.id));
                          showToast("Emergency contact removed!");
                        } catch {
                          showToast("Failed to delete contact", "error");
                        }
                      } else {
                        setEmergencyContacts(p => p.filter((_, j) => j !== i));
                      }
                    }} className="text-rose-400 hover:text-rose-600 cursor-pointer" title="Delete Contact"><Trash c="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const name = fd.get("name");
              const countryCode = fd.get("country_code");
              const phoneNum = fd.get("phone_num");
              const relation = fd.get("relation");
              const email = fd.get("email");
              if (!name || !phoneNum) return;
              try {
                const res = await axios.post(`${API}/emergency-contacts`, {
                  name, phone: `${countryCode}${phoneNum}`, relation, email: email || null
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setEmergencyContacts(p => [...p, res.data]);
                e.target.reset();
                showToast("Emergency contact added!");
              } catch {
                showToast("Failed to add emergency contact", "error");
              }
            }} className="mt-6 p-4 rounded-2xl bg-[#D6F3F4]/40 border border-[#508991]/15">
              <p className="text-[10px] font-extrabold text-[#004346] uppercase tracking-wide mb-3">Add New Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input name="name" placeholder="Full Name" className="input text-xs" required/>
                <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
                  <select name="country_code" className="px-2 bg-transparent text-xs font-bold border-r border-gray-200 outline-none">
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+61">+61</option>
                    <option value="+971">+971</option>
                  </select>
                  <input name="phone_num" type="tel" onChange={e => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10)} className="flex-1 px-3 py-2 text-xs outline-none border-none focus:ring-0" placeholder="10 digit number" maxLength={10} required/>
                </div>
                <input name="email" placeholder="Gmail Address" type="email" className="input text-xs"/>
                <select name="relation" className="input text-xs" required defaultValue="Family">
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Consultant/Doctor">Consultant/Doctor</option>
                  <option value="Other">Other</option>
                </select>
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

        </div>{/* end max-w wrapper */}
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
