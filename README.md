# Faro — Acompañamiento Emocional

Faro es una aplicación web responsiva diseñada como espacio de desahogo, contención y orientación inicial en situaciones de malestar emocional. Integra un chat interactivo con IA, un motor híbrido de seguridad de crisis no desactivable, autoevaluaciones psicológicas basadas en escalas clínicas (PHQ-9 y GAD-7) y una representación gráfica de la trayectoria afectiva del usuario llamada "La Escalera".

Por ahora solo esta disponible por web, puedes acceder mediante este enlace: faroout.netlify.app

<img width="1024" height="1536" alt="image" src="https://github.com/user-attachments/assets/314bc7c3-6062-42de-a36f-dc76f74f266d" />

---

## Características Técnicas

### 1. Detección de Crisis y Protocolo de Seguridad (No Desactivable)
La aplicación cuenta con una capa de análisis server-side para identificar señales de riesgo de autolesión o suicidio:
*   **Filtro local de palabras clave**: Evaluación determinista mediante expresiones regulares locales.
*   **Clasificador mediante IA**: Clasificación semántica del nivel de riesgo estructurada a través de prompts con salida en formato JSON.
*   **Inyección de recursos de emergencia**: Ante una detección positiva, el servidor anexa de manera prioritaria los datos de contacto de la Línea 106 y Línea 123 de Colombia, activando banderas visuales en la interfaz.

### 2. Autoevaluaciones (PHQ-9 y GAD-7)
*   **PHQ-9 (Patient Health Questionnaire)**: Cuestionario estandarizado de 9 preguntas sobre síntomas de depresión.
*   **GAD-7 (Generalized Anxiety Disorder)**: Escala de 7 preguntas para evaluar niveles de ansiedad.
*   **Alerta en Pregunta 9**: Si la respuesta a la novena pregunta del PHQ-9 (ideación autolesiva) es mayor a 0, la interfaz despliega automáticamente una tarjeta informativa destacada con canales de atención humana.

### 3. Historial de Tendencias
*   Consulta y recuperación de datos de autoevaluaciones desde Firestore.
*   Gráfico de líneas dinámico implementado mediante SVG nativo sin dependencias de librerías de gráficos pesadas.
*   Cálculo automático del nivel de severidad de acuerdo con los rangos de puntuación clínicos oficiales.

### 4. La Escalera Emocional
*   **Extracción de hitos**: Una ruta de API (/api/escalera) analiza el historial de mensajes de la conversación y extrae momentos significativos representados en objetos `{ date, who, desc, level, type }`.
*   **Visualización SVG interactiva**: Renderiza los momentos en una línea de tiempo curva e interactiva con scroll horizontal.
*   **Privacidad**: El prompt del analizador de hitos omite nombres propios o datos de identificación de terceros para enfocarse únicamente en el flujo del estado afectivo.

### 5. Configuración
*   **Temas visuales**: Tres variaciones de color (*Oscuro profundo*, *Cálido ámbar* y *Suave claro*) controlados a través de variables CSS (:root) y persistidos en `localStorage`.
*   **Selección de modelo de lenguaje**: Alterna la llamada del chat entre *Gemini Flash*, *Gemini Pro* y *Claude Sonnet*.

### 6. Interfaz Móvil y Responsiva
*   Alineación de modales responsiva (centrados en pantallas de escritorio, y en formato *bottom-sheet* inferior en pantallas móviles).
*   Uso de la unidad `100dvh` (Dynamic Viewport Height) para evitar el solapamiento con la barra de navegación del navegador móvil.
*   Áreas táctiles optimizadas a un tamaño mínimo de 44px-48px.
*   Prevención de zoom-in automático al enfocar inputs a nivel de configuración del Viewport.

---

## Arquitectura y Stack

*   **Frontend**: Next.js 16 (React 19, App Router) y TypeScript.
*   **Base de datos y autenticación**: Firebase Authentication (Google Sign-In) y Cloud Firestore.
*   **Modelos de IA**: Lógica de fallbacks estructurada en cascada entre Google Gemini API y Anthropic Claude API para mitigar fallas por cuota (rate limits) en el servidor.

---

## Reglas de Seguridad en Base de Datos (`firestore.rules`)
Las conversaciones, los mensajes y los registros de autoevaluación están protegidos con reglas basadas en el identificador único del usuario (`request.auth.uid`):
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

## Configuración Local

### 1. Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

GEMINI_API_KEY=tu_gemini_api_key
CLAUDE_API_KEY=tu_claude_api_key
```

### 2. Comandos de desarrollo
```bash
# Instalar dependencias
npm install

# Levantar servidor local
npm run dev

# Validación de TypeScript
npx tsc --noEmit
```

---

> [!WARNING]
> **Cumplimiento Normativo (Colombia)**: Esta aplicación es un prototipo experimental. Previo a una implementación real en producción en Colombia, requiere una auditoría legal en los términos de la **Ley 1581 de 2012** sobre el tratamiento de datos sensibles de salud.
