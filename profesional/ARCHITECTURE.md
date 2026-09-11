# Arquitectura · Tráfico App Profesional

Base funcional: `app-correcta.html`. La versión activa original no se modifica.

## Runtime
El navegador carga archivos separados para Dashboard, Analítica, Supabase, Control de Cajas, Anticipos, Auth/Permisos, navegación y Alertas.

## Control de Cajas
El antiguo bloque monolítico fue migrado a `25` fragmentos fuente de compilación en `src/control-cajas/`, clasificados por dominio. Para conservar el alcance léxico y no romper variables compartidas, el build recompone esos fragmentos como `assets/js/modules/control-cajas-core.js`.

La recomposición se valida byte a byte y por SHA-256 (`bcaec7564aa2c11009d0c4eaf56f6cc4e2d44c2521b53c6acae2bf21ce179816`) contra el bloque funcional extraído de `app-correcta.html`. Si existe una diferencia, la publicación falla.

## Dominios
- configuracion: 1 fragmento(s)
- inventario: 6 fragmento(s)
- mantenimiento-dot: 7 fragmento(s)
- mapa-qr: 5 fragmento(s)
- rentas: 4 fragmento(s)
- supabase-data: 2 fragmento(s)

## APIs públicas
Inventario, Rentas, Mantenimiento/DOT, Mapa/QR y Configuración exponen fachadas estables en `assets/js/modules/`.
