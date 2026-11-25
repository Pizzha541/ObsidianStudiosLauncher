# Auditoria y cambios de Obsidian Studios Launcher 1.0.9

## Punto de recuperacion

Antes de esta fase se creo y verifico `D:\Escritorio\BACKUP_OBSIDIAN_LAUNCHER_v1.0.8`. Incluye el instalador oficial 1.0.8, una copia de las fuentes disponibles y un bundle Git recuperable. El instalador coincide con el SHA-256 publicado: `35eb7475fe66d3289fad4c2c411df6b932d5a70a11d01dd2f6244ed69ed36f74`.

## Problemas encontrados

- Renderer con acceso completo a Node/Electron y sin aislamiento de contexto.
- Actualizador manual basado principalmente en un Gist y ejecucion de instalador propia.
- Sesiones y refresh tokens almacenados como JSON legible.
- Extracciones ZIP sin limites ni validacion central de rutas.
- Una actualizacion de instancia eliminaba el contenido administrado antes de confirmar el exito.
- IDs remotos, URLs externas y RAM sin validacion suficiente.
- Logs solo en memoria y redaccion incompleta de secretos.
- 26 avisos iniciales de `npm audit`, incluidas dependencias directas vulnerables.
- Catalogo sin filtros ni orden, noticias aun rotuladas como 1.0.8 y pequeños problemas de layout.

## Cambios aplicados

- `preload.js` expone solo 55 operaciones IPC de salida y eventos conocidos; el renderer ya no importa Electron.
- `nodeIntegration: false`, `contextIsolation: true`, sandbox, CSP, navegacion bloqueada y apertura HTTPS validada.
- `safeStorage` cifra los perfiles Microsoft/Discord y migra datos legados al volver a guardarlos.
- Las escrituras JSON usan archivo temporal y reemplazo; los logs rotan a 2 MB y eliminan tokens conocidos.
- ZIP/JAR bloquean traversal, rutas absolutas, enlaces simbolicos, duplicados y volumen descomprimido excesivo.
- Las instalaciones mueven el contenido administrado a un respaldo temporal y hacen commit/rollback.
- El actualizador principal usa `electron-updater` y los artefactos `latest.yml`/blockmap de GitHub Releases. La ruta heredada exige SHA-256 valido y limita el instalador a 500 MB.
- Filtros y orden del catalogo, estados accesibles, Escape en modales, foco visible y respeto a movimiento reducido.
- Se actualizaron Electron, electron-builder, Axios y adm-zip; se retiro `extract-zip`.

## Seguridad de dependencias

El recuento de produccion bajo de 26 avisos iniciales a 6 reportados. `fflate` se actualizo a `0.8.3`, que corrige el aviso sobre archivos ZIP64 malformados. Los seis avisos restantes pertenecen a `minecraft-launcher-core@3.18.2`, que aun depende de `request@2.88.2` y versiones antiguas de `form-data`, `qs`, `tough-cookie` y `uuid`; npm no ofrece una correccion compatible y esa es tambien la version mas reciente del nucleo. La exposicion se reduce validando URLs/rutas, aislando el renderer y evitando que valores remotos lleguen sin filtrar al sistema de archivos. Para una version futura se debe sustituir o bifurcar `minecraft-launcher-core` y eliminar `request`.

## Pruebas realizadas

- Sintaxis de `main.js`, `preload.js` y `src/renderer.js`.
- Smoke test de version, build, CSP, aislamiento, recursos, actualizador, rollback y canales IPC.
- Inicio real de Electron con sandbox y recorrido visual de Instancias, Noticias, Cuenta, Configuracion, Consola y Descargas.
- Comprobacion del catalogo remoto, cuenta existente, skin, filtros, logs y estados sin ejecutar acciones destructivas.
- Auditoria npm de dependencias de produccion.
- Build NSIS completado y arranque visual verificado desde `dist/win-unpacked`, incluido el logo, la introduccion, el catalogo remoto y la interfaz aislada.

## Limites de prueba

- No se repitio un login Microsoft/Discord completo ni se registraron credenciales nuevas.
- No se instalo o inicio un modpack real para evitar alterar instancias/datos del usuario.
- No se publico una release, por lo que la descarga de una futura 1.0.10 solo puede verificarse cuando existan artefactos oficiales.
- La firma Authenticode requiere un certificado del propietario; sin el, Windows puede mostrar SmartScreen aunque los hashes del actualizador se verifiquen.
