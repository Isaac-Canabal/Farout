"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ShieldAlert } from "lucide-react";

/**
 * DisclaimerModal
 * 
 * Muestra el aviso obligatorio de que Faro no reemplaza terapia profesional.
 * La aceptación se persiste en Firestore (colección `consents`, doc = userId)
 * para que quede vinculada a la cuenta, no al navegador.
 * 
 * Props:
 *  - onAccepted: callback cuando el usuario ya aceptó (sea en esta sesión o antes)
 */

interface DisclaimerModalProps {
  onAccepted: () => void;
}

export default function DisclaimerModal({ onAccepted }: DisclaimerModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar si el usuario ya aceptó el disclaimer (consultando Firestore)
  useEffect(() => {
    if (!user) return;

    const checkConsent = async () => {
      try {
        const consentRef = doc(db, "consents", user.uid);
        const consentSnap = await getDoc(consentRef);

        if (consentSnap.exists() && consentSnap.data().disclaimerAccepted) {
          // Ya aceptó previamente
          setIsOpen(false);
          onAccepted();
        } else {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error checking consent:", error);
        // En caso de error, mostramos el disclaimer por precaución
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    };

    checkConsent();
  }, [user, onAccepted]);

  const handleAccept = async () => {
    if (!user) return;

    try {
      const consentRef = doc(db, "consents", user.uid);
      await setDoc(consentRef, {
        disclaimerAccepted: true,
        acceptedAt: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email,
      }, { merge: true });

      setIsOpen(false);
      onAccepted();
    } catch (error) {
      console.error("Error saving consent:", error);
    }
  };

  if (loading || !isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(4, 8, 16, 0.9)",
      backdropFilter: "blur(10px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      padding: "1rem",
    }}>
      <div className="glass animate-glow" style={{
        maxWidth: "520px",
        width: "100%",
        padding: "2.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        textAlign: "center",
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          border: "2px solid var(--error)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "center",
        }}>
          <ShieldAlert size={28} color="var(--error)" />
        </div>

        <div>
          <h3 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
            Antes de empezar
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            Faro es un sistema de acompañamiento emocional basado en inteligencia artificial. 
            Por favor lee con atención los siguientes puntos.
          </p>
        </div>

        <div style={{
          textAlign: "left",
          fontSize: "0.88rem",
          color: "var(--text-secondary)",
          background: "rgba(255,255,255,0.02)",
          padding: "1.25rem",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          lineHeight: "1.55",
        }}>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>No es terapia:</strong> Faro no reemplaza 
            el tratamiento, diagnóstico ni terapia de un profesional de salud mental (psicólogo, 
            psiquiatra u otro).
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>No diagnostica:</strong> Faro nunca emitirá 
            un diagnóstico clínico. Las autoevaluaciones (PHQ-9, GAD-7) son herramientas de 
            autoobservación personal, no resultados médicos.
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>Sistema de seguridad activo:</strong> Si 
            Faro detecta señales de riesgo (ideación suicida, autolesión, crisis aguda), presentará 
            de forma obligatoria y no desactivable la información de la <strong>Línea 106</strong> y la 
            <strong> Línea 123</strong> de Colombia.
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>Tus datos:</strong> Tus conversaciones se 
            cifran en tránsito (TLS) y en reposo (AES-256). Solo tú puedes acceder a tu historial 
            con tu cuenta de Google. Este registro de aceptación queda vinculado a tu cuenta.
          </p>
        </div>

        <button 
          onClick={handleAccept}
          className="btn-primary"
          style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem" }}
        >
          Entiendo y acepto continuar
        </button>

        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
          Al aceptar, reconoces que Faro es un prototipo tecnológico que no sustituye atención profesional.
        </p>
      </div>
    </div>
  );
}
