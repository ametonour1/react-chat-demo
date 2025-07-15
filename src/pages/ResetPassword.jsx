import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";


const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { language } = useLanguage();
  const { t, i18n } = useTranslation();
    
      useEffect(() => {
            i18n.changeLanguage(language); 
          }, [language, i18n]);
        
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/users/request-password-reset?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
           headers: {
            "X-Language": language, // or "el", etc.
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        setMessage(result.message); // "Password reset email sent successfully."
      } else {
        console.log("res",response)
        setError(result.message);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
      <h2>{t("resetPassword.title")}</h2>
      {message ? (
        <p style={{ color: "green" }}>{message}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">{t("resetPassword.enterEmail")}</label>
          <input
            type="email"
            id="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", margin: "10px 0" }}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : t("resetPassword.sendResetLink")}
          </button>
        </form>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default PasswordReset;
