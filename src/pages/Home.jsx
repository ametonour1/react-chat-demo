import React from "react";
import '../App.css';
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";



export default function Home() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t, i18n } = useTranslation();
  
    useEffect(() => {
          i18n.changeLanguage(language); 
        }, [language, i18n]);
      


  return (
    <div className="container">
      <h1 className="title">{t("welcome")}</h1>
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
