"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { X, TrendingUp, Activity, Calendar, AlertCircle } from "lucide-react";

interface TrendsModalProps {
  onClose: () => void;
  onOpenCheckIn: () => void;
}

interface CheckIn {
  id: string;
  type: "phq9" | "gad7";
  score: number;
  createdAt: any;
}

function formatDate(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function getSeverityLabel(type: "phq9" | "gad7", score: number): { label: string; color: string } {
  if (type === "phq9") {
    if (score <= 4) return { label: "Minima", color: "#4a7c59" };
    if (score <= 9) return { label: "Leve", color: "#a0a030" };
    if (score <= 14) return { label: "Moderada", color: "#d08040" };
    if (score <= 19) return { label: "Moderadamente severa", color: "#c05030" };
    return { label: "Severa", color: "#c0432f" };
  } else {
    if (score <= 4) return { label: "Minima", color: "#4a7c59" };
    if (score <= 9) return { label: "Leve", color: "#a0a030" };
    if (score <= 14) return { label: "Moderada", color: "#d08040" };
    return { label: "Severa", color: "#c0432f" };
  }
}

function MiniChart({
  data,
  color,
  max,
}: {
  data: CheckIn[];
  color: string;
  max: number;
}) {
  if (data.length < 2) return null;

  const width = Math.max(data.length * 48, 200);
  const height = 80;
  const pad = 12;

  const xFor = (i: number) =>
    pad + (i / (data.length - 1)) * (width - pad * 2);
  const yFor = (score: number) =>
    height - pad - (score / max) * (height - pad * 2);

  let path = `M ${xFor(0)} ${yFor(data[0].score)}`;
  for (let i = 1; i < data.length; i++) {
    const x0 = xFor(i - 1),
      y0 = yFor(data[i - 1].score);
    const x1 = xFor(i),
      y1 = yFor(data[i].score);
    const mx = (x0 + x1) / 2;
    path += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }

  // Area under curve
  let area = path;
  area += ` L ${xFor(data.length - 1)} ${height - pad} L ${xFor(0)} ${height - pad} Z`;

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path
          d={area}
          fill={`url(#grad-${color.replace("#", "")})`}
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(d.score)}
            r="4"
            fill="var(--bg-deep)"
            stroke={color}
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

export default function TrendsModal({ onClose, onOpenCheckIn }: TrendsModalProps) {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "checkins"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: CheckIn[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({ id: doc.id, type: d.type, score: d.score, createdAt: d.createdAt });
      });
      setCheckins(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const phq9 = checkins.filter((c) => c.type === "phq9");
  const gad7 = checkins.filter((c) => c.type === "gad7");

  const lastPhq9 = phq9[phq9.length - 1];
  const lastGad7 = gad7[gad7.length - 1];

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
            <TrendingUp size={20} color="var(--primary)" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Mis Tendencias</h3>
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

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "3rem",
                gap: "8px",
              }}
            >
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          ) : checkins.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "rgba(251, 146, 60, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Activity size={24} color="var(--primary)" />
              </div>
              <div>
                <p
                  style={{
                    fontWeight: "600",
                    marginBottom: "0.4rem",
                    fontSize: "1rem",
                  }}
                >
                  Sin registros aun
                </p>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.88rem",
                    lineHeight: "1.5",
                    maxWidth: "280px",
                  }}
                >
                  Completa una autoevaluacion para ver tus tendencias de animo y ansiedad a lo largo del tiempo.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* PHQ-9 Section */}
              {phq9.length > 0 && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "14px",
                    padding: "1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "var(--primary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Animo — PHQ-9
                    </span>
                    {lastPhq9 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "700",
                            color: "var(--primary)",
                          }}
                        >
                          {lastPhq9.score}
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: getSeverityLabel("phq9", lastPhq9.score).color,
                              fontWeight: "600",
                            }}
                          >
                            {getSeverityLabel("phq9", lastPhq9.score).label}
                          </div>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Calendar size={10} />
                            {formatDate(lastPhq9.createdAt)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {phq9.length >= 2 ? (
                    <MiniChart data={phq9} color="var(--primary)" max={27} />
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Necesitas al menos 2 registros para ver la grafica.
                    </p>
                  )}

                  {/* History pills */}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {phq9.slice(-6).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          fontSize: "0.72rem",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "20px",
                          background: "rgba(251, 146, 60, 0.07)",
                          border: "1px solid rgba(251, 146, 60, 0.2)",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(c.createdAt)} — <strong style={{ color: "var(--primary)" }}>{c.score}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GAD-7 Section */}
              {gad7.length > 0 && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "14px",
                    padding: "1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "var(--secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Ansiedad — GAD-7
                    </span>
                    {lastGad7 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "700",
                            color: "var(--secondary)",
                          }}
                        >
                          {lastGad7.score}
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: getSeverityLabel("gad7", lastGad7.score).color,
                              fontWeight: "600",
                            }}
                          >
                            {getSeverityLabel("gad7", lastGad7.score).label}
                          </div>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Calendar size={10} />
                            {formatDate(lastGad7.createdAt)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {gad7.length >= 2 ? (
                    <MiniChart data={gad7} color="var(--secondary)" max={21} />
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Necesitas al menos 2 registros para ver la grafica.
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {gad7.slice(-6).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          fontSize: "0.72rem",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "20px",
                          background: "rgba(244, 114, 182, 0.07)",
                          border: "1px solid rgba(244, 114, 182, 0.2)",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(c.createdAt)} — <strong style={{ color: "var(--secondary)" }}>{c.score}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nota aclaratoria */}
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  padding: "0.85rem",
                  background: "rgba(251, 146, 60, 0.04)",
                  border: "1px solid rgba(251, 146, 60, 0.15)",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  lineHeight: "1.5",
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "2px" }} color="var(--warning)" />
                <span>
                  Estas graficas son un reflejo personal, no un diagnostico clinico. Si observas tendencias
                  preocupantes, considera hablar con un profesional de salud mental.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
            display: "flex",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={() => { onClose(); onOpenCheckIn(); }}
            className="btn-primary"
            style={{ flex: 1, padding: "0.85rem", fontSize: "0.92rem", minHeight: "48px" }}
          >
            Nueva autoevaluacion
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "0.85rem 1.25rem", fontSize: "0.92rem", minHeight: "48px" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
