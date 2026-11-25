const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const main = read('main.js')
const preload = read('preload.js')
const renderer = read('src/renderer.js')
const html = read('src/index.html')
const content = JSON.parse(read('content/launcher-content.json'))

assert.strictEqual(packageJson.version, '1.1.0', 'package.json debe conservar la version 1.1.0')
assert(packageJson.dependencies['electron-updater'], 'electron-updater debe ser dependencia de produccion')
assert(!packageJson.dependencies['extract-zip'], 'extract-zip vulnerable no debe estar instalado directamente')
assert(packageJson.build.files.includes('preload.js'), 'el preload seguro debe incluirse en el paquete')
assert(packageJson.build.files.includes('content/**/*'), 'el manifiesto central debe incluirse en el paquete')
assert.strictEqual(packageJson.build.publish.provider, 'github')
assert.strictEqual(packageJson.build.publish.repo, 'ObsidianStudiosLauncher')

assert(/nodeIntegration:\s*false/.test(main), 'nodeIntegration debe estar desactivado')
assert(/contextIsolation:\s*true/.test(main), 'contextIsolation debe estar activado')
assert(/sandbox:\s*true/.test(main), 'el renderer debe ejecutarse en sandbox')
assert(/validateZipArchive/.test(main), 'las extracciones deben validar ZIPs')
assert(/safeStorage\.encryptString/.test(main), 'las sesiones deben protegerse con safeStorage')
assert(/rollbackManagedContentTransaction/.test(main), 'las instalaciones deben poder restaurarse')
assert(/autoUpdater\.downloadUpdate/.test(main), 'el actualizador integrado debe descargar con electron-updater')
assert(/sha256|sha512/i.test(main), 'las actualizaciones deben verificar integridad')
assert.strictEqual((main.match(/shell\.openExternal/g) || []).length, 1, 'los enlaces externos deben pasar por el validador central')

assert(!/require\(['"]electron['"]\)/.test(renderer), 'el renderer no debe importar Electron directamente')
assert(/Content-Security-Policy/.test(html), 'la interfaz debe declarar una politica CSP')
assert(/id="view-home"[^>]*active/.test(html), 'Instancias debe ser la pantalla inicial')
assert(/id="tab-home"[^>]*active/.test(html), 'la navegacion debe iniciar en Instancias')
assert(!/id="(?:view|tab)-dashboard"/.test(html), 'Inicio no debe seguir como vista o categoria')
for (const target of ['home', 'news', 'account', 'settings']) {
    assert(html.includes(`id="tab-${target}"`), `falta la navegacion principal ${target}`)
    assert(html.includes(`id="view-${target}"`), `falta la vista principal ${target}`)
}
assert(/id="service-strip"/.test(html) && /renderServiceStatus/.test(renderer), 'Instancias debe mostrar el estado compacto de servicios')
assert(!/renderDashboard|playDashboardProject/.test(renderer), 'la logica del Inicio eliminado no debe permanecer activa')
assert(/openConsoleWindow\(\)/.test(html) && /openDownloadCenter\(\)/.test(html), 'consola y descargas deben seguir accesibles')
assert(/catalog-access-filter/.test(html) && /catalog-state-filter/.test(html) && /catalog-sort/.test(html), 'el catalogo debe incluir filtros y orden')
assert(/id="catalog-filter-drawer"/.test(html) && /toggleCatalogFilters/.test(renderer), 'los filtros deben abrirse sin superponerse al catalogo')
assert(/selectCatalogProject/.test(renderer) && /pendingCardAction/.test(renderer), 'las acciones rapidas deben validar primero la instancia seleccionada')
assert(/openSelectedInstanceMenu/.test(html) && /openSelectedInstanceFolder\(contextMenuProjectId\)/.test(renderer), 'el detalle debe conservar carpeta y menu contextual')
assert(!/class="btn (?:content|folder|kill)"/.test(html), 'Contenido, Carpeta y Parar no deben duplicarse en la barra principal')
assert(/id="game-action-button"[^>]*onclick="runPrimaryGameAction\(\)"/.test(html) && /setPrimaryGameButtonState/.test(renderer), 'Jugar y Parar deben compartir un unico boton')
assert.strictEqual((html.match(/id="trailer-button"/g) || []).length, 1, 'Ver trailer debe permanecer una sola vez en su posicion')
assert(/function openInstanceContextMenu[\s\S]*?event\.stopPropagation\(\)/.test(renderer), 'el menu contextual debe permanecer abierto tras el clic')
assert(/isInstalling \? 'Instalando' : installButtonLabel/.test(renderer), 'la animacion debe agregar los puntos al texto Instalando')
assert(/setAccessPendingButtonState/.test(renderer) && /actionsDisabled/.test(renderer), 'Instalar debe permanecer visible mientras se comprueba el acceso')
assert(/content-news/.test(main) && /content-news/.test(renderer) && /content-news/.test(preload), 'las noticias deben llegar mediante el puente seguro')
assert(!/codigo_acceso|access_code/.test(JSON.stringify(content)), 'el manifiesto publico no debe contener claves de acceso')
assert(content.projects.every((project) => /^[a-f0-9]{64}$/i.test(project.file?.sha256 || '')), 'cada modpack debe declarar SHA-256')

const sentChannels = [...renderer.matchAll(/ipcRenderer\.send\(['"]([^'"]+)['"]/g)].map((match) => match[1])
const receivedChannels = [...renderer.matchAll(/ipcRenderer\.on\(['"]([^'"]+)['"]/g)].map((match) => match[1])
for (const channel of new Set([...sentChannels, ...receivedChannels])) {
    assert(preload.includes(`'${channel}'`), `el canal IPC ${channel} debe estar permitido en preload.js`)
}

for (const asset of ['56x56-Logo.png', 'icono.ico', 'intro.mp4', 'intro2.mp4']) {
    const stat = fs.statSync(path.join(root, asset))
    assert(stat.isFile() && stat.size > 0, `falta el recurso ${asset}`)
}
for (const asset of ['src/assets/social/discord.png', 'src/assets/social/wento-license-rights.txt']) {
    const stat = fs.statSync(path.join(root, asset))
    assert(stat.isFile() && stat.size > 0, `falta el recurso ${asset}`)
}

const closeHandlerStart = main.indexOf("ipcMain.on('close-app'")
const closeHandlerEnd = main.indexOf("ipcMain.on('minimize-app'", closeHandlerStart)
const closeHandler = main.slice(closeHandlerStart, closeHandlerEnd)
assert(closeHandlerStart >= 0 && closeHandlerEnd > closeHandlerStart, 'debe existir el cierre controlado del launcher')
assert(!/minecraftProcess\.kill\(/.test(closeHandler), 'cerrar el launcher no debe detener Minecraft')
assert(/ipcMain\.on\('kill-instance'[\s\S]*?minecraftProcess\.kill\(/.test(main), 'el boton Detener debe conservar el cierre manual de Minecraft')

const heliosReferences = [main, preload, renderer, html, read('README.md')]
    .flatMap((source) => source.match(/helios/gi) || [])
assert.strictEqual(heliosReferences.length, 0, 'el proyecto no debe conservar referencias a Helios')

console.log(`Smoke test correcto: ${new Set(sentChannels).size} envios IPC y ${new Set(receivedChannels).size} eventos verificados.`)
