import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a aba de perfil por padrão
    navigate("/settings/profile", { replace: true });
  }, [navigate]);

  return null;
};

export default Settings;