import React from "react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifySuccess = () => {
  const query = useQuery();
  const lang = query.get("lang") || "en";

    const { t, i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(lang); 
  }, [lang, i18n]);

  return (
     <div className="page-container">
      <h1>{t("verifySuccessTitle")}</h1>
      <p>{t("verifySuccessMessage")}</p>
    </div>
  );
};

export default VerifySuccess;
