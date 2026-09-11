# Arquitectura · Tráfico App Profesional

Esta versión se genera en paralelo desde `app-correcta.html`. Producción no se modifica.

## Estructura JavaScript
- `assets/js/core/`: lógica transversal.
- `assets/js/ui/`: navegación y shell visual.
- `assets/js/modules/`: negocio.
- `assets/js/security/`: autenticación y permisos.
- `assets/js/config/`: configuración pública del cliente Supabase.
- `assets/js/vendor/`: SDK externo embebido.

## Control de Cajas · estrategia segura
`control-cajas-core.js` conserva temporalmente el IIFE y su estado compartido. Encima se cargan fachadas independientes para Inventario, Rentas, Mantenimiento/DOT, Mapa y Configuración. Así se crean puntos de entrada estables sin duplicar estado ni romper cierres léxicos.
