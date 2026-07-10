"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Settings, Moon, Sun, Flame, Cpu, Check, Activity, Plus, Trash2, Edit2 } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

interface UsageData {
  models: {
    id: string;
    provider: string;
    role: string;
    freeLimit: string;
    resetWindow: string;
  }[];
  usage: {
    totalRequests: number;
    timeRemainingSeconds: number;
    modelsUsed: Record<string, number>;
  };
}

interface Mood {
  value: number;
  label: string;
  color: string;
}

const THEMES = [
  {
    id: "dark",
    label: "Oscuro profundo",
    description: "Fondo azul oscuro clasico",
    icon: Moon,
    vars: {
      "--bg-deep": "#0f1419",
      "--bg-surface": "#1a202c",
      "--bg-sidebar": "#0d1117",
      "--bg-card": "rgba(26, 32, 44, 0.5)",
      "--bg-card-hover": "rgba(45, 55, 72, 0.7)",
      "--text-primary": "#f1f5f9",
      "--text-secondary": "#cbd5e1",
      "--text-muted": "#94a3b8",
      "--primary": "#fb923c",
      "--primary-hover": "#fdba74",
      "--primary-glow": "rgba(251, 146, 60, 0.2)",
      "--secondary": "#f472b6",
      "--secondary-glow": "rgba(244, 114, 182, 0.15)",
      "--border-subtle": "rgba(148, 163, 184, 0.12)",
      "--border-focus": "rgba(251, 146, 60, 0.3)",
      "--bubble-user": "linear-gradient(135deg, #ea580c, #db2777)",
      "--bubble-bot": "rgba(30, 41, 59, 0.6)",
    },
  },
  {
    id: "warm",
    label: "Calido ambar",
    description: "Tonos tierra y marrones suaves",
    icon: Flame,
    vars: {
      "--bg-deep": "#1a1715",
      "--bg-surface": "#26211c",
      "--bg-sidebar": "#151210",
      "--bg-card": "rgba(38, 33, 28, 0.6)",
      "--bg-card-hover": "rgba(58, 50, 40, 0.8)",
      "--text-primary": "#e8e1d8",
      "--text-secondary": "#cfc6ba",
      "--text-muted": "#9a8f82",
      "--primary": "#e8a87c",
      "--primary-hover": "#f0c09a",
      "--primary-glow": "rgba(232, 168, 124, 0.2)",
      "--secondary": "#c4906e",
      "--secondary-glow": "rgba(196, 144, 110, 0.15)",
      "--border-subtle": "rgba(200, 180, 155, 0.12)",
      "--border-focus": "rgba(232, 168, 124, 0.3)",
      "--bubble-user": "linear-gradient(135deg, #c4741a, #a05030)",
      "--bubble-bot": "rgba(38, 33, 28, 0.7)",
    },
  },
  {
    id: "light",
    label: "Suave claro",
    description: "Fondo blanco con acentos suaves",
    icon: Sun,
    vars: {
      "--bg-deep": "#f8f6f3",
      "--bg-surface": "#ffffff",
      "--bg-sidebar": "#f0ece6",
      "--bg-card": "rgba(255, 255, 255, 0.7)",
      "--bg-card-hover": "rgba(245, 240, 234, 0.9)",
      "--text-primary": "#1a1715",
      "--text-secondary": "#4a4540",
      "--text-muted": "#8a8278",
      "--primary": "#c05a20",
      "--primary-hover": "#d4743a",
      "--primary-glow": "rgba(192, 90, 32, 0.15)",
      "--secondary": "#a84070",
      "--secondary-glow": "rgba(168, 64, 112, 0.12)",
      "--border-subtle": "rgba(80, 60, 40, 0.12)",
      "--border-focus": "rgba(192, 90, 32, 0.3)",
      "--bubble-user": "linear-gradient(135deg, #c05a20, #a84070)",
      "--bubble-bot": "rgba(240, 236, 230, 0.8)",
    },
  },
];

const AI_MODELS = [
  {
    id: "gemini-flash",
    label: "Gemini Flash",
    description: "Rapido y eficiente — respuestas en segundos",
    badge: "Recomendado",
    badgeColor: "var(--primary)",
  },
  {
    id: "gemini-pro",
    label: "Gemini Pro",
    description: "Mas detallado y reflexivo — ideal para temas profundos",
    badge: null,
    badgeColor: null,
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet",
    description: "Muy empatico y matizado — excelente para conversaciones emocionales",
    badge: null,
    badgeColor: null,
  },
];

