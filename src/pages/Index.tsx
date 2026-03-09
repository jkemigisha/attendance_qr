import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const dismissedInstall = localStorage.getItem("install-dismissed");

      if (session) {
        navigate("/dashboard");
      } else if (!isStandalone && !dismissedInstall) {
        navigate("/install");
      } else {
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate]);

  return null;
};

export default Index;
