/**
 * Script de prueba para listar todos los modelos disponibles de Gemini
 * Ejecutar con: node test-gemini-models.js TU_API_KEY_AQUI
 */

// Obtener API key del argumento de línea de comandos
const apiKey = process.argv[2];

if (!apiKey) {
  console.error("❌ Debes proporcionar la API key como argumento");
  console.error("   Uso: node test-gemini-models.js TU_API_KEY_AQUI");
  process.exit(1);
}

console.log("🔑 API Key proporcionada. Longitud:", apiKey.length);
console.log("🔍 Listando todos los modelos disponibles...\n");

async function listModels() {
  try {
    // Hacer petición HTTP directa a la API de Google AI para listar modelos
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log("=".repeat(60));
    console.log("MODELOS DISPONIBLES CON TU API KEY");
    console.log("=".repeat(60) + "\n");
    
    if (!data.models || data.models.length === 0) {
      console.log("❌ No se encontraron modelos disponibles");
    } else {
      console.log(`✅ Encontrados ${data.models.length} modelos:\n`);
      
      data.models.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}`);
        console.log(`   Display Name: ${model.displayName || 'N/A'}`);
        console.log(`   Description: ${model.description || 'N/A'}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log();
      });
    }
    
    console.log("=".repeat(60));
    console.log("💡 Usa uno de estos nombres de modelo en tu código");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("❌ Error al listar modelos:");
    console.error(error.message);
    console.error("\nPosibles causas:");
    console.error("1. La API key no es válida");
    console.error("2. La API key no tiene permisos para listar modelos");
    console.error("3. La API key está deshabilitada o revocada");
  }
}

listModels().catch(console.error);
