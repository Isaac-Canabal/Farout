"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc,
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { Send, AlertTriangle, HelpCircle, Activity, Image as ImageIcon, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatWindowProps {
  conversationId: string | null;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  createdAt: any;
  isCrisis?: boolean;
  techniques?: string[];
  imageUrl?: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages when conversationId changes
  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      return;
    }

    setError(null);
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          text: data.text || "",
          sender: data.sender,
          createdAt: data.createdAt,
          isCrisis: data.isCrisis,
          techniques: data.techniques,
          imageUrl: data.imageUrl,
        });
      });
      setMessages(list);
    }, (err) => {
      console.error("Error loading messages:", err);
      setMessages([]);
      setError("No se pudieron cargar los mensajes. Verifica tu conexión.");
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  // Scroll to bottom on new messages or typing state change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isWriting]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !conversationId || !user) return;

    const messageText = inputText.trim();
    setInputText("");
    setError(null);
    setIsWriting(true);

    let imageData = null;
    if (selectedImage) {
      imageData = imagePreview;
    }

    try {
      // 1. Guardar mensaje del usuario en Firestore
      const userMsgRef = await addDoc(
        collection(db, "conversations", conversationId, "messages"),
        {
          text: messageText,
          sender: "user",
          createdAt: serverTimestamp(),
          imageUrl: imageData,
        }
      );

      // Actualizar la conversación principal con el último mensaje
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: messageText || "[Imagen]",
        updatedAt: serverTimestamp(),
      });

      // 2. Obtener Token de Firebase para autenticar la petición de API
      const idToken = await user.getIdToken();

      // 3. Preparar el historial de chat para enviarlo al modelo de lenguaje
      // Enviamos las últimas 10 interacciones para mantener contexto
      const chatHistory = messages.slice(-10).map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      // 4. Llamar a la API server-side
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: messageText,
          history: chatHistory,
          conversationId,
          imageData: imageData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al conectar con Faro.");
      }

      const data = await response.json();

      // 5. Guardar la respuesta del bot en Firestore
      await addDoc(
        collection(db, "conversations", conversationId, "messages"),
        {
          text: data.text,
          sender: "bot",
          createdAt: serverTimestamp(),
          isCrisis: data.isCrisis || false,
          techniques: data.techniques || [],
        }
      );

      // Actualizar de nuevo la conversación principal con la respuesta
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: data.text.substring(0, 60) + (data.text.length > 60 ? "..." : ""),
        updatedAt: serverTimestamp(),
      });

    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Lo siento, ocurrió un error al procesar tu mensaje.");
    } finally {
      setIsWriting(false);
      handleRemoveImage();
    }
  };

  // Welcome state if no conversation is active
  if (!conversationId) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "1.5rem",
        textAlign: "center",
        background: "radial-gradient(circle at center, rgba(56, 189, 248, 0.05) 0%, transparent 60%)",
      }}>
        <div className="animate-float" style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}>
          <Activity size={28} color="var(--primary)" />
        </div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>Bienvenido a Faro</h3>
        <p style={{ color: "var(--text-secondary)", maxWidth: "380px", fontSize: "0.9rem", lineHeight: "1.6" }}>
          Inicia una conversación nueva o selecciona una del historial para tener un espacio de contención, desahogo y escucha empática.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "relative",
    }}>
      {/* Disclaimer Banner at the top */}
      <div style={{
        padding: "0.6rem 1rem",
        background: "rgba(239, 68, 68, 0.05)",
        borderBottom: "1px solid rgba(239, 68, 68, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.75rem",
        color: "var(--text-secondary)",
      }}>
        <AlertTriangle size={12} color="var(--warning)" style={{ flexShrink: 0 }} />
        <span style={{ lineHeight: "1.3" }}>
          <strong>Recordatorio:</strong> Faro es un chatbot de IA para desahogo inicial. No reemplaza terapia.
        </span>
      </div>

      {/* Messages area */}
      <div 
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          return (
            <div 
              key={msg.id}
              className="animate-fade-in"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isBot ? "flex-start" : "flex-end",
                maxWidth: "85%",
                alignSelf: isBot ? "flex-start" : "flex-end",
              }}
            >
              {/* Message Bubble */}
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "16px",
                borderBottomLeftRadius: isBot ? "4px" : "16px",
                borderBottomRightRadius: isBot ? "16px" : "4px",
                background: isBot ? "var(--bubble-bot)" : "var(--bubble-user)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                border: isBot ? "1px solid var(--border-subtle)" : "none",
                boxShadow: isBot ? "0 4px 6px rgba(0,0,0,0.1)" : "0 4px 10px rgba(2, 132, 199, 0.2)",
              }}>
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Imagen adjunta" 
                    style={{
                      maxWidth: "100%",
                      borderRadius: "8px",
                      marginBottom: "0.5rem",
                      maxHeight: "200px",
                      objectFit: "cover",
                    }}
                  />
                )}
                {isBot ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: "600" }}>{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ fontStyle: "italic" }}>{children}</em>
                      ),
                      p: ({ children }) => (
                        <p style={{ margin: "0.25rem 0" }}>{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ margin: "0.25rem 0", paddingLeft: "1.25rem" }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ margin: "0.25rem 0", paddingLeft: "1.25rem" }}>{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ margin: "0.1rem 0" }}>{children}</li>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>

              {/* Psychoeducation Badges */}
              {isBot && msg.techniques && msg.techniques.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.25rem",
                  marginTop: "0.4rem",
                  paddingLeft: "0.25rem",
                }}>
                  {msg.techniques.map((tech, i) => (
                    <span 
                      key={i}
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--primary)",
                        background: "rgba(56, 189, 248, 0.08)",
                        border: "1px solid var(--border-subtle)",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                      }}
                      title="Técnica psicológica implementada por Faro en esta respuesta"
                    >
                      <HelpCircle size={10} />
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isWriting && (
          <div style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            padding: "0.85rem 1.1rem",
            borderRadius: "16px",
            borderBottomLeftRadius: "4px",
            background: "var(--bubble-bot)",
            border: "1px solid var(--border-subtle)",
          }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginRight: "8px" }}>
              Faro está escribiendo
            </span>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}

        {error && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "var(--error-bg)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            color: "var(--error)",
            fontSize: "0.85rem",
            alignSelf: "center",
            maxWidth: "90%",
            margin: "0.5rem 0",
          }}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form 
        onSubmit={handleSend}
        style={{
          padding: "0.75rem 1rem 1rem",
          background: "var(--bg-deep)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Image preview */}
        {imagePreview && (
          <div style={{
            position: "relative",
            display: "inline-block",
            alignSelf: "flex-start",
          }}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{
                maxWidth: "150px",
                maxHeight: "150px",
                borderRadius: "8px",
                objectFit: "cover",
              }}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--error)",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isWriting}
            style={{
              width: "44px",
              height: "44px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            className="glass-hover"
            title="Adjuntar imagen"
          >
            <ImageIcon size={18} />
          </button>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isWriting}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              outline: "none",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
            onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
          />
          
          <button 
            type="submit"
            className="btn-primary"
            disabled={isWriting || (!inputText.trim() && !selectedImage)}
            style={{
              width: "44px",
              height: "44px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
              borderRadius: "12px",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
