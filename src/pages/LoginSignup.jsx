import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../App.css';


export default function LoginSignup({ isLogin: isLoginProp = true }) {
  const [isLogin, setIsLogin] = useState(isLoginProp);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");


  const toggleMode = () => setIsLogin(!isLogin);
  const navigate = useNavigate();

  const handleRegister = async () => {
  const url = `${process.env.REACT_APP_API_URL}/users/register`;
  const payload = { username, email, password };
  const lang = "es"

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json",
                 "Accept-Language": lang || "en" 
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (response.ok) alert(`Login successful! Token: ${data.token}`);
    else alert(`Login error: ${data.message || 'Invalid credentials'}`);
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
};


  
const handleSubmit = (e) => {
  e.preventDefault();
  if (isLogin) {
    handleLogin();
  } else {
    handleRegister();
  }
};

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
      </form>

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
