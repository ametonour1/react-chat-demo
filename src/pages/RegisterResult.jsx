import { useLocation } from "react-router-dom";

export default function RegisterResult() {
  const { state } = useLocation();
  const { message } = state || {};

  return (
    <div className="page-container container">
      <p>{message}</p>
    </div>
  );
}