function applyTheme(themeId: string) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val);
  }
  localStorage.setItem("faro-theme", themeId);
}

export function initTheme() {
  const saved = localStorage.getItem("faro-theme") || "dark";
  applyTheme(saved);
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const [activeTheme, setActiveTheme] = useState("dark");
  const [activeModel, setActiveModel] = useState("gemini-flash");
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [customMoods, setCustomMoods] = useState<Mood[]>([]);
  const [editingMood, setEditingMood] = useState<Mood | null>(null);
  const [showMoodEditor, setShowMoodEditor] = useState(false);
  const [userGeminiKey, setUserGeminiKey] = useState("");
  const [userClaudeKey, setUserClaudeKey] = useState("");
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  useEffect(() => {
    const savedTheme = localStorage.getItem("faro-theme") || "dark";
    const savedModel = localStorage.getItem("faro-model") || "gemini-flash";
    const savedMoods = localStorage.getItem("faro-moods");
    const savedGeminiKey = localStorage.getItem("user-gemini-key");
    const savedClaudeKey = localStorage.getItem("user-claude-key");
    setActiveTheme(savedTheme);
    setActiveModel(savedModel);
    if (savedMoods) {
      setCustomMoods(JSON.parse(savedMoods));
    } else {
      setCustomMoods([
        { value: 0, label: "Muy Mal", color: "#ef4444" },
        { value: 1, label: "Mal", color: "#f97316" },
        { value: 2, label: "Normal", color: "#eab308" },
        { value: 3, label: "Bien", color: "#84cc16" },
        { value: 4, label: "Muy Bien", color: "#22c55e" },
      ]);
    }
    if (savedGeminiKey) setUserGeminiKey(savedGeminiKey);
    if (savedClaudeKey) setUserClaudeKey(savedClaudeKey);
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    if (!user) { setLoadingUsage(false); return; }
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/usage?userId=${encodeURIComponent(user.uid.substring(0, 20))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      }
    } catch (err) {
      console.error("Error fetching usage:", err);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleThemeSelect = (id: string) => {
    setActiveTheme(id);
    applyTheme(id);
  };

  const handleModelSelect = (id: string) => {
    setActiveModel(id);
    localStorage.setItem("faro-model", id);
  };

  const handleAddMood = () => {
    const newValue = customMoods.length;
    setEditingMood({ value: newValue, label: "", color: "#22c55e" });
    setShowMoodEditor(true);
  };

  const handleEditMood = (mood: Mood) => {
    setEditingMood(mood);
    setShowMoodEditor(true);
  };

  const handleDeleteMood = (value: number) => {
    const newMoods = customMoods.filter(m => m.value !== value);
    setCustomMoods(newMoods);
    localStorage.setItem("faro-moods", JSON.stringify(newMoods));
  };

  const handleSaveMood = () => {
    if (!editingMood) return;
    
    let newMoods;
    const existingIndex = customMoods.findIndex(m => m.value === editingMood.value);
    
    if (existingIndex >= 0) {
      newMoods = [...customMoods];
      newMoods[existingIndex] = editingMood;
    } else {
      newMoods = [...customMoods, editingMood];
    }
    
    setCustomMoods(newMoods);
    localStorage.setItem("faro-moods", JSON.stringify(newMoods));
    setShowMoodEditor(false);
    setEditingMood(null);
  };

  const handleSaveApiKeys = () => {
    if (userGeminiKey.trim()) {
      localStorage.setItem("user-gemini-key", userGeminiKey.trim());
    } else {
      localStorage.removeItem("user-gemini-key");
    }
    if (userClaudeKey.trim()) {
      localStorage.setItem("user-claude-key", userClaudeKey.trim());
    } else {
      localStorage.removeItem("user-claude-key");
    }
    alert("API keys guardadas correctamente.");
  };

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
            <Settings size={20} color="var(--primary)" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Configuracion</h3>
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
            gap: "1.75rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Theme Section */}
          <section>
            <div style={{ marginBottom: "0.85rem" }}>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  marginBottom: "0.2rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Tema de la aplicacion
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                El tema se aplica inmediatamente y se guarda en tu dispositivo.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const isActive = activeTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    style={{
                      width: "100%",
                      padding: "0.9rem 1rem",
                      border: "1px solid",
                      borderColor: isActive ? "var(--primary)" : "var(--border-subtle)",
                      borderRadius: "12px",
                      background: isActive
                        ? "var(--primary-glow)"
                        : "rgba(255, 255, 255, 0.02)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      minHeight: "60px",
                    }}
                    className={isActive ? "" : "glass-hover"}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isActive ? "var(--primary)" : "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} color={isActive ? "#040810" : "var(--text-muted)"} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "0.92rem",
                          fontWeight: "600",
                          color: isActive ? "var(--primary)" : "var(--text-primary)",
                          marginBottom: "0.15rem",
                        }}
                      >
                        {theme.label}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        {theme.description}
                      </div>
                    </div>
                    {isActive && (
                      <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Model Section */}
          <section>
            <div style={{ marginBottom: "0.85rem" }}>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  marginBottom: "0.2rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Modelo de IA
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Cambia el modelo para las proximas conversaciones. La deteccion de crisis siempre esta activa sin importar el modelo.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {AI_MODELS.map((model) => {
                const isActive = activeModel === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    style={{
                      width: "100%",
                      padding: "0.9rem 1rem",
                      border: "1px solid",
                      borderColor: isActive ? "var(--primary)" : "var(--border-subtle)",
                      borderRadius: "12px",
                      background: isActive
                        ? "var(--primary-glow)"
                        : "rgba(255, 255, 255, 0.02)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      minHeight: "60px",
                    }}
                    className={isActive ? "" : "glass-hover"}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isActive ? "var(--primary)" : "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Cpu size={18} color={isActive ? "#040810" : "var(--text-muted)"} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.15rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.92rem",
                            fontWeight: "600",
                            color: isActive ? "var(--primary)" : "var(--text-primary)",
                          }}
                        >
                          {model.label}
                        </span>
                        {model.badge && (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "6px",
                              background: "rgba(251, 146, 60, 0.12)",
                              color: model.badgeColor || "var(--primary)",
                              fontWeight: "600",
                              border: "1px solid rgba(251, 146, 60, 0.25)",
                            }}
                          >
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        {model.description}
                      </div>
                    </div>
                    {isActive && (
                      <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Moods Section */}
          <section>
            <div style={{ marginBottom: "0.85rem" }}>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  marginBottom: "0.2rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Estados de Animo
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Personaliza los estados de ánimo para tu diario y notas.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {customMoods.map((mood) => (
                <div
                  key={mood.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: mood.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                    {mood.label}
                  </span>
                  <button
                    onClick={() => handleEditMood(mood)}
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
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteMood(mood.value)}
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
              ))}
              <button
                onClick={handleAddMood}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.88rem",
                  transition: "all 0.2s ease",
                }}
                className="glass-hover"
              >
                <Plus size={16} />
                Agregar estado de ánimo
              </button>
            </div>
          </section>

          {/* API Keys Section */}
          <section>
            <div style={{ marginBottom: "0.85rem" }}>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  marginBottom: "0.2rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                API Keys
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Configura tus propias API keys para usar Faro sin límites.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={userGeminiKey}
                  onChange={(e) => setUserGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Claude API Key (opcional)
                </label>
                <input
                  type="password"
                  value={userClaudeKey}
                  onChange={(e) => setUserClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <button
                onClick={() => setShowApiKeyGuide(true)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  transition: "all 0.2s ease",
                }}
                className="glass-hover"
              >
                ¿Cómo obtener una API key?
              </button>

              <button
                onClick={handleSaveApiKeys}
                className="btn-primary"
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.9rem",
                }}
              >
                Guardar API Keys
              </button>
            </div>
          </section>

          {/* AI Usage / Consumption Section */}
          <section>
            <div style={{ marginBottom: "0.85rem" }}>
              <h4
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  marginBottom: "0.2rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Consumo de IA
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Tu consumo reciente y los modelos disponibles con sus limites gratuitos.
              </p>
            </div>

            {loadingUsage ? (
              <div style={{ padding: "1rem", textAlign: "center", display: "flex", gap: "6px", justifyContent: "center" }}>
                <div className="dot" />
                <div className="dot" />
              </div>
            ) : usageData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* User stats summary */}
                <div style={{
                  padding: "1rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  display: "flex",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Solicitudes recientes
                    </span>
                    <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--primary)" }}>
                      {usageData.usage.totalRequests}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Reinicio de cuota en
                    </span>
                    <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--secondary)" }}>
                      {usageData.usage.timeRemainingSeconds}s
                    </span>
                  </div>
                </div>

                {/* Per-model usage */}
                {Object.keys(usageData.usage.modelsUsed).length > 0 && (
                  <div style={{
                    padding: "0.85rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "12px",
                  }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                      Modelos utilizados en esta sesion
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {Object.entries(usageData.usage.modelsUsed).map(([model, count]) => (
                        <div key={model} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{model}</span>
                          <span style={{
                            fontSize: "0.75rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "12px",
                            background: "rgba(251, 146, 60, 0.1)",
                            color: "var(--primary)",
                            fontWeight: "600",
                          }}>
                            {count} {count === 1 ? "uso" : "usos"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available models table */}
                <div style={{
                  padding: "0.85rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                    Modelos disponibles y limites
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {usageData.models.map((m) => (
                      <div key={m.id} style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                        padding: "0.6rem 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Activity size={12} color="var(--primary)" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>{m.id}</span>
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{m.provider}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "1.25rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{m.role}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m.freeLimit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                No se pudieron cargar los datos de uso.
              </p>
            )}
          </section>
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
            Guardar y cerrar
          </button>
        </div>
      </div>

      {/* Mood Editor Modal */}
      {showMoodEditor && editingMood && (
        <div
          className="modal-overlay"
          onClick={() => setShowMoodEditor(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="glass"
            style={{
              padding: "1.5rem",
              borderRadius: "16px",
              maxWidth: "400px",
              width: "90%",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
              {customMoods.find(m => m.value === editingMood.value) ? "Editar Estado" : "Nuevo Estado"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingMood.label}
                  onChange={(e) => setEditingMood({ ...editingMood, label: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Color
                </label>
                <input
                  type="color"
                  value={editingMood.color}
                  onChange={(e) => setEditingMood({ ...editingMood, color: e.target.value })}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "transparent",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                onClick={() => setShowMoodEditor(false)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMood}
                disabled={!editingMood.label.trim()}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  opacity: !editingMood.label.trim() ? 0.5 : 1,
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Guide Modal */}
      {showApiKeyGuide && (
        <div
          className="modal-overlay"
          onClick={() => setShowApiKeyGuide(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="glass"
            style={{
              padding: "1.5rem",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Cómo obtener tu API Key</h3>
              <button
                onClick={() => setShowApiKeyGuide(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "0.4rem",
                  borderRadius: "8px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "1rem", background: "rgba(251, 146, 60, 0.1)", borderRadius: "8px", border: "1px solid rgba(251, 146, 60, 0.2)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--primary)" }}>Gemini (Google)</h4>
                <ol style={{ fontSize: "0.85rem", color: "var(--text-secondary)", paddingLeft: "1.2rem", lineHeight: "1.6" }}>
                  <li>Ve a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Google AI Studio</a></li>
                  <li>Inicia sesión con tu cuenta de Google</li>
                  <li>Haz clic en "Create API Key" o "Crear API Key"</li>
                  <li>Copia la key que empieza con "AIzaSy..."</li>
                  <li>Pégala en el campo de Gemini API Key arriba</li>
                </ol>
              </div>

              <div style={{ padding: "1rem", background: "rgba(244, 114, 182, 0.1)", borderRadius: "8px", border: "1px solid rgba(244, 114, 182, 0.2)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--secondary)" }}>Claude (Anthropic)</h4>
                <ol style={{ fontSize: "0.85rem", color: "var(--text-secondary)", paddingLeft: "1.2rem", lineHeight: "1.6" }}>
                  <li>Ve a <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--secondary)" }}>Anthropic Console</a></li>
                  <li>Inicia sesión o crea una cuenta</li>
                  <li>Ve a "API Keys" o "Billing"</li>
                  <li>Haz clic en "Create Key" o "Crear Key"</li>
                  <li>Copia la key que empieza con "sk-ant-..."</li>
                  <li>Pégala en el campo de Claude API Key arriba</li>
                </ol>
              </div>

              <div style={{ padding: "0.75rem", background: "rgba(148, 163, 184, 0.1)", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <strong>Nota:</strong> Solo necesitas Gemini para usar Faro. Claude es opcional pero proporciona respuestas más empáticas.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
