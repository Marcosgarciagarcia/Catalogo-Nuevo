# sync-users.ps1
# Script para sincronizar la tabla auth_user de SQLite local a Turso

Write-Host "🔄 Sincronizando usuarios de SQLite local a Turso..." -ForegroundColor Cyan
Write-Host ""

# Verificar que existe db.sqlite3
if (-not (Test-Path "db.sqlite3")) {
    Write-Host "❌ Error: No se encuentra db.sqlite3" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio del proyecto" -ForegroundColor Yellow
    exit 1
}

# Exportar usuarios
Write-Host "📤 Exportando usuarios desde SQLite local..." -ForegroundColor Yellow
sqlite3 db.sqlite3 ".dump auth_user" > auth_user_export.sql

# Verificar que el archivo se creó
if (Test-Path auth_user_export.sql) {
    $fileSize = (Get-Item auth_user_export.sql).Length
    Write-Host "✅ Exportación exitosa ($fileSize bytes)" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar usuarios que se van a sincronizar
    Write-Host "👥 Usuarios a sincronizar:" -ForegroundColor Cyan
    sqlite3 db.sqlite3 "SELECT username, email, CASE WHEN is_superuser=1 THEN 'Admin' ELSE 'User' END as role FROM auth_user;"
    Write-Host ""
    
    # Confirmar antes de importar
    $confirm = Read-Host "¿Deseas continuar con la importación a Turso? (S/N)"
    
    if ($confirm -eq "S" -or $confirm -eq "s") {
        # Importar a Turso
        Write-Host "📥 Importando usuarios a Turso..." -ForegroundColor Yellow
        turso db shell catalogo-prueba < auth_user_export.sql
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Sincronización completada exitosamente" -ForegroundColor Green
            Write-Host ""
            Write-Host "🔍 Verificando usuarios en Turso:" -ForegroundColor Cyan
            turso db shell catalogo-prueba "SELECT username, email, CASE WHEN is_superuser=1 THEN 'Admin' ELSE 'User' END as role FROM auth_user;"
        } else {
            Write-Host "❌ Error al importar a Turso" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Sincronización cancelada" -ForegroundColor Yellow
    }
    
    # Limpiar archivo temporal
    Remove-Item auth_user_export.sql
    Write-Host ""
    Write-Host "🧹 Archivo temporal eliminado" -ForegroundColor Gray
} else {
    Write-Host "❌ Error en la exportación" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ Proceso completado" -ForegroundColor Green
