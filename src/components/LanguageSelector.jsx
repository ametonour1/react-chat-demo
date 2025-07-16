// src/components/LanguageSelector.jsx
import { useLanguage } from "../context/LanguageContext";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="gr">Ελληνικα</option>

      {/* Add more languages here */}
    </select>
  );
}
