# Configuración de Variables de Entorno en Vercel

Para que el sistema de autenticación funcione correctamente en Vercel, debes configurar las siguientes variables de entorno:

## Variables Requeridas

1. **TURSO_DATABASE_URL**
   - Valor: `https://catalogo-prueba-marcosgarciagarcia.aws-eu-west-1.turso.io`
   - Descripción: URL de tu base de datos Turso

2. **TURSO_AUTH_TOKEN**
   - Valor: Tu token de autenticación de Turso
   - Descripción: Token con permisos READ/WRITE para la base de datos

3. **JWT_SECRET** (NUEVO)
   - Valor: Una cadena aleatoria y segura (mínimo 32 caracteres)
   - Descripción: Secret para firmar los tokens JWT de autenticación
   - Ejemplo: `mi-super-secret-key-muy-segura-y-aleatoria-2026`

## Cómo Configurar en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Click en **Settings** (Configuración)
3. Click en **Environment Variables** (Variables de Entorno)
4. Añade cada variable con su valor correspondiente
5. Selecciona los entornos: **Production**, **Preview**, y **Development**
6. Click en **Save** (Guardar)

## Después de Configurar

1. Haz un nuevo deploy o espera al próximo push a GitHub
2. Vercel automáticamente usará las nuevas variables de entorno
3. El sistema de autenticación funcionará correctamente

## Verificar que Funciona

1. Abre tu app en Vercel
2. Deberías ver el botón "Iniciar Sesión" en la esquina superior derecha
3. Prueba hacer login con tus credenciales de Django

## Troubleshooting

Si el botón de login no aparece:
- Verifica que todas las variables estén configuradas
- Revisa los logs de deployment en Vercel
- Asegúrate de que el build se completó sin errores
