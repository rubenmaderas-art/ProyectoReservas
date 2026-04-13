# Script para crear la tarea programada de sincronización
# Ejecutar como ADMINISTRADOR en PowerShell

# 1. Crear la tarea programada
$taskName = "SincronizarCentrosReservas"
$action = New-ScheduledTaskAction -Execute "C:\Proyectos\ProyectoReservas\back\sync_centros_scheduler.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
$principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType S4U
$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable -StartWhenAvailable

# Crear la tarea
Register-ScheduledTask -TaskName $taskName `
                       -Action $action `
                       -Trigger $trigger `
                       -Principal $principal `
                       -Settings $settings `
                       -Description "Sincroniza centros desde UnificaPP cada noche a las 03:00" `
                       -Force

Write-Host "Tarea creada: $taskName"
Write-Host "Se ejecutará cada día a las 03:00 AM"

# Ver la tarea creada
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, @{Name="NextRunTime";Expression={$_.Triggers.StartBoundary}}, State
