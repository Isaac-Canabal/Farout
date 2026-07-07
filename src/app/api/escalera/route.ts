/**
 * /api/escalera/route.ts
 *
 * Analiza las conversaciones del usuario y extrae los momentos emocionales
 * más significativos para construir "La Escalera" personal.
 */

import { NextRequest, NextResponse } from "next/server";
import { getChatModel, getFallbackChatModel } from "@/lib/gemini";
import { getClaudeChatModel, isClaudeAvailable } from "@/lib/claude";

const ESCALERA_PROMPT = `Eres un analizador empático de narrativas personales. Tu tarea es leer el historial de conversación de un usuario con un chatbot de apoyo emocional y extraer entre 5 y 12 momentos emocionales clave que formen una "escalera" personal — una línea de tiempo de altos y bajos emocionales.

Para cada momento, devuelve:
- date: una etiqueta de tiempo breve (ej: "hace 2 años", "el año pasado", "hace 3 meses", "hace 2 semanas", "hoy")
- who: un título corto del momento (ej: "Una ruptura", "Semanas de soledad", "Conversación reveladora") — sin nombres propios reales
- desc: una descripción breve y empática del momento (max 60 caracteres)
- level: número del 0 al 8 (0 = máximo dolor, 8 = máxima claridad/alivio)
- type: "down" si fue una caída/momento difícil, "up" si fue un avance/alivio, "flat" si fue una transición o meseta

REGLAS IMPORTANTES:
1. Respeta la privacidad: NO uses nombres propios reales de personas mencionadas
2. Ordena los momentos cronológicamente (del más antiguo al más reciente)
3. El último momento debe representar el estado actual
4. Si no hay suficiente información para al menos 4 momentos distintos, devuelve un array vacío
5. Mantén un tono empático y respetuoso

Responde ÚNICAMENTE con un array JSON válido, sin texto adicional, sin markdown, sin bloques de código.

Ejemplo de formato:
[{"date":"hace 1 año","who":"Una ruptura difícil","desc":"Todo se derrumbó de golpe","level":1,"type":"down"},{"date":"hace 6 meses","who":"Un momento de calma","desc":"Las cosas se acomodaron un poco","level":5,"type":"up"}]

El historial de conversaciones a analizar es el siguiente:
`;

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken || idToken.length < 10) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  try {
    // Get recent messages from the request body (sent from client)
    let body: { messages?: string } = {};
    try {
      body = await request.json();
    } catch {
      // body is optional
    }

    const conversationText = body.messages || "(Sin historial de conversaciones disponible)";

    const prompt = ESCALERA_PROMPT + conversationText;

    let responseText = "";
    let modelIndex = 0;
    let usingClaude = false;
    let success = false;

    while (modelIndex < 6 && !success) {
      try {
        if (!usingClaude) {
          const model = modelIndex === 0 ? getChatModel() : getFallbackChatModel(modelIndex - 1);
          if (!model) {
            usingClaude = true;
            modelIndex = 0;
            continue;
          }
          const result = await model.generateContent(prompt);
          responseText = result.response.text();
          success = true;
        } else {
          const claudeModel = getClaudeChatModel(modelIndex);
          if (!claudeModel) break;
          const result = await claudeModel.anthropic.messages.create({
            model: claudeModel.model,
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
          });
          responseText = result.content[0]?.type === "text" ? result.content[0].text : "";
          success = true;
        }
      } catch (err: any) {
        if (err?.status === 429 || err?.message?.includes("quota") || err?.error?.type === "rate_limit_error") {
          modelIndex++;
          if (!usingClaude && modelIndex >= 3 && isClaudeAvailable()) {
            usingClaude = true;
            modelIndex = 0;
          }
          continue;
        }
        throw err;
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: "Todos los modelos están temporalmente no disponibles. Intenta en unos minutos." },
        { status: 503 }
      );
    }

    // Parse JSON from response
    let events: any[] = [];
    try {
      // Clean markdown fences if present
      const cleaned = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      events = JSON.parse(cleaned);
      if (!Array.isArray(events)) events = [];
    } catch {
      events = [];
    }

    // Validate and sanitize each event
    const validEvents = events
      .filter(
        (e) =>
          typeof e.date === "string" &&
          typeof e.who === "string" &&
          typeof e.desc === "string" &&
          typeof e.level === "number" &&
          e.level >= 0 &&
          e.level <= 8 &&
          ["up", "down", "flat"].includes(e.type)
      )
      .map((e) => ({
        date: String(e.date).slice(0, 30),
        who: String(e.who).slice(0, 40),
        desc: String(e.desc).slice(0, 80),
        level: Math.round(Math.max(0, Math.min(8, e.level))),
        type: e.type as "up" | "down" | "flat",
      }));

    return NextResponse.json({ events: validEvents });
  } catch (error: any) {
    console.error("[Faro Escalera] Error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al analizar tus conversaciones." },
      { status: 500 }
    );
  }
}
