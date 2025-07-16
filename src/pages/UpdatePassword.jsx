import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


const UpdatePassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const lang = searchParams.get("lang");

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

    useEffect(() => {
    if (lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang,i18n]);

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/users/update-password?token=${token}&newPassword=${encodeURIComponent(password)}`,
        { method: "POST" ,
             headers: {
            "X-Language": lang, // or "el", etc.
          },
        }
      );

      const result = await res.json();
      if (res.ok) setMessage(result.message);
      else setError(result.message || "Something went wrong.");
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: "auto" }}>
      <h2>{t("resetPassword.title")}</h2>
      {message ? (
        <div>
        <p style={{ color: "green" }}>{message}</p>
        <button onClick={handleLoginRedirect} className="btn btn-primary mt-3">
        {t("goToLogin")}
      </button>
        </div>
      ) : (
        <form onSubmit={handleReset}>
          <label>{t("resetPassword.newPassword")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          />
          <button type="submit">{t("resetPassword.updatePassword")}</button>
        </form>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default UpdatePassword;
