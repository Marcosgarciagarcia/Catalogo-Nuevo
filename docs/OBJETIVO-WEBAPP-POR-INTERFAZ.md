# Objetivo de la webapp por tipo de interfaz

Documento de referencia: comportamiento deseado de la aplicación web según el dispositivo.

---

## Móvil (smartphone)

- **Rol:** Elemento de **consulta**.
- Solo lectura del catálogo (libros, búsqueda, filtros, ficha de detalle).
- **No** se muestra el botón de iniciar sesión.
- Sin creación, edición ni eliminación de datos.

---

## Tablet y escritorio (portátil / ordenador de mesa)

- **Mismos permisos y operativas** que la aplicación de escritorio (Catálogo Manager), **con dos excepciones**:

### Igual que en escritorio

- Login y control de acceso por usuario (permisos según rol: admin, staff, etc.).
- Consulta del catálogo.
- Creación y edición de autores, editoriales y libros (según permisos).

### Diferencias respecto a la aplicación de escritorio

| Aspecto | Escritorio | Web (tablet/escritorio) |
|--------|------------|---------------------------|
| **Sincronización** | Manual (botón “Sincronizar”, elección de fuente local/Turso). | Automática: temporizada y/o al abrir la aplicación. Sin UI de sincronización manual. |
| **Eliminaciones** | Disponibles (con las garantías actuales). | De momento **no** disponibles en la web; las eliminaciones se hacen con garantías solo en la aplicación de escritorio. |

---

## Resumen

- **Móvil:** solo consulta, sin login ni escritura.
- **Tablet/escritorio:** mismo modelo de permisos y operativas que la app de escritorio, salvo sincronización automática (sin mando manual) y sin eliminaciones (reservadas a la app de escritorio).
