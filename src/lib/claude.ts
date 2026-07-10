/**
 * claude.ts — Cliente server-side de Claude con sistema de fallback
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

import Anthropic from "@anthropic-ai/sdk";

const defaultApiKey = process.env.ANTHROPIC_API_KEY;

if (!defaultApiKey) {
  console.warn(
    "[Faro] ANTHROPIC_API_KEY no está configurada en las variables de entorno. " +
    "Claude no estará disponible como fallback."
  );
}

function getAnthropic(userApiKey?: string): Anthropic | null {
  const apiKey = userApiKey || defaultApiKey;
  if (!apiKey) {
    return null;
  }
  return new Anthropic({ apiKey });
}

// ─────────────────────────────────────────────────────────────────────
// MODELOS DE CLAUDE - En orden de preferencia
// ─────────────────────────────────────────────────────────────────────

const CLAUDE_CHAT_MODELS = [
  "claude-3-5-sonnet-20241022",  // Más potente y rápido
  "claude-3-5-haiku-20241022",   // Más económico
  "claude-3-opus-20240229",      // Versión anterior, muy estable
];

const CLAUDE_CLASSIFIER_MODELS = [
  "claude-3-5-haiku-20241022",   // Rápido para clasificación
  "claude-3-5-sonnet-20241022",
  "claude-3-opus-20240229",
];

const CLAUDE_DISTRESS_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20241022",
  "claude-3-opus-20240229",
];

/**
 * Modelo para la generación de respuestas empáticas de Faro usando Claude.
 */
export function getClaudeChatModel(modelIndex: number = 0, userApiKey?: string) {
  const anthropic = getAnthropic(userApiKey);
  if (!anthropic) return null;
  
  const model = CLAUDE_CHAT_MODELS[modelIndex] || CLAUDE_CHAT_MODELS[0];
  return { anthropic, model };
}

/**
 * Modelo para la clasificación de riesgo de crisis usando Claude.
 */
export function getClaudeCrisisClassifierModel(modelIndex: number = 0, userApiKey?: string) {
  const anthropic = getAnthropic(userApiKey);
  if (!anthropic) return null;
  
  const model = CLAUDE_CLASSIFIER_MODELS[modelIndex] || CLAUDE_CLASSIFIER_MODELS[0];
  return { anthropic, model };
}

/**
 * Modelo para la detección de malestar sostenido usando Claude.
 */
export function getClaudeSustainedDistressModel(modelIndex: number = 0, userApiKey?: string) {
  const anthropic = getAnthropic(userApiKey);
  if (!anthropic) return null;
  
  const model = CLAUDE_DISTRESS_MODELS[modelIndex] || CLAUDE_DISTRESS_MODELS[0];
  return { anthropic, model };
}

/**
 * Verifica si Claude está disponible
 */
export function isClaudeAvailable(userApiKey?: string): boolean {
  return getAnthropic(userApiKey) !== null;
}
