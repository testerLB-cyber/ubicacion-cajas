# Arquitectura · Tráfico App Profesional

Esta versión se genera en paralelo desde `app-correcta.html`. Producción no se modifica.

## Estructura JavaScript

- `assets/js/core/`: lógica transversal del dashboard y banderas de compatibilidad/rendimiento.
- `assets/js/ui/`: navegación y shell visual.
- `assets/js/modules/`: módulos funcionales de negocio.
- `assets/js/security/`: autenticación y permisos.
- `assets/js/config/`: configuración pública del cliente Supabase.
- `assets/js/vendor/`: SDK externo embebido que ya utilizaba la versión funcional.

## Regla de seguridad

Los archivos se extraen sin modificar su contenido y `index.html` conserva el mismo orden de ejecución que `app-correcta.html`. Esto permite profesionalizar la estructura sin cambiar el comportamiento actual.

## Próxima división segura

El archivo `modules/control-cajas-core.js` sigue siendo el bloque funcional más grande. Se dividirá internamente por Inventario, Rentas, Mantenimiento/DOT, Mapa/QR y Configuración solamente después de identificar dependencias globales y mantener una capa de compatibilidad.
