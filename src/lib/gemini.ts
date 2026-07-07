/**
 * gemini.ts — Cliente server-side de Gemini con sistema de fallback
 * 
 * ╔═════════════════════════════════════════════════════════════════╗
 * ║  ESTE ARCHIVO ES EXCLUSIVAMENTE SERVER-SIDE.                   ║
 * ║  No debe ser importado NUNCA desde un componente cliente       ║
 * ║  ("use client"), ni desde ningún archivo en /src/components,   ║
 * ║  /src/context, ni desde /src/app/page.tsx o layout.tsx.        ║
 * ║                                                                ║
 * ║  Solo se importa desde /src/app/api/chat/route.ts              ║
 * ║  (API Route de Next.js que corre en el servidor).              ║
 * ╚═════════════════════════════════════════════════════════════════╝
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "[Faro] GEMINI_API_KEY no está configurada en las variables de entorno. " +
    "Las llamadas a la API de IA fallarán hasta que se configure."
  );
} else {
  console.log("[Faro] GEMINI_API_KEY está configurada. Longitud:", apiKey.length);
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// ─────────────────────────────────────────────────────────────────────
// MODELOS CON FALLBACK - En orden de preferencia
// Si uno falla por cuota, automáticamente intenta con el siguiente
// ─────────────────────────────────────────────────────────────────────

const CHAT_MODELS = [
  "models/gemini-2.5-flash",        // Último modelo, rápido y potente
  "models/gemini-2.5-pro",          // Más potente, fallback
  "models/gemini-2.0-flash-001",    // Estable, fallback adicional
  "models/gemini-flash-latest",     // Último release de Flash
  "models/gemini-pro-latest",       // Último release de Pro
];

const CLASSIFIER_MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro",
  "models/gemini-2.0-flash-001",
  "models/gemini-flash-latest",
];

const DISTRESS_MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro",
  "models/gemini-2.0-flash-001",
  "models/gemini-flash-latest",
];

// ─────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE SEGURIDAD COMÚN
// ─────────────────────────────────────────────────────────────────────

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

/**
 * Modelo para la generación de respuestas empáticas de Faro.
 * Con sistema de fallback automático entre múltiples modelos.
 */
export function getChatModel() {
  return genAI.getGenerativeModel({
    model: CHAT_MODELS[0],
    safetySettings: SAFETY_SETTINGS,
  });
}

/**
 * Obtiene el siguiente modelo disponible si el actual falla
 */
export function getFallbackChatModel(failedModelIndex: number) {
  const nextIndex = failedModelIndex + 1;
  if (nextIndex < CHAT_MODELS.length) {
    console.log(`[Faro] Fallback: Cambiando a modelo ${CHAT_MODELS[nextIndex]}`);
    return genAI.getGenerativeModel({
      model: CHAT_MODELS[nextIndex],
      safetySettings: SAFETY_SETTINGS,
    });
  }
  return null;
}

/**
 * Modelo para la clasificación de riesgo de crisis.
 */
export function getCrisisClassifierModel() {
  return genAI.getGenerativeModel({
    model: CLASSIFIER_MODELS[0],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  });
}

export function getFallbackCrisisClassifierModel(failedModelIndex: number) {
  const nextIndex = failedModelIndex + 1;
  if (nextIndex < CLASSIFIER_MODELS.length) {
    console.log(`[Faro] Fallback: Cambiando clasificador a ${CLASSIFIER_MODELS[nextIndex]}`);
    return genAI.getGenerativeModel({
      model: CLASSIFIER_MODELS[nextIndex],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
      },
    });
  }
  return null;
}

/**
 * Modelo para la detección de malestar sostenido en el historial.
 */
export function getSustainedDistressModel() {
  return genAI.getGenerativeModel({
    model: DISTRESS_MODELS[0],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  });
}

export function getFallbackSustainedDistressModel(failedModelIndex: number) {
  const nextIndex = failedModelIndex + 1;
  if (nextIndex < DISTRESS_MODELS.length) {
    console.log(`[Faro] Fallback: Cambiando detector de malestar a ${DISTRESS_MODELS[nextIndex]}`);
    return genAI.getGenerativeModel({
      model: DISTRESS_MODELS[nextIndex],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
      },
    });
  }
  return null;
}
