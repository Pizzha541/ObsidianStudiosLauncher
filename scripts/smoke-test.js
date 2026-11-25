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

assert.strictEqual(packageJson.version, '1.0.9', 'package.json debe conservar la version 1.0.9')
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
assert(/catalog-access-filter/.test(html) && /catalog-state-filter/.test(html) && /catalog-sort/.test(html), 'el catalogo debe incluir filtros y orden')
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

const heliosReferences = [main, preload, renderer, html, read('README.md')]
    .flatMap((source) => source.match(/helios/gi) || [])
assert.strictEqual(heliosReferences.length, 0, 'el proyecto no debe conservar referencias a Helios')

console.log(`Smoke test correcto: ${new Set(sentChannels).size} envios IPC y ${new Set(receivedChannels).size} eventos verificados.`)
