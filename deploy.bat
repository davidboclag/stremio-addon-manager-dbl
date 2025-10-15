@echo off
echo 🚀 Iniciando deployment...
echo.

echo 📋 Compilando aplicación...
call npm run build:prod
if errorlevel 1 (
    echo ❌ Error en el build
    pause
    exit /b 1
)
echo ✅ Build completado
echo.

echo 📋 Desplegando a Vercel...
call vercel --prod
if errorlevel 1 (
    echo ❌ Error en el deployment
    pause
    exit /b 1
)

echo.
echo 🎉 ¡Deployment completado!
echo 🌐 Tu aplicación está desplegada exitosamente
pause