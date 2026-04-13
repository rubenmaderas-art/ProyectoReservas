@echo off
REM Script para ejecutar la sincronización de centros
REM Se ejecuta a través de Windows Task Scheduler

cd /d C:\Proyectos\ProyectoReservas\back

REM Ejecutar el script Node.js
node scripts/syncCentros.js

REM Guardar resultado en log
echo. >> scripts\sync_resultado.log
echo Ejecución: %date% %time% >> scripts\sync_resultado.log

exit /b %ERRORLEVEL%
