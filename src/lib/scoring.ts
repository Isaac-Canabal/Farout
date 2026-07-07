export function getSeverityLabel(type: "phq9" | "gad7" | "daily", score: number, maxScore: number = 27): { label: string; color: string; description?: string } {
  if (type === "phq9") {
    if (score <= 4) return { label: "Minima", color: "#4a7c59", description: "Tus síntomas depresivos son mínimos o inexistentes." };
    if (score <= 9) return { label: "Leve", color: "#a0a030", description: "Presentas síntomas leves. Sigue monitoreando cómo te sientes." };
    if (score <= 14) return { label: "Moderada", color: "#d08040", description: "Tus síntomas sugieren depresión moderada. Podría ser útil hablar con un profesional." };
    if (score <= 19) return { label: "Moderadamente severa", color: "#c05030", description: "Tus síntomas son moderadamente severos. Es recomendable buscar apoyo profesional." };
    return { label: "Severa", color: "#c0432f", description: "Tus síntomas son severos. Por favor, considera buscar ayuda clínica lo más pronto posible." };
  } else if (type === "gad7") {
    if (score <= 4) return { label: "Minima", color: "#4a7c59", description: "Tu nivel de ansiedad es mínimo." };
    if (score <= 9) return { label: "Leve", color: "#a0a030", description: "Presentas ansiedad leve. Es normal en situaciones de estrés moderado." };
    if (score <= 14) return { label: "Moderada", color: "#d08040", description: "Tus síntomas sugieren ansiedad moderada. Considera practicar técnicas de relajación." };
    return { label: "Severa", color: "#c0432f", description: "Tus síntomas indican ansiedad severa. Es recomendable consultar con un profesional de la salud." };
  } else {
    // "daily" wellness check (score out of maxScore, e.g., 15)
    const ratio = score / maxScore;
    if (ratio >= 0.8) return { label: "Excelente", color: "#4a7c59", description: "Parece que te sientes muy bien. ¡Sigue así!" };
    if (ratio >= 0.6) return { label: "Bueno", color: "#a0a030", description: "Tu estado general es positivo." };
    if (ratio >= 0.4) return { label: "Regular", color: "#d08040", description: "Estás pasando por un momento regular. Tómate un tiempo para ti." };
    if (ratio >= 0.2) return { label: "Bajo", color: "#c05030", description: "Tu bienestar está bajo. Intenta descansar y apoyarte en alguien de confianza." };
    return { label: "Critico", color: "#c0432f", description: "Tu nivel de bienestar es muy bajo en este momento. Por favor, sé amable contigo mismo/a y busca apoyo." };
  }
}
