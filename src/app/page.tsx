"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Heart, MessageCircle, BarChart2, ShieldAlert } from "lucide-react";

export default function Home() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-deep)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
      {/* Decorative ambient glowing circles */}
      <div style={{ position: "absolute", top: "10%", left: "15%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)", zIndex: 0 }}></div>
      <div style={{ position: "absolute", bottom: "10%", right: "15%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%)", zIndex: 0 }}></div>

      <div className="glass animate-glow" style={{ position: "relative", zIndex: 1, maxWidth: "600px", width: "100%", padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Logo / Icon */}
        <div className="animate-float" style={{ display: "inline-flex", alignSelf: "center", justifyContent: "center", alignItems: "center", width: "70px", height: "70px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.1)", border: "2px solid var(--primary)" }}>
          <Heart size={35} color="var(--primary)" />
        </div>

        {/* Headings */}
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.75rem", background: "linear-gradient(135deg, var(--primary), var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Faro</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: "1.6" }}>
            Un espacio de desahogo, contención inicial y orientación emocional.
          </p>
        </div>

        {/* Features list */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", textAlign: "left", margin: "1rem 0" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <MessageCircle size={18} color="var(--primary)" />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Chat de escucha activa</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Heart size={18} color="var(--secondary)" />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Principios de TCC y DBT</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <BarChart2 size={18} color="var(--primary)" />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Monitoreo de tendencias</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <ShieldAlert size={18} color="var(--secondary)" />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Detección de crisis 24/7</span>
          </div>
        </div>

        {/* Important therapy warning disclaimer */}
        <div style={{ padding: "1rem", borderRadius: "12px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", textAlign: "justify" }}>
          <strong>Aviso de Privacidad e Importancia del Servicio:</strong> 
          <br />
          Faro es un chatbot de acompañamiento inicial impulsado por inteligencia artificial. **No reemplaza terapia ni diagnóstico profesional**. Si estás experimentando una crisis aguda de salud mental, por favor busca ayuda humana de inmediato.
        </div>

        {/* Google Login Button */}
        <button 
          onClick={loginWithGoogle} 
          className="btn-primary" 
          style={{ width: "100%", padding: "0.9rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", fontSize: "1rem" }}
        >
          {/* Custom Google Icon SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Iniciar sesión con Google
        </button>
      </div>
    </main>
  );
}
