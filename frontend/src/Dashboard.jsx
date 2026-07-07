import { useState, useEffect } from "react";
import { useAuth } from "./App";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000";

// SVG Components
const PillIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CrossIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RefreshIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ShieldIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const StethoscopeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a7 7 0 0 0 7-7V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v11a7 7 0 0 0 7 7z" />
    <path d="M12 8V2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ChartBarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

const SettingsGearIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const PhoneIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z" />
  </svg>
);

const LockIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertTriangleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function Dashboard() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();

  // Tab State: 'overview' or 'settings'
  const [activeTab, setActiveTab] = useState("overview");

  // Edit Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    gender: user?.gender || "male",
    age: user?.age || "",
    weight: user?.weight ? user.weight.replace(" kg", "") : "",
    height: user?.height ? user.height.replace(" cm", "") : ""
  });

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });

  // UI States
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Toast notifications state
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // Sync profile form when user context changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
        gender: user.gender || "male",
        age: user.age || "",
        weight: user.weight ? user.weight.replace(" kg", "") : "",
        height: user.height ? user.height.replace(" cm", "") : ""
      });
    }
  }, [user]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── API handlers ──────────────────────────────────────
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }

    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone || null
      };

      if (user?.role === "patient") {
        payload.gender = profileForm.gender;
        payload.age = profileForm.age ? parseInt(profileForm.age) : null;
        payload.weight = profileForm.weight ? `${profileForm.weight} kg` : null;
        payload.height = profileForm.height ? `${profileForm.height} cm` : null;
      }

      const res = await axios.patch(
        `${API}/users/profile`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update Auth context and localstorage
      login(token, res.data);
      showToast("Profile details updated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update profile", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.old_password || !passwordForm.new_password) {
      showToast("All password fields are required", "error");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("New passwords do not match", "error");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API}/users/password`,
        {
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast("Password updated successfully!", "success");
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to change password", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  // Get current week days for calendar row
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Get Sunday of this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayOfWeek);

    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      days.push({
        name: current.toLocaleDateString("en-US", { weekday: "short" }),
        date: current.getDate(),
        isToday: current.toDateString() === new Date().toDateString(),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const currentMonthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const role = user?.role || "patient";

  // Overview Stats Setup
  const stats = [
    { icon: <PillIcon className="w-5 h-5" />, label: "Active Medicines", value: role === "patient" ? "3" : "0", bg: "border-[#004346]/15 text-[#004346]" },
    { icon: <CheckIcon className="w-5 h-5" />, label: "Doses Taken", value: role === "patient" ? "8" : "0", bg: "border-emerald-500/10 text-emerald-700" },
    { icon: <CrossIcon className="w-5 h-5" />, label: "Doses Missed", value: "0", bg: "border-rose-500/10 text-rose-700" },
    { icon: <RefreshIcon className="w-5 h-5" />, label: "Refills Due", value: role === "patient" ? "1" : "0", bg: "border-amber-500/10 text-[#74B3CE]" },
  ];

  return (
    <div className="min-h-screen bg-[#D6F3F4] text-[#172A3A] selection:bg-[#74B3CE]/30">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-[#004346]/5 px-6 sm:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#004346] text-white flex items-center justify-center font-bold">
            <PillIcon className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#004346]">PillSync</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Role badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold text-white bg-gradient-to-r ${
            role === "admin" 
              ? "from-purple-600 to-pink-600" 
              : role === "caregiver" 
              ? "from-blue-600 to-indigo-600" 
              : "from-[#004346] to-[#508991]"
          } shadow-sm uppercase tracking-wider`}>
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              {role === "admin" ? <ShieldIcon className="w-3 h-3" /> : role === "caregiver" ? <StethoscopeIcon className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
            </span>
            <span>{role}</span>
          </span>

          {/* User profile info */}
          <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
            <div className="w-9 h-9 rounded-xl bg-[#004346] text-[#D6F3F4] font-bold flex items-center justify-center text-sm shadow-inner uppercase">
              {user?.name?.slice(0, 2) || "PS"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-[#172A3A] leading-none mb-0.5">{user?.name}</p>
              <p className="text-[10px] text-gray-500 leading-none">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="cursor-pointer border border-[#004346]/15 hover:border-[#004346] text-[#004346] hover:bg-[#004346]/5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-[1140px] mx-auto px-6 py-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold text-[#508991] uppercase tracking-widest mb-1.5">
              Dashboard / Overview
            </div>
            <h1 className="text-3xl font-extrabold text-[#004346] flex items-center gap-2">
              Hi, {user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Be in control of your medication schedules and user profile.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit self-start sm:self-center">
              <button
                onClick={() => setActiveTab("overview")}
                className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "overview"
                    ? "bg-[#004346] text-[#D6F3F4] shadow-md shadow-[#004346]/20"
                    : "text-gray-500 hover:text-[#004346]"
                }`}
              >
                <ChartBarIcon className="w-3.5 h-3.5" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "settings"
                    ? "bg-[#004346] text-[#D6F3F4] shadow-md shadow-[#004346]/20"
                    : "text-gray-500 hover:text-[#004346]"
                }`}
              >
                <SettingsGearIcon className="w-3.5 h-3.5" />
                Account Settings
              </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-slide-up">
            
            {/* Left and Mid Column: Calendar and Schedule list */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Calendar Selector widget */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 mb-6 text-sm font-bold text-[#004346]">
                  <span>{currentMonthYear}</span>
                  <span className="text-xs text-gray-400">▼</span>
                </div>

                {/* Horizontal Calendar row */}
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer ${
                        day.isToday 
                          ? "bg-[#004346] text-white shadow-md shadow-[#004346]/15" 
                          : "bg-[#D6F3F4]/60 hover:bg-[#D6F3F4] text-gray-500"
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${day.isToday ? "text-[#74B3CE]" : "text-gray-400"}`}>
                        {day.name}
                      </span>
                      <span className="text-lg font-extrabold mt-1">
                        {day.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient checklist */}
              {role === "patient" && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#004346] text-lg pl-1">To take</h3>
                  
                  <div className="space-y-3">
                    {[
                      { name: "Probiotic, 250mg", desc: "1 pill, once per day", time: "09:00 am", taken: true },
                      { name: "Loratadine, 10mg", desc: "1 pill, once per day", time: "16:00 pm", taken: false },
                      { name: "Vitamin B12", desc: "take on empty stomach", time: "08:00 am", taken: true },
                    ].map((med, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-4 rounded-3xl bg-white border border-gray-100 shadow-sm hover:border-[#004346]/10 transition-all duration-300 relative overflow-hidden group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Circular medicine pill icon container */}
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                            med.taken ? "bg-emerald-50 text-emerald-600" : "bg-[#D6F3F4] text-[#74B3CE]"
                          }`}>
                            <PillIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold">{med.desc}</p>
                            <h4 className="font-extrabold text-[#004346] text-base mt-0.5">{med.name}</h4>
                            <p className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                              <span>{med.time}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Checkmark */}
                        <div className="flex items-center gap-3">
                          {med.taken ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                              <CheckIcon className="w-4 h-4" />
                            </div>
                          ) : (
                            <button 
                              onClick={() => showToast(`${med.name} marked as taken!`, "success")}
                              className="cursor-pointer w-8 h-8 rounded-full bg-[#D6F3F4] text-gray-400 hover:bg-rose-500 hover:text-white border border-gray-200 hover:border-transparent flex items-center justify-center transition-all"
                            >
                              <CrossIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caregiver view */}
              {role === "caregiver" && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#004346] text-lg pl-1">Monitored Profiles</h3>
                  
                  <div className="space-y-3">
                    {[
                      { name: "Rahul Saha (Father)", age: 62, gender: "male", weight: "70 kg", height: "172 cm", adherence: "94%", lastAction: "1.5 hours ago" },
                      { name: "Devi Saha (Mother)", age: 58, gender: "female", weight: "62 kg", height: "162 cm", adherence: "100%", lastAction: "30 mins ago" },
                    ].map((patient, i) => (
                      <div key={i} className="flex flex-col p-5 rounded-3xl bg-white border border-gray-100 shadow-sm gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#D6F3F4] rounded-2xl flex items-center justify-center text-[#004346]">
                              <UserIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[#004346] text-base">{patient.name}</h4>
                              <p className="text-xs text-gray-400 font-bold capitalize">{patient.gender} • {patient.age} years</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 justify-between sm:justify-end">
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Last Taken</p>
                              <p className="text-xs font-bold text-gray-700 mt-1">{patient.lastAction}</p>
                            </div>
                            <div className="bg-[#D6F3F4] text-[#004346] px-4 py-2 rounded-2xl font-extrabold text-sm border border-[#508991]/10">
                              {patient.adherence} Adherence
                            </div>
                          </div>
                        </div>
                        
                        {/* Vitals summary for caregiver */}
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-3 text-xs font-semibold text-gray-500">
                          <div>Height: <span className="text-[#004346]">{patient.height}</span></div>
                          <div>Weight: <span className="text-[#004346]">{patient.weight}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Console View */}
              {role === "admin" && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-[#004346] text-lg pl-1">System Console</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-400 font-bold uppercase">System Health</p>
                      <p className="text-2xl font-extrabold text-[#004346] mt-1">Healthy</p>
                      <p className="text-[11px] text-gray-400 mt-1">Uptime status: 99.98%</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-400 font-bold uppercase">Total Accounts</p>
                      <p className="text-2xl font-extrabold text-[#004346] mt-1">12 Registered</p>
                      <p className="text-[11px] text-gray-400 mt-1">PostgreSQL Database active</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Cabinet promo display */}
            <div className="space-y-6">
              
              {/* Cabinet showcase widget - Design matching screenshot 2 */}
              <div className="bg-[#004346] text-[#D6F3F4] p-8 rounded-[36px] shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[340px]">
                {/* Background bubbles decoration */}
                <div className="absolute top-[-30px] right-[-30px] w-32 h-32 rounded-full bg-[#74B3CE]/10 blur-xl" />
                <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 rounded-full bg-white/5" />
                
                <div className="z-10">
                  <h3 className="text-3xl font-extrabold leading-tight text-white mb-2">
                    Your Personal<br />Drug Cabinet
                  </h3>
                  <p className="text-sm text-[#D6F3F4]/75 font-semibold">
                    Be in control of your meds
                  </p>
                </div>

                {/* Minimal mockup illustration inside the cabinet widget */}
                <div className="my-6 z-10 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <PillIcon className="w-5 h-5 text-[#74B3CE]" />
                    <div>
                      <p className="text-xs font-bold text-white">Daily adherence</p>
                      <p className="text-[10px] text-[#D6F3F4]/60">Check status details</p>
                    </div>
                  </div>
                  <span className="text-[#74B3CE] text-xs font-extrabold">92%</span>
                </div>

                <div className="z-10 mt-auto">
                  <button 
                    onClick={() => showToast("Features opening in Milestone 2!", "success")}
                    className="cursor-pointer w-full py-3 bg-[#74B3CE] hover:bg-[#F4ECE1] text-[#004346] hover:text-[#004346] font-extrabold text-sm rounded-2xl tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Get started</span>
                    <span className="font-bold">↗</span>
                  </button>
                </div>
              </div>

              {/* Profile overview card (Now with Patient Vitals if Patient) */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#D6F3F4] text-[#004346] font-extrabold flex items-center justify-center text-xl uppercase">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#004346] text-sm">{user?.name}</h4>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {user?.phone && <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><PhoneIcon className="w-3 h-3" />{user?.phone}</p>}
                  </div>
                </div>
                
                {/* Patient vitals details in card */}
                {role === "patient" && (user?.age || user?.gender || user?.weight || user?.height) && (
                  <div className="border-t border-gray-50 pt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-gray-500">
                    {user.gender && (
                      <div>Gender: <span className="text-[#004346] capitalize">{user.gender}</span></div>
                    )}
                    {user.age && (
                      <div>Age: <span className="text-[#004346]">{user.age} yrs</span></div>
                    )}
                    {user.height && (
                      <div>Height: <span className="text-[#004346]">{user.height}</span></div>
                    )}
                    {user.weight && (
                      <div>Weight: <span className="text-[#004346]">{user.weight}</span></div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Settings */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
            
            {/* Profile Info Form */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-gray-100">
              <div className="border-b border-gray-100 pb-4 mb-6">
                <h3 className="font-extrabold text-lg text-[#004346] flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Profile Details
                </h3>
                <p className="text-xs text-gray-500">Update your account name and phone number information.</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#004346] uppercase tracking-wider mb-1.5 ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#508991] focus:ring-0 outline-none text-sm bg-white transition-all font-semibold text-gray-800"
                    placeholder="Ayushi Saha"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#004346] uppercase tracking-wider mb-1.5 ml-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#508991] focus:ring-0 outline-none text-sm bg-white transition-all font-semibold text-gray-800"
                    placeholder="+91 9876543210"
                  />
                </div>

                {/* Patient Specific Vitals editing */}
                {role === "patient" && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#D6F3F4]/45 border border-[#508991]/15">
                    <div className="col-span-2">
                      <p className="text-xs font-extrabold text-[#004346] uppercase tracking-wide border-b border-[#508991]/10 pb-1">
                        Patient Health Stats
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-[#004346] uppercase tracking-wider mb-1">
                        Gender
                      </label>
                      <select 
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs bg-white font-bold cursor-pointer text-[#004346]"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#004346] uppercase tracking-wider mb-1">
                        Age
                      </label>
                      <input 
                        type="number" 
                        value={profileForm.age}
                        onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs bg-white font-bold text-gray-800"
                        placeholder="60"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#004346] uppercase tracking-wider mb-1">
                        Weight (kg)
                      </label>
                      <input 
                        type="number" 
                        value={profileForm.weight}
                        onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs bg-white font-bold text-gray-800"
                        placeholder="70"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#004346] uppercase tracking-wider mb-1">
                        Height (cm)
                      </label>
                      <input 
                        type="number" 
                        value={profileForm.height}
                        onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none text-xs bg-white font-bold text-gray-800"
                        placeholder="170"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#004346] uppercase tracking-wider mb-1.5 ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-400 outline-none text-sm cursor-not-allowed font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm tracking-wide shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    profileLoading 
                      ? "bg-[#508991] cursor-not-allowed" 
                      : "bg-[#004346] hover:bg-[#508991]"
                  }`}
                >
                  {profileLoading ? (
                    "Saving Profile..."
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4" />
                      Save Profile Changes
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-gray-100">
              <div className="border-b border-gray-100 pb-4 mb-6">
                <h3 className="font-extrabold text-lg text-[#004346] flex items-center gap-2">
                  <LockIcon className="w-5 h-5" />
                  Security Settings
                </h3>
                <p className="text-xs text-gray-500">Change your password securely. Minimum 6 characters required.</p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#004346] uppercase tracking-wider mb-1.5 ml-1">
                    Old Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#508991] focus:ring-0 outline-none text-sm bg-white transition-all font-semibold text-gray-800"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <hr className="border-gray-100 my-2" />

                <div>
                  <label className="block text-xs font-bold text-[#004346] uppercase tracking-wider mb-1.5 ml-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#508991] focus:ring-0 outline-none text-sm bg-white transition-all font-semibold text-gray-800"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#004346] uppercase tracking-wider mb-1.5 ml-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#508991] focus:ring-0 outline-none text-sm bg-white transition-all font-semibold text-gray-800"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm tracking-wide shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    passwordLoading 
                      ? "bg-[#508991] cursor-not-allowed" 
                      : "bg-[#004346] hover:bg-[#508991]"
                  }`}
                >
                  {passwordLoading ? (
                    "Updating Password..."
                  ) : (
                    <span className="flex items-center gap-2">
                      <LockIcon className="w-4 h-4" />
                      Update Password
                    </span>
                  )}
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-scale-up">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-950/5" 
              : "bg-red-50 border-red-200 text-red-800 shadow-red-950/5"
          }`}>
            <span className={toast.type === "success" ? "text-emerald-600" : "text-red-500"}>
              {toast.type === "success" ? <CheckCircleIcon className="w-5 h-5" /> : <AlertTriangleIcon className="w-5 h-5" />}
            </span>
            <div className="font-semibold text-sm">{toast.message}</div>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-85 text-xs font-bold leading-none select-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
