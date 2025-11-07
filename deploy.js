#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando proceso de deployment...\n');

// Función para ejecutar comandos
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completado\n`);
  } catch (error) {
    console.error(`❌ Error en: ${description}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Verificar que estamos en el directorio correcto
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ No se encontró package.json. Ejecuta este script desde la raíz del proyecto.');
  process.exit(1);
}

// Verificar que existe vercel.json
const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
if (!fs.existsSync(vercelJsonPath)) {
  console.error('❌ No se encontró vercel.json. Asegúrate de tener la configuración de Vercel.');
  process.exit(1);
}

console.log('📁 Directorio del proyecto verificado ✅');
console.log('⚙️  Configuración de Vercel encontrada ✅\n');

// Paso 1: Build de producción
runCommand('npm run build:prod', 'Build de producción');

// Paso 2: Verificar que se generó el build
const buildPath = path.join(process.cwd(), 'dist', 'stremio-addon-manager-dbl', 'browser');
if (!fs.existsSync(buildPath)) {
  console.error('❌ No se encontró el directorio de build. Verifica que el build se completó correctamente.');
  process.exit(1);
}

console.log('📦 Build verificado ✅\n');

// Paso 3: Deployment a Vercel
const deployType = process.argv.includes('--preview') ? '' : '--prod';
const deployDescription = deployType === '--prod' ? 'Deployment a producción' : 'Deployment preview';

runCommand(`vercel ${deployType}`, deployDescription);

console.log('\n🎉 ¡Deployment completado exitosamente!');
console.log('🌐 Tu aplicación está disponible en la URL mostrada arriba.');