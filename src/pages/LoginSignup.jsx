import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

import '../App.css';


export default function LoginSignup({ isLogin: isLoginProp = true }) {
  const [isLogin, setIsLogin] = useState(isLoginProp);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showResend,setShowResend] = useState(false)

  const { t, i18n } = useTranslation();
  const { login } = useAuth();

  const [resendMessage, setResendMessage] = useState("");
  const [loading, setLoading] = useState(false);


  const toggleMode = () => setIsLogin(!isLogin);
  const navigate = useNavigate();
  const lang = "es"


  const handleRegister = async () => {
  const url = `${process.env.REACT_APP_API_URL}/users/register`;
  const payload = { username, email, password };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json",
                 "Accept-Language": "en",
                  "X-Language":lang 
       },
      body: JSON.stringify(payload),
    });
    //const text = await response.text();
    const data = await response.json();
    console.log("data",data)
    if (response.ok) { navigate("/register-result", {
        state: {
          message: data.message,
          success: true,
          lang:lang,
          email:email
        },
      });}
    else {setErrorMessage(data.message);
      console.log("error",data)
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
};

const handleLogin = async () => {
  const url = `${process.env.REACT_APP_API_URL}/users/login`;
  const payload = { email, password };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "Accept-Language": "en",
        "X-Language":lang
       },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (response.ok) {
      login(data.token, data);
      navigate("/dashboard");
    }
    else {
       if (data.key === "user.error.verificationExpired") {
    setErrorMessage(data.message);
    setShowResend(true); // trigger rendering the resend button
  } else {
    setErrorMessage(data.message);
  }
    };
    console.log("data",data)
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
};

const handleResendEmail = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/users/resend-verification?email=${email}&lang=${lang}`, {
      method: "POST",
    });
    const data = await res.json();
    setResendMessage(data.message);
  } catch (err) {
    setResendMessage("Error sending verification email.");
  } finally {
    setLoading(false);
  }
};

const handleForgotPassword =  async (email) => {
 
  navigate("/password-reset");
};

  
const handleSubmit = (e) => {
  e.preventDefault();
  if (isLogin) {
    handleLogin();
  } else {
    handleRegister();
  }
};

   useEffect(() => {
        i18n.changeLanguage(lang); 
      }, [lang, i18n]);
    

  return (
    <div className="container">
      <h1 className="title">{isLogin ? "Sign In" : "Create Account"}</h1>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            className="input"
            required
            autoComplete="name"
            onChange={(e) => setUsername(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="input"
          required
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="input"
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="btn" style={{ width: "100%" }}>
          {isLogin ? "Sign In" : "Sign Up"}
        </button>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {showResend && (
  <button type="button" onClick={handleResendEmail}>
    {loading ? t("resending") : t("resendVerification")}
  </button>
  
)}
{resendMessage && <p>{resendMessage}</p>}
      </form>
      {isLogin && (
  <p
    className="text" 
    style={{ marginTop: "20px" }}
  >Forgot Password?
    <span
      className="btn btn-secondary"
      style={{ cursor: "pointer", padding: "5px 10px", marginLeft:"10px",fontSize: "14px" }}
      onClick={handleForgotPassword}
    >
      Reset Password
    </span>
  </p>
)}
      <p className="text" style={{ marginTop: "20px" }}>
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <span
          className="btn btn-secondary"
          style={{ cursor: "pointer", padding: "5px 10px", fontSize: "14px" }}
          onClick={toggleMode}
        >
          {isLogin ? "Sign Up" : "Sign In"}
        </span>
      </p>
    </div>
  );
}
