# Tráfico App - Versión Profesional Paralela

Base funcional: `app-correcta.html`.

- La versión original de producción no se modifica.
- `source-original.html` es una copia exacta de la base funcional.
- `index.html` conserva el HTML y orden de ejecución, pero carga bloques internos desde archivos separados.
- `assets/css/` contiene 28 bloques CSS extraídos.
- `assets/js/` contiene 12 bloques JavaScript extraídos.
- Las páginas auxiliares y `vendor` se copian dentro de `/profesional/` para conservar rutas relativas.

Esta es la primera etapa de modularización segura. Los módulos funcionales pueden separarse progresivamente sobre esta base sin tocar producción.
