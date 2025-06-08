import React from "react";
import { useLocation } from "react-router-dom";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifyFailed = () => {
  const query = useQuery();
  const lang = query.get("lang") || "en";

  return (
    <div className="page-container">
      <h1>Verification Failed</h1>
      <p>Language: {lang}</p>
    </div>
  );
};

export default VerifyFailed;
