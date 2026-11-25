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
- Actualizaciones del launcher mediante un manifiesto remoto.

## Requisitos de desarrollo

- Node.js 20 o posterior.
- npm.
- Windows para generar el instalador NSIS configurado por el proyecto.

## Desarrollo

```bash
npm install
npm run check
npm start
```

## Compilacion

```bash
npm run dist
```

El instalador se genera en `dist/`. Esa carpeta, las dependencias instaladas y los archivos temporales no se versionan.

## Configuracion

El catalogo de respaldo se encuentra en `data/proyectos.json`. El catalogo de produccion y el manifiesto de actualizaciones se descargan desde las URLs configuradas al inicio de `main.js`.

No incluyas contrasenas, tokens ni claves privadas en el repositorio. Los campos de acceso sensibles deben administrarse fuera del codigo publicado.

## Estructura

- `main.js`: proceso principal, instalaciones, autenticacion y lanzamiento de Minecraft.
- `src/`: interfaz, estilos y logica del proceso de renderizado.
- `src/assets/`: recursos que usa la interfaz.
- `data/proyectos.json`: catalogo local de respaldo sin secretos.
- `build/installer.nsh`: personalizacion del instalador de Windows.
- `intro.mp4` y `intro2.mp4`: secuencias de introduccion del launcher.

## Licencia

Publicado bajo la licencia MIT. Consulta [LICENSE](LICENSE).
