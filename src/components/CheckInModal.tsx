"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { X, ChevronRight, ChevronLeft, Award, HelpCircle, ShieldAlert } from "lucide-react";

interface CheckInModalProps {
  onClose: () => void;
}

const phq9Questions = [
  "Poco interés o placer en hacer las cosas.",
  "Sentirse desanimado/a, deprimido/a o sin esperanzas.",
  "Problemas para conciliar el sueño, permanecer dormido/a o dormir demasiado.",
  "Sentirse cansado/a o con poca energía.",
  "Poco apetito o comer en exceso.",
  "Sentirse mal consigo mismo/a, sentir que es un fracaso o que ha decepcionado a su familia o a sí mismo/a.",
  "Dificultad para concentrarse en cosas tales como leer o ver televisión.",
  "Moverse o hablar tan despacio que otras personas podrían notarlo, o estar tan inquieto/a o agitado/a que se mueve mucho más de lo normal.",
  "Pensamientos de que estaría mejor muerto/a o de lastimarse de alguna manera."
];

const gad7Questions = [
  "Sentirse nervioso/a, ansioso/a o con los nervios de punta.",
  "No poder dejar de preocuparse o no ser capaz de controlar la preocupación.",
  "Preocuparse demasiado por diferentes cosas.",
  "Dificultad para relajarse.",
  "Estar tan inquieto/a que es difícil permanecer sentado/a.",
  "Molestarse o irritarse fácilmente.",
  "Sentirse con temor, como si algo terrible pudiera suceder."
];

const options = [
  { label: "Nunca", value: 0 },
  { label: "Varios días", value: 1 },
  { label: "Más de la mitad de los días", value: 2 },
  { label: "Casi todos los días", value: 3 }
];

