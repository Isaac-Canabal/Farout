"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { X, RefreshCw, AlertCircle } from "lucide-react";

interface EscaleraModalProps {
  onClose: () => void;
}

interface EscaleraEvent {
  date: string;
  who: string;
  desc: string;
  level: number; // 0-8
  type: "up" | "down" | "flat";
}

const EXAMPLE_EVENTS: EscaleraEvent[] = [
  { date: "Antes", who: "El origen", desc: "Como empezó todo", level: 5, type: "flat" },
  { date: "Algun momento", who: "Una caida", desc: "Cuando las cosas se pusieron difíciles", level: 2, type: "down" },
  { date: "Luego", who: "Un respiro", desc: "Algo que ayudó a seguir", level: 5, type: "up" },
  { date: "Despues", who: "Otra vez abajo", desc: "El ciclo que se repitió", level: 1, type: "down" },
  { date: "Y aún así", who: "Aquí estás", desc: "Buscando entender, no solo sobrevivir", level: 6, type: "up" },
];

const TYPE_COLORS: Record<string, string> = {
  down: "#c0432f",
  up: "#4a7c59",
  flat: "#5a5248",
};

function EscaleraChart({ events }: { events: EscaleraEvent[] }) {
  const maxLevel = 8;
  const stepW = 110;
  const width = events.length * stepW + 80;
  const height = 380;
  const topMargin = 100;
  const bottom = 280;

  const xFor = (i: number) => 60 + i * stepW;
  const yFor = (lvl: number) =>
    bottom - (lvl / maxLevel) * (bottom - topMargin);

  // Build smooth path
  let path = `M ${xFor(0)} ${yFor(events[0].level)}`;
  for (let i = 1; i < events.length; i++) {
    const x0 = xFor(i - 1), y0 = yFor(events[i - 1].level);
    const x1 = xFor(i), y1 = yFor(events[i].level);
    const mx = (x0 + x1) / 2;
    path += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }

  // Y-axis labels
  const yLabels = [
    { lvl: 0, label: "Dolor intenso" },
    { lvl: 4, label: "Neutro" },
    { lvl: 8, label: "Claridad" },
  ];

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", minWidth: width }}
      aria-label="Grafico de la escalera emocional"
    >
      {/* Y axis labels */}
      {yLabels.map(({ lvl, label }) => (
        <g key={lvl}>
          <line
            x1={40}
            x2={width - 20}
            y1={yFor(lvl)}
            y2={yFor(lvl)}
            stroke="rgba(200,180,155,0.07)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <text
            x={38}
            y={yFor(lvl) + 4}
            textAnchor="end"
            fontSize="9"
            fill="#6a6258"
            fontFamily="Georgia, serif"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Main path */}
      <path d={path} fill="none" stroke="#7a6f62" strokeWidth="2" opacity="0.5" />

      {/* Baseline */}
      <line
        x1={30}
        x2={width - 20}
        y1={bottom}
        y2={bottom}
        stroke="#3a342c"
        strokeWidth="1"
      />

      {events.map((e, i) => {
        const x = xFor(i);
        const y = yFor(e.level);
        const color = TYPE_COLORS[e.type];

        return (
          <g key={i}>
            {/* Stem */}
            <line x1={x} x2={x} y1={y} y2={bottom} stroke="#332e27" strokeWidth="1" />

            {/* Node circle */}
            <circle
              cx={x}
              cy={y}
              r={9}
              fill="var(--bg-deep)"
              stroke={color}
              strokeWidth="2.5"
            />
            <circle cx={x} cy={y} r={4} fill={color} opacity="0.6" />

            {/* Date label above */}
            <text
              x={x}
              y={y - 18}
              textAnchor="middle"
              fontSize="9"
              fill="#9a8f82"
              fontFamily="Georgia, serif"
            >
              {e.date}
            </text>

            {/* Who label — rotated below baseline */}
            <g transform={`translate(${x}, ${bottom + 12}) rotate(35)`}>
              <text
                textAnchor="start"
                fontSize="10"
                fill="#cfc6ba"
                fontFamily="Georgia, serif"
              >
                {e.who}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export default function EscaleraModal({ onClose }: EscaleraModalProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EscaleraEvent[]>([]);
  const [isExample, setIsExample] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadEscalera();
  }, [user]);

  const loadEscalera = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, "escalera", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.events?.length > 0) {
        setEvents(snap.data().events);
        setIsExample(false);
      } else {
        setEvents(EXAMPLE_EVENTS);
        setIsExample(true);
      }
    } catch {
      setEvents(EXAMPLE_EVENTS);
      setIsExample(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!user) return;
    setUpdating(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();

      // Gather recent conversation messages to send to the API
      const convsQuery = query(
        collection(db, "conversations"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc"),
        limit(5)
      );
      const convsSnap = await getDocs(convsQuery);
      const messageLines: string[] = [];

      for (const convDoc of convsSnap.docs) {
        const msgsQuery = query(
          collection(db, "conversations", convDoc.id, "messages"),
          orderBy("createdAt", "asc"),
          limit(30)
        );
        const msgsSnap = await getDocs(msgsQuery);
        msgsSnap.forEach((m) => {
          const d = m.data();
          if (d.text && typeof d.text === "string") {
            const role = d.sender === "user" ? "Usuario" : "Faro";
            messageLines.push(`${role}: ${d.text.substring(0, 200)}`);
          }
        });
      }

      // Añadir notas recientes del Diario
      const notesQuery = query(
        collection(db, "checkins"),
        where("userId", "==", user.uid),
        where("type", "==", "mood_note"),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const notesSnap = await getDocs(notesQuery);
      notesSnap.forEach((n) => {
        const d = n.data();
        if (d.title || d.description) {
          messageLines.push(`[Nota de Diario]: Título: "${d.title}" - Descripción: "${d.description}" (Estado de ánimo: ${d.score}/4)`);
        }
      });

      const messagesText =
        messageLines.length > 0
          ? messageLines.join("\n")
          : "(Sin historial de conversaciones disponible)";

      const res = await fetch("/api/escalera", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ messages: messagesText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar la escalera.");
      }

      const data = await res.json();
      if (data.events && data.events.length > 0) {
        setEvents(data.events);
        setIsExample(false);
        await setDoc(doc(db, "escalera", user.uid), {
          events: data.events,
          updatedAt: serverTimestamp(),
        });
      } else {
        setError(
          "No se encontraron momentos suficientes en tus conversaciones aun. Sigue charlando y vuelve a intentarlo."
        );
      }
    } catch (err: any) {
      setError(err.message || "Ocurrio un error al analizar tus conversaciones.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(4, 8, 16, 0.9)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
      onClick={onClose}
    >
      <div
        style={{
          margin: "auto",
          width: "100%",
          maxWidth: "700px",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.25rem 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: "700",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "0.25rem",
              }}
            >
              La escalera
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                fontStyle: "italic",
                lineHeight: "1.4",
              }}
            >
              No es una caida recta. Sube, baja, se devuelve — y aun asi avanza un poco.
            </p>
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
              marginLeft: "0.5rem",
              flexShrink: 0,
            }}
            className="glass-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Example badge */}
        {isExample && !loading && (
          <div
            style={{
              margin: "0.75rem 1.25rem 0",
              padding: "0.65rem 0.9rem",
              background: "rgba(251, 146, 60, 0.06)",
              border: "1px solid rgba(251, 146, 60, 0.2)",
              borderRadius: "10px",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              lineHeight: "1.4",
            }}
          >
            <AlertCircle size={14} color="var(--warning)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>
              Esto es un ejemplo de como se vera tu escalera. Pulsa "Actualizar desde mis conversaciones" para construir la tuya real.
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              margin: "0.75rem 1.25rem 0",
              padding: "0.65rem 0.9rem",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "10px",
              fontSize: "0.78rem",
              color: "var(--error)",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Chart */}
        <div style={{ flex: 1, padding: "1rem 1.25rem" }}>
          {loading ? (
            <div
              style={{
                height: "300px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: "0.5rem",
              }}
            >
              <EscaleraChart events={events} />
            </div>
          )}

          {/* Hint */}
          {!loading && (
            <p
              style={{
                textAlign: "center",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginTop: "0.35rem",
                fontStyle: "italic",
              }}
            >
              desliza para ver la linea completa
            </p>
          )}
        </div>

        {/* Legend */}
        {!loading && (
          <div
            style={{
              margin: "0 1.25rem",
              padding: "0.75rem 1rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { color: "#c0432f", label: "Caidas / dolor intenso" },
              { color: "#4a7c59", label: "Subidas / claridad" },
              { color: "#5a5248", label: "Mesetas / transicion" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        {!loading && (
          <p
            style={{
              margin: "0.85rem 1.25rem",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              fontStyle: "italic",
              lineHeight: "1.55",
              textAlign: "center",
            }}
          >
            Cada escalon es un momento real. La altura no es que tan bien estabas en terminos absolutos,
            sino el movimiento relativo: hacia el dolor o hacia la claridad, visto desde hoy.
          </p>
        )}

        {/* Footer actions */}
        <div
          style={{
            padding: "1rem 1.25rem 1.5rem",
            display: "flex",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="btn-primary"
            style={{
              flex: 1,
              padding: "0.85rem",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: "48px",
              opacity: updating ? 0.7 : 1,
            }}
          >
            <RefreshCw size={16} style={{ animation: updating ? "spin 1s linear infinite" : "none" }} />
            {updating ? "Analizando conversaciones..." : "Actualizar desde mis conversaciones"}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "0.85rem 1.1rem", fontSize: "0.9rem", minHeight: "48px" }}
          >
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
