import React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifyFailed = () => {
  const query = useQuery();
  const lang = query.get("lang") || "en";

     const { t, i18n } = useTranslation();
  
    useEffect(() => {
      i18n.changeLanguage(lang); 
    }, [lang, i18n]);
  

  return (
    <div className="page-container container">
      <h1>{t("verifyFailedTitle")}</h1>
      <p>{t("verifyFailedMessage")}</p>
    </div>
  );
};

export default VerifyFailed;
