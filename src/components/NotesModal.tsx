"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { X, CheckCircle2, Frown, Meh, Smile, Heart, Zap } from "lucide-react";

interface NotesModalProps {
  onClose: () => void;
}

interface Mood {
  value: number;
  label: string;
  color: string;
}

const DEFAULT_MOODS: Mood[] = [
  { value: 0, label: "Muy Mal", color: "#ef4444" },
  { value: 1, label: "Mal", color: "#f97316" },
  { value: 2, label: "Normal", color: "#eab308" },
  { value: 3, label: "Bien", color: "#84cc16" },
  { value: 4, label: "Muy Bien", color: "#22c55e" },
];

export default function NotesModal({ onClose }: NotesModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [moods, setMoods] = useState<Mood[]>(DEFAULT_MOODS);
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const savedMoods = localStorage.getItem("faro-moods");
    if (savedMoods) {
      setMoods(JSON.parse(savedMoods));
    }
  }, []);

  const handleSave = async () => {
    if (!user || mood === null || !title.trim() || !description.trim()) return;
    
    setIsSaving(true);
    try {
      const noteData = {
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        mood,
        createdAt: serverTimestamp(),
      };

      // Guardar en colección "notes"
      await addDoc(collection(db, "notes"), noteData);

      // Guardar también como checkin para las tendencias
      await addDoc(collection(db, "checkins"), {
        userId: user.uid,
        type: "mood_note",
        score: mood,
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error guardando la nota:", error);
      alert("Ocurrió un error guardando la nota.");
    } finally {
      setIsSaving(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="glass modal-container" style={{ maxWidth: "400px", padding: "2.5rem", textAlign: "center" }}>
          <CheckCircle2 size={48} color="#34d399" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "0.5rem" }}>Nota Guardada</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Tu diario ha sido actualizado y el ánimo registrado en tus tendencias.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass modal-container"
        style={{
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Nuevo Registro en Diario</h3>
          <button onClick={onClose} className="glass-hover" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.4rem", borderRadius: "8px" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Mood Selector */}
          <div>
            <label style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.9rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              ¿Cómo te sientes en este momento? *
            </label>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              {moods.map((m: Mood) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.75rem 0.25rem",
                    borderRadius: "12px",
                    background: mood === m.value ? `${m.color}20` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${mood === m.value ? m.color : "var(--border-subtle)"}`,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  className="glass-hover"
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: m.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: mood === m.value ? m.color : "var(--text-secondary)", fontWeight: mood === m.value ? "600" : "400" }}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="Título de la nota *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "1rem"
              }}
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              placeholder="Escribe lo que sientes, lo que te preocupa o lo que te hace feliz... *"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                resize: "vertical",
                lineHeight: "1.5"
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || mood === null || !title.trim() || !description.trim()}
            className="btn-primary"
            style={{ padding: "0.9rem", marginTop: "0.5rem", opacity: (isSaving || mood === null || !title.trim() || !description.trim()) ? 0.5 : 1 }}
          >
            {isSaving ? "Guardando..." : "Guardar Nota"}
          </button>

        </div>
      </div>
    </div>
  );
}
