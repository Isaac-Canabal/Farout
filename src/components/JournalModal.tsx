"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, BookOpen, Calendar, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";

interface JournalModalProps {
  onClose: () => void;
}

interface JournalEntry {
  id: string;
  mood: number;
  description: string;
  createdAt: any;
}

interface Mood {
  value: number;
  label: string;
  color: string;
}

export default function JournalModal({ onClose }: JournalModalProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [moods, setMoods] = useState<Mood[]>([]);

  useEffect(() => {
    // Cargar estados de ánimo personalizados o usar defaults
    const savedMoods = localStorage.getItem("custom-moods");
    if (savedMoods) {
      setMoods(JSON.parse(savedMoods));
    } else {
      setMoods([
        { value: 0, label: "Muy Mal", color: "#ef4444" },
        { value: 1, label: "Mal", color: "#f97316" },
        { value: 2, label: "Normal", color: "#eab308" },
        { value: 3, label: "Bien", color: "#84cc16" },
        { value: 4, label: "Muy Bien", color: "#22c55e" },
      ]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "checkins"),
      where("userId", "==", user.uid),
      where("type", "==", "mood_note"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: JournalEntry[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          mood: d.mood,
          description: d.description,
          createdAt: d.createdAt,
        });
      });
      setEntries(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading journal entries:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta nota?")) return;
    
    try {
      await deleteDoc(doc(db, "checkins", id));
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const getMoodLabel = (value: number) => {
    const mood = moods.find((m) => m.value === value);
    return mood ? mood.label : "Desconocido";
  };

  const getMoodColor = (value: number) => {
    const mood = moods.find((m) => m.value === value);
    return mood ? mood.color : "#888";
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-primary)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={20} color="white" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Mi Diario
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Tus notas y reflexiones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem",
              border: "none",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="glass-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                display: "flex",
                gap: "6px",
                justifyContent: "center",
              }}
            >
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          ) : entries.length === 0 ? (
            <div
              style={{
                padding: "3rem 1rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <BookOpen size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
              <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                No tienes notas en tu diario todavía
              </p>
              <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                Usa el botón de notas para agregar tu primera reflexión
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "1.25rem",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: getMoodColor(entry.mood),
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <span
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                          }}
                        >
                          {getMoodLabel(entry.mood)}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          <Calendar size={12} />
                          {formatDate(entry.createdAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        padding: "0.4rem",
                        border: "none",
                        borderRadius: "6px",
                        background: "transparent",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      className="glass-hover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      lineHeight: "1.6",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {entry.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: "100%", padding: "0.85rem", fontSize: "0.92rem" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
