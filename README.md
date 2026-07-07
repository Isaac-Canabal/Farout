# Faro — Acompañamiento Emocional Inteligente

Faro es una aplicación web responsiva (PWA ready) diseñada como espacio seguro de desahogo, contención y orientación inicial en salud mental. El proyecto combina un sistema de IA empática con un motor híbrido de seguridad de crisis no desactivable, autoevaluaciones psicológicas validadas (PHQ-9/GAD-7) con visualización de tendencias, y una representación gráfica interactiva de la trayectoria emocional del usuario llamada "La Escalera".

Este proyecto está estructurado con altos estándares de desarrollo, seguridad y diseño UX/UI móvil-primero para servir como portafolio profesional de ingeniería de software.

---

## Características Principales

### 1. Sistema Híbrido de Seguridad y Contención de Crisis (No Desactivable)
La seguridad es la prioridad número uno. Faro integra una capa de detección de crisis de salud mental robusta e inalterable:
*   **Filtro local de palabras clave de respaldo**: Detección determinista e instantánea en el servidor.
*   **Clasificador con Inteligencia Artificial**: Detección semántica de ideas de autolesión o suicidio mediante prompts estructurados con salida JSON.
*   **Inyección Prioritaria de Canales Oficiales**: En caso de alerta, inyecta de forma prioritaria los recursos oficiales de atención en Colombia (Línea 106 y 123) y activa banderas de alerta visuales.

### 2. Autoevaluaciones Validadas (PHQ-9 y GAD-7)
*   Formularios paso a paso interactivos adaptados para dispositivos móviles (diseño *bottom-sheet*).
*   **PHQ-9 (Cuestionario sobre la Salud del Paciente)**: Mide severidad de síntomas depresivos.
*   **GAD-7 (Escala del Trastorno de Ansiedad Generalizada)**: Mide niveles de ansiedad.
*   **Alerta de Riesgo en PHQ-9 (Pregunta 9)**: Si el usuario reporta ideación autolesiva en la última pregunta, el sistema muestra inmediatamente una advertencia visual destacada con los canales de emergencia humanos.

### 3. Mis Tendencias (Gráficos en Tiempo Real)
*   Consulta segura a Firestore para recuperar el historial del usuario.
*   Gráfico de líneas interactivo e implementado con SVG puro (sin dependencias externas pesadas) que se renderiza dinámicamente.
*   Cálculo automático de la severidad del estado de ánimo y ansiedad de acuerdo a escalas clínicas oficiales.

### 4. La Escalera (Visualización Emocional Histórica)
*   **Análisis Narrativo mediante IA**: Al presionar "Actualizar", una ruta de API recopila los mensajes del historial de chat y extrae de forma segura los momentos emocionales clave (fecha, descripción breve, nivel emocional del 0 al 8 y dirección).
*   **Renderizado SVG Animado**: Basado en un diseño a medida, dibuja curvas bezier, líneas de conexión y estados de ánimo con scroll horizontal responsivo.
*   **Respeto a la Privacidad**: El prompt del sistema sanitiza la información sensible de forma automática, omitiendo nombres propios de terceros y enfocándose solo en la narrativa afectiva.

### 5. Configuración Personalizada de Interfaz e IA
*   **Selector de Temas**: Soporte para tres temas visuales (*Oscuro profundo*, *Cálido ámbar* y *Suave claro*) que se sincronizan en tiempo real mediante variables de CSS (:root) y se persisten en `localStorage`.
*   **Selector de Modelo de IA**: Posibilidad de alternar el motor de lenguaje entre *Gemini Flash* (predeterminado), *Gemini Pro* y *Claude Sonnet*.

### 6. Diseño Responsivo y Optimización Móvil Nativa
*   Uso de `100dvh` (Dynamic Viewport Height) para evitar que la barra de navegación del navegador móvil tape la entrada del chat.
*   Elementos touch-friendly con objetivos de pulsación (touch targets) de al menos 44px-48px de alto.
*   Sidebar animado tipo cajón (*drawer*) con overlay translúcido para móviles.
*   Prevención de zoom-in molesto al hacer foco en inputs vía configuración de Viewport de Next.js 16.

---

## Arquitectura y Stack Técnico

*   **Frontend**: Next.js 16 (React 19, App Router) optimizado con TypeScript.
*   **Estilos**: Vanilla CSS con variables CSS responsivas aplicadas a un sistema de diseño premium (glassmorphism, gradientes suaves y micro-animaciones).
*   **Autenticación**: Firebase Authentication con Google Provider (configurado para solicitar selección de cuenta).
*   **Base de Datos**: Google Cloud Firestore.
*   **Modelos de IA**: Sistema de fallback jerárquico multicapa entre Google Gemini API (`gemini-2.5-flash`, `gemini-2.5-pro`) y Anthropic Claude API (`claude-3-5-sonnet`) para garantizar alta disponibilidad incluso ante límites de cuota (Rate Limits).

---

## Seguridad de Datos y Buenas Prácticas

### Cero Secretos Hardcodeados
Todas las llaves de Firebase Client y las API keys de Gemini y Claude se inyectan a través de variables de entorno (`.env.local` en desarrollo, variables del entorno en producción) y jamás se exponen en el código fuente.

### Reglas de Seguridad de Firestore (`firestore.rules`)
Las conversaciones, los mensajes, las autoevaluaciones y la escalera emocional del usuario están protegidos mediante políticas estrictas basadas en el UID del usuario autenticado:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conversations/{conversationId} {
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null
                                  && resource.data.userId == request.auth.uid;

      match /messages/{messageId} {
        allow read, write: if request.auth != null
                           && get(/databases/$(database)/documents/conversations/$(conversationId)).data.userId == request.auth.uid;
      }
    }
    match /checkins/{checkinId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## Configuración y Arranque en Local

### 1. Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto con la siguiente estructura:
```env
# Firebase Client Config (Public keys)
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Server-Side Keys (Secret keys - NEVER client-side)
GEMINI_API_KEY=tu_gemini_api_key
CLAUDE_API_KEY=tu_claude_api_key # Opcional, para fallback
```

### 2. Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm run dev

# Chequear tipos TypeScript
npx tsc --noEmit
```

---

> [!WARNING]
> **Cumplimiento Legal (Colombia)**: Esta aplicación es un prototipo tecnológico enfocado en la salud mental. Antes de una implementación comercial real en territorio colombiano, se debe realizar una auditoría legal completa según la **Ley 1581 de 2012 (Habeas Data)** para el tratamiento seguro de datos sensibles de salud.
