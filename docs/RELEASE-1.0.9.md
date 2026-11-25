# Preparar y publicar Obsidian Studios Launcher 1.0.9

## Compilar localmente sin publicar

1. Instala Node.js 20 o posterior y ejecuta `npm ci`.
2. Ejecuta `npm run check`, `npm run test:smoke` y `npm run audit:prod`.
3. Ejecuta `npm run dist`. El script siempre incluye `--publish never`.
4. Conserva juntos el instalador `.exe`, su `.blockmap` y `latest.yml` generados en `dist/`.
5. Instala y abre el ejecutable en un equipo de prueba antes de publicarlo.

## Firma recomendada

Para una distribucion publica, configura el certificado Authenticode compatible con electron-builder mediante `CSC_LINK` y `CSC_KEY_PASSWORD` en el entorno de compilacion. No guardes el certificado ni su clave en el repositorio. Verifica la firma del instalador desde Propiedades > Firmas digitales.

## Publicar posteriormente

1. Revisa y confirma localmente los cambios; este trabajo no hace commit ni push.
2. Crea la etiqueta exacta `v1.0.9` cuando decidas publicar.
3. Crea una GitHub Release no marcada como prerelease y usa notas basadas en `CHANGELOG.md`.
4. Adjunta el instalador, el `.blockmap` y `latest.yml` de la misma compilacion. No mezcles artefactos de builds diferentes.
5. Publica la release y comprueba que los tres archivos sean descargables.
6. Desde una instalacion 1.0.8, pulsa **Comprobar versiones**, valida notas/progreso y confirma el reinicio solo en un equipo de prueba.

El actualizador preserva `%APPDATA%\Obsidian Studios Launcher` y las instancias en `%APPDATA%\.obsidian-launcher`; el instalador no debe borrar esas ubicaciones.

## Artefacto verificado en esta preparacion

- Instalador: `dist/Obsidian-Studios-Launcher-Setup-1.0.9.exe`
- Tamano: `115946156` bytes
- SHA-256: `28B7EA61E15DA35591CEDCE39AB030FEB9758BD31DFD608CD233BAAB49E8D39C`
- Manifiesto: `dist/latest.yml` (nombre, tamano y SHA-512 coincidentes)
- Blockmap: `dist/Obsidian-Studios-Launcher-Setup-1.0.9.exe.blockmap`

La compilacion no esta firmada porque no se proporciono un certificado Authenticode. No publiques un hash distinto sin actualizar esta seccion y volver a validar `latest.yml`.
