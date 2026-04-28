import { useState } from "react";
import { translations } from "../constants/translations";

export const useLanguage = () => {
  const [language] = useState("en");

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const toggleLanguage = () => {
    // Language switching is disabled; use English only.
  };

  return { language, t, toggleLanguage };
};

export default useLanguage;
