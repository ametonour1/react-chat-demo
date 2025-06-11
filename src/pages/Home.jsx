import React from "react";
import '../App.css';

import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1 className="title">Welcome to ChatApp</h1>
      <p className="text">Sign in or create an account to start chatting.</p>
      <button className="btn" onClick={() => navigate("/login")}>
        Sign In
      </button>
      <button
        className="btn btn-secondary"
        style={{ marginLeft: "15px" }}
        onClick={() => navigate("/signup")}
      >
        Sign Up
      </button>
    </div>
  );
}
