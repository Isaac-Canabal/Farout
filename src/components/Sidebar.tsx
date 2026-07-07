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
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  MessageSquare,
  LogOut,
  User,
  Activity,
  TrendingUp,
  Shield,
  Trash2,
  Settings,
  BarChart2,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onOpenCheckIn: () => void;
  onOpenTrends: () => void;
  onOpenPrivacy: () => void;
  onOpenSettings: () => void;
  onOpenEscalera: () => void;
  onOpenNotes: () => void;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: any;
}

export default function Sidebar({
  activeId,
  onSelect,
  onOpenCheckIn,
  onOpenTrends,
  onOpenPrivacy,
  onOpenSettings,
  onOpenEscalera,
  onOpenNotes,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            title: data.title || "Conversacion nueva",
            updatedAt: data.updatedAt,
          });
        });
        setConversations(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching conversations:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateConversation = async () => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "conversations"), {
        userId: user.uid,
        title: `Conversacion ${new Date().toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
        })}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onSelect(docRef.id);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation();
    if (!user) return;
    if (
      !confirm(
        "¿Estas seguro de que quieres eliminar esta conversacion? Esta accion no se puede deshacer."
      )
    )
      return;
    try {
      if (activeId === conversationId) {
        onSelect(null);
      }
      await deleteDoc(doc(db, "conversations", conversationId));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const navBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    border: "none",
    borderRadius: "10px",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "0.88rem",
    minHeight: "44px",
    transition: "all 0.2s ease",
  };

  return (
    <aside
      style={{
        width: "280px",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        zIndex: 10,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, var(--primary) 0%, var(--secondary) 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 0 10px var(--primary-glow)",
            flexShrink: 0,
          }}
        >
          <Activity size={16} color="#040810" />
        </div>
        <div>
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              background:
                "linear-gradient(135deg, var(--primary), var(--secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Faro
          </h2>
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
            }}
          >
            ACOMPANAMIENTO EMOCIONAL
          </span>
        </div>
      </div>

      {/* New Conversation Button */}
      <div style={{ padding: "0.85rem", flexShrink: 0 }}>
        <button
          onClick={handleCreateConversation}
          className="btn-primary"
          style={{
            width: "100%",
            padding: "0.8rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.92rem",
            minHeight: "48px",
          }}
        >
          <Plus size={18} />
          Nueva conversacion
        </button>
      </div>

      {/* Conversation History */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 0.6rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <span
          style={{
            padding: "0.4rem 0.6rem",
            fontSize: "0.7rem",
            fontWeight: "600",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Historial
        </span>

        {loading ? (
          <div
            style={{ padding: "1rem", textAlign: "center", display: "flex", gap: "6px", justifyContent: "center" }}
          >
            <div className="dot" />
            <div className="dot" />
          </div>
        ) : conversations.length === 0 ? (
          <div
            style={{
              padding: "1.25rem 0.75rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.82rem",
              lineHeight: "1.4",
            }}
          >
            No tienes chats anteriores. Empieza uno nuevo arriba.
          </div>
        ) : (
          conversations.map((chat) => {
            const isActive = chat.id === activeId;
            return (
              <div
                key={chat.id}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <button
                  onClick={() => onSelect(chat.id)}
                  style={{
                    flex: 1,
                    padding: "0.65rem 0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    border: "1px solid",
                    borderColor: isActive ? "var(--primary)" : "transparent",
                    borderRadius: "10px",
                    background: isActive
                      ? "var(--primary-glow)"
                      : "transparent",
                    color: isActive
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    minHeight: "44px",
                  }}
                  className="glass-hover"
                >
                  <MessageSquare size={15} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: "0.86rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: isActive ? "500" : "400",
                    }}
                  >
                    {chat.title}
                  </span>
                </button>
                <button
                  onClick={(e) => handleDeleteConversation(e, chat.id)}
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
                    flexShrink: 0,
                    minWidth: "36px",
                    minHeight: "36px",
                    transition: "all 0.2s ease",
                  }}
                  className="glass-hover"
                  title="Eliminar conversacion"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Navigation section */}
      <div
        style={{
          padding: "0.6rem",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "0.15rem",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            padding: "0.35rem 0.6rem",
            fontSize: "0.7rem",
            fontWeight: "600",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Herramientas
        </span>

        <button onClick={onOpenCheckIn} style={navBtnStyle} className="glass-hover">
          <Activity size={15} style={{ flexShrink: 0 }} />
          Autoevaluacion (PHQ-9 / GAD-7)
        </button>

        <button onClick={onOpenTrends} style={navBtnStyle} className="glass-hover">
          <TrendingUp size={15} style={{ flexShrink: 0 }} />
          Mis Tendencias
        </button>

        <button onClick={onOpenEscalera} style={navBtnStyle} className="glass-hover">
          <BarChart2 size={15} style={{ flexShrink: 0 }} />
          La Escalera
        </button>

        <button onClick={onOpenNotes} style={navBtnStyle} className="glass-hover">
          <BookOpen size={15} style={{ flexShrink: 0 }} />
          Diario / Notas
        </button>

        <button onClick={onOpenPrivacy} style={navBtnStyle} className="glass-hover">
          <Shield size={15} style={{ flexShrink: 0 }} />
          Privacidad y Terminos
        </button>

        <button onClick={onOpenSettings} style={navBtnStyle} className="glass-hover">
          <Settings size={15} style={{ flexShrink: 0 }} />
          Configuracion
        </button>
      </div>

      {/* User profile / LogOut */}
      <div
        style={{
          padding: "0.85rem",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            overflow: "hidden",
            minWidth: 0,
            flex: 1,
          }}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "Avatar"}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid var(--border-subtle)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.05)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <User size={16} color="var(--text-secondary)" />
            </div>
          )}
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: "500",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {user?.displayName || "Usuario"}
          </span>
        </div>

        <button
          onClick={logout}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "0.5rem",
            borderRadius: "8px",
            transition: "all 0.2s ease",
            flexShrink: 0,
            minWidth: "40px",
            minHeight: "40px",
          }}
          className="glass-hover"
          title="Cerrar sesion"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
