
import './App.css';
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LoginSignup from "./pages/LoginSignup";
import VerifySuccess from "./pages/VerifySuccess";
import VerifyFailed from "./pages/VerifyFailed";
import RegisterResult from './pages/RegisterResult';
import ResetPassword from "./pages/ResetPassword"
import PrivateRoute from "./routes/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import LanguageSelector from "./components/LanguageSelector";
import UpdatePassword from './pages/UpdatePassword';
import CreateEncryptionKeys from './pages/CreateEncryptionKeys';
import RecoverEncryptionKeys from './pages/RecoverEncryptionKeys';


import './i18n'; 


function App() {
  return (
    <>
      <header style={{ position: "absolute", top: 10, right: 10 }}>
        <LanguageSelector />
      </header>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginSignup isLogin={true} />} />
        <Route path="/signup" element={<LoginSignup isLogin={false} />} />
        <Route path="/verify-success" element={<VerifySuccess />} />
        <Route path="/verify-failed" element={<VerifyFailed />} />
        <Route path="/register-result" element={<RegisterResult />} />
        <Route path="/password-reset" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />


         <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route path="/setup-encryption" element={<PrivateRoute><CreateEncryptionKeys /></PrivateRoute>} />
          <Route path="/recover-encryption" element={<PrivateRoute><RecoverEncryptionKeys /></PrivateRoute>} />

      </Routes>
    </Router>
    </>
  );
}

export default App;
