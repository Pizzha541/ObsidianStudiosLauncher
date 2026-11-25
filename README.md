# Obsidian Studios Launcher

Launcher de escritorio de Obsidian Studios para instalar, administrar y ejecutar instancias de Minecraft. El proyecto cuenta con una implementacion Electron, una interfaz y un flujo de distribucion propios.

## Funciones principales

- Catalogo remoto y local de instancias.
- Instalacion de modpacks ZIP y Modrinth (`.mrpack`).
- Compatibilidad con Vanilla, Fabric, Forge y NeoForge.
- Inicio de sesion de Microsoft para Minecraft premium y modo offline.
- Biblioteca y previsualizacion 3D de skins y capas.
- Control de acceso mediante roles de Discord.
- Descargas con progreso, cache y diagnostico.
- Actualizaciones integradas mediante GitHub Releases, `electron-updater`, verificacion SHA-512 y barra de progreso.
- Recuperacion de la instalacion anterior cuando falla una actualizacion de instancia.
- Sesiones protegidas mediante el almacenamiento seguro de Windows.
- Filtros por acceso/estado, orden del catalogo, diagnostico y logs persistentes.

## Requisitos de desarrollo

- Node.js 20 o posterior.
- npm.
- Windows para generar el instalador NSIS configurado por el proyecto.

## Desarrollo

```bash
npm install
npm run check
npm run test:smoke
npm run audit:prod
npm start
```

## Compilacion

```bash
npm run dist
```

El instalador, `latest.yml` y el blockmap se generan en `dist/`. El script fuerza `--publish never`: compilar nunca publica ni crea una release. Esa carpeta, las dependencias instaladas y los archivos temporales no se versionan.

## Configuracion

El catalogo de respaldo se encuentra en `data/proyectos.json`. El catalogo de produccion se descarga desde la URL configurada al inicio de `main.js`. En una aplicacion empaquetada, las actualizaciones se consultan en las releases oficiales de `Pizzha541/ObsidianStudiosLauncher`; el manifiesto antiguo queda unicamente como compatibilidad de emergencia.

No incluyas contrasenas, tokens ni claves privadas en el repositorio. Los campos de acceso sensibles deben administrarse fuera del codigo publicado.

## Estructura

- `main.js`: proceso principal, instalaciones, autenticacion y lanzamiento de Minecraft.
- `preload.js`: puente IPC limitado entre la interfaz aislada y el proceso principal.
- `src/`: interfaz, estilos y logica del proceso de renderizado.
- `src/assets/`: recursos que usa la interfaz.
- `data/proyectos.json`: catalogo local de respaldo sin secretos.
- `build/installer.nsh`: personalizacion del instalador de Windows.
- `intro.mp4` y `intro2.mp4`: secuencias de introduccion del launcher.
- `docs/`: auditoria y procedimiento de preparacion/publicacion de la 1.0.9.

## Version 1.0.9

Consulta [la auditoria tecnica](docs/AUDIT-1.0.9.md), [el procedimiento de release](docs/RELEASE-1.0.9.md) y [el changelog](CHANGELOG.md). El backup inicial verificado se conserva fuera del repositorio en `D:\Escritorio\BACKUP_OBSIDIAN_LAUNCHER_v1.0.8`.

## Licencia

Publicado bajo la licencia MIT. Consulta [LICENSE](LICENSE).
