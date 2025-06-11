import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

export default function RegisterResult() {
  const { state } = useLocation();
  const { message, email, lang } = state || {};
  const { t, i18n } = useTranslation();

  const [resendMessage, setResendMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      setResendMessage(t("error.missingEmail"));
      return;
    }

    setLoading(true);
    setResendMessage("");

    

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/resend-verification?email=${encodeURIComponent(email)}&lang=${lang}`, {
        method: "POST",
        headers: {
          "Accept-Language": lang,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage(data.message);
      } else {
        setResendMessage(data.error || data.message || t("error.unknown"));
      }
    } catch (err) {
      setResendMessage(t("error.network"));
    } finally {
      setLoading(false);
    }
  };

     useEffect(() => {
        i18n.changeLanguage(lang); 
      }, [lang, i18n]);
    

  console.log("logs:",email,lang)
  return (
    <div className="page-container container">
      <p>{message}</p>
      {email && (
        <div style={{ marginTop: "1rem" }}>
          <button className="btn-secondary" onClick={handleResend} disabled={loading}>
            {loading ? t("resending") : t("resendVerification")}
          </button>
          {resendMessage && <p>{resendMessage}</p>}
        </div>
      )}
    </div>
  );
}
