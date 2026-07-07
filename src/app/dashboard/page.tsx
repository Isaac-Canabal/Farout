"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import DisclaimerModal from "@/components/DisclaimerModal";
import CheckInModal from "@/components/CheckInModal";
import PrivacyModal from "@/components/PrivacyModal";
import TrendsModal from "@/components/TrendsModal";
import SettingsModal from "@/components/SettingsModal";
import EscaleraModal from "@/components/EscaleraModal";
import NotesModal from "@/components/NotesModal";
import { Menu, X } from "lucide-react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEscalera, setShowEscalera] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("faro-theme") || "dark";
    const THEME_VARS: Record<string, Record<string, string>> = {
      dark: {
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
      warm: {
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
      light: {
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
    };
    const vars = THEME_VARS[savedTheme] || THEME_VARS.dark;
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const closeSidebar = () => setSidebarOpen(false);

  const openModal = (setter: (v: boolean) => void) => {
    setter(true);
    if (isMobile) closeSidebar();
  };

  if (loading || !user) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--bg-deep)",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Disclaimer — blocks everything until accepted */}
      <DisclaimerModal onAccepted={() => setDisclaimerAccepted(true)} />

      {/* Main layout */}
      <div
        style={{
          display: "flex",
          height: "100dvh",
          backgroundColor: "var(--bg-deep)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            onClick={closeSidebar}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 40,
              WebkitTapHighlightColor: "transparent",
            }}
          />
        )}

        {/* Sidebar */}
        <div
          style={{
            position: isMobile ? "fixed" : "relative",
            left: isMobile ? (sidebarOpen ? 0 : "-280px") : 0,
            top: 0,
            height: "100%",
            zIndex: isMobile ? 50 : 10,
            transition: isMobile ? "left 0.28s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
        >
          <Sidebar
            activeId={activeConversationId}
            onSelect={(id) => {
              setActiveConversationId(id);
              if (isMobile) closeSidebar();
            }}
            onOpenCheckIn={() => openModal(setShowCheckIn)}
            onOpenTrends={() => openModal(setShowTrends)}
            onOpenPrivacy={() => openModal(setShowPrivacy)}
            onOpenSettings={() => openModal(setShowSettings)}
            onOpenEscalera={() => openModal(setShowEscalera)}
            onOpenNotes={() => openModal(setShowNotes)}
          />
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {/* Mobile top bar */}
          {isMobile && (
            <div
              style={{
                padding: "0 1rem",
                height: "56px",
                backgroundColor: "var(--bg-sidebar)",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexShrink: 0,
                zIndex: 5,
              }}
            >
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  width: "44px",
                  height: "44px",
                  border: "none",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: "700",
                  background:
                    "linear-gradient(135deg, var(--primary), var(--secondary))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Faro
              </span>
            </div>
          )}

          {/* Chat or waiting state */}
          {disclaimerAccepted ? (
            <ChatWindow conversationId={activeConversationId} />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "2rem 1.5rem",
                textAlign: "center",
                background:
                  "radial-gradient(circle at center, var(--primary-glow) 0%, transparent 60%)",
              }}
            >
              <div
                className="glass animate-glow"
                style={{
                  padding: "2rem 1.5rem",
                  borderRadius: "16px",
                  maxWidth: "440px",
                  width: "100%",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: "600",
                    marginBottom: "0.6rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Esperando tu aceptacion
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                  }}
                >
                  Por favor revisa y acepta el aviso importante antes de
                  comenzar a usar Faro.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
      {showTrends && (
        <TrendsModal
          onClose={() => setShowTrends(false)}
          onOpenCheckIn={() => {
            setShowTrends(false);
            setShowCheckIn(true);
          }}
        />
      )}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showEscalera && <EscaleraModal onClose={() => setShowEscalera(false)} />}
      {showNotes && <NotesModal onClose={() => setShowNotes(false)} />}
    </>
  );
}
