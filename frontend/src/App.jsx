import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useState } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

// Auth Context inside App.jsx
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const Protected = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/forgot"   element={<Auth mode="forgot" />} />
          <Route path="/dashboard" element={
            <Protected><Dashboard /></Protected>
          } />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

/* 
   cd frontend
npm run dev
*/

/* 
   cd frontend
npm run dev
*/