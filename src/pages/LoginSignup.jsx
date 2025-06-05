import React, { useState } from "react";
import '../App.css';


export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => setIsLogin(!isLogin);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: handle form submission
    alert(`${isLogin ? "Logging in" : "Signing up"}...`);
  };

  return (
    <div className="container">
      <h1 className="title">{isLogin ? "Sign In" : "Create Account"}</h1>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            className="input"
            required
            autoComplete="name"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="input"
          required
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          className="input"
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={6}
        />

        <button type="submit" className="btn" style={{ width: "100%" }}>
          {isLogin ? "Sign In" : "Sign Up"}
        </button>
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