export default function CheckInModal({ onClose }: CheckInModalProps) {
  const { user } = useAuth();
  
  // Selection states: 'select' | 'phq9' | 'gad7' | 'results'
  const [step, setStep] = useState<"select" | "phq9" | "gad7" | "results">("select");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [savedType, setSavedType] = useState<"phq9" | "gad7" | null>(null);
  const [hasHighRiskAnswer, setHasHighRiskAnswer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentQuestions = step === "phq9" ? phq9Questions : gad7Questions;

  const handleStart = (type: "phq9" | "gad7") => {
    setStep(type);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(type === "phq9" ? phq9Questions.length : gad7Questions.length).fill(-1));
    setHasHighRiskAnswer(false);
  };

  const handleAnswerSelect = (val: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = val;
    setAnswers(newAnswers);

    // PHQ-9 Question 9 is about self-harm or suicide ideation. If answer > 0, set high risk
    if (step === "phq9" && currentQuestionIndex === 8 && val > 0) {
      setHasHighRiskAnswer(true);
    }
  };

  const handleNext = () => {
    if (answers[currentQuestionIndex] === -1) return; // Prevent proceeding without answering
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      saveResults();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setStep("select");
    }
  };

  const saveResults = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const score = answers.reduce((a, b) => a + b, 0);
    const type = step === "phq9" ? "phq9" : "gad7";

    try {
      await addDoc(collection(db, "checkins"), {
        userId: user.uid,
        type,
        score,
        answers,
        hasHighRisk: hasHighRiskAnswer,
        createdAt: serverTimestamp()
      });

      setSavedScore(score);
      setSavedType(type);
      setStep("results");
    } catch (error) {
      console.error("Error saving checkin:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetAndClose = () => {
    setStep("select");
    setSavedScore(null);
    setSavedType(null);
    setHasHighRiskAnswer(false);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={resetAndClose}
    >
      <div
        className="glass modal-container"
        style={{
          maxWidth: "560px",
          padding: "1.5rem 1.25rem",
          position: "relative",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button 
          onClick={resetAndClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            padding: "0.4rem",
            borderRadius: "8px",
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="glass-hover"
        >
          <X size={20} />
        </button>

        {/* Step: Select Test */}
        {step === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "0.5rem" }}>Autoevaluación Personal</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Elige una de las escalas validadas para monitorear tu estado emocional. El resultado no es un diagnóstico clínico; solo te sirve para ver tus propias tendencias en el tiempo.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* PHQ-9 Button Card */}
              <button 
                onClick={() => handleStart("phq9")}
                style={{
                  padding: "1.25rem",
                  textAlign: "left",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  transition: "all 0.2s ease"
                }}
                className="glass-hover"
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ fontWeight: "600", fontSize: "1rem", color: "var(--primary)" }}>Escala de Ánimo (PHQ-9)</span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  Evalúa síntomas de tristeza, desinterés y fatiga durante las últimas 2 semanas (9 preguntas).
                </span>
              </button>

              {/* GAD-7 Button Card */}
              <button 
                onClick={() => handleStart("gad7")}
                style={{
                  padding: "1.25rem",
                  textAlign: "left",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  transition: "all 0.2s ease"
                }}
                className="glass-hover"
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ fontWeight: "600", fontSize: "1rem", color: "var(--secondary)" }}>Escala de Ansiedad (GAD-7)</span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  Evalúa niveles de preocupación, tensión nerviosa y dificultad para relajarse (7 preguntas).
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Questions (PHQ-9 or GAD-7) */}
        {(step === "phq9" || step === "gad7") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Header / Progress */}
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {step === "phq9" ? "Evaluación de Ánimo PHQ-9" : "Evaluación de Ansiedad GAD-7"}
              </span>
              <h4 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "0.25rem" }}>
                Pregunta {currentQuestionIndex + 1} de {currentQuestions.length}
              </h4>
              
              {/* Progress Bar */}
              <div style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "0.75rem", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`,
                  background: step === "phq9" ? "var(--primary)" : "var(--secondary)",
                  transition: "width 0.3s ease"
                }} />
              </div>
            </div>

            {/* Question Text */}
            <div style={{
              padding: "1.5rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              fontSize: "1.05rem",
              lineHeight: "1.5",
              fontWeight: "400",
              minHeight: "100px",
              display: "flex",
              alignItems: "center"
            }}>
              ¿Con qué frecuencia te ha molestado este problema durante las últimas 2 semanas?
              <br />
              <strong style={{ color: "var(--text-primary)", display: "block", marginTop: "0.5rem" }}>
                {currentQuestions[currentQuestionIndex]}
              </strong>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {options.map((opt) => {
                const isSelected = answers[currentQuestionIndex] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswerSelect(opt.value)}
                    style={{
                      padding: "0.85rem 1.25rem",
                      borderRadius: "10px",
                      border: "1px solid",
                      borderColor: isSelected 
                        ? (step === "phq9" ? "var(--primary)" : "var(--secondary)") 
                        : "var(--border-subtle)",
                      background: isSelected 
                        ? (step === "phq9" ? "rgba(56, 189, 248, 0.08)" : "rgba(45, 212, 191, 0.08)") 
                        : "rgba(255,255,255,0.01)",
                      color: isSelected 
                        ? (step === "phq9" ? "var(--primary)" : "var(--secondary)") 
                        : "var(--text-secondary)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: isSelected ? "600" : "400",
                      transition: "all 0.15s ease"
                    }}
                    className="glass-hover"
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Footer Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", gap: "0.75rem" }}>
              <button 
                onClick={handlePrev}
                style={{
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.9rem",
                  minHeight: "48px",
                }}
                className="btn-secondary"
              >
                <ChevronLeft size={16} />
                Atras
              </button>

              <button 
                onClick={handleNext}
                disabled={answers[currentQuestionIndex] === -1 || isSaving}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  fontSize: "0.9rem",
                  opacity: answers[currentQuestionIndex] === -1 ? 0.5 : 1,
                  cursor: answers[currentQuestionIndex] === -1 ? "not-allowed" : "pointer",
                  minHeight: "48px",
                }}
                className="btn-primary"
              >
                {isSaving ? "Guardando..." : (currentQuestionIndex === currentQuestions.length - 1 ? "Ver resultados" : "Siguiente")}
                {!isSaving && <ChevronRight size={16} />}
              </button>
            </div>

          </div>
        )}

        {/* Step: Results */}
        {step === "results" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center" }}>
            
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: savedType === "phq9" ? "rgba(56, 189, 248, 0.1)" : "rgba(45, 212, 191, 0.1)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              alignSelf: "center",
            }}>
              <Award size={28} color={savedType === "phq9" ? "var(--primary)" : "var(--secondary)"} />
            </div>

            <div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "0.25rem" }}>Autoevaluación Completada</h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                {savedType === "phq9" ? "Escala de Ánimo PHQ-9" : "Escala de Ansiedad GAD-7"}
              </span>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
              padding: "1.5rem",
              borderRadius: "16px",
              display: "inline-block",
              alignSelf: "center"
            }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block" }}>PUNTUACIÓN OBTENIDA</span>
              <strong style={{
                fontSize: "3rem",
                fontWeight: "700",
                color: savedType === "phq9" ? "var(--primary)" : "var(--secondary)"
              }}>
                {savedScore}
              </strong>
              <span style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                display: "block",
                marginTop: "0.25rem"
              }}>
                Máximo posible: {savedType === "phq9" ? 27 : 21}
              </span>
            </div>

            {/* High risk safety notification for PHQ-9 Q9 */}
            {hasHighRiskAnswer && (
              <div style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "1rem 1.25rem",
                borderRadius: "12px",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                textAlign: "left",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                lineHeight: "1.4"
              }}>
                <ShieldAlert size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Atención:</strong> Has reportado pensamientos relacionados con autolesionarte o estar mejor muerto/a. Queremos recordarte que **no estás solo/a**. Por favor considera comunicarte de inmediato con los canales de ayuda humana de Colombia:
                  <br />
                  • **Línea 106** (confidencial y gratuita, 24/7)
                  <br />
                  • **Línea 123** (emergencias nacionales)
                </div>
              </div>
            )}

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", textAlign: "justify" }}>
              **Nota aclaratoria**: Esta puntuación no representa un diagnóstico. Su único fin es ayudarte a visualizar tus propios patrones afectivos. Te sugerimos guardar este historial y compartir tus sensaciones con un profesional en tu EPS o IPS de confianza.
            </p>

            <button 
              onClick={resetAndClose}
              className="btn-primary"
              style={{ width: "100%", padding: "0.9rem", fontSize: "0.95rem", minHeight: "48px" }}
            >
              Cerrar y Volver al Chat
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
