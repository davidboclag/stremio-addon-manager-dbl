# Script de deployment para Stremio Addon Manager
Write-Host "🚀 Iniciando proceso de deployment..." -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ No se encontró package.json. Ejecuta este script desde la raíz del proyecto." -ForegroundColor Red
    exit 1
}

Write-Host "📁 Directorio verificado ✅" -ForegroundColor Green

# Paso 1: Build de producción
Write-Host "📋 Compilando aplicación..." -ForegroundColor Yellow
try {
    npm run build:prod
    Write-Host "✅ Build completado" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error en el build" -ForegroundColor Red
    exit 1
}

# Verificar que se generó el build
$buildPath = "dist\stremio-addon-manager-dbl\browser"
if (-Not (Test-Path $buildPath)) {
    Write-Host "❌ No se encontró el directorio de build en: $buildPath" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Build verificado en: $buildPath ✅" -ForegroundColor Green
Write-Host ""

# Paso 2: Deployment
Write-Host "📋 Desplegando a Vercel..." -ForegroundColor Yellow
try {
    if ($args -contains "--preview") {
        vercel
        Write-Host "✅ Preview deployment completado" -ForegroundColor Green
    } else {
        vercel --prod
        Write-Host "✅ Production deployment completado" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error en el deployment" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 ¡Deployment completado exitosamente!" -ForegroundColor Green
Write-Host "🌐 Tu aplicación está disponible en la URL mostrada arriba." -ForegroundColor Cyan