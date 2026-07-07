# Política de Privacidad y Términos de Uso - Faro

Última actualización: Julio 2026

Faro está comprometido con la privacidad y la protección de los datos de sus usuarios. Debido a que las conversaciones ingresadas en esta plataforma pueden contener información sobre tu estado emocional o mental, tratamos estos datos como **datos sensibles** según la legislación vigente.

---

## 1. Protección y Cifrado de Datos

Garantizamos la seguridad de tu información mediante los siguientes mecanismos:

- **Cifrado en tránsito**: Toda la comunicación entre tu navegador web y nuestros servidores se realiza a través de conexiones seguras HTTPS cifradas mediante protocolos TLS de última generación. Ningún intermediario puede interceptar el flujo de tus datos en la red.
- **Cifrado en reposo**: Los datos recopilados (conversaciones, mensajes y autoevaluaciones) se guardan en Google Cloud / Firebase Firestore, que de manera automática y nativa aplica cifrado en reposo utilizando el algoritmo estándar de la industria **AES-256** gestionado directamente por Google.
- **Aislamiento a nivel de usuario (Reglas de Seguridad)**: Hemos programado reglas estrictas a nivel de base de datos (`firestore.rules`) que impiden que cualquier usuario, excepto tú mismo mediante tu cuenta de Google autenticada, pueda leer, modificar, agregar o eliminar tus conversaciones. Ni siquiera otros usuarios registrados pueden acceder a tu historial.
- **Servidor Seguro (Server-Side Isolation)**: La comunicación con el motor de Inteligencia Artificial (Gemini) se hace en un servidor seguro mediante APIs en Next.js. Tus credenciales de acceso, contraseñas de Firebase y API Keys de IA nunca se exponen al navegador cliente ni se cargan en componentes de frontend.

---

## 2. Advertencia Legal Importante

> [!CAUTION]
> **Pendiente de Revisión Legal (Habeas Data - Ley 1581 de 2012)**:
> Esta aplicación ha sido desarrollada con los más altos estándares técnicos de seguridad de la información. Sin embargo, antes de su puesta en producción comercial o despliegue real en Colombia, es **obligatorio y mandatorio** realizar una auditoría y revisión legal exhaustiva de la política de datos conforme a la **Ley 1581 de 2012 (Protección de Datos Personales o Habeas Data)** y su reglamentación.
>
> Debido al carácter altamente sensible de los datos de salud mental recopilados:
> - Se requiere la formalización del consentimiento expreso y previo del usuario.
> - Se debe estructurar el Registro Nacional de Bases de Datos ante la Superintendencia de Industria y Comercio (SIC).
> - Este software se entrega en calidad de prototipo técnico ("as-is"), por lo que la responsabilidad de cumplimiento legal definitivo recae en quien despliegue e implemente la solución en producción.

---

## 3. Limitaciones del Servicio

- Faro no es una herramienta médica, diagnóstica ni terapéutica.
- La información contenida en el chat no constituye una recomendación profesional.
- El sistema de detección de crisis está activo de forma **obligatoria y no desactivable** por regulaciones internas de seguridad y contención. En caso de detectarse riesgo de autolesión o suicidio, se priorizará presentarte canales de ayuda (Línea 106 y Línea 123 en Colombia).
