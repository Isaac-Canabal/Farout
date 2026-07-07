/**
 * /api/usage/route.ts
 *
 * Devuelve información sobre los modelos de IA disponibles,
 * cuántas solicitudes ha hecho el usuario en la ventana actual,
 * y cuánto tiempo falta para que se reinicie la cuota.
 *
 * Nota: En producción, estos contadores vivirían en una base de datos.
 * Aquí usamos un mapa en memoria (se reinicia al hacer re-deploy).
 */

import { NextRequest, NextResponse } from "next/server";

// Modelos disponibles y sus límites públicos aproximados (solicitudes/minuto gratuitas)
const AI_MODELS = [
  {
    id: "gemini-2.5-flash",
    provider: "Google (Gemini)",
    role: "Chat principal + Clasificador de crisis",
    freeLimit: "10 solicitudes/minuto",
    resetWindow: "1 minuto",
  },
  {
    id: "gemini-2.5-pro",
    provider: "Google (Gemini)",
    role: "Fallback de chat y análisis",
    freeLimit: "5 solicitudes/minuto",
    resetWindow: "1 minuto",
  },
  {
    id: "gemini-2.0-flash-001",
    provider: "Google (Gemini)",
    role: "Fallback secundario",
    freeLimit: "15 solicitudes/minuto",
    resetWindow: "1 minuto",
  },
  {
    id: "claude-3-5-sonnet",
    provider: "Anthropic (Claude)",
    role: "Fallback cuando Gemini se agota",
    freeLimit: "Según plan configurado",
    resetWindow: "1 minuto",
  },
  {
    id: "claude-3-5-haiku",
    provider: "Anthropic (Claude)",
    role: "Clasificador rápido (fallback)",
    freeLimit: "Según plan configurado",
    resetWindow: "1 minuto",
  },
];

// Mapa en memoria: userId -> { count, windowStart }
interface UsageEntry {
  count: number;
  windowStart: number;
  modelsUsed: Record<string, number>;
}

const usageMap = new Map<string, UsageEntry>();

// Limpieza periódica
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of usageMap) {
    if (now - entry.windowStart > 5 * 60 * 1000) {
      usageMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function trackUsage(userId: string, modelId: string) {
  const now = Date.now();
  let entry = usageMap.get(userId);

  if (!entry || now - entry.windowStart > 60_000) {
    entry = { count: 0, windowStart: now, modelsUsed: {} };
    usageMap.set(userId, entry);
  }

  entry.count++;
  entry.modelsUsed[modelId] = (entry.modelsUsed[modelId] || 0) + 1;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Extraer userId del query param (pasado desde el cliente)
  const userId = request.nextUrl.searchParams.get("userId");

  const now = Date.now();
  const entry = userId ? usageMap.get(userId) : null;

  let userUsage = {
    totalRequests: 0,
    windowStart: now,
    timeRemainingSeconds: 60,
    modelsUsed: {} as Record<string, number>,
  };

  if (entry) {
    const elapsed = now - entry.windowStart;
    const remaining = Math.max(0, 60_000 - elapsed);
    userUsage = {
      totalRequests: entry.count,
      windowStart: entry.windowStart,
      timeRemainingSeconds: Math.ceil(remaining / 1000),
      modelsUsed: entry.modelsUsed,
    };
  }

  return NextResponse.json({
    models: AI_MODELS,
    usage: userUsage,
  });
}
