"use client";

import { X, Shield } from "lucide-react";

interface PrivacyModalProps {
  onClose: () => void;
}

export default function PrivacyModal({ onClose }: PrivacyModalProps) {
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="glass modal-container"
        style={{
          maxWidth: "600px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Shield size={20} color="var(--primary)" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
              Privacidad y Terminos de Faro
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "0.4rem",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "44px",
              minHeight: "44px",
            }}
            className="glass-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "1.25rem",
            overflowY: "auto",
            fontSize: "0.88rem",
            lineHeight: "1.65",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div>
            <h4
              style={{
                color: "var(--primary)",
                fontWeight: "600",
                marginBottom: "0.3rem",
                fontSize: "0.9rem",
              }}
            >
              1. Seguridad y Cifrado
            </h4>
            <p style={{ color: "var(--text-secondary)" }}>
              Tus datos son altamente confidenciales. Faro cifra las
              comunicaciones en transito usando HTTPS/TLS y en reposo mediante
              AES-256 en Google Cloud Firestore.
            </p>
          </div>

          <div>
            <h4
              style={{
                color: "var(--primary)",
                fontWeight: "600",
                marginBottom: "0.3rem",
                fontSize: "0.9rem",
              }}
            >
              2. Privacidad de Cuenta
            </h4>
            <p style={{ color: "var(--text-secondary)" }}>
              Las reglas de seguridad de Firestore impiden que cualquier otra
              persona que no seas tu (con tu sesion de Google) lea o escriba en
              tu historial de chats o autoevaluaciones.
            </p>
          </div>

          <div>
            <h4
              style={{
                color: "var(--primary)",
                fontWeight: "600",
                marginBottom: "0.3rem",
                fontSize: "0.9rem",
              }}
            >
              3. Sistema Hibrido de Seguridad (No Desactivable)
            </h4>
            <p style={{ color: "var(--text-secondary)" }}>
              Por tu seguridad, Faro cuenta con una deteccion de crisis de
              salud mental que nunca se puede apagar ni modificar. Combina
              clasificacion mediante IA con reglas de palabras clave de respaldo
              para inyectar recursos oficiales en Colombia (Linea 106 y 123) si
              detecta riesgo de autolesion o suicidio.
            </p>
          </div>

          <div
            style={{
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              padding: "1rem",
              borderRadius: "10px",
            }}
          >
            <h4
              style={{
                color: "var(--error)",
                fontWeight: "600",
                marginBottom: "0.3rem",
                fontSize: "0.9rem",
              }}
            >
              4. Cumplimiento Ley 1581 de 2012 (Colombia)
            </h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              <strong>Advertencia:</strong> Esta aplicacion es un prototipo
              tecnologico. Antes de ser implementada comercialmente en Colombia,
              se requiere realizar una auditoria legal completa segun la Ley
              1581 de 2012 de proteccion de datos (Habeas Data) para el
              tratamiento seguro de datos sensibles de salud.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: "100%", padding: "0.85rem", fontSize: "0.92rem", minHeight: "48px" }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
