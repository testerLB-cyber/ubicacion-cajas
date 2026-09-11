# Control de Cajas · fuente modular

Esta carpeta es la fuente modular de compilación del antiguo bloque monolítico de Control de Cajas.

Los archivos `*.part.js` están ordenados por prefijo numérico y clasificados por dominio: Inventario, Rentas, Mantenimiento/DOT, Mapa/QR, Configuración, Supabase/Data y Shared Core. El build concatena los fragmentos exactamente en el orden del manifiesto y verifica SHA-256 contra el bloque funcional de `app-correcta.html`.

**Regla:** no cambiar el orden de los fragmentos. Para migraciones futuras, mover funciones completas entre fragmentos solo cuando la recomposición y las pruebas de contrato continúen pasando.
