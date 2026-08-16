import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./App";
import axios from "axios";

const API = "http://127.0.0.1:8000";

// SVG Components
const PillIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
);

const BellIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const DocumentIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h8" />
    <path d="M8 10h8" />
    <path d="M8 14h6" />
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

export default function Auth({ mode }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";

  // Login Role state derived from URL query parameter or default to "patient"
  const searchParams = new URLSearchParams(location.search);
  const urlRole = searchParams.get("role");
  const [loginRole, setLoginRole] = useState(urlRole || "patient");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("role");
    if (r && ["patient", "caregiver", "admin"].includes(r)) {
      setLoginRole(r);
    }
  }, [location.search]);
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    confirmPassword: "", 
    role: "patient", 
    phone: "",
    gender: "",
    age: "",
    weight: "",
    height: "",
    code: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNum, setPhoneNum] = useState("");


  const handle = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear validation errors when typing
    if (name === "email") {
      setEmailError("");
      setError("");
    }
    if (name === "password") {
      setPasswordError("");
      setError("");
    }
    if (name === "code") {
      setCodeError("");
      setError("");
    }
  };

  const validate = () => {
    let isValid = true;
    
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!emailRegex.test(form.email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    if (isForgot && !codeSent) {
      // If code is not sent yet, we only validate email
      return isValid;
    }

    if (!form.password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    if (isForgot && !form.code) {
      setCodeError("Verification code is required");
      isValid = false;
    }

    if (isForgot && form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match");
      isValid = false;
    }

    return isValid;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true); 
    setError("");
    setSuccess("");
    try {
      if (isForgot) {
        if (!codeSent) {
          // Send verification code
          await axios.post(`${API}/auth/send-code`, {
            email: form.email,
            purpose: "reset_password"
          });
          setCodeSent(true);
          setSuccess("Verification code sent to your email!");
        } else {
          // Verify code and reset password
          await axios.post(`${API}/auth/reset-password`, {
            email: form.email,
            code: form.code,
            new_password: form.password
          });
          setSuccess("Password reset successfully! You can now log in.");
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      } else {
        const endpoint = isLogin ? "/auth/login" : "/auth/register";
        
        // Build payload depending on role & mode
        let payload;
        if (isLogin) {
          payload = { email: form.email, password: form.password };
        } else {
          payload = { 
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            phone: phoneNum ? `${countryCode}${phoneNum}` : null
          };
          // Only add patient vital stats if role is patient
          if (form.role === "patient") {
            payload.gender = form.gender;
            payload.age = form.age ? parseInt(form.age) : null;
            payload.weight = form.weight ? `${form.weight} kg` : null;
            payload.height = form.height ? `${form.height} cm` : null;
          }
        }
        
        const res = await axios.post(API + endpoint, payload);
        
        // Enforce role-based login portal separation
        if (isLogin && res.data.user.role !== loginRole) {
          setError(`This account is registered as a ${res.data.user.role}. Please sign in via the correct portal.`);
          setLoading(false);
          return;
        }

        login(res.data.token, res.data.user);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Connection refused. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-[#D6F3F4] via-[#C8D9E6] to-[#D6F3F4] text-[#172A3A] selection:bg-[#508991]/30">
      {/* Left Panel - Hidden on Mobile */}
      <div className="left-panel w-[42%] bg-[#004346] relative overflow-hidden flex flex-col justify-between p-12 text-white h-screen">
        {/* Background decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-[#508991] opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[#74B3CE] opacity-15 blur-3xl pointer-events-none" />

        {/* Logo, Hero and Feature Cards - stacked with clean gaps to prevent any overlap */}
        <div className="relative z-10 flex flex-col gap-8 my-auto w-full">
          {/* Header Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#74B3CE] text-[#004346] rounded-xl flex items-center justify-center shadow-md">
              <PillIcon className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-[#D6F3F4]">PillSync</span>
          </div>

          {/* Hero Section */}
          <div className="max-w-sm animate-float">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#508991]/30 border border-[#74B3CE]/30 text-[#D6F3F4] text-xs font-semibold uppercase tracking-wider mb-4 w-fit">
              Intelligent Healthcare
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-white mb-3">
              Smart medicine tracking, made effortless.
            </h1>
            <p className="text-sm text-[#D6F3F4]/80 leading-relaxed">
              Never miss a dose again. Connect patients, caregivers, and medicine schedules under one secure, AI-powered assistant.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="w-full space-y-3">
            {[
              { icon: <BellIcon />, title: "Smart Reminders", desc: "Automated alerts for patient dosages" },
              { icon: <DocumentIcon />, title: "Prescription OCR", desc: "Instantly scan and log prescriptions" },
              { icon: <RefreshIcon />, title: "Refill Predictions", desc: "Smart stocks and depletion alerts" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#74B3CE]/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#508991]/30 text-[#D6F3F4] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{item.title}</h4>
                  <p className="text-xs text-[#D6F3F4]/65">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-[#D6F3F4]/40 pt-4 border-t border-white/10 shrink-0">
          <span>© 2026 PillSync Inc.</span>
        </div>
      </div>

      {/* Right Panel - Login/Register/Forgot Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto h-screen">
        <div className="w-full max-w-[460px] my-auto py-8">
          <div className="glass-panel p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-[#004346]/8 border border-white/70 animate-scale-up">
            {/* Login Role Switcher Tabs */}
            {isLogin && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 font-extrabold text-[11px] sm:text-xs">
                {["patient", "caregiver", "admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setLoginRole(r);
                      setError("");
                      setSuccess("");
                      navigate(`/login?role=${r}`, { replace: true });
                    }}
                    className={`flex-1 py-2 sm:py-2.5 rounded-xl capitalize transition-all cursor-pointer ${
                      loginRole === r
                        ? "bg-[#004346] text-white shadow-sm"
                        : "text-gray-500 hover:text-[#004346]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Header info */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-[#508991] uppercase tracking-widest mb-1.5">
                {isForgot ? "Password Recovery" : isLogin ? `${loginRole.charAt(0).toUpperCase() + loginRole.slice(1)} Portal` : "Get started"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#004346]">
                {isForgot ? "Reset password" : isLogin ? `Sign in as ${loginRole.charAt(0).toUpperCase() + loginRole.slice(1)}` : "Create account"}
              </h2>
              <p className="text-xs sm:text-sm text-[#508991] mt-2">
                {isForgot 
                  ? "Enter your email and choose a new password" 
                  : isLogin 
                  ? `Access your personalized ${loginRole} dashboard` 
                  : "Register to start managing medicines and tracking schedules"}
              </p>
            </div>

            {/* Success & Error Banners */}
            {success && (
              <div className="flex items-center gap-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 rounded-xl text-sm mb-6 animate-fade-in shadow-sm">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-medium">{success}</span>
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl text-sm mb-6 animate-fade-in shadow-sm">
                <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">
              {!isLogin && !isForgot && (
                <div className="grid grid-cols-1 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#0C3C34] uppercase tracking-wider mb-1.5 ml-1">
                      Full Name
                    </label>
                    <input 
                      name="name" 
                      type="text"
                      placeholder="Enter Your Full Name" 
                      value={form.name}
                      onChange={handle} 
                      required
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#2D5B53] focus:ring-0 outline-none text-sm bg-white/70 backdrop-blur-sm transition-all placeholder:text-gray-400 font-semibold"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-[#0C3C34] uppercase tracking-wider mb-1.5 ml-1">
                      Phone Number (optional)
                    </label>
                    <div className="flex rounded-2xl border-2 border-gray-100 focus-within:border-[#2D5B53] bg-white/70 backdrop-blur-sm overflow-hidden transition-all">
                      <select 
                        value={countryCode} 
                        onChange={e => setCountryCode(e.target.value)} 
                        className="px-3 text-sm font-semibold text-[#0C3C34] bg-transparent outline-none border-r border-gray-100 cursor-pointer"
                      >
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+61">+61</option>
                        <option value="+971">+971</option>
                        <option value="+82">+82</option>
                        <option value="+33">+33</option>
                      </select>
                      <input 
                        type="tel"
                        placeholder="10 digit number" 
                        value={phoneNum}
                        onChange={e => setPhoneNum(e.target.value.replace(/\D/g, "").slice(0, 10))} 
                        maxLength={10}
                        className="flex-1 px-4 py-3 outline-none text-sm bg-transparent placeholder:text-gray-400 font-semibold border-none focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Role Select */}
                  <div>
                    <label className="block text-xs font-bold text-[#0C3C34] uppercase tracking-wider mb-1.5 ml-1">
                      Register as
                    </label>
                    <div className="relative">
                      <select 
                        name="role" 
                        value={form.role}
                        onChange={handle}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#2D5B53] focus:ring-0 outline-none text-sm bg-white/70 backdrop-blur-sm transition-all font-bold appearance-none cursor-pointer text-[#0C3C34]"
                      >
                        <option value="patient">Patient (Manage medicines)</option>
                        <option value="caregiver">Caregiver (Monitor patients)</option>
                        <option value="admin">Admin (Manage settings)</option>
                      </select>
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#2D5B53]">▼</span>
                    </div>
                  </div>

                  {/* Patient Specific Fields: Gender, Age, Weight, Height */}
                  {form.role === "patient" && (
                    <div className="p-4 rounded-2xl bg-[#E6EDE8]/45 border border-[#2D5B53]/15 space-y-3 animate-fade-in">
                      <p className="text-xs font-extrabold text-[#0C3C34] uppercase tracking-wider border-b border-[#2D5B53]/10 pb-1.5">
                        Patient Vitals (Optional)
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Gender */}
                        <div>
                          <label className="block text-[10px] font-bold text-[#0C3C34] uppercase tracking-wider mb-1 ml-1">
                            Gender
                          </label>
                          <div className="relative">
                            <select 
                              name="gender" 
                              value={form.gender}
                              onChange={handle}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#2D5B53] outline-none text-xs bg-white font-bold cursor-pointer appearance-none text-[#0C3C34]"
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#2D5B53] text-[9px]">▼</span>
                          </div>
                        </div>

                        {/* Age */}
                        <div>
                          <label className="block text-[10px] font-bold text-[#0C3C34] uppercase tracking-wider mb-1 ml-1">
                            Age (years)
                          </label>
                          <input 
                            name="age" 
                            type="number"
                            placeholder="60"
                            min="0"
                            value={form.age}
                            onChange={handle}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#2D5B53] outline-none text-xs bg-white font-bold"
                          />
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="block text-[10px] font-bold text-[#0C3C34] uppercase tracking-wider mb-1 ml-1">
                            Weight (kg)
                          </label>
                          <input 
                            name="weight" 
                            type="number" 
                            placeholder="70"
                            min="0"
                            value={form.weight}
                            onChange={handle}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#2D5B53] outline-none text-xs bg-white font-bold"
                          />
                        </div>

                        {/* Height */}
                        <div>
                          <label className="block text-[10px] font-bold text-[#0C3C34] uppercase tracking-wider mb-1 ml-1">
                            Height (cm)
                          </label>
                          <input 
                            name="height" 
                            type="number" 
                            placeholder="170"
                            min="0"
                            value={form.height}
                            onChange={handle}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#2D5B53] outline-none text-xs bg-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#0C3C34] uppercase tracking-wider mb-1.5 ml-1">
                  Email Address
                </label>
                <input 
                  name="email" 
                  type="email"
                  placeholder="you@example.com" 
                  value={form.email}
                  onChange={handle}
                  autoComplete="off"
                  className={`w-full px-4 py-3 rounded-2xl border-2 outline-none text-sm bg-white/70 backdrop-blur-sm transition-all placeholder:text-gray-400 font-semibold ${
                    emailError ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#2D5B53]'
                  }`}
                />
                {emailError && <p className="text-red-500 text-xs mt-1 ml-1 font-semibold">{emailError}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#0C3C34] uppercase tracking-wider mb-1.5 ml-1">
                  {isForgot ? "New Password" : "Password"}
                </label>
                <input 
                  name="password" 
                  type="password"
                  placeholder="••••••••" 
                  value={form.password}
                  onChange={handle}
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 rounded-2xl border-2 outline-none text-sm bg-white/70 backdrop-blur-sm transition-all placeholder:text-gray-400 font-semibold ${
                    passwordError ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#2D5B53]'
                  }`}
                />
                {passwordError && <p className="text-red-500 text-xs mt-1 ml-1 font-semibold">{passwordError}</p>}
              </div>

              {/* Confirm Password (only on Forgot Password screen) */}
              {isForgot && (
                <div>
                  <label className="block text-xs font-bold text-[#0C3C34] uppercase tracking-wider mb-1.5 ml-1">
                    Confirm New Password
                  </label>
                  <input 
                    name="confirmPassword" 
                    type="password"
                    placeholder="••••••••" 
                    value={form.confirmPassword}
                    onChange={handle}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-[#2D5B53] focus:ring-0 outline-none text-sm bg-white/70 backdrop-blur-sm transition-all placeholder:text-gray-400 font-semibold"
                  />
                </div>
              )}

              {/* Remember/Forgot Helpers */}
              {isLogin && (
                <div className="flex items-center justify-between text-xs font-semibold px-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[#004346]/80">
                    <input type="checkbox" className="rounded text-[#508991] focus:ring-0 border-gray-300 bg-white" />
                    <span>Keep me signed in</span>
                  </label>
                  <Link to="/forgot" className="text-[#508991] hover:text-[#004346] hover:underline font-bold transition-all">
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm tracking-wide shadow-lg shadow-[#004346]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                  loading 
                    ? "bg-[#508991] cursor-not-allowed" 
                    : "bg-[#004346] hover:bg-[#508991] hover:shadow-xl cursor-pointer"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Please wait...</span>
                  </>
                ) : (
                  <span>{isForgot ? "Reset Password" : isLogin ? "Sign In" : "Create Account"}</span>
                )}
              </button>
            </form>

            {/* Toggle Mode Footer */}
            <div className="mt-6 text-center text-sm font-semibold text-gray-500">
              {isForgot ? (
                <Link 
                  to="/login" 
                  className="text-[#004346] hover:text-[#508991] hover:underline font-bold transition-all"
                >
                  ← Back to Sign In
                </Link>
              ) : isLogin ? (
                <>
                  New to PillSync?{" "}
                  <Link 
                    to="/register" 
                    className="text-[#004346] hover:text-[#508991] hover:underline font-bold transition-all"
                  >
                    Register Now
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link 
                    to="/login" 
                    className="text-[#004346] hover:text-[#508991] hover:underline font-bold transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}