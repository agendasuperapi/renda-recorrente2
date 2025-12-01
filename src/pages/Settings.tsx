import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para Meu Perfil por padrão
    navigate("/settings/personal", { replace: true });
  }, [navigate]);

  return null;
};

export default Settings;