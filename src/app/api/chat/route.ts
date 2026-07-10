/**
 * /api/chat/route.ts — API Route server-side para Faro
 * 
 * Flujo de cada petición:
 * 1. Rate limiting por IP
 * 2. Validación de auth (Firebase ID Token)
 * 3. Detección híbrida de crisis (keywords locales + clasificación IA)
 * 4. Detección de malestar sostenido (si hay historial suficiente)
 * 5. Generación de respuesta empática con system prompt completo
 * 6. Inyección obligatoria de recursos de crisis si aplica
 * 
 * La detección de crisis NO PUEDE ser desactivada desde ninguna
 * configuración de usuario ni panel de administración.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getChatModel, 
  getFallbackChatModel,
  getCrisisClassifierModel, 
  getFallbackCrisisClassifierModel,
  getSustainedDistressModel,
  getFallbackSustainedDistressModel 
} from "@/lib/gemini";
import {
  getClaudeChatModel,
  getClaudeCrisisClassifierModel,
  getClaudeSustainedDistressModel,
  isClaudeAvailable
} from "@/lib/claude";
import {
  FARO_SYSTEM_PROMPT,
  CRISIS_CLASSIFICATION_PROMPT,
  SUSTAINED_DISTRESS_PROMPT,
  buildCrisisInjection,
  buildSustainedDistressNote,
  localCrisisKeywordCheck,
} from "@/lib/prompts";
import { trackUsage } from "@/app/api/usage/route";

// ─────────────────────────────────────────────────────────────────────
// RATE LIMITING — Mapa en memoria por IP
// Límite: 20 solicitudes por minuto por IP
// ─────────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 20;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpieza periódica de entradas vencidas (cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true; // Permitido
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return false; // Bloqueado
  }

  return true; // Permitido
}

// ─────────────────────────────────────────────────────────────────────
// HANDLER POST
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Por favor espera un momento antes de enviar otro mensaje." },
      { status: 429 }
    );
  }

  // 2. Validación básica de autenticación
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "No autorizado. Inicia sesión para continuar." },
      { status: 401 }
    );
  }

  // Nota: En producción, validar el token con Firebase Admin SDK.
  // Para el prototipo, verificamos que existe un token.
  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken || idToken.length < 10) {
    return NextResponse.json(
      { error: "Token de autenticación inválido." },
      { status: 401 }
    );
  }

  // 3. Parsear el body
  let body: { message: string; history: any[]; conversationId: string; imageData?: string; userGeminiKey?: string; userClaudeKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  const { message, history = [], conversationId, imageData, userGeminiKey, userClaudeKey } = body;

  // Permitir mensajes vacíos si hay una imagen
  if ((!message || typeof message !== "string" || message.trim().length === 0) && !imageData) {
    return NextResponse.json(
      { error: "El mensaje no puede estar vacío." },
      { status: 400 }
    );
  }

  if (!conversationId) {
    return NextResponse.json(
      { error: "Se requiere un ID de conversación." },
      { status: 400 }
    );
  }

  try {
    // ═══════════════════════════════════════════════════════
    // PASO A: DETECCIÓN HÍBRIDA DE CRISIS (NO DESACTIVABLE)
    // ═══════════════════════════════════════════════════════

    // A.1: Detección local por palabras clave (respaldo ineludible)
    let isCrisis = localCrisisKeywordCheck(message);
    let crisisReasoning = isCrisis ? "Detectado por coincidencia de palabras clave de riesgo." : "";

    // A.2: Clasificación por IA (se ejecuta siempre, incluso si keywords ya dieron positivo)
    // Con sistema de fallback automático: Gemini primero, luego Claude
    let classifierModelIndex = 0;
    let classifierUsingClaude = false;
    try {
      while (classifierModelIndex < 6) { // 3 Gemini + 3 Claude
        try {
          let classifierResult;
          let classifierText;
          
          if (!classifierUsingClaude) {
            // Intentar con Gemini
            const classifierModel = classifierModelIndex === 0 
              ? getCrisisClassifierModel(userGeminiKey)
              : getFallbackCrisisClassifierModel(classifierModelIndex - 1, userGeminiKey);
            
            if (!classifierModel) {
              // Pasar a Claude si Gemini se agota
              classifierUsingClaude = true;
              classifierModelIndex = 0;
              continue;
            }
            
            const result = await classifierModel.generateContent(
              CRISIS_CLASSIFICATION_PROMPT + `"${message}"`
            );
            classifierText = result.response.text();
          } else {
            // Intentar con Claude
            const claudeModel = getClaudeCrisisClassifierModel(classifierModelIndex, userClaudeKey);
            
            if (!claudeModel) break;
            
            const result = await claudeModel.anthropic.messages.create({
              model: claudeModel.model,
              max_tokens: 256,
              messages: [{ role: "user" as const, content: CRISIS_CLASSIFICATION_PROMPT + `"${message}"` }],
            });
            classifierText = result.content[0]?.type === "text" ? result.content[0].text : "";
          }
          
          const classifierJSON = JSON.parse(classifierText);

          if (classifierJSON.riskLevel === "high") {
            isCrisis = true;
            crisisReasoning = classifierJSON.reasoning || crisisReasoning;
          }
          break; // Éxito, salir del loop
        } catch (classifierError: any) {
          console.error(`[Faro] Error en clasificador (${classifierUsingClaude ? 'Claude' : 'Gemini'}) modelo ${classifierModelIndex}:`, classifierError);
          // Si es error de cuota (429), intentar con siguiente modelo
          if (classifierError?.status === 429 || classifierError?.message?.includes('quota') || classifierError?.error?.type === 'rate_limit_error') {
            classifierModelIndex++;
            // Si agotamos Gemini, pasar a Claude
            if (!classifierUsingClaude && classifierModelIndex >= 3 && isClaudeAvailable(userClaudeKey)) {
              classifierUsingClaude = true;
              classifierModelIndex = 0;
              console.log("[Faro] Gemini agotado, cambiando a Claude para clasificación");
            }
            continue;
          }
          break; // Otro error, salir del loop
        }
      }
    } catch (classifierError) {
      console.error("[Faro] Error en clasificación de crisis por IA:", classifierError);
      // Si la IA falla completamente, nos quedamos con el resultado de las keywords.
    }

    // ═══════════════════════════════════════════════════════
    // PASO B: DETECCIÓN DE MALESTAR SOSTENIDO
    // Solo se evalúa si no hay crisis aguda y hay suficiente historial
    // ═══════════════════════════════════════════════════════

    let hasSustainedDistress = false;
    let distressThemes: string[] = [];

    if (!isCrisis && history.length >= 6) {
      let distressModelIndex = 0;
      let distressUsingClaude = false;
      try {
        while (distressModelIndex < 6) { // 3 Gemini + 3 Claude
          try {
            let distressText;
            
            if (!distressUsingClaude) {
              // Intentar con Gemini
              const distressModel = distressModelIndex === 0
                ? getSustainedDistressModel(userGeminiKey)
                : getFallbackSustainedDistressModel(distressModelIndex - 1, userGeminiKey);
              
              if (!distressModel) {
                // Pasar a Claude si Gemini se agota
                distressUsingClaude = true;
                distressModelIndex = 0;
                continue;
              }
              
              const historyText = history
                .map((msg: any) => `${msg.role === "user" ? "Usuario" : "Faro"}: ${msg.parts?.[0]?.text || ""}`)
                .join("\n");

              const distressResult = await distressModel.generateContent(
                SUSTAINED_DISTRESS_PROMPT + historyText
              );
              distressText = distressResult.response.text();
            } else {
              // Intentar con Claude
              const claudeModel = getClaudeSustainedDistressModel(distressModelIndex, userClaudeKey);
              
              if (!claudeModel) break;
              
              const historyText = history
                .map((msg: any) => `${msg.role === "user" ? "Usuario" : "Faro"}: ${msg.parts?.[0]?.text || ""}`)
                .join("\n");

              const distressResult = await claudeModel.anthropic.messages.create({
                model: claudeModel.model,
                max_tokens: 256,
                messages: [{ role: "user" as const, content: SUSTAINED_DISTRESS_PROMPT + historyText }],
              });
              distressText = distressResult.content[0]?.type === "text" ? distressResult.content[0].text : "";
            }
            
            const distressJSON = JSON.parse(distressText);

            hasSustainedDistress = distressJSON.sustainedDistress === true;
            distressThemes = distressJSON.themes || [];
            break; // Éxito, salir del loop
          } catch (distressError: any) {
            console.error(`[Faro] Error en detector de malestar (${distressUsingClaude ? 'Claude' : 'Gemini'}) modelo ${distressModelIndex}:`, distressError);
            // Si es error de cuota, intentar con siguiente modelo
            if (distressError?.status === 429 || distressError?.message?.includes('quota') || distressError?.error?.type === 'rate_limit_error') {
              distressModelIndex++;
              // Si agotamos Gemini, pasar a Claude
              if (!distressUsingClaude && distressModelIndex >= 3 && isClaudeAvailable(userClaudeKey)) {
                distressUsingClaude = true;
                distressModelIndex = 0;
                console.log("[Faro] Gemini agotado, cambiando a Claude para detección de malestar");
              }
              continue;
            }
            break; // Otro error, salir del loop
          }
        }
      } catch (distressError) {
        console.error("[Faro] Error en detección de malestar sostenido:", distressError);
        // Si falla completamente, simplemente no sugerimos. No es crítico para la seguridad.
      }
    }

    // ═══════════════════════════════════════════════════════
    // PASO C: GENERACIÓN DE RESPUESTA EMPÁTICA
    // Con sistema de fallback automático: Gemini primero, luego Claude
    // ═══════════════════════════════════════════════════════

    // Añadir contexto de crisis al mensaje si aplica
    let userPrompt = message;
    if (isCrisis) {
      userPrompt += "\n\n[CONTEXTO INTERNO PARA FARO — NO MOSTRAR AL USUARIO: Se han detectado señales de riesgo en este mensaje. Tu respuesta DEBE incluir empatía genuina, sostener la emoción, y terminar con la información de contacto de la Línea 106 y Línea 123 de Colombia de forma prioritaria. No minimices lo que la persona siente. No intentes resolver la crisis por ti mismo — tu prioridad es conectar a la persona con ayuda humana real.]";
    }

    let responseText = "";
    let chatModelIndex = 0;
    let usingClaude = false;
    let chatSuccess = false;
    let modelUsed = "unknown";

    while (chatModelIndex < 6 && !chatSuccess) { // 3 Gemini + 3 Claude
      try {
        if (!usingClaude) {
          // Intentar con Gemini
          const chatModel = chatModelIndex === 0 
            ? getChatModel(userGeminiKey)
            : getFallbackChatModel(chatModelIndex - 1, userGeminiKey);
          
          if (!chatModel) {
            // Pasar a Claude si Gemini se agota
            usingClaude = true;
            chatModelIndex = 0;
            continue;
          }

          // Construir el historial para el chat Gemini
          const chatHistory = history.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: msg.parts || [{ text: "" }],
          }));

          // Iniciar chat con system instruction y el historial previo
          const chat = chatModel.startChat({
            history: chatHistory,
            systemInstruction: { 
              role: "user", 
              parts: [{ text: FARO_SYSTEM_PROMPT }] 
            },
          });

          // Construir el contenido del mensaje (texto + imagen si existe)
          let messageContent: any = userPrompt;
          if (imageData) {
            // Convertir base64 a formato que Gemini acepte
            const imageBase64 = imageData.split(',')[1];
            messageContent = [
              { text: userPrompt || "¿Qué puedes decirme sobre esta imagen?" },
              { 
                inlineData: {
                  data: imageBase64,
                  mimeType: "image/jpeg"
                }
              }
            ];
          }

          const result = await chat.sendMessage(messageContent);
          responseText = result.response.text();
          modelUsed = chatModelIndex === 0 ? "gemini-2.5-flash" : `gemini-fallback-${chatModelIndex}`;
          chatSuccess = true;
        } else {
          // Intentar con Claude
          const claudeModel = getClaudeChatModel(chatModelIndex, userClaudeKey);
          
          if (!claudeModel) break;

          // Construir el historial para Claude (formato diferente)
          const claudeHistory = history.map((msg: any) => ({
            role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: msg.parts?.[0]?.text || "",
          }));

          const result = await claudeModel.anthropic.messages.create({
            model: claudeModel.model,
            max_tokens: 2048,
            system: FARO_SYSTEM_PROMPT,
            messages: [...claudeHistory, { role: "user" as const, content: userPrompt }],
          });
          responseText = result.content[0]?.type === "text" ? result.content[0].text : "";
          modelUsed = `claude-${claudeModel.model}`;
          chatSuccess = true;
        }
      } catch (chatError: any) {
        console.error(`[Faro] Error en modelo de chat (${usingClaude ? 'Claude' : 'Gemini'}) modelo ${chatModelIndex}:`, chatError);
        // Si es error de cuota (429), intentar con siguiente modelo
        if (chatError?.status === 429 || chatError?.message?.includes('quota') || chatError?.error?.type === 'rate_limit_error') {
          chatModelIndex++;
          // Si agotamos Gemini, pasar a Claude
          if (!usingClaude && chatModelIndex >= 3 && isClaudeAvailable(userClaudeKey)) {
            usingClaude = true;
            chatModelIndex = 0;
            console.log("[Faro] Gemini agotado, cambiando a Claude para chat");
          }
          continue;
        }
        throw chatError; // Otro error, propagar
      }
    }

    if (!chatSuccess) {
      throw new Error("Todos los modelos de IA están temporalmente no disponibles por límites de cuota. Por favor intenta en unos minutos.");
    }

    // ═══════════════════════════════════════════════════════
    // PASO D: INYECCIONES OBLIGATORIAS POST-RESPUESTA
    // ═══════════════════════════════════════════════════════

    // D.1: Si hay crisis, SIEMPRE inyectar recursos (NO DESACTIVABLE)
    if (isCrisis) {
      // Verificar si el modelo ya incluyó "106" en la respuesta
      if (!responseText.includes("106")) {
        responseText += buildCrisisInjection();
      }
    }

    // D.2: Si hay malestar sostenido (sin crisis), sugerir Línea 106 naturalmente
    if (hasSustainedDistress && !isCrisis) {
      // Solo añadir si no se mencionó la Línea 106 ya en la respuesta
      if (!responseText.includes("106")) {
        responseText += buildSustainedDistressNote();
      }
    }

    // ═══════════════════════════════════════════════════════
    // PASO E: EXTRAER TÉCNICAS PSICOEDUCATIVAS MENCIONADAS
    // Para mostrar badges en la interfaz
    // ═══════════════════════════════════════════════════════

    const techniques: string[] = [];
    const techniquesMap: Record<string, string> = {
      "reencuadre cognitivo": "Reencuadre Cognitivo",
      "pregunta socrática": "Pregunta Socrática",
      "preguntas socráticas": "Pregunta Socrática",
      "validación": "Validación (DBT)",
      "terapia dialéctico": "DBT (Linehan)",
      "dialéctico-conductual": "DBT (Linehan)",
      "escucha activa": "Escucha Activa",
      "entrevista motivacional": "Entrevista Motivacional",
      "distorsión cognitiva": "TCC (Beck/Burns)",
      "catastrofización": "TCC — Catastrofización",
      "pensamiento todo-o-nada": "TCC — Todo o Nada",
      "lectura de mente": "TCC — Lectura de Mente",
      "generalización": "TCC — Generalización",
      "filtro mental": "TCC — Filtro Mental",
    };

    const responseLower = responseText.toLowerCase();
    for (const [keyword, label] of Object.entries(techniquesMap)) {
      if (responseLower.includes(keyword) && !techniques.includes(label)) {
        techniques.push(label);
      }
    }

    // ═══════════════════════════════════════════════════════
    // RESPUESTA FINAL
    // ═══════════════════════════════════════════════════════

    // Track usage for the user
    const userIdFromToken = idToken.substring(0, 20); // simple identifier
    trackUsage(userIdFromToken, modelUsed);

    return NextResponse.json({
      text: responseText,
      isCrisis,
      hasSustainedDistress,
      distressThemes,
      techniques,
      crisisReasoning: isCrisis ? crisisReasoning : undefined,
      modelUsed,
    });

  } catch (error: any) {
    console.error("[Faro] Error en generación de respuesta:", error);

    // Incluso en caso de error, si detectamos crisis por keywords,
    // devolvemos los recursos de crisis de todos modos.
    if (localCrisisKeywordCheck(message)) {
      return NextResponse.json({
        text: "Lo siento, estoy teniendo dificultades técnicas en este momento, pero quiero asegurarme de que tengas esto:" + buildCrisisInjection(),
        isCrisis: true,
        hasSustainedDistress: false,
        distressThemes: [],
        techniques: [],
      });
    }

    return NextResponse.json(
      { error: "Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}
