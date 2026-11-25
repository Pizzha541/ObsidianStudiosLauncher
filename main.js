const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')
const axios = require('axios')
const https = require('https')
const http = require('http')
const crypto = require('crypto')
const os = require('os')
const net = require('net')
const { Transform } = require('stream')
const { pipeline } = require('stream/promises')
const childProcess = require('child_process')
const { Client, Authenticator } = require('minecraft-launcher-core')
const { Auth: MicrosoftAuth, lexicon: msmcLexicon } = require('msmc')
const { autoUpdater } = require('electron-updater')

let win
let minecraftProcess = null
let installInProgress = false
let activePlaySession = null
let latestAccessRequestId = 0
const discordRoleCache = new Map()
const discordRoleRequests = new Map()
const DISCORD_ROLE_CACHE_MS = 30000

let currentProject = null
let selectedRAM = '4G'
let cachedServerList = []
let remoteServerList = []
let localServerList = []
let remoteCatalogMessage = null
let remoteNewsList = []
let contentSource = 'local'
let discordUser = null
let minecraftProfile = null
let discordCallbackServer = null
let discordCallbackTimer = null
let launcherUpdateInProgress = false
let launcherUpdateReady = false
let launcherUpdateCheckManual = false
let activeLauncherUpdate = null
let pendingDeepLink = ''
let activeDownloadStream = null
let currentDownloadPaused = false
let currentDownloadCancelled = false
let activeDownloadState = null

const DISCORD_CLIENT_ID = '1503987372289949836'
const DISCORD_GUILD_ID = '1515139525624725616'
const CONTENT_URL = 'https://raw.githubusercontent.com/Pizzha541/ObsidianStudiosLauncher/main/content/launcher-content.json'
const LEGACY_CONFIG_URL = 'https://gist.githubusercontent.com/Pizzha541/aec40d00b8ee727c8dfc6f8c1a778514/raw/gistfile1.txt'
const LAUNCHER_UPDATE_URL = 'https://gist.githubusercontent.com/Pizzha541/32889023a7d8f63c93130e44197ffe6d/raw'
const GITHUB_RELEASES_API_URL = 'https://api.github.com/repos/Pizzha541/ObsidianStudiosLauncher/releases/latest'
const MINECRAFT_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'
const DISCORD_REDIRECT_PORT = 53124
const DISCORD_REDIRECT_URI = `http://127.0.0.1:${DISCORD_REDIRECT_PORT}/callback`
const MICROSOFT_AUTH_PROMPT = 'select_account'
const TOKEN_REFRESH_GRACE_MS = 5 * 60 * 1000

const DATA_DIR = path.join(app.getPath('userData'), 'data')
const SESSION_FILE = path.join(DATA_DIR, 'session.json')
const MINECRAFT_PROFILE_FILE = path.join(DATA_DIR, 'minecraft-profile.json')
const MINECRAFT_DEFAULTS_FILE = path.join(DATA_DIR, 'minecraft-defaults.json')
const LOCAL_CONFIG_FILE = path.join(__dirname, 'data', 'proyectos.json')
const LOCAL_CONTENT_FILE = path.join(__dirname, 'content', 'launcher-content.json')
const CONTENT_CACHE_FILE = path.join(DATA_DIR, 'content-cache.json')
const LOCAL_INSTANCES_FILE = path.join(DATA_DIR, 'local-instances.json')
const LOCAL_PACKS_DIR = path.join(DATA_DIR, 'local-packs')
const LOCAL_IMAGES_DIR = path.join(DATA_DIR, 'local-images')
const PROFILE_SKINS_DIR = path.join(DATA_DIR, 'profile-skins')
const SKIN_LIBRARY_FILE = path.join(PROFILE_SKINS_DIR, 'library.json')
const DEFAULT_SKIN_ASSETS = {
    steve: { id: 'steve', name: 'Steve', variant: 'classic', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'steve.png') },
    alex: { id: 'alex', name: 'Alex', variant: 'slim', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'alex.png') },
    noor: { id: 'noor', name: 'Noor', variant: 'slim', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'noor.png') },
    sunny: { id: 'sunny', name: 'Sunny', variant: 'classic', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'sunny.png') },
    ari: { id: 'ari', name: 'Ari', variant: 'slim', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'ari.png') },
    zuri: { id: 'zuri', name: 'Zuri', variant: 'slim', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'zuri.png') },
    makena: { id: 'makena', name: 'Makena', variant: 'classic', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'makena.png') },
    kai: { id: 'kai', name: 'Kai', variant: 'slim', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'kai.png') },
    efe: { id: 'efe', name: 'Efe', variant: 'classic', filePath: path.join(__dirname, 'src', 'assets', 'skins', 'defaults', 'efe.png') }
}

const JAVA_DIR = path.join(DATA_DIR, 'java')
const PLAYTIME_FILE = path.join(DATA_DIR, 'playtime.json')
const LAUNCHER_UPDATE_DIR = path.join(DATA_DIR, 'launcher-updates')
const DOWNLOAD_CACHE_DIR = path.join(DATA_DIR, 'download-cache')
const LOG_FILE = path.join(DATA_DIR, 'launcher.log')
const MAX_LOG_BYTES = 2 * 1024 * 1024
const MODRINTH_API_URL = 'https://api.modrinth.com/v2'

function isSafeExternalUrl(value) {
    try {
        const parsed = new URL(String(value || '').trim())
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
        const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
        if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) return false
        if (net.isIP(hostname) === 4) {
            const parts = hostname.split('.').map(Number)
            if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224) return false
            if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return false
            if (parts[0] === 169 && parts[1] === 254) return false
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false
            if (parts[0] === 192 && parts[1] === 168) return false
        }
        if (net.isIP(hostname) === 6 && (/^(?:0*:)*0*1$/.test(hostname) || hostname === '::' || /^(?:fc|fd|fe[89ab])/i.test(hostname))) return false
        return true
    } catch (err) {
        return false
    }
}

async function openExternalSafe(value) {
    const target = String(value || '').trim()
    if (!isSafeExternalUrl(target)) throw new Error('El enlace externo fue bloqueado por seguridad.')
    await shell.openExternal(target)
}

function summarizeError(error, maxLength = 320) {
    return String(error?.message || error || 'Error desconocido').split(/\r?\n/, 1)[0].slice(0, maxLength)
}

function handleDeepLink(rawUrl) {
    const value = String(rawUrl || '').trim()
    if (!value || !value.startsWith('obsidian://')) return
    pendingDeepLink = value
    try {
        const parsed = new URL(value)
        const code = parsed.hostname === 'lobby' ? parsed.pathname.replace(/^\/+/, '') : ''
        if (code) sendToRenderer('lobby-invite-code', decodeURIComponent(code))
    } catch (err) {}
}

log(`Iniciando Obsidian Studios Launcher ${app.getVersion()} (${app.isPackaged ? 'empaquetado' : 'desarrollo'}).`)
for (const stream of [process.stdout, process.stderr]) {
    if (app.isPackaged && typeof stream?.write === 'function') {
        const nativeWrite = stream.write.bind(stream)
        stream.write = (...args) => {
            try {
                return nativeWrite(...args)
            } catch (err) {
                if (err?.code === 'EPIPE') return false
                throw err
            }
        }
    }
    stream?.on?.('error', (err) => {
        if (err?.code !== 'EPIPE') log(`Flujo de salida: ${summarizeError(err)}`)
    })
}
if (app.isPackaged) {
    for (const method of ['log', 'info', 'debug']) console[method] = () => {}
    for (const method of ['warn', 'error']) {
        console[method] = (...values) => log(values.map((value) => value?.stack || value?.message || String(value)).join(' '))
    }
}
const gotSingleInstanceLock = process.defaultApp || app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
    log('Otra instancia del launcher ya esta activa; se reutilizara la ventana existente.')
    app.quit()
} else {
    app.on('second-instance', (event, argv) => {
        if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
        handleDeepLink(argv.find((arg) => String(arg || '').startsWith('obsidian://')))
    })
    app.on('open-url', (event, url) => {
        event.preventDefault()
        handleDeepLink(url)
    })
}

try {
    if (process.defaultApp) app.setAsDefaultProtocolClient('obsidian', process.execPath, [path.resolve(process.argv[1] || '.')])
    else app.setAsDefaultProtocolClient('obsidian')
} catch (err) {}

app.setAppUserModelId('com.obsidianstudios.launcher')

function createWindow() {
    win = new BrowserWindow({
        width: 1380,
        height: 780,
        minWidth: 860,
        minHeight: 600,
        resizable: true,
        maximizable: true,
        center: true,
        frame: false,
        icon: path.join(__dirname, 'icono.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false
        }
    })

    win.webContents.setWindowOpenHandler(({ url }) => {
        openExternalSafe(url).catch((err) => log(err.message))
        return { action: 'deny' }
    })
    win.webContents.on('will-navigate', (event, url) => {
        if (url !== win.webContents.getURL()) {
            event.preventDefault()
            openExternalSafe(url).catch((err) => log(err.message))
        }
    })
    win.webContents.on('render-process-gone', (event, details) => {
        log(`El proceso visual termino inesperadamente (${details.reason || 'desconocido'}, codigo ${details.exitCode ?? 'n/a'}).`)
    })
    win.on('unresponsive', () => log('La ventana del launcher dejo de responder temporalmente.'))

    const youtubeFilter = { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] }
    win.webContents.session.webRequest.onBeforeSendHeaders(youtubeFilter, (details, callback) => {
        details.requestHeaders.Referer = 'https://www.youtube.com/'
        details.requestHeaders.Origin = 'https://www.youtube.com'
        callback({ requestHeaders: details.requestHeaders })
    })

    win.loadFile('src/index.html')

    win.webContents.on('did-finish-load', async () => {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true })
        }
        tryAutoLogin()
        loadMinecraftProfile()
        if (minecraftProfile?.mode === 'premium' && minecraftProfile?.microsoftRefreshToken) {
            refreshMicrosoftProfile().catch((err) => log(`No se pudo actualizar automaticamente la skin: ${formatMicrosoftError(err)}`))
        }
        await fetchRemoteConfig()
        checkLauncherUpdates()
        setTimeout(() => handleDeepLink(pendingDeepLink || process.argv.find((arg) => String(arg || '').startsWith('obsidian://'))), 400)
    })
}

app.whenReady().then(() => {
    configureAutoUpdater()
    createWindow()
})

app.on('before-quit', () => {
    finishPlaytimeSession()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('close-app', () => {
    finishPlaytimeSession()
    if (minecraftProcess && typeof minecraftProcess.unref === 'function') minecraftProcess.unref()
    stopDiscordCallbackServer()
    app.quit()
})

ipcMain.on('minimize-app', () => win.minimize())

ipcMain.on('toggle-maximize-app', () => {
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
})

ipcMain.on('renderer-error', (event, value) => {
    const message = String(value || '').slice(0, 4000)
    if (message) log(`Interfaz: ${message}`)
})

function sendToRenderer(channel, payload) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

function log(msg) {
    const safeMessage = redactSensitive(msg)
    sendToRenderer('log', safeMessage)
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true })
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size >= MAX_LOG_BYTES) {
            const previous = LOG_FILE + '.1'
            try { fs.rmSync(previous, { force: true }) } catch (err) {}
            fs.renameSync(LOG_FILE, previous)
        }
        fs.appendFile(LOG_FILE, `[${new Date().toISOString()}] ${safeMessage}\n`, () => {})
    } catch (err) {}
}

process.on('unhandledRejection', (reason) => {
    log(`Promesa no controlada: ${reason?.stack || reason?.message || String(reason)}`)
})

process.on('uncaughtExceptionMonitor', (err) => {
    log(`Error no controlado: ${err?.stack || err?.message || String(err)}`)
})

function setProgress(percent) {
    const safe = Math.max(0, Math.min(100, Math.round(percent)))
    sendToRenderer('progress', safe)
    if (activeDownloadState) sendDownloadActivity({ percent: safe })
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
    const total = Math.round(seconds)
    const minutes = Math.floor(total / 60)
    const rest = total % 60
    return String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0')
}

function sendDownloadActivity(update = {}) {
    activeDownloadState = {
        title: 'Sin descargas activas',
        phase: 'Preparado',
        percent: 0,
        downloaded: 0,
        total: 0,
        speed: 0,
        eta: '',
        filesDone: 0,
        filesTotal: 0,
        modsDone: 0,
        modsTotal: 0,
        resourcepacksDone: 0,
        resourcepacksTotal: 0,
        configDone: 0,
        configTotal: 0,
        paused: currentDownloadPaused,
        cancellable: Boolean(activeDownloadStream),
        ...activeDownloadState,
        ...update
    }
    activeDownloadState.paused = currentDownloadPaused
    activeDownloadState.cancellable = Boolean(activeDownloadStream || installInProgress)
    sendToRenderer('download-center-update', activeDownloadState)
}

function finishDownloadActivity(message = 'Listo') {
    sendDownloadActivity({ phase: message, percent: 100, paused: false, cancellable: false })
    activeDownloadStream = null
    currentDownloadPaused = false
}

function parseVersionParts(version) {
    return String(version || '0').replace(/^v/i, '').split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
}

function isNewerVersion(latest, current) {
    const latestParts = parseVersionParts(latest)
    const currentParts = parseVersionParts(current)
    const length = Math.max(latestParts.length, currentParts.length)
    for (let i = 0; i < length; i += 1) {
        const next = latestParts[i] || 0
        const now = currentParts[i] || 0
        if (next > now) return true
        if (next < now) return false
    }
    return false
}

function parseJsonLikePayload(payload) {
    if (payload == null) return null
    if (Buffer.isBuffer(payload)) return parseJsonLikePayload(payload.toString('utf8'))
    if (typeof payload !== 'string') return payload

    let text = payload.trim().replace(/^\uFEFF/, '')
    if (!text) return null
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()

    try { return JSON.parse(text) } catch (err) {}

    const firstObject = text.match(/{[\s\S]*}/)
    if (firstObject) {
        try { return JSON.parse(firstObject[0]) } catch (err) {}
    }
    const firstArray = text.match(/\[[\s\S]*\]/)
    if (firstArray) {
        try { return JSON.parse(firstArray[0]) } catch (err) {}
    }
    return null
}

function hasLauncherUpdateShape(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    return Boolean(
        value.latest_version || value.version || value.latestVersion || value.latest ||
        value.download_url || value.url || value.downloadUrl || value.installer_url || value.installerUrl
    )
}

function pickLauncherUpdateObject(data) {
    const parsed = parseJsonLikePayload(data)
    if (!parsed) return null
    if (Array.isArray(parsed)) {
        return parsed.find((item) => hasLauncherUpdateShape(item)) || null
    }
    if (typeof parsed !== 'object') return null

    if (hasLauncherUpdateShape(parsed)) return parsed

    const nested = parsed.launcher_update || parsed.launcherUpdate || parsed.update || parsed.launcher || parsed.latest
    if (nested) return pickLauncherUpdateObject(nested)

    if (parsed.files && typeof parsed.files === 'object') {
        for (const file of Object.values(parsed.files)) {
            const candidate = pickLauncherUpdateObject(file && (file.content || file.raw_url || file))
            if (candidate) return candidate
        }
    }
    return parsed
}

function normalizeLauncherUpdate(data, { silent = false } = {}) {
    const source = pickLauncherUpdateObject(data)
    if (!source || typeof source !== 'object') {
        if (!silent) log('Updater: el RAW no contiene un JSON de actualizacion valido.')
        return null
    }

    const latestVersion = source.latest_version || source.version || source.latestVersion || source.latest
    const downloadUrl = source.download_url || source.url || source.downloadUrl || source.installer_url || source.installerUrl
    if (!latestVersion) {
        if (!silent) log('Updater: falta latest_version/version en el JSON de actualizacion.')
        return null
    }
    if (!downloadUrl) {
        if (!silent) log('Updater: falta download_url/url en el JSON de actualizacion.')
        return null
    }

    const normalizedUrl = String(downloadUrl).trim()
    if (/^PON_AQUI_|^REEMPLAZA_|^TODO_|^https?:\/\/example\./i.test(normalizedUrl)) {
        if (!silent) log('Updater: download_url todavia es un placeholder. Pon el link directo al instalador .exe.')
        return null
    }

    return {
        latest_version: String(latestVersion).replace(/^v/i, '').trim(),
        current_version: app.getVersion(),
        download_url: normalizedUrl,
        provider: String(source.provider || 'legacy-manifest'),
        required: source.required === true || source.force === true || source.mandatory === true,
        changelog: Array.isArray(source.changelog)
            ? source.changelog.map(String).filter(Boolean)
            : String(source.changelog || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        sha256: String(source.sha256 || source.hash || source.checksum || '').trim(),
        installer_args: ['/S']
    }
}

function releaseNotesToChangelog(value) {
    return String(value || '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:[-*+]\s+|#{1,6}\s*)/, '').trim())
        .filter((line) => line && !/^https?:\/\//i.test(line))
        .slice(0, 16)
}

function normalizeGitHubRelease(release) {
    if (!release || release.draft || release.prerelease) return null
    const asset = Array.isArray(release.assets)
        ? release.assets.find((item) => item?.state === 'uploaded' && /\.exe$/i.test(item.name || '') && !/uninstaller/i.test(item.name || ''))
        : null
    const digest = String(asset?.digest || '')
    const sha256 = digest.toLowerCase().startsWith('sha256:') ? digest.slice(7).trim() : ''
    if (!asset?.browser_download_url || !sha256) return null

    return {
        latest_version: String(release.tag_name || release.name || '').replace(/^v/i, '').trim(),
        current_version: app.getVersion(),
        download_url: String(asset.browser_download_url),
        provider: 'github-release',
        required: false,
        changelog: releaseNotesToChangelog(release.body),
        sha256,
        installer_args: ['/S']
    }
}

async function fetchGitHubReleaseUpdate() {
    const response = await axios.get(GITHUB_RELEASES_API_URL, {
        timeout: 15000,
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': `ObsidianLauncher/${app.getVersion()}`,
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
    const update = normalizeGitHubRelease(response.data)
    if (!update) throw new Error('La release mas reciente no incluye un instalador EXE con digest SHA-256 verificable.')
    return update
}

async function fetchLegacyLauncherUpdate() {
    const separator = LAUNCHER_UPDATE_URL.includes('?') ? '&' : '?'
    const response = await axios.get(`${LAUNCHER_UPDATE_URL}${separator}_=${Date.now()}`, {
        timeout: 15000,
        headers: { 'Cache-Control': 'no-cache' }
    })
    return normalizeLauncherUpdate(response.data, { silent: true })
}

function autoUpdaterPayload(info = {}) {
    const releaseNotes = Array.isArray(info.releaseNotes)
        ? info.releaseNotes.map((item) => item?.note || item).filter(Boolean)
        : releaseNotesToChangelog(info.releaseNotes)
    return {
        latest_version: String(info.version || '').replace(/^v/i, ''),
        current_version: app.getVersion(),
        download_url: 'electron-updater://download',
        provider: 'electron-updater',
        required: false,
        changelog: releaseNotes
    }
}

function configureAutoUpdater() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.allowPrerelease = false
    autoUpdater.allowDowngrade = false
    autoUpdater.disableWebInstaller = true
    autoUpdater.on('update-available', (info) => {
        activeLauncherUpdate = autoUpdaterPayload(info)
        launcherUpdateReady = false
        log(`Nueva version del launcher disponible: ${activeLauncherUpdate.current_version} -> ${activeLauncherUpdate.latest_version}.`)
        sendToRenderer('launcher-update-available', activeLauncherUpdate)
    })
    autoUpdater.on('update-not-available', () => {
        if (launcherUpdateCheckManual) {
            const current = { current_version: app.getVersion(), latest_version: app.getVersion(), provider: 'electron-updater' }
            log(`El launcher ya esta actualizado: v${app.getVersion()}.`)
            sendToRenderer('launcher-update-current', current)
        }
    })
    autoUpdater.on('download-progress', (progress = {}) => {
        sendToRenderer('launcher-update-download-progress', {
            percent: Number(progress.percent || 0),
            downloaded: Number(progress.transferred || 0),
            total: Number(progress.total || 0),
            speed: Number(progress.bytesPerSecond || 0)
        })
    })
    autoUpdater.on('update-downloaded', (info) => {
        launcherUpdateReady = true
        activeLauncherUpdate = { ...(activeLauncherUpdate || autoUpdaterPayload(info)), ready_to_install: true }
        log(`Actualizacion v${info?.version || activeLauncherUpdate.latest_version} descargada y verificada.`)
        sendToRenderer('launcher-update-downloaded', activeLauncherUpdate)
    })
    autoUpdater.on('error', (err) => {
        const message = summarizeError(err)
        log(`Updater integrado: ${message}`)
        if (launcherUpdateInProgress) sendToRenderer('launcher-update-error', { message })
    })
}

async function checkLauncherUpdates({ manual = false } = {}) {
    launcherUpdateCheckManual = manual
    if (app.isPackaged) {
        try {
            await autoUpdater.checkForUpdates()
            return
        } catch (err) {
            log(`Updater integrado no disponible; usando comprobacion segura por GitHub: ${summarizeError(err)}`)
        } finally {
            launcherUpdateCheckManual = false
        }
    }

    try {
        let update
        try {
            update = await fetchGitHubReleaseUpdate()
        } catch (githubError) {
            log(`GitHub Releases no respondio con una actualizacion verificable: ${summarizeError(githubError)}`)
            update = await fetchLegacyLauncherUpdate()
        }
        if (!update) {
            if (manual) log('No se pudo leer la informacion de actualizacion del launcher.')
            return
        }
        if (isNewerVersion(update.latest_version, update.current_version)) {
            activeLauncherUpdate = update
            launcherUpdateReady = false
            log(`Nueva version del launcher disponible: ${update.current_version} -> ${update.latest_version}.`)
            sendToRenderer('launcher-update-available', update)
        } else if (manual) {
            activeLauncherUpdate = null
            log(`El launcher ya esta actualizado: v${update.current_version}.`)
            sendToRenderer('launcher-update-current', update)
        }
    } catch (err) {
        if (manual) log(`No se pudo comprobar actualizaciones del launcher: ${err.message}`)
    } finally {
        launcherUpdateCheckManual = false
    }
}

function getLauncherUpdateFileName(update) {
    try {
        const url = new URL(update.download_url)
        const baseName = path.basename(decodeURIComponent(url.pathname || ''))
        if (/\.exe$/i.test(baseName)) return baseName.replace(/[^a-z0-9._ -]/gi, '_')
    } catch (err) {}
    return `Obsidian Studios Launcher Setup ${String(update.latest_version || 'latest')}.exe`
}

async function downloadLauncherUpdateInstaller(update) {
    if (!update || typeof update !== 'object') throw new Error('Actualizacion invalida.')
    const targetUrl = String(update.download_url || '').trim()
    if (!/^https:\/\//i.test(targetUrl)) throw new Error('El link de actualizacion debe ser HTTPS.')
    if (!fs.existsSync(LAUNCHER_UPDATE_DIR)) fs.mkdirSync(LAUNCHER_UPDATE_DIR, { recursive: true })

    const fileName = getLauncherUpdateFileName(update)
    const targetPath = path.join(LAUNCHER_UPDATE_DIR, fileName)
    const partialPath = targetPath + '.download'
    try { if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath) } catch (err) {}

    const response = await axios.get(targetUrl, {
        responseType: 'stream',
        timeout: 30000,
        maxRedirects: 8,
        headers: { 'User-Agent': 'ObsidianLauncher/' + app.getVersion() },
        validateStatus: (status) => status >= 200 && status < 300
    })

    const total = Number(response.headers['content-length'] || 0)
    const maxUpdateBytes = 500 * 1024 * 1024
    if (total > maxUpdateBytes) {
        response.data.destroy()
        throw new Error('El instalador supera el limite de seguridad de 500 MB.')
    }
    let downloaded = 0
    response.data.on('data', (chunk) => {
        downloaded += chunk.length
        if (downloaded > maxUpdateBytes) {
            response.data.destroy(new Error('La descarga supero el limite de seguridad de 500 MB.'))
            return
        }
        const percent = total ? Math.min(99, Math.round((downloaded / total) * 100)) : 0
        sendToRenderer('launcher-update-download-progress', { percent, downloaded, total })
    })

    await pipeline(response.data, fs.createWriteStream(partialPath))
    if (!fs.existsSync(partialPath) || fs.statSync(partialPath).size < 1024 * 1024) {
        throw new Error('El instalador descargado parece incompleto.')
    }
    if (total && downloaded !== total) throw new Error('La descarga termino con un tamano diferente al anunciado por el servidor.')

    const expectedHash = String(update.sha256 || '').trim().toLowerCase()
    if (!/^[a-f0-9]{64}$/.test(expectedHash)) {
        try { fs.unlinkSync(partialPath) } catch (err) {}
        throw new Error('La actualizacion no publica un SHA-256 valido. Descarga bloqueada.')
    }
    const actualHash = await fileHash(partialPath, 'sha256')
    if (actualHash !== expectedHash) {
        try { fs.unlinkSync(partialPath) } catch (err) {}
        throw new Error('El SHA-256 del instalador no coincide. Descarga bloqueada.')
    }

    try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath) } catch (err) {}
    fs.renameSync(partialPath, targetPath)
    sendToRenderer('launcher-update-download-progress', { percent: 100, downloaded, total })
    return targetPath
}

function runLauncherUpdateInstaller(installerPath, update = {}) {
    if (!fs.existsSync(installerPath)) throw new Error('No se encontro el instalador descargado.')
    const args = Array.isArray(update.installer_args) && update.installer_args.length ? update.installer_args.map(String) : ['/S']
    log('Instalando nueva version del launcher...')
    sendToRenderer('launcher-update-installing', { path: installerPath })
    const child = childProcess.spawn(installerPath, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    })
    child.unref()
    setTimeout(() => {
        finishPlaytimeSession()
        if (minecraftProcess && typeof minecraftProcess.unref === 'function') minecraftProcess.unref()
        stopDiscordCallbackServer()
        app.quit()
    }, 900)
}
function writeFileAtomic(file, contents) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const temporaryFile = `${file}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(temporaryFile, contents, { encoding: 'utf8', mode: 0o600 })
    try {
        fs.renameSync(temporaryFile, file)
    } catch (err) {
        if (process.platform === 'win32' && fs.existsSync(file)) {
            fs.rmSync(file, { force: true })
            fs.renameSync(temporaryFile, file)
        } else {
            try { fs.rmSync(temporaryFile, { force: true }) } catch (cleanupError) {}
            throw err
        }
    }
}

function saveJson(file, data) {
    writeFileAtomic(file, JSON.stringify(data, null, 2))
}

function saveSecureJson(file, data) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!safeStorage.isEncryptionAvailable()) {
        log(`Almacenamiento seguro no disponible; ${path.basename(file)} no se guardo en disco.`)
        return false
    }
    const encrypted = safeStorage.encryptString(JSON.stringify(data)).toString('base64')
    writeFileAtomic(file, JSON.stringify({ secure: true, version: 1, data: encrypted }, null, 2))
    return true
}

function readSecureJson(file) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!parsed?.secure) return parsed
    if (!safeStorage.isEncryptionAvailable()) throw new Error('El almacenamiento seguro de Windows no esta disponible.')
    const decrypted = safeStorage.decryptString(Buffer.from(String(parsed.data || ''), 'base64'))
    return JSON.parse(decrypted)
}

function readPlaytime() {
    try {
        if (!fs.existsSync(PLAYTIME_FILE)) return {}
        const data = JSON.parse(fs.readFileSync(PLAYTIME_FILE, 'utf8'))
        return data && typeof data === 'object' ? data : {}
    } catch (err) {
        return {}
    }
}

function sendPlaytimeStats() {
    const playtime = readPlaytime()
    const projects = cachedServerList.map((project) => ({
        id: project.id,
        name: project.name,
        milliseconds: Number(playtime[project.id]?.milliseconds || 0)
    })).sort((a, b) => b.milliseconds - a.milliseconds)
    sendToRenderer('playtime-stats', projects)
}

function startPlaytimeSession(project) {
    activePlaySession = {
        id: project.id,
        name: project.name,
        startedAt: Date.now()
    }
}

function finishPlaytimeSession() {
    if (!activePlaySession) return
    const elapsed = Math.max(0, Date.now() - activePlaySession.startedAt)
    const playtime = readPlaytime()
    const previous = playtime[activePlaySession.id] || { name: activePlaySession.name, milliseconds: 0 }
    playtime[activePlaySession.id] = {
        name: activePlaySession.name,
        milliseconds: Number(previous.milliseconds || 0) + elapsed,
        updatedAt: new Date().toISOString()
    }
    saveJson(PLAYTIME_FILE, playtime)
    activePlaySession = null
    sendPlaytimeStats()
}

function redactSensitive(value) {
    return String(value || '')
        .replace(/(--accessToken\s+)(\S+)/g, '$1[redacted]')
        .replace(/(access_token["']?\s*[:=]\s*["']?)([^"',\s]+)/gi, '$1[redacted]')
        .replace(/(refresh_token["']?\s*[:=]\s*["']?)([^"',\s]+)/gi, '$1[redacted]')
        .replace(/(authorization:\s*bearer\s+)(\S+)/gi, '$1[redacted]')
        .replace(/(client_secret["']?\s*[:=]\s*["']?)([^"',\s]+)/gi, '$1[redacted]')
}

function readDirEntries(dirPath) {
    try {
        return fs.readdirSync(dirPath, { withFileTypes: true })
    } catch (e) {
        return []
    }
}

function validateZipArchive(zip, options = {}) {
    const entries = zip.getEntries()
    const maxEntries = Number(options.maxEntries || 50000)
    const maxSingleBytes = Number(options.maxSingleBytes || 2 * 1024 * 1024 * 1024)
    const maxTotalBytes = Number(options.maxTotalBytes || 12 * 1024 * 1024 * 1024)
    if (entries.length > maxEntries) throw new Error(`El paquete contiene demasiados archivos (${entries.length}).`)

    const names = new Set()
    let totalBytes = 0
    for (const entry of entries) {
        const normalized = String(entry.entryName || '').replace(/\\/g, '/')
        const segments = normalized.split('/').filter(Boolean)
        if (!normalized || normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || segments.includes('..')) {
            throw new Error(`El paquete contiene una ruta insegura: ${entry.entryName}`)
        }
        const unixType = (Number(entry.attr || 0) >>> 16) & 0xf000
        if (unixType === 0xa000) throw new Error(`El paquete contiene un enlace simbolico no permitido: ${entry.entryName}`)

        const key = normalized.toLowerCase().replace(/\/$/, '')
        if (!entry.isDirectory && names.has(key)) throw new Error(`El paquete contiene una entrada duplicada: ${entry.entryName}`)
        if (!entry.isDirectory) names.add(key)

        const size = Number(entry.header?.size || 0)
        if (!Number.isSafeInteger(size) || size < 0 || size > maxSingleBytes) {
            throw new Error(`El archivo ${entry.entryName} supera el limite permitido.`)
        }
        totalBytes += size
        if (totalBytes > maxTotalBytes) throw new Error('El contenido descomprimido del paquete supera el limite de seguridad.')
    }
    return zip
}

function openValidatedZip(source, options = {}) {
    return validateZipArchive(new AdmZip(source), options)
}

function getForgeVersionParts(mcVersion, loaderVersion) {
    const fullVersion = getForgeMavenVersion(mcVersion, loaderVersion)
    const loaderOnly = String(loaderVersion || '').startsWith(`${mcVersion}-`)
        ? String(loaderVersion).slice(`${mcVersion}-`.length)
        : String(loaderVersion || '')

    return { fullVersion, loaderOnly }
}

function getExpectedForgeProfileNames(mcVersion, loaderVersion) {
    const { fullVersion, loaderOnly } = getForgeVersionParts(mcVersion, loaderVersion)
    return [
        `forge-${fullVersion}`,
        `${mcVersion}-forge-${loaderOnly}`,
        fullVersion,
        `forge-${loaderOnly}`
    ].filter(Boolean).map((value) => value.toLowerCase())
}

function isForgeProfileName(name, mcVersion, loaderVersion) {
    const lowerName = String(name || '').toLowerCase()
    if (!lowerName.includes('forge') || lowerName.includes('neoforge')) return false

    const { loaderOnly } = getForgeVersionParts(mcVersion, loaderVersion)
    const expectedNames = getExpectedForgeProfileNames(mcVersion, loaderVersion)
    if (expectedNames.includes(lowerName)) return true

    return (!mcVersion || lowerName.includes(String(mcVersion).toLowerCase())) &&
        (!loaderOnly || lowerName.includes(loaderOnly.toLowerCase()))
}

function findLatestLoaderProfile(gamePath, loader, mcVersion, loaderVersion = '') {
    const versionsDir = path.join(gamePath, 'versions')
    const wanted = String(loader || '').toLowerCase()
    const expectedNeoForge = loaderVersion ? `neoforge-${loaderVersion}`.toLowerCase() : ''
    const matches = readDirEntries(versionsDir)
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const fullPath = path.join(versionsDir, entry.name)
            const stat = fs.statSync(fullPath)
            return { name: entry.name, fullPath, mtimeMs: stat.mtimeMs }
        })
        .filter((entry) => {
            const name = entry.name.toLowerCase()
            if (wanted === 'forge') {
                return isForgeProfileName(name, mcVersion, loaderVersion)
            }
            if (wanted === 'neoforge') {
                return name.startsWith('neoforge-') && (!expectedNeoForge || name === expectedNeoForge)
            }
            return false
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)

    return matches[0]?.name || ''
}

function ensureLauncherProfiles(gamePath) {
    const profilePath = path.join(gamePath, 'launcher_profiles.json')
    if (fs.existsSync(profilePath)) return

    fs.mkdirSync(gamePath, { recursive: true })
    fs.writeFileSync(profilePath, JSON.stringify({ profiles: {}, settings: {} }, null, 2), 'utf8')
}

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function isReadableJar(filePath) {
    try {
        if (!fs.existsSync(filePath)) return true
        const zip = openValidatedZip(filePath, { maxEntries: 100000, maxSingleBytes: 512 * 1024 * 1024, maxTotalBytes: 2 * 1024 * 1024 * 1024 })
        zip.getEntries()
        return true
    } catch (err) {
        return false
    }
}

function findCorruptJars(rootPath) {
    const corrupt = []
    const walk = (dirPath) => {
        for (const entry of readDirEntries(dirPath)) {
            const fullPath = path.join(dirPath, entry.name)
            if (entry.isDirectory()) {
                walk(fullPath)
                continue
            }
            if (entry.name.toLowerCase().endsWith('.jar') && !isReadableJar(fullPath)) {
                corrupt.push(fullPath)
            }
        }
    }

    walk(rootPath)
    return corrupt
}

function removeCorruptJars(jarPaths) {
    for (const jarPath of jarPaths) {
        try {
            fs.unlinkSync(jarPath)
            log(`Jar corrupto eliminado: ${path.basename(jarPath)}`)
        } catch (err) {
            log(`No se pudo eliminar jar corrupto ${path.basename(jarPath)}: ${err.message}`)
        }
    }
}

async function ensureVanillaVersionJson(gamePath, mcVersion) {
    const versionDir = path.join(gamePath, 'versions', mcVersion)
    const versionJsonPath = path.join(versionDir, `${mcVersion}.json`)
    const existingJson = readJsonIfExists(versionJsonPath)
    if (existingJson) return existingJson

    log(`Descargando metadatos base de Minecraft ${mcVersion}...`)
    const manifestResponse = await axios.get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
    const versionInfo = manifestResponse.data?.versions?.find((version) => version.id === mcVersion)
    if (!versionInfo?.url) {
        throw new Error(`No se encontro Minecraft ${mcVersion} en el manifiesto oficial.`)
    }

    const versionResponse = await axios.get(versionInfo.url)
    fs.mkdirSync(versionDir, { recursive: true })
    fs.writeFileSync(versionJsonPath, JSON.stringify(versionResponse.data, null, 2), 'utf8')
    return versionResponse.data
}

async function getAssetIndexId(gamePath, mcVersion) {
    const versionJson = await ensureVanillaVersionJson(gamePath, mcVersion)
    return versionJson?.assetIndex?.id || mcVersion
}

function resolveVersionArgument(value, fields) {
    return String(value || '').replace(/\$\{([^}]+)\}/g, (match) => fields[match] || match)
}

function getProfileJvmArgs(gamePath, profileId) {
    if (!profileId) return []

    const profileJson = readJsonIfExists(path.join(gamePath, 'versions', profileId, `${profileId}.json`))
    const jvmArgs = profileJson?.arguments?.jvm
    if (!Array.isArray(jvmArgs)) return []

    const fields = {
        '${library_directory}': path.join(gamePath, 'libraries'),
        '${classpath_separator}': process.platform === 'win32' ? ';' : ':',
        '${version_name}': profileId,
        '${natives_directory}': gamePath,
        '${launcher_name}': 'ObsidianLauncher',
        '${launcher_version}': '1.0.0'
    }

    return jvmArgs
        .filter((arg) => typeof arg === 'string')
        .map((arg) => resolveVersionArgument(arg, fields))
}

function findNewestFile(rootDir, filterFn) {
    let newest = null
    const walk = (dirPath) => {
        for (const entry of readDirEntries(dirPath)) {
            const fullPath = path.join(dirPath, entry.name)
            if (entry.isDirectory()) {
                walk(fullPath)
                continue
            }
            if (!filterFn(fullPath, entry.name)) continue
            const stat = fs.statSync(fullPath)
            if (!newest || stat.mtimeMs > newest.mtimeMs) {
                newest = { path: fullPath, mtimeMs: stat.mtimeMs }
            }
        }
    }

    walk(rootDir)
    return newest?.path || ''
}

function readLogTail(filePath, maxLines = 28) {
    try {
        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean)
        return lines.slice(-maxLines).join('\n')
    } catch (err) {
        return ''
    }
}

function logLatestMinecraftFailure(gamePath) {
    const crashReport = findNewestFile(
        path.join(gamePath, 'crash-reports'),
        (filePath, fileName) => fileName.toLowerCase().startsWith('crash-') && fileName.toLowerCase().endsWith('.txt')
    )

    if (crashReport) {
        log(`Ultimo crash report detectado: ${crashReport}`)
        const crashText = readLogTail(crashReport, 38)
        if (crashText) log(crashText)
        return
    }

    const latestLog = path.join(gamePath, 'logs', 'latest.log')
    if (fs.existsSync(latestLog)) {
        log(`No se encontro crash report. Final de latest.log:`)
        const logText = readLogTail(latestLog, 38)
        if (logText) log(logText)
    }
}

function parseJavaMajor(output) {
    const text = String(output || '')
    const match = text.match(/version "([^"]+)"/i) || text.match(/openjdk version "([^"]+)"/i)
    if (!match) return 0

    const version = match[1]
    if (version.startsWith('1.')) return Number(version.split('.')[1]) || 0
    return Number(version.split('.')[0]) || 0
}

function getJavaMajor(javaExe) {
    const result = childProcess.spawnSync(javaExe, ['-version'], {
        encoding: 'utf8',
        windowsHide: true
    })
    if (result.error || result.status !== 0) return 0
    return parseJavaMajor(`${result.stdout}\n${result.stderr}`)
}

function parseJavaRequirement(value) {
    const match = String(value || '').match(/\d+/)
    return match ? Number(match[0]) || 0 : 0
}

function getRequiredJavaMajor(projectOrVersion) {
    const explicitRequirement = typeof projectOrVersion === 'object'
        ? parseJavaRequirement(
            projectOrVersion.java_version ||
            projectOrVersion.java_major ||
            projectOrVersion.required_java ||
            projectOrVersion.java
        )
        : 0

    if (explicitRequirement > 0) return explicitRequirement

    const mcVersion = typeof projectOrVersion === 'object'
        ? projectOrVersion.minecraft_version
        : projectOrVersion

    const parts = String(mcVersion || '').split('.').map((part) => Number(part) || 0)
    const major = parts[0] || 0
    const minor = parts[1] || 0
    const patch = parts[2] || 0

    if (major >= 26) return 25
    if (major === 1 && minor >= 26) return 25
    if (minor > 20 || (minor === 20 && patch >= 5)) return 21
    if (minor >= 18) return 17
    return 8
}

function getAdoptiumArch() {
    if (process.arch === 'arm64') return 'aarch64'
    return 'x64'
}

function getManagedJavaRoot(required) {
    return path.join(JAVA_DIR, `temurin-${required}`)
}

function findJavaExecutable(rootPath) {
    if (!rootPath || !fs.existsSync(rootPath)) return ''

    const directPath = path.join(rootPath, 'bin', 'java.exe')
    if (fs.existsSync(directPath)) return directPath

    const walk = (dirPath, depth = 0) => {
        if (depth > 4) return ''

        for (const entry of readDirEntries(dirPath)) {
            const fullPath = path.join(dirPath, entry.name)
            if (entry.isFile() && entry.name.toLowerCase() === 'java.exe') {
                return fullPath
            }
            if (entry.isDirectory()) {
                const found = walk(fullPath, depth + 1)
                if (found) return found
            }
        }

        return ''
    }

    return walk(rootPath)
}

function getManagedJavaPath(required) {
    const javaExe = findJavaExecutable(getManagedJavaRoot(required))
    if (!javaExe) return ''
    return getJavaMajor(javaExe) >= required ? javaExe : ''
}

function getAdoptiumRuntimeUrl(required) {
    const arch = getAdoptiumArch()
    return `https://api.adoptium.net/v3/binary/latest/${required}/ga/windows/${arch}/jdk/hotspot/normal/eclipse?project=jdk`
}

async function ensureManagedJava(required, progressStart = 8, progressEnd = 35) {
    const existingJava = getManagedJavaPath(required)
    if (existingJava) {
        log(`Java ${required} portable listo: ${existingJava}`)
        return existingJava
    }

    const javaRoot = getManagedJavaRoot(required)
    const zipPath = path.join(JAVA_DIR, `temurin-${required}.zip`)
    const resolvedRoot = path.resolve(javaRoot)
    const resolvedJavaDir = path.resolve(JAVA_DIR)
    const relative = path.relative(resolvedJavaDir, resolvedRoot)

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Ruta interna de Java insegura.')
    }

    fs.rmSync(javaRoot, { recursive: true, force: true })
    fs.mkdirSync(javaRoot, { recursive: true })

    log(`Java ${required} no encontrado. Descargando runtime portable de Temurin...`)
    await downloadFile(getAdoptiumRuntimeUrl(required), zipPath, {
        expectZip: true,
        minSize: 20 * 1024 * 1024,
        progressStart,
        progressEnd
    })

    log(`Extrayendo Java ${required} portable...`)
    await openValidatedZip(zipPath).extractAllToAsync(javaRoot, true, false)
    try { fs.unlinkSync(zipPath) } catch (e) {}

    const javaExe = getManagedJavaPath(required)
    if (!javaExe) {
        throw new Error(`No se pudo preparar Java ${required} portable.`)
    }

    log(`Java ${required} portable instalado.`)
    return javaExe
}

function getJavaCandidates(project) {
    const discovered = []
    const roots = [
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Eclipse Adoptium'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Java'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Eclipse Adoptium'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Java')
    ]

    for (const root of roots) {
        for (const entry of readDirEntries(root)) {
            if (!entry.isDirectory()) continue
            const javaPath = path.join(root, entry.name, 'bin', 'java.exe')
            if (fs.existsSync(javaPath)) discovered.push(javaPath)
        }
    }

    const candidates = [
        project.java_path,
        process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java.exe') : '',
        ...discovered,
        'C:\\Program Files\\Java\\jdk-25\\bin\\java.exe',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-25\\bin\\java.exe',
        'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
        'java'
    ]

    return [...new Set(candidates.filter(Boolean))]
}

async function resolveJavaPath(project, progressStart = 8, progressEnd = 35) {
    const required = getRequiredJavaMajor(project)

    if (project.java_path) {
        const major = fs.existsSync(project.java_path) ? getJavaMajor(project.java_path) : 0
        if (major >= required) {
            return { path: project.java_path, major, required, managed: false }
        }
        throw new Error(`java_path esta configurado, pero no cumple Java ${required}: ${project.java_path}`)
    }

    const managedJava = getManagedJavaPath(required)
    if (managedJava) {
        return { path: managedJava, major: getJavaMajor(managedJava), required, managed: true }
    }

    for (const candidate of getJavaCandidates(project)) {
        if (candidate !== 'java' && !fs.existsSync(candidate)) continue
        const major = getJavaMajor(candidate)
        if (major >= required) {
            return { path: candidate, major, required, managed: false }
        }
    }

    const downloadedJava = await ensureManagedJava(required, progressStart, progressEnd)
    return { path: downloadedJava, major: getJavaMajor(downloadedJava), required, managed: true }
}

function tryAutoLogin() {
    if (!fs.existsSync(SESSION_FILE)) return

    try {
        log('Restaurando sesion previa de Discord...')
        const sessionData = readSecureJson(SESSION_FILE)
        if (sessionData && sessionData.accessToken) {
            discordUser = sessionData
            setTimeout(() => {
                if (!win) return
                sendToRenderer('discord-login-success', discordUser)
                log(`Sesion restaurada automaticamente: ${discordUser.username}`)
            }, 1500)
        }
    } catch (err) {
        log('No se pudo restaurar la sesion antigua.')
        try { fs.unlinkSync(SESSION_FILE) } catch (e) {}
    }
}

function loadMinecraftProfile() {
    try {
        if (fs.existsSync(MINECRAFT_PROFILE_FILE)) {
            minecraftProfile = readSecureJson(MINECRAFT_PROFILE_FILE)
        } else {
            minecraftProfile = {
                mode: 'offline',
                username: 'PlayerTest',
                skinUrl: '',
                premiumReady: false,
                auth: null
            }
        }
    } catch (err) {
        minecraftProfile = {
            mode: 'offline',
            username: 'PlayerTest',
            skinUrl: '',
            premiumReady: false,
            auth: null
        }
    }

    saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
    sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
}

function secureMinecraftAssetUrl(value) {
    return String(value || '').trim().replace(/^http:\/\/textures\.minecraft\.net/i, 'https://textures.minecraft.net')
}

function normalizeMinecraftCapes(capes = []) {
    return (Array.isArray(capes) ? capes : []).map((cape) => ({
        id: String(cape?.id || ''),
        alias: String(cape?.alias || 'Capa de Minecraft'),
        url: secureMinecraftAssetUrl(cape?.url || ''),
        state: String(cape?.state || ''),
        active: cape?.state === 'ACTIVE'
    })).filter((cape) => cape.id && cape.url)
}

function loadSkinLibrary() {
    try {
        if (!fs.existsSync(SKIN_LIBRARY_FILE)) return []
        const items = JSON.parse(fs.readFileSync(SKIN_LIBRARY_FILE, 'utf8'))
        return (Array.isArray(items) ? items : []).filter((item) => item?.id && item?.filePath && fs.existsSync(item.filePath))
    } catch (err) {
        log(`No se pudo leer la biblioteca de skins: ${err.message}`)
        return []
    }
}

function saveSkinLibrary(items) {
    fs.mkdirSync(PROFILE_SKINS_DIR, { recursive: true })
    writeFileAtomic(SKIN_LIBRARY_FILE, JSON.stringify(items, null, 2))
}

function registerSkinInLibrary(source, fileData, variant, displayName = '') {
    fs.mkdirSync(PROFILE_SKINS_DIR, { recursive: true })
    const id = crypto.createHash('sha256').update(fileData).digest('hex').slice(0, 20)
    const filePath = path.join(PROFILE_SKINS_DIR, `skin-${id}.png`)
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, fileData)
    const items = loadSkinLibrary()
    const existingIndex = items.findIndex((item) => item.id === id)
    const previous = existingIndex >= 0 ? items[existingIndex] : null
    const item = {
        id,
        name: displayName || previous?.name || path.basename(source, path.extname(source)).slice(0, 48) || 'Skin',
        variant: variant === 'slim' ? 'slim' : 'classic',
        filePath,
        addedAt: previous?.addedAt || new Date().toISOString()
    }
    if (existingIndex >= 0) items[existingIndex] = item
    else items.push(item)
    saveSkinLibrary(items)
    return item
}

function getSafeSkinLibrary() {
    return loadSkinLibrary().map((item) => ({
        id: item.id,
        name: item.name,
        variant: item.variant === 'slim' ? 'slim' : 'classic',
        addedAt: item.addedAt || '',
        skinUrl: `data:image/png;base64,${fs.readFileSync(item.filePath).toString('base64')}`
    }))
}

function getSafeMinecraftProfile() {
    if (!minecraftProfile) loadMinecraftProfile()
    const { auth, microsoftRefreshToken, skinPath, ...safeProfile } = minecraftProfile
    let previewSkinUrl = secureMinecraftAssetUrl(safeProfile.skinUrl)
    if ((safeProfile.skinSource === 'local' || safeProfile.skinSource === 'default') && skinPath && fs.existsSync(skinPath)) {
        previewSkinUrl = `data:image/png;base64,${fs.readFileSync(skinPath).toString('base64')}`
    }
    return {
        ...safeProfile,
        skinUrl: previewSkinUrl,
        skinSource: safeProfile.skinSource || (previewSkinUrl ? 'microsoft' : 'default'),
        skinFileName: skinPath ? path.basename(skinPath) : '',
        capeUrl: secureMinecraftAssetUrl(safeProfile.capeUrl),
        availableCapes: normalizeMinecraftCapes(safeProfile.availableCapes),
        skinLibrary: getSafeSkinLibrary()
    }
}

function formatMicrosoftError(err) {
    try {
        return msmcLexicon.wrapError(err).message || String(err)
    } catch (e) {
        return err?.message || String(err)
    }
}

function createMicrosoftAuth() {
    const authManager = new MicrosoftAuth(MICROSOFT_AUTH_PROMPT)
    authManager.on('load', (code, message) => {
        log(`Microsoft: ${message}`)
    })
    return authManager
}

function saveMicrosoftProfile(minecraftToken, refreshToken) {
    const auth = minecraftToken.mclc(true)
    const activeSkin = minecraftToken.profile?.skins?.find((skin) => skin.state === 'ACTIVE')
    const skinUrl = secureMinecraftAssetUrl(activeSkin?.url || minecraftProfile?.skinUrl || '')
    const capeUrl = secureMinecraftAssetUrl(minecraftToken.profile?.capes?.find((cape) => cape.state === 'ACTIVE')?.url || minecraftProfile?.capeUrl || '')
    const sameSkin = secureMinecraftAssetUrl(minecraftProfile?.skinUrl) === skinUrl
    const activeSkinLibraryId = sameSkin ? minecraftProfile?.activeSkinLibraryId || '' : ''
    const activeDefaultSkinId = sameSkin ? minecraftProfile?.activeDefaultSkinId || '' : ''

    minecraftProfile = {
        mode: 'premium',
        username: auth.name,
        skinUrl,
        capeUrl,
        skinAnimation: minecraftProfile?.skinAnimation || 'walk',
        skinVariant: String(activeSkin?.variant || minecraftProfile?.skinVariant || 'classic').toLowerCase(),
        activeSkinLibraryId,
        activeDefaultSkinId,
        availableCapes: normalizeMinecraftCapes(minecraftToken.profile?.capes),
        skinSource: 'microsoft',
        skinPath: '',
        premiumReady: true,
        auth,
        microsoftRefreshToken: refreshToken || auth.meta?.refresh || minecraftProfile?.microsoftRefreshToken || ''
    }

    saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
    sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    log(`Microsoft vinculado: ${minecraftProfile.username}`)
}

async function refreshMicrosoftProfile() {
    if (!minecraftProfile?.microsoftRefreshToken) {
        throw new Error('No hay token de Microsoft guardado. Inicia sesion otra vez.')
    }

    log('Renovando sesion de Microsoft...')
    const authManager = createMicrosoftAuth()
    const xboxManager = await authManager.refresh(minecraftProfile.microsoftRefreshToken)
    const minecraftToken = await xboxManager.getMinecraft()
    saveMicrosoftProfile(minecraftToken, xboxManager.save())
}

function applyMinecraftServicesProfile(profile) {
    const activeSkin = profile?.skins?.find((skin) => skin.state === 'ACTIVE') || profile?.skins?.[0]
    const activeCape = profile?.capes?.find((cape) => cape.state === 'ACTIVE')
    const nextSkinUrl = secureMinecraftAssetUrl(activeSkin?.url || minecraftProfile?.skinUrl || '')
    const sameSkin = secureMinecraftAssetUrl(minecraftProfile?.skinUrl) === nextSkinUrl
    const activeSkinLibraryId = sameSkin ? minecraftProfile?.activeSkinLibraryId || '' : ''
    const activeDefaultSkinId = sameSkin ? minecraftProfile?.activeDefaultSkinId || '' : ''
    minecraftProfile = {
        ...minecraftProfile,
        mode: 'premium',
        username: profile?.name || minecraftProfile?.username || 'PlayerTest',
        skinUrl: nextSkinUrl,
        activeSkinLibraryId,
        activeDefaultSkinId,
        capeUrl: secureMinecraftAssetUrl(activeCape?.url || ''),
        skinVariant: String(activeSkin?.variant || minecraftProfile?.skinVariant || 'classic').toLowerCase(),
        availableCapes: normalizeMinecraftCapes(profile?.capes),
        skinSource: 'microsoft',
        skinPath: '',
        premiumReady: true
    }
    saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
    sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
}

function createSkinMultipartBody(fileData, fileName, variant) {
    const boundary = `----ObsidianSkin${crypto.randomBytes(12).toString('hex')}`
    const safeFileName = String(fileName || 'skin.png').replace(/[^a-zA-Z0-9._-]/g, '_')
    const prefix = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="variant"\r\n\r\n${variant}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFileName}"\r\nContent-Type: image/png\r\n\r\n`
    )
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`)
    return { boundary, body: Buffer.concat([prefix, fileData, suffix]) }
}

async function uploadMinecraftSkin(filePath, requestedVariant = 'classic') {
    if (minecraftProfile?.mode !== 'premium') throw new Error('Inicia sesion con Microsoft para cambiar la skin de tu cuenta.')
    const variant = requestedVariant === 'slim' ? 'slim' : 'classic'
    const fileData = fs.readFileSync(filePath)
    const { boundary, body } = createSkinMultipartBody(fileData, path.basename(filePath), variant)
    const uploadWithToken = async (accessToken) => {
        const uploadResponse = await axios.post(`${MINECRAFT_PROFILE_URL}/skins`, body, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            maxBodyLength: 2 * 1024 * 1024,
            timeout: 30000
        })
        if (uploadResponse.data?.skins) return uploadResponse.data
        const profileResponse = await axios.get(MINECRAFT_PROFILE_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 30000
        })
        return profileResponse.data
    }
    let authorization = await getMinecraftAuthorization()
    if (!authorization?.access_token) throw new Error('La sesion de Minecraft no tiene un token valido. Inicia sesion otra vez.')
    let profile
    try {
        profile = await uploadWithToken(authorization.access_token)
    } catch (err) {
        if (err?.response?.status !== 401 || !minecraftProfile?.microsoftRefreshToken) throw err
        await refreshMicrosoftProfile()
        authorization = await getMinecraftAuthorization()
        profile = await uploadWithToken(authorization.access_token)
    }
    applyMinecraftServicesProfile(profile)
    return getSafeMinecraftProfile()
}

async function archiveCurrentSkinInLibrary() {
    if (!minecraftProfile || minecraftProfile.mode !== 'premium' || !minecraftProfile.skinUrl) return null
    if (minecraftProfile.activeSkinLibraryId || minecraftProfile.activeDefaultSkinId) return null
    try {
        const response = await axios.get(secureMinecraftAssetUrl(minecraftProfile.skinUrl), {
            responseType: 'arraybuffer',
            timeout: 20000
        })
        const data = Buffer.from(response.data)
        if (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null
        const name = (minecraftProfile.username || 'Minecraft') + ' - anterior'
        return registerSkinInLibrary('skin-anterior.png', data, minecraftProfile.skinVariant || 'classic', name)
    } catch (err) {
        log('No se pudo archivar la skin anterior: ' + (err.message || String(err)))
        return null
    }
}

async function activateSkinLibraryItem(item, requestedVariant = item?.variant) {
    if (!item?.id || !item?.filePath || !fs.existsSync(item.filePath)) {
        throw new Error('La skin guardada ya no existe en el equipo.')
    }
    if (!minecraftProfile) loadMinecraftProfile()
    const variant = requestedVariant === 'slim' ? 'slim' : 'classic'
    const items = loadSkinLibrary()
    const index = items.findIndex((entry) => entry.id === item.id)
    if (index >= 0 && items[index].variant !== variant) {
        items[index] = { ...items[index], variant }
        saveSkinLibrary(items)
    }
    if (minecraftProfile.mode === 'premium') {
        await uploadMinecraftSkin(item.filePath, variant)
        minecraftProfile.activeSkinLibraryId = item.id
        minecraftProfile.activeDefaultSkinId = ''
        saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    } else {
        minecraftProfile = {
            ...minecraftProfile,
            skinSource: 'local',
            skinPath: item.filePath,
            skinVariant: variant,
            activeSkinLibraryId: item.id,
            activeDefaultSkinId: ''
        }
        saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    }
    return getSafeMinecraftProfile()
}

async function activateDefaultSkinItem(item) {
    if (!item?.id || !item?.filePath || !fs.existsSync(item.filePath)) {
        throw new Error('No se encontro la skin predeterminada seleccionada.')
    }
    if (!minecraftProfile) loadMinecraftProfile()
    const variant = item.variant === 'slim' ? 'slim' : 'classic'
    if (minecraftProfile.mode === 'premium') {
        await uploadMinecraftSkin(item.filePath, variant)
        minecraftProfile.activeDefaultSkinId = item.id
        minecraftProfile.activeSkinLibraryId = ''
        saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    } else {
        minecraftProfile = {
            ...minecraftProfile,
            skinUrl: '',
            skinSource: 'default',
            skinPath: item.filePath,
            skinVariant: variant,
            activeDefaultSkinId: item.id,
            activeSkinLibraryId: ''
        }
        saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    }
    return getSafeMinecraftProfile()
}

async function updateMinecraftCape(capeId = '') {
    if (minecraftProfile?.mode !== 'premium') {
        throw new Error('Inicia sesion con Microsoft para cambiar la capa de tu cuenta.')
    }
    const applyWithToken = async (accessToken) => {
        const headers = { Authorization: 'Bearer ' + accessToken }
        if (capeId) {
            await axios.put(MINECRAFT_PROFILE_URL + '/capes/active', { capeId }, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                timeout: 30000
            })
        } else {
            await axios.delete(MINECRAFT_PROFILE_URL + '/capes/active', { headers, timeout: 30000 })
        }
        const response = await axios.get(MINECRAFT_PROFILE_URL, { headers, timeout: 30000 })
        return response.data
    }
    let authorization = await getMinecraftAuthorization()
    if (!authorization?.access_token) throw new Error('La sesion de Minecraft no tiene un token valido. Inicia sesion otra vez.')
    let profile
    try {
        profile = await applyWithToken(authorization.access_token)
    } catch (err) {
        if (err?.response?.status !== 401 || !minecraftProfile?.microsoftRefreshToken) throw err
        await refreshMicrosoftProfile()
        authorization = await getMinecraftAuthorization()
        profile = await applyWithToken(authorization.access_token)
    }
    applyMinecraftServicesProfile(profile)
    return getSafeMinecraftProfile()
}
async function getMinecraftAuthorization() {
    if (minecraftProfile?.mode === 'premium' && minecraftProfile.auth?.access_token) {
        const expiresAt = Number(minecraftProfile.auth?.meta?.exp || 0)
        if (expiresAt && expiresAt - TOKEN_REFRESH_GRACE_MS <= Date.now()) {
            await refreshMicrosoftProfile()
        }

        return minecraftProfile.auth
    }

    return Authenticator.getAuth(minecraftProfile?.username || discordUser?.username || 'PlayerTest')
}

function slugify(value, fallback) {
    return String(value || fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function sanitizeProjectId(value, fallback) {
    const safe = String(value || fallback || '')
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^\.+/, '')
        .replace(/-+/g, '-')
        .slice(0, 80)
    return safe || slugify(fallback, 'proyecto')
}

function sanitizeCatalogUrl(value) {
    const candidate = String(value || '').trim()
    return isSafeExternalUrl(candidate) ? candidate : ''
}

function sanitizeManagedPath(value, root) {
    const candidate = String(value || '').trim()
    if (!candidate) return ''
    const resolved = path.resolve(candidate)
    const relative = path.relative(path.resolve(root), resolved)
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? resolved : ''
}

function normalizeProject(project, index = 0, { trustedLocal = false } = {}) {
    if (!project || typeof project !== 'object') return null
    if (project.hidden === true || project.enabled === false || project.active === false) return null

    const name = String(project.name || `Proyecto ${index + 1}`).trim().slice(0, 120)
    const requestedLoader = String(project.loader || '').toLowerCase()
    const loader = ['vanilla', 'fabric', 'forge', 'neoforge'].includes(requestedLoader) ? requestedLoader : ''
    const loaderVersion = project.loader_version ||
        project.fabric_version ||
        project.forge_version ||
        project.neoforge_version ||
        project.loaderVersion ||
        ''
    const isLocal = trustedLocal && Boolean(project.local || project.is_local || project.source === 'local')
    const localImagePath = isLocal ? sanitizeManagedPath(project.local_image_path || project.localImagePath, LOCAL_IMAGES_DIR) : ''
    const fileInfo = project.file && typeof project.file === 'object' ? project.file : {}
    const accessInfo = project.access && typeof project.access === 'object' ? project.access : {}
    const imageCandidate = project.bg_image || project.image || localImagePath || ''
    const expectedSize = Number(project.file_size || fileInfo.size || 0)
    const expectedSha256 = String(project.file_sha256 || fileInfo.sha256 || '').trim().toLowerCase()

    const normalized = {
        id: sanitizeProjectId(project.id, slugify(name, `proyecto-${index + 1}`)),
        name,
        description: String(project.description || 'Sin descripcion disponible.').slice(0, 800),
        codigo_acceso: trustedLocal ? String(project.codigo_acceso || project.access_code || '').slice(0, 256) : '',
        access_type: String(accessInfo.type || project.access_type || '').slice(0, 40),
        discord_guild_id: /^\d{15,22}$/.test(String(project.discord_guild_id || project.guild_id || accessInfo.guild_id || '')) ? String(project.discord_guild_id || project.guild_id || accessInfo.guild_id) : DISCORD_GUILD_ID,
        discord_role_id: /^\d{15,22}$/.test(String(project.discord_role_id || accessInfo.role_id || '')) ? String(project.discord_role_id || accessInfo.role_id) : '',
        bg_image: isLocal && localImagePath && path.resolve(imageCandidate) === localImagePath ? localImagePath : sanitizeCatalogUrl(imageCandidate),
        announcement_image: sanitizeCatalogUrl(project.announcement_image || project.news_image || project.bg_image || project.image || ''),
        modpack_url: sanitizeCatalogUrl(project.modpack_url || project.url || fileInfo.url || ''),
        file_type: String(project.file_type || fileInfo.type || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12),
        file_size: Number.isSafeInteger(expectedSize) && expectedSize > 0 ? expectedSize : 0,
        file_sha256: /^[a-f0-9]{64}$/.test(expectedSha256) ? expectedSha256 : '',
        trailer_url: sanitizeCatalogUrl(project.trailer_url || project.trailer || project.video_url || ''),
        featured: Boolean(project.featured || project.destacado || project.highlighted),
        maintenance: Boolean(project.maintenance || project.mantenimiento || project.disabled || project.no_disponible),
        maintenance_message: project.maintenance_message || project.maintenanceMessage || project.message || project.aviso || '',
        status: project.status || project.estado || '',
        changelog: Array.isArray(project.changelog)
            ? project.changelog.map((item) => String(item).slice(0, 300)).filter(Boolean).slice(0, 40)
            : String(project.changelog || '').split(/\r?\n/).map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, 40),
        project_version: String(project.project_version ||
            project.instance_version ||
            project.pack_version ||
            project.modpack_version ||
            '1.0.0').slice(0, 64),
        minecraft_version: isLocal && !project.minecraft_version && !project.version ? '' : String(project.minecraft_version || project.version || '1.21.1').slice(0, 40),
        loader: loader || (isLocal ? '' : (project.neoforge_version ? 'neoforge' : project.forge_version ? 'forge' : 'fabric')),
        loader_version: String(loaderVersion).slice(0, 80),
        loader_profile_id: project.loader_profile_id || project.profile_id || '',
        fabric_version: project.fabric_version || (loader === 'fabric' ? loaderVersion : ''),
        java_version: project.java_version || project.java_major || project.required_java || project.java || '',
        java_path: isLocal ? String(project.java_path || project.javaPath || '') : '',
        source: project.source || project.origin || '',
        local: isLocal,
        local_pack_path: isLocal ? sanitizeManagedPath(project.local_pack_path || project.localPackPath, LOCAL_PACKS_DIR) : '',
        original_pack_path: isLocal ? String(project.original_pack_path || project.originalPackPath || '') : '',
        local_pack_type: project.local_pack_type || project.localPackType || '',
        local_image_path: localImagePath,
        requires_curseforge_api: Boolean(project.requires_curseforge_api || project.requiresCurseForgeApi),
        imported_at: project.imported_at || ''
    }

    if (!normalized.local && normalized.loader === 'fabric' && !normalized.loader_version) {
        normalized.loader_version = '0.16.10'
        normalized.fabric_version = normalized.loader_version
    }

    return normalized
}

async function getDiscordGuildRoles(guildId) {
    if (!discordUser) return []
    const cacheKey = `${discordUser.id || discordUser.username}:${guildId}`
    const cached = discordRoleCache.get(cacheKey)
    if (cached && Date.now() - cached.checkedAt < DISCORD_ROLE_CACHE_MS) return cached.roles
    if (discordRoleRequests.has(cacheKey)) return discordRoleRequests.get(cacheKey)

    const request = axios.get(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        { headers: { Authorization: `Bearer ${discordUser.accessToken}` } }
    ).then((memberData) => {
        const roles = Array.isArray(memberData.data.roles) ? memberData.data.roles.map(String) : []
        discordRoleCache.set(cacheKey, { roles, checkedAt: Date.now() })
        return roles
    }).catch((error) => {
        if (error.response?.status === 429 && cached) {
            log('Discord limito temporalmente las consultas. Usando la ultima verificacion de roles valida.')
            return cached.roles
        }
        throw error
    }).finally(() => {
        discordRoleRequests.delete(cacheKey)
    })

    discordRoleRequests.set(cacheKey, request)
    return request
}

async function validateDiscordRole(project) {
    if (!discordUser || !project.discord_role_id) return false
    const guildId = project.discord_guild_id || DISCORD_GUILD_ID
    const requiredRole = String(project.discord_role_id)

    try {
        const roles = await getDiscordGuildRoles(guildId)
        const hasRole = roles.includes(requiredRole)
        if (hasRole) {
            log(`Discord verifico el rol ${requiredRole} en el servidor ${guildId}.`)
        } else {
            log(`Discord no encontro el rol requerido para [${project.name}]. Servidor: ${guildId}. Rol requerido: ${requiredRole}. Roles recibidos: ${roles.join(', ') || 'ninguno'}.`)
        }
        return hasRole
    } catch (error) {
        const status = error.response?.status
        if (status === 401 || status === 403) {
            log('Discord no autorizo leer tus roles. Cierra Discord en el launcher y vuelve a vincularlo.')
            return false
        }
        if (status === 404) {
            log(`No se encontro tu membresia en el servidor Discord configurado (${guildId}). Revisa discord_guild_id en el catalogo.`)
            return false
        }
        if (status === 429) {
            log('Discord esta limitando las consultas. Espera unos segundos; no es necesario introducir la clave.')
            return null
        }
        log(`Error consultando roles de Discord: ${error.message}`)
        return false
    }
}

function normalizeProjectList(rawProjects, options = {}) {
    let catalogMeta = null
    let sourceList = rawProjects

    if (rawProjects && !Array.isArray(rawProjects) && typeof rawProjects === 'object') {
        const nestedList = Array.isArray(rawProjects.projects)
            ? rawProjects.projects
            : Array.isArray(rawProjects.instances)
                ? rawProjects.instances
                : Array.isArray(rawProjects.modpacks)
                    ? rawProjects.modpacks
                    : null

        if (nestedList) {
            catalogMeta = {
                maintenance: Boolean(rawProjects.maintenance || rawProjects.mantenimiento),
                message: rawProjects.message || rawProjects.aviso || rawProjects.notice || '',
                title: rawProjects.title || rawProjects.titulo || ''
            }
            sourceList = nestedList
        }
    }

    const list = Array.isArray(sourceList) ? sourceList : [sourceList]
    const normalizedProjects = list.map((project, index) => {
        const normalized = normalizeProject(project, index, options)
        if (!normalized || !catalogMeta) return normalized
        return {
            ...normalized,
            maintenance: catalogMeta.maintenance || normalized.maintenance,
            maintenance_message: normalized.maintenance_message || catalogMeta.message || ''
        }
    }).filter(Boolean)
    const usedIds = new Set()

    if (catalogMeta) remoteCatalogMessage = catalogMeta

    return normalizedProjects.map((project, index) => {
        const originalId = String(project.id)
        if (!usedIds.has(originalId)) {
            usedIds.add(originalId)
            return project
        }

        const nameSuffix = slugify(project.name, `proyecto-${index + 1}`)
        let uniqueId = `${originalId}--${nameSuffix}`
        let suffix = 2
        while (usedIds.has(uniqueId)) {
            uniqueId = `${originalId}--${nameSuffix}-${suffix}`
            suffix += 1
        }
        usedIds.add(uniqueId)
        log(`ID duplicado detectado en el catalogo: "${originalId}". [${project.name}] usara temporalmente "${uniqueId}". Corrige el campo id en el RAW.`)
        return { ...project, source_id: originalId, id: uniqueId }
    })
}

function normalizeNewsList(rawNews) {
    const now = Date.now()
    const allowedActions = new Set(['project', 'tab', 'versions', 'external'])
    const usedIds = new Set()
    return (Array.isArray(rawNews) ? rawNews : []).map((item, index) => {
        if (!item || typeof item !== 'object') return null
        const status = String(item.status || 'published').toLowerCase()
        const publishAt = Date.parse(item.publish_at || item.date || '')
        const expiresAt = item.expires_at ? Date.parse(item.expires_at) : NaN
        if (status !== 'published' || (Number.isFinite(publishAt) && publishAt > now) || (Number.isFinite(expiresAt) && expiresAt <= now)) return null
        const id = sanitizeProjectId(item.id, `noticia-${index + 1}`)
        if (usedIds.has(id)) return null
        usedIds.add(id)
        const rawAction = item.action && typeof item.action === 'object' ? item.action : null
        const actionType = rawAction && allowedActions.has(String(rawAction.type || '').toLowerCase()) ? String(rawAction.type).toLowerCase() : ''
        const externalUrl = actionType === 'external' ? sanitizeCatalogUrl(rawAction.value || item.external_url || '') : ''
        const action = actionType && (actionType !== 'external' || externalUrl) ? {
            type: actionType,
            value: actionType === 'external' ? externalUrl : String(rawAction.value || '').slice(0, 160),
            label: String(rawAction.label || 'Abrir').slice(0, 80)
        } : null
        const date = Number.isFinite(publishAt) ? new Date(publishAt).toISOString() : new Date().toISOString()
        return {
            id,
            date,
            label: String(item.label || item.type || 'Noticia').slice(0, 40),
            type: String(item.type || 'news').slice(0, 40),
            title: String(item.title || 'Noticia de Obsidian Studios').slice(0, 160),
            summary: String(item.summary || item.excerpt || '').slice(0, 500),
            body: String(item.content || item.body || item.summary || '').slice(0, 8000),
            image: sanitizeCatalogUrl(item.image || '') || (String(item.image || '').startsWith('../') ? String(item.image).slice(0, 200) : ''),
            featured: Boolean(item.featured),
            priority: Math.max(-1000, Math.min(1000, Number(item.priority) || 0)),
            project_id: item.project_id ? sanitizeProjectId(item.project_id, 'proyecto') : '',
            version: String(item.version || '').slice(0, 64),
            tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).slice(0, 40)).filter(Boolean).slice(0, 12) : [],
            action
        }
    }).filter(Boolean).sort((a, b) => Number(b.featured) - Number(a.featured) || b.priority - a.priority || Date.parse(b.date) - Date.parse(a.date))
}

function normalizeContentDocument(rawDocument, options = {}) {
    if (!rawDocument || typeof rawDocument !== 'object') throw new Error('El documento de contenido no es valido.')
    const projects = normalizeProjectList(rawDocument, options)
    const news = normalizeNewsList(rawDocument.news)
    const catalog = rawDocument.catalog && typeof rawDocument.catalog === 'object' ? rawDocument.catalog : rawDocument
    remoteCatalogMessage = {
        maintenance: Boolean(catalog.maintenance || catalog.mantenimiento),
        message: String(catalog.message || catalog.aviso || catalog.notice || '').slice(0, 600),
        title: String(catalog.title || catalog.titulo || '').slice(0, 120)
    }
    return { projects, news }
}

function readContentFile(filePath) {
    if (!fs.existsSync(filePath)) throw new Error(`No existe ${path.basename(filePath)}.`)
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readLocalInstances() {
    try {
        if (!fs.existsSync(LOCAL_INSTANCES_FILE)) return []
        return normalizeProjectList(JSON.parse(fs.readFileSync(LOCAL_INSTANCES_FILE, 'utf8')), { trustedLocal: true })
            .map((project) => ({ ...project, source: 'local', local: true }))
    } catch (err) {
        log(`Error leyendo instancias locales: ${err.message}`)
        return []
    }
}

function saveLocalInstances(list) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const safeList = Array.isArray(list) ? list : []
    writeFileAtomic(LOCAL_INSTANCES_FILE, JSON.stringify(safeList, null, 2))
}

function refreshCombinedCatalog() {
    cachedServerList = [...remoteServerList, ...localServerList]
    sendToRenderer('catalog-message', remoteCatalogMessage)
    sendToRenderer('content-news', remoteNewsList)
    sendToRenderer('content-status', { source: contentSource, projects: remoteServerList.length, news: remoteNewsList.length })
    sendToRenderer('all-servers-info', cachedServerList.map((project) => ({ ...project, ...getInstanceState(project) })))
    sendToRenderer('local-instances-info', localServerList.map((project) => ({ ...project, ...getInstanceState(project) })))
    sendPlaytimeStats()
}

function getPackExtension(filePath) {
    return path.extname(String(filePath || '')).replace(/^\./, '').toLowerCase()
}

function guessLocalPackName(filePath) {
    return path.basename(String(filePath || 'Modpack local'), path.extname(String(filePath || ''))).replace(/[._-]+/g, ' ').trim() || 'Modpack local'
}

function findZipContentRoot(zip) {
    const validRoots = new Set(['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves', 'kubejs', 'defaultconfigs'])
    const validFiles = new Set(['options.txt', 'servers.dat', 'optionsof.txt'])
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory).map((entry) => entry.entryName.replace(/\\/g, '/'))
    const hasValidAt = (prefix) => entries.some((name) => {
        if (prefix && !name.startsWith(prefix)) return false
        const relative = prefix ? name.slice(prefix.length) : name
        const parts = relative.split('/').filter(Boolean)
        if (!parts.length) return false
        return validRoots.has(parts[0].toLowerCase()) || validFiles.has(parts[0].toLowerCase())
    })
    if (hasValidAt('')) return ''
    const candidates = [...new Set(entries.map((name) => name.split('/')[0]).filter(Boolean))]
    for (const candidate of candidates) {
        const prefix = `${candidate}/`
        if (hasValidAt(prefix)) return prefix
    }
    return ''
}


function extractMinecraftVersionFromText(value = '') {
    const text = String(value || '')
    const direct = text.match(/(?:minecraft|mc|game|mcversion|gameversion|minecraft_version)[^0-9]{0,24}(1\.(?:[0-9]{1,2})(?:\.[0-9]{1,2})?)/i)
    if (direct) return direct[1]
    const plus = text.match(/\+((?:1\.)[0-9]{1,2}(?:\.[0-9]{1,2})?)(?:\D|$)/)
    if (plus) return plus[1]
    const fileToken = text.match(/(?:^|[-_\s])mc?((?:1\.)[0-9]{1,2}(?:\.[0-9]{1,2})?)(?:[-_\s+. ]|$)/i)
    if (fileToken) return fileToken[1]
    return ''
}
function extractMinecraftVersionFromModToml(toml = '') {
    const text = String(toml || '')
    const blocks = text.split(/\[\[dependencies\.[^\]]+\]\]/i)
    const minecraftBlock = blocks.find((block) => /modId\s*=\s*["']minecraft["']/i.test(block))
    if (minecraftBlock) return extractMinecraftVersionFromText(minecraftBlock)
    const lines = text.split(/\r?\n/).filter((line) => /minecraft/i.test(line) && /(version|range|minecraft)/i.test(line))
    return extractMinecraftVersionFromText(lines.join(' '))
}
function parseLoaderId(loaderId = '') {
    const value = String(loaderId || '').toLowerCase()
    const loader = value.includes('neoforge') ? 'neoforge' : value.includes('forge') ? 'forge' : value.includes('fabric') || value.includes('quilt') ? 'fabric' : ''
    const versionMatch = value.match(/(?:fabric|forge|neoforge|quilt)[-_ ]?(.+)$/)
    return { loader, loaderVersion: versionMatch ? versionMatch[1].replace(/^loader[-_]/, '') : '' }
}
function findEntryByName(zip, entryName) {
    const expected = String(entryName || '').replace(/\\/g, '/').toLowerCase()
    return zip.getEntries().find((entry) => entry.entryName.replace(/\\/g, '/').toLowerCase() === expected)
}
function findLocalPackImageEntry(zip, prefix = '') {
    const names = ['icon.png', 'icon.jpg', 'icon.jpeg', 'pack.png', 'thumbnail.png', 'thumb.png', 'logo.png', 'image.png', 'cover.png']
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory)
    for (const rawName of names) {
        const wanted = (prefix + rawName).toLowerCase()
        const match = entries.find((entry) => entry.entryName.replace(/\\/g, '/').toLowerCase() === wanted)
        if (match) return match.entryName
    }
    const loose = entries.find((entry) => {
        const name = entry.entryName.replace(/\\/g, '/').toLowerCase()
        return /\.(png|jpe?g|webp)$/i.test(name) && !name.includes('__macosx/') && /(icon|pack|thumb|logo|cover|image)/i.test(path.basename(name))
    })
    return loose?.entryName || ''
}
function storeLocalPackImage(zipPath, id, entryName) {
    if (!entryName) return ''
    try {
        if (!fs.existsSync(LOCAL_IMAGES_DIR)) fs.mkdirSync(LOCAL_IMAGES_DIR, { recursive: true })
        const zip = openValidatedZip(zipPath)
        const entry = findEntryByName(zip, entryName)
        if (!entry) return ''
        const ext = path.extname(entry.entryName).toLowerCase() || '.png'
        const destination = path.join(LOCAL_IMAGES_DIR, id + ext)
        fs.writeFileSync(destination, entry.getData())
        return destination
    } catch (err) { log('No se pudo extraer imagen local: ' + err.message); return '' }
}
function zipHasIncludedMods(zip, prefix = '') {
    return zip.getEntries().some((entry) => {
        if (entry.isDirectory) return false
        const name = entry.entryName.replace(/\\/g, '/')
        const relative = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name
        return /^mods\/[^/]+\.jar$/i.test(relative) || /^overrides\/mods\/[^/]+\.jar$/i.test(relative)
    })
}
function detectFromCurseForgeManifest(zip, project = {}) {
    const manifestEntry = zip.getEntries().find((entry) => !entry.isDirectory && path.basename(entry.entryName).toLowerCase() === 'manifest.json')
    if (!manifestEntry) return null
    try {
        const manifest = JSON.parse(manifestEntry.getData().toString('utf8'))
        if (!manifest.minecraft) return null
        const prefix = findZipContentRoot(zip)
        const loaderInfo = parseLoaderId(manifest.minecraft.modLoaders?.find((loader) => loader.primary)?.id || manifest.minecraft.modLoaders?.[0]?.id || '')
        const hasExternalFiles = Array.isArray(manifest.files) && manifest.files.length > 0
        return {
            name: manifest.name || project.name || '',
            minecraftVersion: manifest.minecraft.version || project.minecraft_version || '',
            loader: loaderInfo.loader || project.loader || '',
            loaderVersion: loaderInfo.loaderVersion || project.loader_version || '',
            imageEntry: findLocalPackImageEntry(zip, prefix),
            requiresCurseForgeApi: hasExternalFiles && !zipHasIncludedMods(zip, prefix)
        }
    } catch (err) { return null }
}
function detectLoaderFromJarData(buffer, fileName = '') {
    const lowerName = String(fileName || '').toLowerCase()
    const fromName = extractMinecraftVersionFromText(lowerName)
    try {
        const jar = openValidatedZip(buffer, { maxEntries: 100000, maxSingleBytes: 512 * 1024 * 1024, maxTotalBytes: 2 * 1024 * 1024 * 1024 })
        const fabricEntry = jar.getEntry('fabric.mod.json')
        if (fabricEntry) {
            try {
                const fabric = JSON.parse(fabricEntry.getData().toString('utf8'))
                const depends = fabric.depends || fabric.recommends || {}
                return { loader: 'fabric', loaderVersion: '', minecraftVersion: extractMinecraftVersionFromText(depends.minecraft || depends['minecraft'] || fromName) || fromName }
            } catch (err) { return { loader: 'fabric', loaderVersion: '', minecraftVersion: fromName } }
        }
        const neoEntry = jar.getEntry('META-INF/neoforge.mods.toml')
        if (neoEntry) return { loader: 'neoforge', loaderVersion: '', minecraftVersion: extractMinecraftVersionFromModToml(neoEntry.getData().toString('utf8')) || fromName }
        const forgeEntry = jar.getEntry('META-INF/mods.toml')
        if (forgeEntry) {
            const toml = forgeEntry.getData().toString('utf8')
            const loader = lowerName.includes('neoforge') ? 'neoforge' : 'forge'
            return { loader, loaderVersion: '', minecraftVersion: extractMinecraftVersionFromModToml(toml) || fromName }
        }
    } catch (err) {}
    if (lowerName.includes('fabric')) return { loader: 'fabric', loaderVersion: '', minecraftVersion: fromName }
    if (lowerName.includes('neoforge')) return { loader: 'neoforge', loaderVersion: '', minecraftVersion: fromName }
    if (lowerName.includes('forge')) return { loader: 'forge', loaderVersion: '', minecraftVersion: fromName }
    return fromName ? { loader: '', loaderVersion: '', minecraftVersion: fromName } : null
}

function detectZipPackInfo(zipPath, project = {}) {
    const zip = openValidatedZip(zipPath)
    const prefix = findZipContentRoot(zip)
    const curse = detectFromCurseForgeManifest(zip, project)
    if (curse) return curse
    const indexEntry = zip.getEntry('modrinth.index.json')
    if (indexEntry) {
        const index = JSON.parse(indexEntry.getData().toString('utf8'))
        const dependencies = index.dependencies || {}
        const loaderInfo = getLoaderFromDependencies(dependencies, project)
        return { name: index.name || project.name || '', minecraftVersion: dependencies.minecraft || project.minecraft_version || '', loader: loaderInfo.loader || project.loader || '', loaderVersion: loaderInfo.loaderVersion || project.loader_version || '', imageEntry: findLocalPackImageEntry(zip, prefix) }
    }
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory)
    const modEntries = entries.filter((entry) => {
        const name = entry.entryName.replace(/\\/g, '/')
        const relative = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name
        return /^mods\/[^/]+\.jar$/i.test(relative)
    })
    let detected = null
    for (const entry of modEntries.slice(0, 80)) {
        const info = detectLoaderFromJarData(entry.getData(), entry.entryName)
        if (!info) continue
        detected = { loader: detected?.loader || info.loader, loaderVersion: detected?.loaderVersion || info.loaderVersion, minecraftVersion: detected?.minecraftVersion || info.minecraftVersion }
        if (detected.loader && detected.minecraftVersion) break
    }
    const versionFromNames = entries.map((entry) => extractMinecraftVersionFromText(entry.entryName)).find(Boolean)
    return { name: project.name || '', minecraftVersion: project.minecraft_version || detected?.minecraftVersion || versionFromNames || '', loader: project.loader || detected?.loader || '', loaderVersion: project.loader_version || detected?.loaderVersion || '', imageEntry: findLocalPackImageEntry(zip, prefix), requiresCurseForgeApi: Boolean(detected?.requiresCurseForgeApi) }
}

async function copyZipPackContents(zipPath, gamePath) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'obsidian-pack-'))
    let copied = 0
    let sourceRoot = tempRoot
    try {
        const archive = openValidatedZip(zipPath)
        await archive.extractAllToAsync(tempRoot, true, false)
        const topLevel = readDirEntries(tempRoot).filter((entry) => entry.name !== '__MACOSX')
        if (topLevel.length === 1 && topLevel[0].isDirectory()) {
            const candidate = path.join(tempRoot, topLevel[0].name)
            const childNames = new Set(readDirEntries(candidate).map((entry) => entry.name.toLowerCase()))
            if (['mods', 'config', 'resourcepacks', 'shaderpacks', 'manifest.json', 'modrinth.index.json'].some((name) => childNames.has(name))) {
                sourceRoot = candidate
            }
        }
        const copyFiltered = (source, destination) => {
            const stat = fs.statSync(source)
            if (stat.isDirectory()) {
                fs.mkdirSync(destination, { recursive: true })
                for (const entry of readDirEntries(source)) {
                    if (entry.name === '__MACOSX') continue
                    copyFiltered(path.join(source, entry.name), path.join(destination, entry.name))
                }
                return
            }
            fs.mkdirSync(path.dirname(destination), { recursive: true })
            fs.copyFileSync(source, destination)
            copied += 1
        }
        copyFiltered(sourceRoot, gamePath)
    } finally {
        try { fs.rmSync(tempRoot, { recursive: true, force: true }) } catch (err) {}
    }
    return { copied, prefix: sourceRoot === tempRoot ? '' : path.basename(sourceRoot) + '/' }
}

function readFabricModsFromGame(gamePath) {
    const modsDir = path.join(gamePath, 'mods')
    if (!fs.existsSync(modsDir)) return { installed: new Set(), required: new Set() }
    const installed = new Set()
    const required = new Set()
    for (const entry of readDirEntries(modsDir)) {
        if (!entry.isFile() || !/.jar$/i.test(entry.name)) continue
        const jarPath = path.join(modsDir, entry.name)
        try {
            const jar = openValidatedZip(jarPath, { maxEntries: 100000, maxSingleBytes: 512 * 1024 * 1024, maxTotalBytes: 2 * 1024 * 1024 * 1024 })
            const fabricEntry = jar.getEntry('fabric.mod.json')
            if (!fabricEntry) continue
            const fabric = JSON.parse(fabricEntry.getData().toString('utf8'))
            if (fabric.id) installed.add(String(fabric.id).toLowerCase())
            const depends = fabric.depends || {}
            for (const key of Object.keys(depends)) required.add(String(key).toLowerCase())
        } catch (err) {}
    }
    return { installed, required }
}

async function ensureCommonFabricDependencies(gamePath, project) {
    if (String(project.loader || '').toLowerCase() !== 'fabric') return
    if (!project.minecraft_version) return
    const { installed, required } = readFabricModsFromGame(gamePath)
    const ignored = new Set(['java', 'minecraft', 'fabricloader', 'fabric-loader'])
    const dependencyMap = new Map([
        ['fabric-api', 'fabric-api'],
        ['fabric-resource-loader-v0', 'fabric-api'],
        ['fabric-rendering-v1', 'fabric-api'],
        ['fabric-rendering-data-attachment-v1', 'fabric-api'],
        ['fabric-renderer-api-v1', 'fabric-api'],
        ['fabric-lifecycle-events-v1', 'fabric-api'],
        ['fabric-networking-api-v1', 'fabric-api'],
        ['fabric-key-binding-api-v1', 'fabric-api'],
        ['geckolib', 'geckolib'],
        ['player-animator', 'playeranimator'],
        ['cloth-config', 'cloth-config'],
        ['cloth-config2', 'cloth-config'],
        ['architectury', 'architectury-api'],
        ['fabric-language-kotlin', 'fabric-language-kotlin'],
        ['modmenu', 'modmenu'],
        ['owo', 'owo-lib'],
        ['trinkets', 'trinkets']
    ])
    const slugs = new Set()
    for (const dependency of required) {
        if (ignored.has(dependency) || installed.has(dependency)) continue
        const slug = dependencyMap.get(dependency) || (dependency.startsWith('fabric-') ? 'fabric-api' : '')
        if (slug) slugs.add(slug)
    }
    if (!slugs.size) return
    log('Detectadas dependencias Fabric comunes faltantes: ' + [...slugs].join(', ') + '.')
    for (const slug of slugs) {
        try {
            const files = await installModrinthWithDependencies(project, slug, 'mod')
            log('Dependencia Fabric instalada desde Modrinth: ' + slug + ' (' + files.length + ' archivo(s)).')
        } catch (err) {
            log('No se pudo instalar automaticamente la dependencia ' + slug + ': ' + err.message)
        }
    }
}


function storeLocalPackFile(filePath, id) {
    if (!fs.existsSync(LOCAL_PACKS_DIR)) fs.mkdirSync(LOCAL_PACKS_DIR, { recursive: true })
    const ext = getPackExtension(filePath) || 'zip'
    const destination = path.join(LOCAL_PACKS_DIR, id + '.' + ext)
    fs.copyFileSync(filePath, destination)
    return destination
}
function createLocalProjectFromFile(filePath, options = {}) {
    const ext = getPackExtension(filePath)
    if (ext !== 'mrpack') {
        throw new Error('Selecciona un archivo .mrpack. El modo ZIP/local fue retirado temporalmente.')
    }
    let name = String(options.name || '').trim() || guessLocalPackName(filePath)
    const id = `local-${slugify(name, 'modpack-local')}-${Date.now()}`
    let detected = { minecraftVersion: '', loader: '', loaderVersion: '' }
    try { detected = detectZipPackInfo(filePath, options) } catch (err) { log(`No se pudo analizar completamente el paquete local: ${err.message}`) }
    if (!String(options.name || '').trim() && detected.name) name = detected.name
    const localImagePath = storeLocalPackImage(filePath, id, detected.imageEntry)
    const loader = String(options.loader || detected.loader || '').toLowerCase()
    return normalizeProject({
        id,
        name,
        description: options.description || `Instancia local importada desde ${path.basename(filePath)}.`,
        project_version: options.project_version || '1.0.0-local',
        minecraft_version: options.minecraft_version || detected.minecraftVersion || '',
        loader: loader || '',
        loader_version: options.loader_version || detected.loaderVersion || '',
        fabric_version: loader === 'fabric' ? (options.loader_version || detected.loaderVersion || '') : '',
        local: true,
        source: 'local',
        local_pack_path: storeLocalPackFile(filePath, id),
        original_pack_path: filePath,
        local_pack_type: ext,
        local_image_path: localImagePath,
        bg_image: localImagePath,
        requires_curseforge_api: Boolean(detected.requiresCurseForgeApi),
        imported_at: new Date().toISOString(),
        status: detected.requiresCurseForgeApi ? 'needs_curseforge_api' : ((!options.minecraft_version && !detected.minecraftVersion) || (!loader && !detected.loader) || (loader && loader !== 'vanilla' && !options.loader_version && !detected.loaderVersion) ? 'needs_config' : '')
    }, 0, { trustedLocal: true })
}


function createEmptyLocalProject(options = {}) {
    const name = String(options.name || '').trim() || 'Nueva instancia local'
    const loader = String(options.loader || '').trim().toLowerCase()
    const loaderVersion = String(options.loader_version || '').trim()
    const minecraftVersion = String(options.minecraft_version || '').trim()
    const id = 'local-' + slugify(name, 'instancia-local') + '-' + Date.now()
    const project = normalizeProject({
        id,
        name,
        description: String(options.description || '').trim() || 'Instancia local creada desde Obsidian Workshop.',
        project_version: '1.0.0-local',
        minecraft_version: minecraftVersion,
        loader,
        loader_version: loaderVersion,
        fabric_version: loader === 'fabric' ? loaderVersion : '',
        local: true,
        source: 'local',
        local_pack_type: 'created',
        imported_at: new Date().toISOString(),
        status: (!minecraftVersion || (!loader && loader !== 'vanilla') || (loader && loader !== 'vanilla' && !loaderVersion)) ? 'needs_config' : ''
    }, 0, { trustedLocal: true })
    const gamePath = path.join(getInstanceBasePath(project), 'game')
    for (const folder of ['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves', 'screenshots']) {
        fs.mkdirSync(path.join(gamePath, folder), { recursive: true })
    }
    return project
}

function readLocalConfig() {
    if (!fs.existsSync(LOCAL_CONFIG_FILE)) return []
    const rawData = fs.readFileSync(LOCAL_CONFIG_FILE, 'utf8')
    return normalizeProjectList(JSON.parse(rawData))
}

function getInstanceBasePath(project) {
    const instancesRoot = path.join(DATA_DIR, 'instancias')
    return safeJoin(instancesRoot, sanitizeProjectId(project?.id, 'proyecto'))
}

function getInstanceManifestPath(project) {
    return path.join(getInstanceBasePath(project), 'obsidian-instance.json')
}

function getInstalledManifest(project) {
    try {
        const manifestPath = getInstanceManifestPath(project)
        if (!fs.existsSync(manifestPath)) return null
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    } catch (err) {
        return null
    }
}

function getInstanceState(project) {
    const basePath = getInstanceBasePath(project)
    const isInstalled = fs.existsSync(path.join(basePath, 'game', 'versions'))
    const manifest = getInstalledManifest(project)
    const installedVersion = manifest?.project_version || ''
    const projectVersion = project.project_version || '1.0.0'

    return {
        isInstalled,
        installedVersion,
        projectVersion,
        isUpdateAvailable: Boolean(isInstalled && installedVersion !== projectVersion)
    }
}

function getDiagnosticRows(project = currentProject) {
    const state = project ? getInstanceState(project) : {}
    const basePath = project ? getInstanceBasePath(project) : ''
    const gamePath = basePath ? path.join(basePath, 'game') : ''
    const requiredJava = project ? getRequiredJavaMajor(project) : getRequiredJavaMajor('1.21.1')
    let javaMajor = 0
    let javaPath = getManagedJavaPath(requiredJava)
    if (javaPath) javaMajor = getJavaMajor(javaPath)
    if (!javaMajor && project) {
        for (const candidate of getJavaCandidates(project)) {
            if (candidate !== 'java' && !fs.existsSync(candidate)) continue
            javaMajor = getJavaMajor(candidate)
            if (javaMajor >= requiredJava) { javaPath = candidate; break }
        }
    }
    const hasLoader = project ? (project.loader === 'vanilla' || Boolean(project.loader && project.loader_version)) : false
    const ramGB = Number(String(selectedRAM || '4G').replace(/[^0-9.]/g, '')) || 4
    const hasFiles = gamePath ? fs.existsSync(gamePath) : false
    const microsoftReady = Boolean(minecraftProfile && (minecraftProfile.username || minecraftProfile.access_token))
    const accessReady = Boolean(project && (project.local || !project.discord_role_id || currentProject?.id === project.id))
    return [
        { key: 'Java', value: javaMajor >= requiredJava ? 'Listo (Java ' + javaMajor + ')' : 'Necesita Java ' + requiredJava, state: javaMajor >= requiredJava ? 'ok' : 'warn' },
        { key: 'Versión de Minecraft', value: project?.minecraft_version ? 'v' + project.minecraft_version : 'Selecciona una instancia', state: project?.minecraft_version ? 'ok' : 'warn' },
        { key: 'Cargador de mods', value: hasLoader ? (project.loader + ' ' + (project.loader_version || '')).trim() : 'Falta configurar', state: hasLoader ? 'ok' : 'warn' },
        { key: 'Memoria asignada', value: ramGB >= 4 ? ramGB + ' GB (correcto)' : ramGB + ' GB; usa al menos 4 GB', state: ramGB >= 4 ? 'ok' : 'warn' },
        { key: 'Instalación', value: hasFiles ? (state.isInstalled ? 'Lista' : 'Incompleta') : 'Todavía no instalada', state: state.isInstalled ? 'ok' : 'warn' },
        { key: 'Catálogo', value: cachedServerList.length ? 'Conectado' : 'No se pudo sincronizar', state: cachedServerList.length ? 'ok' : 'warn' },
        { key: 'Cuenta Microsoft', value: microsoftReady ? (minecraftProfile.username || 'Conectada') : 'Modo offline', state: microsoftReady ? 'ok' : 'warn' },
        { key: 'Acceso privado', value: accessReady ? 'Listo' : 'Pendiente de comprobar', state: accessReady ? 'ok' : 'warn' }
    ]
}

function buildDiagnosticReport(project = currentProject) {
    const rows = getDiagnosticRows(project)
    const state = project ? getInstanceState(project) : {}
    const report = [
        'Obsidian Studios Launcher - Diagnostico',
        'Fecha: ' + new Date().toISOString(),
        'Launcher: v' + app.getVersion(),
        'Sistema: ' + os.platform() + ' ' + os.release() + ' ' + os.arch(),
        'RAM sistema: ' + Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
        'Instancia: ' + (project?.name || 'Sin instancia'),
        'Version proyecto: ' + (project?.project_version || 'N/A'),
        'Instalada: ' + (state.isInstalled ? 'si' : 'no'),
        'Actualizacion disponible: ' + (state.isUpdateAvailable ? 'si' : 'no'),
        '',
        ...rows.map((row) => row.key + ': ' + row.value + ' [' + row.state + ']'),
        '',
        'Nota: copia tambien la consola si el error acaba de ocurrir.'
    ].join('\n')
    return { rows, report }
}

function getLaunchAssetIndexName(project, loaderLaunchInfo) {
    return loaderLaunchInfo?.customVersion ||
        project.loader_profile_id ||
        project.minecraft_version
}

function saveInstanceManifest(project) {
    const manifestPath = getInstanceManifestPath(project)
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
    writeFileAtomic(manifestPath, JSON.stringify({
        id: project.id,
        name: project.name,
        project_version: project.project_version || '1.0.0',
        minecraft_version: project.minecraft_version,
        loader: project.loader,
        loader_version: project.loader_version,
        java_version: project.java_version || getRequiredJavaMajor(project),
        modpack_url: project.modpack_url,
        local: Boolean(project.local),
        local_pack_path: project.local_pack_path || '',
        local_pack_type: project.local_pack_type || '',
        installed_at: new Date().toISOString()
    }, null, 2))
}

function getFreshConfigUrl(baseUrl = CONTENT_URL) {
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}_=${Date.now()}`
}

function cleanDownloadUrl(url) {
    let cleanUrl = String(url || '').replace(/[\r\n\t]/g, '').trim()
    cleanUrl = cleanUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com')

    if (!cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`
    }
    if (!isSafeExternalUrl(cleanUrl)) throw new Error('La URL de descarga fue bloqueada por seguridad.')
    return cleanUrl
}

function isInside(parent, child) {
    const relative = path.relative(parent, child)
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function safeJoin(basePath, relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/')
    const dest = path.resolve(basePath, normalized)
    if (!isInside(basePath, dest) && dest !== path.resolve(basePath)) {
        throw new Error(`Ruta insegura dentro del paquete: ${relativePath}`)
    }
    return dest
}

function fileHash(filePath, algorithm) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm)
        const stream = fs.createReadStream(filePath)
        stream.on('data', (chunk) => hash.update(chunk))
        stream.on('end', () => resolve(hash.digest('hex')))
        stream.on('error', reject)
    })
}

async function verifyHashIfPresent(filePath, hashes = {}) {
    const algorithm = hashes.sha512 ? 'sha512' : hashes.sha256 ? 'sha256' : hashes.sha1 ? 'sha1' : null
    if (!algorithm) return true

    const actual = await fileHash(filePath, algorithm)
    return actual.toLowerCase() === String(hashes[algorithm]).toLowerCase()
}

async function verifyProjectPackage(filePath, project) {
    if (!project || project.local) return true
    const expectedSize = Number(project.file_size || 0)
    if (expectedSize && fs.statSync(filePath).size !== expectedSize) {
        throw new Error(`El paquete de ${project.name} no coincide con el tamano publicado.`)
    }
    if (project.file_sha256) {
        const valid = await verifyHashIfPresent(filePath, { sha256: project.file_sha256 })
        if (!valid) throw new Error(`La verificacion SHA-256 del paquete de ${project.name} fallo. El archivo fue rechazado.`)
        log(`Integridad SHA-256 verificada para [${project.name}].`)
    }
    return true
}

function getModpackCacheEntry(project, extension = 'zip') {
    const source = [project.modpack_url || project.local_pack_path || '', project.project_version || '', project.minecraft_version || '', project.loader || '', project.loader_version || ''].join('|')
    const id = crypto.createHash('sha256').update(source).digest('hex').slice(0, 24)
    const safeExt = String(extension || 'zip').replace(/[^a-z0-9]/gi, '') || 'zip'
    return {
        id,
        file: path.join(DOWNLOAD_CACHE_DIR, id + '.' + safeExt),
        meta: path.join(DOWNLOAD_CACHE_DIR, id + '.json')
    }
}

function getCachedPackageInfo(entry, minSize = 1000) {
    try {
        if (!entry || !fs.existsSync(entry.file)) return null
        const stats = fs.statSync(entry.file)
        if (stats.size < minSize) return null
        return { path: entry.file, size: stats.size, updatedAt: stats.mtime.toISOString() }
    } catch (err) {
        return null
    }
}

function saveCachedPackageInfo(entry, project, url) {
    try {
        fs.mkdirSync(path.dirname(entry.meta), { recursive: true })
        writeFileAtomic(entry.meta, JSON.stringify({ id: entry.id, name: project.name, project_version: project.project_version, url, updatedAt: new Date().toISOString() }, null, 2))
    } catch (err) {}
}

async function downloadFile(url, dest, options = {}) {
    if (!url || String(url).trim() === '') {
        throw new Error('La URL de descarga esta vacia.')
    }

    const cleanUrl = cleanDownloadUrl(url)
    fs.mkdirSync(path.dirname(dest), { recursive: true })

    try {
        const maxBytes = Math.max(1024 * 1024, Number(options.maxBytes) || 8 * 1024 * 1024 * 1024)
        const response = await axios({
            method: 'GET',
            url: cleanUrl,
            responseType: 'stream',
            maxRedirects: 10,
            beforeRedirect: (redirectOptions) => {
                const redirectUrl = `${redirectOptions.protocol}//${redirectOptions.hostname}${redirectOptions.path || ''}`
                if (!isSafeExternalUrl(redirectUrl)) throw new Error('La redireccion de descarga fue bloqueada por seguridad.')
            },
            timeout: 300000,
            headers: {
                'User-Agent': 'ObsidianLauncher/1.0'
            },
            validateStatus: (status) => status >= 200 && status < 300
        })

        let downloaded = 0
        let checkedHeader = false
        let lastActivityAt = 0
        const startedAt = Date.now()
        const totalSize = Number(response.headers['content-length'] || 0)
        if (totalSize > maxBytes) {
            response.data.destroy()
            throw new Error('La descarga supera el limite de seguridad permitido.')
        }
        const startProgress = Number(options.progressStart || 0)
        const endProgress = Number(options.progressEnd || startProgress)
        activeDownloadStream = response.data
        currentDownloadPaused = false
        sendDownloadActivity({ title: options.downloadTitle || path.basename(dest), phase: options.phase || 'Descargando', downloaded: 0, total: totalSize, percent: startProgress, filesDone: options.filesDone || 0, filesTotal: options.filesTotal || 0 })

        const validateZipHeader = new Transform({
            transform(chunk, encoding, callback) {
                if (options.expectZip && !checkedHeader) {
                    checkedHeader = true
                    const header = chunk.subarray(0, 4).toString('utf8')
                    if (!header.startsWith('PK')) {
                        if (header.startsWith('Rar!')) {
                            callback(new Error('La descarga es un archivo RAR renombrado como zip. Exporta/sube el modpack como .zip o .mrpack real.'))
                            return
                        }
                        if (header.trim().startsWith('<')) {
                            callback(new Error('La descarga devolvio HTML en vez de un zip/mrpack. Revisa que el enlace sea directo y publico.'))
                            return
                        }
                        callback(new Error('La descarga no es un archivo zip/mrpack valido. El host probablemente devolvio otro tipo de archivo o bloqueo la descarga.'))
                        return
                    }
                }

                if (currentDownloadCancelled) {
                    callback(new Error('Descarga cancelada por el usuario.'))
                    return
                }

                downloaded += chunk.length
                if (downloaded > maxBytes) {
                    callback(new Error('La descarga supero el limite de seguridad permitido.'))
                    return
                }
                const elapsedSeconds = Math.max(0.1, (Date.now() - startedAt) / 1000)
                const speed = downloaded / elapsedSeconds
                const remaining = totalSize > downloaded && speed > 0 ? (totalSize - downloaded) / speed : 0
                if (totalSize > 0 && endProgress > startProgress) {
                    const percent = startProgress + ((downloaded / totalSize) * (endProgress - startProgress))
                    setProgress(percent)
                }
                if (Date.now() - lastActivityAt > 250) {
                    lastActivityAt = Date.now()
                    sendDownloadActivity({
                        title: options.downloadTitle || path.basename(dest),
                        phase: options.phase || 'Descargando',
                        downloaded,
                        total: totalSize,
                        speed,
                        eta: formatDuration(remaining),
                        filesDone: options.filesDone || 0,
                        filesTotal: options.filesTotal || 0
                    })
                }

                callback(null, chunk)
            }
        })

        await pipeline(response.data, validateZipHeader, fs.createWriteStream(dest))
        activeDownloadStream = null
        currentDownloadPaused = false
        sendDownloadActivity({ title: options.downloadTitle || path.basename(dest), phase: options.donePhase || 'Descarga completada', downloaded, total: totalSize, speed: 0, eta: '00:00' })

        const stats = fs.statSync(dest)
        if (stats.size < (options.minSize || 1)) {
            throw new Error('El archivo descargado esta vacio o incompleto.')
        }

        if (options.expectZip) {
            const header = fs.readFileSync(dest, { encoding: null, flag: 'r' }).subarray(0, 4).toString('utf8')
            if (!header.startsWith('PK')) {
                if (header.startsWith('Rar!')) {
                    throw new Error('La descarga es un archivo RAR renombrado como zip. Exporta/sube el modpack como .zip o .mrpack real.')
                }
                throw new Error('La descarga no es un archivo zip/mrpack valido. El host probablemente devolvio una pagina HTML o bloqueo la descarga.')
            }
        }
    } catch (err) {
        activeDownloadStream = null
        currentDownloadPaused = false
        try { fs.unlinkSync(dest) } catch (e) {}
        const status = err && err.response && err.response.status ? 'HTTP ' + err.response.status : ''
        const reason = [status, err && err.message ? err.message : String(err)].filter(Boolean).join(' - ')
        throw new Error('Fallo la descarga: ' + reason + '. URL: ' + cleanUrl)
    }
}

function copyMrpackFolder(zip, sourceFolder, gamePath) {
    const prefix = `${sourceFolder}/`
    zip.getEntries()
        .filter((entry) => !entry.isDirectory && entry.entryName.startsWith(prefix))
        .forEach((entry) => {
            const relativePath = entry.entryName.slice(prefix.length)
            const dest = safeJoin(gamePath, relativePath)
            fs.mkdirSync(path.dirname(dest), { recursive: true })
            fs.writeFileSync(dest, entry.getData())
        })
}

async function downloadMrpackFiles(index, gamePath) {
    const files = Array.isArray(index.files) ? index.files : []
    let done = 0
    let available = 0
    let downloadedCount = 0
    let modified = 0
    const totals = { mods: 0, resourcepacks: 0, config: 0 }
    const progress = { mods: 0, resourcepacks: 0, config: 0 }

    for (const file of files) {
        if (file.env?.client === 'unsupported') continue
        const normalized = String(file.path || '').replace(/\\/g, '/')
        if (normalized.startsWith('mods/')) totals.mods += 1
        else if (normalized.startsWith('resourcepacks/')) totals.resourcepacks += 1
        else if (normalized.startsWith('config/') || normalized.startsWith('defaultconfigs/')) totals.config += 1
    }

    sendDownloadActivity({
        title: 'Descargando ' + (index.name || currentProject?.name || 'modpack'),
        phase: 'Analizando cache',
        filesDone: 0,
        filesTotal: files.length,
        modsTotal: totals.mods,
        resourcepacksTotal: totals.resourcepacks,
        configTotal: totals.config
    })

    for (const file of files) {
        done += 1
        if (file.env?.client === 'unsupported') continue

        const targetPath = safeJoin(gamePath, file.path)
        const existed = fs.existsSync(targetPath)
        const alreadyValid = existed && await verifyHashIfPresent(targetPath, file.hashes)
        const normalized = String(file.path || '').replace(/\\/g, '/')
        const bucket = normalized.startsWith('mods/') ? 'mods' : normalized.startsWith('resourcepacks/') ? 'resourcepacks' : (normalized.startsWith('config/') || normalized.startsWith('defaultconfigs/')) ? 'config' : ''
        if (bucket) progress[bucket] += 1

        if (alreadyValid) {
            available += 1
            sendDownloadActivity({
                phase: 'Usando cache',
                filesDone: done,
                filesTotal: files.length,
                modsDone: progress.mods,
                resourcepacksDone: progress.resourcepacks,
                configDone: progress.config
            })
            continue
        }
        if (existed) modified += 1

        const downloadUrl = Array.isArray(file.downloads) ? file.downloads[0] : null
        if (!downloadUrl) {
            throw new Error('El archivo ' + file.path + ' no tiene URL de descarga.')
        }

        log('Descargando mod ' + done + '/' + files.length + ': ' + path.basename(file.path))
        await downloadFile(downloadUrl, targetPath, {
            minSize: file.fileSize || 1,
            downloadTitle: currentProject?.name || index.name || 'Modpack',
            phase: 'Descargando ' + path.basename(file.path),
            filesDone: done,
            filesTotal: files.length
        })
        downloadedCount += 1

        const validHash = await verifyHashIfPresent(targetPath, file.hashes)
        if (!validHash) {
            try { fs.unlinkSync(targetPath) } catch (e) {}
            throw new Error('Hash invalido descargando ' + file.path + '.')
        }

        sendDownloadActivity({
            phase: 'Procesando archivos',
            filesDone: done,
            filesTotal: files.length,
            modsDone: progress.mods,
            modsTotal: totals.mods,
            resourcepacksDone: progress.resourcepacks,
            resourcepacksTotal: totals.resourcepacks,
            configDone: progress.config,
            configTotal: totals.config
        })

        if (files.length) {
            setProgress(35 + Math.round((done / files.length) * 45))
        }
    }
    log('Cache del modpack: ' + available + ' archivos ya disponibles, ' + downloadedCount + ' nuevos, ' + modified + ' modificados.')
}

function getLoaderFromDependencies(dependencies = {}, project = {}) {
    if (dependencies['fabric-loader']) {
        return { loader: 'fabric', loaderVersion: dependencies['fabric-loader'] }
    }
    if (dependencies.neoforge) {
        return { loader: 'neoforge', loaderVersion: dependencies.neoforge }
    }
    if (dependencies.forge) {
        return { loader: 'forge', loaderVersion: dependencies.forge }
    }
    if (dependencies['quilt-loader']) {
        return { loader: 'quilt', loaderVersion: dependencies['quilt-loader'] }
    }

    return {
        loader: project.loader || 'fabric',
        loaderVersion: project.loader_version || project.fabric_version || ''
    }
}

async function installMrpack(zipPath, gamePath, project) {
    const zip = openValidatedZip(zipPath)
    const indexEntry = zip.getEntry('modrinth.index.json')

    if (!indexEntry) {
        log('Extrayendo paquete zip...')
        await zip.extractAllToAsync(gamePath, true, false)
        return {
            minecraftVersion: project.minecraft_version,
            loader: project.loader,
            loaderVersion: project.loader_version || project.fabric_version
        }
    }

    const index = JSON.parse(indexEntry.getData().toString('utf8'))
    const dependencies = index.dependencies || {}
    const minecraftVersion = dependencies.minecraft || project.minecraft_version
    const { loader, loaderVersion } = getLoaderFromDependencies(dependencies, project)

    log(`Procesando mrpack: Minecraft ${minecraftVersion}, ${loader} ${loaderVersion}`)
    copyMrpackFolder(zip, 'overrides', gamePath)
    copyMrpackFolder(zip, 'client-overrides', gamePath)
    await downloadMrpackFiles(index, gamePath)

    return { minecraftVersion, loader, loaderVersion }
}

async function installZip(zipPath, gamePath, project) {
    log('Extrayendo paquete zip...')
    const info = detectZipPackInfo(zipPath, project)
    if (info.requiresCurseForgeApi) {
        throw new Error('Este ZIP es un export de CurseForge incompleto: tiene manifest.json, pero no incluye los mods .jar. Exportalo con la carpeta mods completa o usa un pack .mrpack/Modrinth.')
    }
    const copyResult = await copyZipPackContents(zipPath, gamePath)
    log(`Paquete zip local extraido: ${copyResult.copied} archivos${copyResult.prefix ? ` desde ${copyResult.prefix}` : ''}.`)
    const installInfo = {
        minecraftVersion: info.minecraftVersion || project.minecraft_version,
        loader: info.loader || project.loader,
        loaderVersion: info.loaderVersion || project.loader_version || project.fabric_version
    }
    await ensureCommonFabricDependencies(gamePath, { ...project, minecraft_version: installInfo.minecraftVersion, loader: installInfo.loader, loader_version: installInfo.loaderVersion })
    return installInfo
}

function getForgeMavenVersion(mcVersion, loaderVersion) {
    if (!loaderVersion) return ''
    return loaderVersion.startsWith(`${mcVersion}-`) ? loaderVersion : `${mcVersion}-${loaderVersion}`
}

async function getNeoForgeVersions() {
    const response = await axios.get('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml', {
        responseType: 'text',
        timeout: 30000
    })
    return [...String(response.data).matchAll(/<version>([^<]+)<\/version>/g)].map((match) => match[1])
}

function sortLoaderVersions(a, b) {
    const parse = (value) => String(value).match(/\d+|[a-z]+/gi)?.map((part) => {
        const number = Number(part)
        return Number.isNaN(number) ? part : number
    }) || []
    const left = parse(a)
    const right = parse(b)
    const length = Math.max(left.length, right.length)

    for (let index = 0; index < length; index += 1) {
        const l = left[index]
        const r = right[index]
        if (l === undefined) return -1
        if (r === undefined) return 1
        if (typeof l === 'number' && typeof r === 'number' && l !== r) return l - r
        if (String(l) !== String(r)) return String(l).localeCompare(String(r))
    }

    return 0
}

async function resolveNeoForgeVersion(loaderVersion) {
    const requested = String(loaderVersion || '').trim()
    if (!requested) return ''

    const versions = await getNeoForgeVersions()
    if (versions.includes(requested)) return requested

    const betaVariant = `${requested}-beta`
    if (versions.includes(betaVariant)) {
        log(`NeoForge ${requested} no existe estable; usando ${betaVariant}.`)
        return betaVariant
    }

    const prefix = requested.replace(/(?:-beta|-alpha.*)$/i, '')
    const compatible = versions
        .filter((version) => version === prefix || version.startsWith(`${prefix}.`) || version.startsWith(`${prefix}-`))
        .sort(sortLoaderVersions)

    if (compatible.length) {
        const resolved = compatible[compatible.length - 1]
        log(`NeoForge ${requested} no existe; usando version compatible ${resolved}.`)
        return resolved
    }

    const family = requested.split('.').slice(0, 2).join('.')
    const familyVersions = versions
        .filter((version) => version.startsWith(`${family}.`))
        .sort(sortLoaderVersions)
        .slice(-6)

    throw new Error(`NeoForge ${requested} no existe en Maven. Prueba una version publicada como: ${familyVersions.join(', ') || 'revisa maven.neoforged.net'}.`)
}

function getLoaderInstallerInfo(loader, mcVersion, loaderVersion, basePath) {
    if (loader === 'forge') {
        const forgeVersion = getForgeMavenVersion(mcVersion, loaderVersion)
        return {
            version: forgeVersion,
            url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeVersion}/forge-${forgeVersion}-installer.jar`,
            file: path.join(basePath, 'loaders', `forge-${forgeVersion}-installer.jar`)
        }
    }

    if (loader === 'neoforge') {
        return {
            version: loaderVersion,
            url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`,
            file: path.join(basePath, 'loaders', `neoforge-${loaderVersion}-installer.jar`)
        }
    }

    return null
}

function runInstallerWithFallback(javaExe, installerFile, gamePath, loader) {
    const attempts = loader === 'forge'
        ? [
            ['-jar', installerFile, '--installClient', gamePath]
        ]
        : [
            ['-jar', installerFile, '--install-client', gamePath],
            ['-jar', installerFile, '--installClient', gamePath]
        ]

    let lastResult = null
    for (const installArgs of attempts) {
        const installResult = childProcess.spawnSync(javaExe, installArgs, {
            cwd: gamePath,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            windowsHide: true
        })

        lastResult = installResult
        if (!installResult.error && installResult.status === 0) {
            return installResult
        }
    }

    return lastResult
}

async function installLoader(basePath, gamePath, project) {
    const loader = String(project.loader || 'fabric').toLowerCase()
    const loaderVersion = project.loader_version || project.fabric_version

    if (loader === 'vanilla' || loader === 'none') return null

    if (!loaderVersion) {
        throw new Error(`Falta loader_version para ${loader}.`)
    }

    if (loader === 'fabric') {
        log(`Inyectando Fabric Loader (${loaderVersion})...`)
        await installFabric(gamePath, project.minecraft_version, loaderVersion)
        return {
            customVersion: `fabric-loader-${loaderVersion}-${project.minecraft_version}`,
            forgeInstaller: null,
            loader
        }
    }

    if (loader === 'forge' || loader === 'neoforge') {
        const resolvedLoaderVersion = loader === 'neoforge'
            ? await resolveNeoForgeVersion(loaderVersion)
            : loaderVersion
        project.loader_version = resolvedLoaderVersion
        if (loader === 'fabric') project.fabric_version = resolvedLoaderVersion

        const installer = getLoaderInstallerInfo(loader, project.minecraft_version, resolvedLoaderVersion, basePath)
        if (!installer.version) {
            throw new Error(`Version de ${loader} no configurada.`)
        }

        const existingProfile = project.loader_profile_id || findLatestLoaderProfile(gamePath, loader, project.minecraft_version, resolvedLoaderVersion)
        if (existingProfile && fs.existsSync(path.join(gamePath, 'versions', existingProfile, `${existingProfile}.json`))) {
            const corruptJars = findCorruptJars(path.join(gamePath, 'libraries'))
            if (!corruptJars.length) {
                return {
                    customVersion: existingProfile,
                    forgeInstaller: null,
                    loader
                }
            }

            log(`Se detectaron ${corruptJars.length} librerias jar corruptas. Reinstalando ${loader}...`)
            removeCorruptJars(corruptJars)
            try {
                fs.rmSync(path.join(gamePath, 'versions', existingProfile), { recursive: true, force: true })
                project.loader_profile_id = ''
            } catch (err) {
                log(`No se pudo limpiar el perfil ${existingProfile}: ${err.message}`)
            }
        }

        if (!fs.existsSync(installer.file)) {
            log(`Descargando ${loader} ${installer.version}...`)
            await downloadFile(installer.url, installer.file, { expectZip: true, minSize: 1000, progressStart: 80, progressEnd: 90 })
        }

        log(`Ejecutando instalador oficial de ${loader}...`)
        ensureLauncherProfiles(gamePath)
        const javaInfo = await resolveJavaPath(project, 80, 92)
        project._resolved_java_path = javaInfo.path
        log(`Usando Java ${javaInfo.major} para ${loader}${javaInfo.managed ? ' (portable)' : ''}.`)
        const javaExe = javaInfo.path
        const installResult = runInstallerWithFallback(javaExe, installer.file, gamePath, loader)

        if (installResult.error) {
            throw installResult.error
        }
        if (installResult.status !== 0) {
            const combinedOutput = [installResult.stdout, installResult.stderr].filter(Boolean).join('\n').trim()
            throw new Error(`El instalador de ${loader} fallo con codigo ${installResult.status}.${combinedOutput ? `\n${combinedOutput}` : ''}`)
        }

        const remainingCorruptJars = findCorruptJars(path.join(gamePath, 'libraries'))
        if (remainingCorruptJars.length) {
            throw new Error(`${loader} dejo ${remainingCorruptJars.length} librerias corruptas despues de instalar:\n${remainingCorruptJars.join('\n')}`)
        }

        const profileId = findLatestLoaderProfile(gamePath, loader, project.minecraft_version, resolvedLoaderVersion)
        if (!profileId) {
            throw new Error(`No se pudo detectar el perfil instalado de ${loader}.`)
        }

        project.loader_profile_id = profileId
        return {
            customVersion: profileId,
            forgeInstaller: null,
            loader
        }
    }

    throw new Error(`Loader no soportado: ${loader}. Usa fabric, forge, neoforge o vanilla.`)
}

async function fetchRemoteConfig() {
    let packagedContent = null
    try {
        packagedContent = readContentFile(LOCAL_CONTENT_FILE)
    } catch (err) {
        log(`Contenido incluido no disponible: ${err.message}`)
    }

    try {
        log('Sincronizando contenido central de Obsidian Studios...')
        const webConfig = await axios.get(getFreshConfigUrl(CONTENT_URL), {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0'
            },
            responseType: 'text',
            timeout: 20000
        })
        const rawData = webConfig.data
        const parsedConfig = typeof rawData === 'string' ? JSON.parse(rawData.trim()) : rawData
        const content = normalizeContentDocument(parsedConfig)
        remoteServerList = content.projects
        remoteNewsList = content.news
        contentSource = 'remote'
        fs.mkdirSync(DATA_DIR, { recursive: true })
        writeFileAtomic(CONTENT_CACHE_FILE, JSON.stringify(parsedConfig, null, 2))
        localServerList = readLocalInstances()
        refreshCombinedCatalog()
        log(`Contenido central sincronizado: ${remoteServerList.length} proyectos y ${remoteNewsList.length} noticias.`)
        return
    } catch (remoteErr) {
        log(`Fuente central no disponible: ${remoteErr.message}`)
    }

    try {
        const legacyResponse = await axios.get(getFreshConfigUrl(LEGACY_CONFIG_URL), {
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache', Expires: '0' },
            responseType: 'text',
            timeout: 15000
        })
        const legacyRaw = typeof legacyResponse.data === 'string' ? JSON.parse(legacyResponse.data.trim()) : legacyResponse.data
        const packagedNormalized = packagedContent ? normalizeContentDocument(packagedContent) : { projects: [], news: [] }
        remoteServerList = normalizeProjectList(legacyRaw).map((project) => {
            const baseline = packagedNormalized.projects.find((item) => item.id.toLowerCase() === project.id.toLowerCase() && item.modpack_url === project.modpack_url)
            return baseline ? { ...project, file_type: baseline.file_type, file_size: baseline.file_size, file_sha256: baseline.file_sha256 } : project
        })
        remoteNewsList = packagedNormalized.news
        contentSource = 'legacy-remote'
        localServerList = readLocalInstances()
        refreshCombinedCatalog()
        log(`Catalogo de compatibilidad sincronizado: ${remoteServerList.length} proyectos. Las claves publicas antiguas fueron ignoradas.`)
        return
    } catch (legacyErr) {
        log(`Catalogo de compatibilidad no disponible: ${legacyErr.message}`)
    }

    const fallbackSources = [
        { name: 'cache', file: CONTENT_CACHE_FILE },
        { name: 'packaged', file: LOCAL_CONTENT_FILE }
    ]
    for (const source of fallbackSources) {
        try {
            const content = normalizeContentDocument(readContentFile(source.file))
            remoteServerList = content.projects
            remoteNewsList = content.news
            contentSource = source.name
            localServerList = readLocalInstances()
            refreshCombinedCatalog()
            log(`Contenido recuperado desde ${source.name}: ${remoteServerList.length} proyectos y ${remoteNewsList.length} noticias.`)
            return
        } catch (fallbackErr) {
            log(`No se pudo leer ${source.name}: ${fallbackErr.message}`)
        }
    }

    remoteServerList = readLocalConfig()
    remoteNewsList = []
    contentSource = 'legacy-local'
    localServerList = readLocalInstances()
    refreshCombinedCatalog()
    log('Se uso el catalogo local de emergencia sin noticias dinamicas.')
}

ipcMain.on('refresh-catalog', async () => {
    await fetchRemoteConfig()
})

ipcMain.on('check-launcher-update', async () => {
    await checkLauncherUpdates({ manual: true })
})

ipcMain.on('download-and-install-launcher-update', async (event, updatePayload = {}) => {
    if (launcherUpdateInProgress) return
    launcherUpdateInProgress = true
    try {
        if (updatePayload?.provider === 'electron-updater') {
            if (!app.isPackaged) throw new Error('Las actualizaciones integradas solo se instalan desde una compilacion instalada.')
            if (launcherUpdateReady || updatePayload.ready_to_install) {
                log('Reiniciando para instalar la actualizacion verificada...')
                sendToRenderer('launcher-update-installing', activeLauncherUpdate || updatePayload)
                setTimeout(() => autoUpdater.quitAndInstall(false, true), 250)
                return
            }
            activeLauncherUpdate = { ...updatePayload, provider: 'electron-updater' }
            log(`Descargando actualizacion del launcher v${updatePayload.latest_version} mediante el actualizador integrado...`)
            sendToRenderer('launcher-update-download-started', activeLauncherUpdate)
            await autoUpdater.downloadUpdate()
            return
        }

        const update = normalizeLauncherUpdate(activeLauncherUpdate)
        if (!update) throw new Error('No se pudo leer la informacion de actualizacion.')
        if (!isNewerVersion(update.latest_version, update.current_version)) {
            sendToRenderer('launcher-update-current', update)
            return
        }
        log(`Descargando actualizacion del launcher v${update.latest_version}...`)
        sendToRenderer('launcher-update-download-started', update)
        const installerPath = await downloadLauncherUpdateInstaller(update)
        runLauncherUpdateInstaller(installerPath, update)
    } catch (err) {
        log(`No se pudo actualizar automaticamente el launcher: ${err.message}`)
        sendToRenderer('launcher-update-error', { message: err.message })
    } finally {
        launcherUpdateInProgress = false
    }
})

ipcMain.on('create-local-instance', (event, options = {}) => {
    try {
        const project = createEmptyLocalProject(options)
        localServerList = readLocalInstances()
        localServerList.push(project)
        saveLocalInstances(localServerList)
        refreshCombinedCatalog()
        event.reply('local-pack-imported', project)
        log('Instancia local creada: ' + project.name)
    } catch (err) {
        event.reply('local-pack-import-error', { message: err.message })
        log('No se pudo crear la instancia local: ' + err.message)
    }
})

ipcMain.on('import-local-pack', async (event, options = {}) => {
    try {
        const result = await dialog.showOpenDialog(win, {
            title: 'Importar modpack local',
            properties: ['openFile'],
            filters: [{ name: 'Modpacks locales', extensions: ['zip', 'mrpack'] }]
        })
        if (result.canceled || !result.filePaths?.[0]) return
        const imported = importLocalPackFiles([result.filePaths[0]], options)
        event.reply('local-pack-imported', imported[0] || null)
    } catch (err) {
        log('No se pudo importar el modpack local: ' + err.message)
        event.reply('local-pack-import-error', { message: err.message })
    }
})
ipcMain.on('get-local-instances', () => {
    localServerList = readLocalInstances()
    refreshCombinedCatalog()
})


function importLocalPackFiles(filePaths = [], options = {}) {
    const imported = []
    for (const filePath of filePaths) {
        const fullPath = String(filePath || '').trim()
        if (!fullPath) continue
        const project = createLocalProjectFromFile(fullPath, options)
        localServerList = readLocalInstances()
        localServerList.push(project)
        saveLocalInstances(localServerList)
        imported.push(project)
        log('Modpack local importado: ' + project.name)
    }
    refreshCombinedCatalog()
    return imported
}

ipcMain.on('import-local-pack-files', (event, data = {}) => {
    try {
        const filePaths = Array.isArray(data.filePaths) ? data.filePaths : []
        const imported = importLocalPackFiles(filePaths, data.options || {})
        event.reply('local-pack-imported', imported[0] || null)
    } catch (err) {
        event.reply('local-pack-import-error', { message: err.message })
        log('Error importando modpack local: ' + err.message)
    }
})

ipcMain.on('delete-local-instance', (event, projectId) => {
    try {
        const id = String(projectId || '')
        localServerList = readLocalInstances()
        const project = localServerList.find((item) => item.id === id)
        localServerList = localServerList.filter((item) => item.id !== id)
        saveLocalInstances(localServerList)
        if (project?.local_pack_path && fs.existsSync(project.local_pack_path)) {
            try { fs.unlinkSync(project.local_pack_path) } catch (err) { log('No se pudo borrar pack local: ' + err.message) }
        }
        if (project?.local_image_path && fs.existsSync(project.local_image_path)) {
            try { fs.unlinkSync(project.local_image_path) } catch (err) {}
        }
        if (project) {
            const instancePath = getInstanceBasePath(project)
            if (isInside(DATA_DIR, instancePath) && fs.existsSync(instancePath)) {
                try { fs.rmSync(instancePath, { recursive: true, force: true }) } catch (err) { log('No se pudo borrar carpeta de instancia local: ' + err.message) }
            }
        }
        if (currentProject?.id === id) currentProject = null
        refreshCombinedCatalog()
        event.reply('local-instance-deleted', { id })
        log('Instancia local quitada del launcher: ' + (project?.name || id) + '.')
    } catch (err) {
        event.reply('local-pack-import-error', { message: err.message })
    }
})

function findCatalogProject(projectId) {
    const id = String(projectId || '')
    return cachedServerList.find((item) => item.id === id) || localServerList.find((item) => item.id === id) || (!id || currentProject?.id === id ? currentProject : null)
}

function updateLocalProjectConfig(projectId, updates = {}) {
    const id = String(projectId || '')
    localServerList = readLocalInstances()
    const index = localServerList.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('No se encontro la instancia local seleccionada.')
    const existing = localServerList[index]
    const loader = String(updates.loader ?? existing.loader ?? '').trim().toLowerCase()
    const next = normalizeProject({
        ...existing,
        name: String(updates.name ?? existing.name ?? '').trim() || existing.name,
        description: String(updates.description ?? existing.description ?? '').trim() || existing.description,
        minecraft_version: String(updates.minecraft_version ?? existing.minecraft_version ?? '').trim(),
        loader,
        loader_version: String(updates.loader_version ?? existing.loader_version ?? '').trim(),
        fabric_version: loader === 'fabric' ? String(updates.loader_version ?? existing.loader_version ?? '').trim() : '',
        status: ''
    }, 0, { trustedLocal: true })
    const needsConfig = !next.minecraft_version || (!next.loader && next.loader !== 'vanilla') || (next.loader && next.loader !== 'vanilla' && !next.loader_version)
    next.status = existing.requires_curseforge_api ? 'needs_curseforge_api' : (needsConfig ? 'needs_config' : '')
    localServerList[index] = next
    saveLocalInstances(localServerList)
    if (currentProject?.id === id) currentProject = { ...currentProject, ...next }
    refreshCombinedCatalog()
    return next
}

function getInstanceAssetTarget(project, kind) {
    if (!project?.id) throw new Error('Selecciona una instancia primero.')
    const map = { mods: 'mods', shaders: 'shaderpacks', resourcepacks: 'resourcepacks', textures: 'resourcepacks', config: 'config' }
    const folder = map[String(kind || '').toLowerCase()]
    if (!folder) throw new Error('Tipo de archivo no valido.')
    const target = path.join(getInstanceBasePath(project), 'game', folder)
    fs.mkdirSync(target, { recursive: true })
    return target
}

function getLocalAssetTarget(project, kind) {
    return getInstanceAssetTarget(project, kind)
}

function copyLocalAssetFiles(project, kind, filePaths = []) {
    const target = getInstanceAssetTarget(project, kind)
    let copied = 0
    for (const rawPath of filePaths) {
        const source = String(rawPath || '')
        if (!source || !fs.existsSync(source)) continue
        const stat = fs.statSync(source)
        if (stat.isDirectory()) continue
        const destination = safeJoin(target, path.basename(source))
        fs.copyFileSync(source, destination)
        copied += 1
    }
    return { copied, target }
}

function getModrinthHeaders() {
    return { 'User-Agent': 'ObsidianStudiosLauncher/' + app.getVersion() + ' (modrinth-local-workshop)' }
}

function modrinthTargetFolder(projectType) {
    const type = String(projectType || 'mod').toLowerCase()
    if (type === 'resourcepack') return 'resourcepacks'
    if (type === 'shader') return 'shaderpacks'
    return 'mods'
}

async function getCompatibleModrinthVersion(projectSlug, project = {}, projectType = 'mod') {
    const loader = String(project.loader || '').toLowerCase()
    const minecraftVersion = String(project.minecraft_version || '').trim()
    if (!minecraftVersion && projectType !== 'modpack') throw new Error('Configura primero la version de Minecraft de la instancia local.')
    const params = { include_changelog: false }
    if (minecraftVersion) params.game_versions = JSON.stringify([minecraftVersion])
    if ((projectType === 'mod' || projectType === 'modpack') && loader && loader !== 'vanilla') params.loaders = JSON.stringify([loader])
    const response = await axios.get(MODRINTH_API_URL + '/project/' + encodeURIComponent(projectSlug) + '/version', { params, headers: getModrinthHeaders(), timeout: 30000 })
    const versions = Array.isArray(response.data) ? response.data : []
    return versions.find((version) => version.version_type === 'release') || versions[0] || null
}

async function downloadModrinthVersionFile(project, version, projectType = 'mod') {
    const file = version.files?.find((candidate) => candidate.primary) || version.files?.[0]
    if (!file?.url || !file?.filename) throw new Error('La version compatible no tiene archivo descargable.')
    const folder = modrinthTargetFolder(projectType)
    const targetDir = path.join(getInstanceBasePath(project), 'game', folder)
    fs.mkdirSync(targetDir, { recursive: true })
    const targetPath = safeJoin(targetDir, file.filename)
    await downloadFile(file.url, targetPath, { progressStart: 0, progressEnd: 100 })
    return { file: file.filename, folder }
}

async function installModrinthWithDependencies(project, projectSlug, projectType = 'mod', seen = new Set()) {
    const key = String(projectSlug || '').toLowerCase()
    if (!key || seen.has(key)) return []
    seen.add(key)
    const version = await getCompatibleModrinthVersion(projectSlug, project, projectType)
    if (!version) throw new Error('No encontre una version compatible con esta instancia.')
    const installed = [await downloadModrinthVersionFile(project, version, projectType)]
    const dependencies = Array.isArray(version.dependencies) ? version.dependencies : []
    for (const dependency of dependencies) {
        if (dependency.dependency_type !== 'required' || !dependency.project_id) continue
        try {
            const dependencyFiles = await installModrinthWithDependencies(project, dependency.project_id, 'mod', seen)
            installed.push(...dependencyFiles)
        } catch (err) {
            log('No se pudo instalar una dependencia requerida de Modrinth: ' + err.message)
        }
    }
    return installed
}

ipcMain.on('update-local-instance', (event, data = {}) => {
    try {
        const project = updateLocalProjectConfig(data.projectId, data.updates || {})
        event.reply('local-instance-updated', project)
        log('Configuracion local guardada: ' + project.name)
    } catch (err) {
        event.reply('local-pack-import-error', { message: err.message })
        log('No se pudo guardar la configuracion local: ' + err.message)
    }
})

ipcMain.on('choose-instance-assets', async (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        if (!project?.id) throw new Error('Selecciona una instancia primero.')
        const kind = String(data.kind || 'mods')
        const filters = kind === 'mods'
            ? [{ name: 'Mods Java', extensions: ['jar'] }]
            : kind === 'shaders'
                ? [{ name: 'Shaders', extensions: ['zip'] }]
                : kind === 'resourcepacks' || kind === 'textures'
                    ? [{ name: 'Resource packs', extensions: ['zip'] }]
                    : [{ name: 'Archivos', extensions: ['*'] }]
        const result = await dialog.showOpenDialog(win, { title: 'Agregar archivos a instancia', properties: ['openFile', 'multiSelections'], filters })
        if (result.canceled) return
        const copied = copyLocalAssetFiles(project, kind, result.filePaths || [])
        event.reply('instance-assets-added', { projectId: project.id, kind, ...copied, content: listInstanceContentFiles(project) })
        log('Archivos agregados a ' + project.name + ': ' + copied.copied + ' (' + kind + ').')
    } catch (err) {
        event.reply('instance-content-info', { projectId: data.projectId, error: err.message, content: {} })
        log('No se pudieron agregar archivos a instancia: ' + err.message)
    }
})

ipcMain.on('choose-local-assets', async (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        if (!project?.local) throw new Error('Selecciona una instancia local primero.')
        const kind = String(data.kind || 'mods')
        const filters = kind === 'mods'
            ? [{ name: 'Mods Java', extensions: ['jar'] }]
            : kind === 'shaders'
                ? [{ name: 'Shaders', extensions: ['zip'] }]
                : kind === 'resourcepacks' || kind === 'textures'
                    ? [{ name: 'Resource packs', extensions: ['zip'] }]
                    : [{ name: 'Archivos', extensions: ['*'] }]
        const result = await dialog.showOpenDialog(win, { title: 'Agregar archivos a instancia local', properties: ['openFile', 'multiSelections'], filters })
        if (result.canceled) return
        const copied = copyLocalAssetFiles(project, kind, result.filePaths || [])
        event.reply('local-assets-added', { projectId: project.id, kind, ...copied, content: listInstanceContentFiles(project) })
        log('Archivos agregados a ' + project.name + ': ' + copied.copied + ' (' + kind + ').')
    } catch (err) {
        event.reply('local-pack-import-error', { message: err.message })
        log('No se pudieron agregar archivos locales: ' + err.message)
    }
})

ipcMain.on('modrinth-search', async (event, data = {}) => {
    try {
        const query = String(data.query || '').trim()
        if (!query) throw new Error('Escribe que quieres buscar en Modrinth.')
        const project = findCatalogProject(data.projectId) || {
            minecraft_version: String(data.minecraft_version || '').trim(),
            loader: String(data.loader || '').trim().toLowerCase()
        }
        const type = String(data.projectType || 'mod').toLowerCase()
        const facets = [['project_type:' + type]]
        if (project.minecraft_version) facets.push(['versions:' + project.minecraft_version])
        if ((type === 'mod' || type === 'modpack') && project.loader && project.loader !== 'vanilla') facets.push(['categories:' + project.loader])
        const response = await axios.get(MODRINTH_API_URL + '/search', {
            params: { query, limit: 12, facets: JSON.stringify(facets) },
            headers: getModrinthHeaders(),
            timeout: 30000
        })
        const items = (response.data?.hits || []).map((item) => ({
            project_id: item.project_id,
            slug: item.slug,
            title: item.title,
            description: item.description,
            icon_url: item.icon_url || '',
            project_type: item.project_type || type,
            downloads: item.downloads || 0
        }))
        event.reply('modrinth-search-results', { items })
    } catch (err) {
        event.reply('modrinth-search-results', { error: err.message, items: [] })
        log('Error buscando en Modrinth: ' + err.message)
    }
})

ipcMain.on('modrinth-install-project', async (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        if (!project?.local) throw new Error('Selecciona una instancia local para instalar contenido de Modrinth.')
        if (!project.minecraft_version || (!project.loader && project.loader !== 'vanilla')) throw new Error('Configura Minecraft y loader antes de instalar desde Modrinth.')
        const projectSlug = String(data.slug || data.project_id || '').trim()
        if (!projectSlug) throw new Error('Proyecto de Modrinth invalido.')
        const projectType = String(data.projectType || 'mod').toLowerCase()
        log('Descargando desde Modrinth: ' + (data.title || projectSlug) + '.')
        const installedFiles = await installModrinthWithDependencies(project, projectSlug, projectType)
        event.reply('modrinth-install-complete', { projectId: project.id, title: data.title || projectSlug, installed: installedFiles.length, file: installedFiles[0]?.file || '', folder: installedFiles[0]?.folder || '', content: listLocalContentFiles(project) })
        log('Modrinth instalado: ' + installedFiles.length + ' archivo(s), incluyendo dependencias requeridas detectadas.')
    } catch (err) {
        event.reply('modrinth-install-error', { message: err.message })
        log('No se pudo instalar desde Modrinth: ' + err.message)
    }
})

ipcMain.on('modrinth-install-modpack', async (event, data = {}) => {
    try {
        const projectSlug = String(data.slug || data.project_id || '').trim()
        if (!projectSlug) throw new Error('Modpack de Modrinth invalido.')
        const filterProject = {
            minecraft_version: String(data.minecraft_version || '').trim(),
            loader: String(data.loader || '').trim().toLowerCase()
        }
        const version = await getCompatibleModrinthVersion(projectSlug, filterProject, 'modpack')
        if (!version) throw new Error('No encontre una version compatible para ese modpack.')
        const file = version.files?.find((candidate) => candidate.primary && /\.mrpack$/i.test(candidate.filename || '')) ||
            version.files?.find((candidate) => /\.mrpack$/i.test(candidate.filename || '')) ||
            version.files?.[0]
        if (!file?.url || !file?.filename) throw new Error('La version compatible no tiene archivo descargable.')
        if (!fs.existsSync(LOCAL_PACKS_DIR)) fs.mkdirSync(LOCAL_PACKS_DIR, { recursive: true })
        const targetId = `modrinth-${slugify(data.title || projectSlug, 'modpack')}-${Date.now()}`
        const targetPath = path.join(LOCAL_PACKS_DIR, targetId + (path.extname(file.filename) || '.mrpack'))
        log('Descargando modpack de Modrinth: ' + (data.title || projectSlug) + '.')
        await downloadFile(file.url, targetPath, { expectZip: true, minSize: 1000, progressStart: 0, progressEnd: 100 })
        const project = createLocalProjectFromFile(targetPath, {
            name: data.title || '',
            description: data.description || 'Modpack de comunidad importado desde Modrinth.',
            minecraft_version: filterProject.minecraft_version,
            loader: filterProject.loader,
            project_version: version.version_number ? String(version.version_number) + '-modrinth' : '1.0.0-modrinth'
        })
        if (data.icon_url && !project.bg_image) project.bg_image = data.icon_url
        project.source = 'modrinth'
        project.modrinth_slug = projectSlug
        project.modrinth_version = version.version_number || ''
        localServerList = readLocalInstances()
        localServerList.push(project)
        saveLocalInstances(localServerList)
        refreshCombinedCatalog()
        event.reply('modrinth-modpack-imported', project)
        log('Modpack de comunidad agregado a Local: ' + project.name)
    } catch (err) {
        event.reply('modrinth-install-error', { message: err.message })
        log('No se pudo importar modpack desde Modrinth: ' + err.message)
    }
})


function listInstanceContentFiles(project) {
    if (!project?.id) return {}
    const root = path.join(getInstanceBasePath(project), 'game')
    const groups = {
        mods: path.join(root, 'mods'),
        shaders: path.join(root, 'shaderpacks'),
        resourcepacks: path.join(root, 'resourcepacks'),
        config: path.join(root, 'config')
    }
    const result = {}
    for (const [kind, dir] of Object.entries(groups)) {
        result[kind] = readDirEntries(dir)
            .filter((entry) => entry.isFile())
            .filter((entry) => kind === 'config' || /\.(jar|zip|disabled)$/i.test(entry.name))
            .map((entry) => {
                const fullPath = path.join(dir, entry.name)
                let stat = null
                try { stat = fs.statSync(fullPath) } catch (err) {}
                return { name: entry.name, kind, size: stat?.size || 0, modifiedAt: stat?.mtimeMs || 0, disabled: /\.disabled$/i.test(entry.name) }
            })
            .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name))
    }
    return result
}

function listLocalContentFiles(project) {
    return project?.local ? listInstanceContentFiles(project) : {}
}

function deleteInstanceContentFile(project, kind, fileName) {
    if (!project?.id) throw new Error('Selecciona una instancia primero.')
    const targetDir = getInstanceAssetTarget(project, kind)
    const target = safeJoin(targetDir, path.basename(String(fileName || '')))
    if (!isInside(targetDir, target) || !fs.existsSync(target)) throw new Error('No se encontro el archivo seleccionado.')
    fs.unlinkSync(target)
}

function deleteLocalContentFile(project, kind, fileName) {
    if (!project?.local) throw new Error('Selecciona una instancia local primero.')
    deleteInstanceContentFile(project, kind, fileName)
}

function toggleInstanceContentFile(project, kind, fileName) {
    if (!project?.id) throw new Error('Selecciona una instancia primero.')
    if (String(kind || '').toLowerCase() === 'config') throw new Error('Los archivos de config se editan manualmente para evitar romper la instancia.')
    const targetDir = getInstanceAssetTarget(project, kind)
    const source = safeJoin(targetDir, path.basename(String(fileName || '')))
    if (!isInside(targetDir, source) || !fs.existsSync(source)) throw new Error('No se encontro el archivo seleccionado.')
    const disabled = /\.disabled$/i.test(source)
    const destination = disabled ? source.replace(/\.disabled$/i, '') : source + '.disabled'
    if (fs.existsSync(destination)) throw new Error('Ya existe un archivo con ese nombre de destino.')
    fs.renameSync(source, destination)
    return path.basename(destination)
}

function copyRecursive(source, destination) {
    if (!fs.existsSync(source)) return 0
    const stat = fs.statSync(source)
    let copied = 0
    if (stat.isDirectory()) {
        fs.mkdirSync(destination, { recursive: true })
        for (const entry of readDirEntries(source)) copied += copyRecursive(path.join(source, entry.name), path.join(destination, entry.name))
        return copied
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(source, destination)
    return 1
}

function getConfigPresetItems(groups = []) {
    const wanted = new Set(Array.isArray(groups) && groups.length ? groups : ['options', 'config'])
    const items = []
    if (wanted.has('options')) items.push(['options.txt', 'options.txt'], ['optionsof.txt', 'optionsof.txt'])
    if (wanted.has('config')) items.push(['config', 'config'])
    if (wanted.has('resourcepacks')) items.push(['resourcepacks', 'resourcepacks'])
    if (wanted.has('shaders')) items.push(['shaderpacks', 'shaderpacks'])
    if (wanted.has('servers')) items.push(['servers.dat', 'servers.dat'])
    if (wanted.has('kubejs')) items.push(['kubejs', 'kubejs'], ['defaultconfigs', 'defaultconfigs'])
    return items
}

function importConfigPresetFromInstance(sourceProject, targetProject, groups = []) {
    const sourceGame = path.join(getInstanceBasePath(sourceProject), 'game')
    const targetGame = path.join(getInstanceBasePath(targetProject), 'game')
    fs.mkdirSync(targetGame, { recursive: true })
    let copied = 0
    for (const [sourceRelative, targetRelative] of getConfigPresetItems(groups)) copied += copyRecursive(path.join(sourceGame, sourceRelative), path.join(targetGame, targetRelative))
    return copied
}

function importConfigPresetFromArchive(archivePath, targetProject, groups = []) {
    const zip = openValidatedZip(archivePath)
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory)
    const prefix = findZipContentRoot(zip) || ''
    const targetGame = path.join(getInstanceBasePath(targetProject), 'game')
    fs.mkdirSync(targetGame, { recursive: true })
    const allowed = getConfigPresetItems(groups).map(([sourceRelative, targetRelative]) => ({ source: sourceRelative.replace(/\\/g, '/'), target: targetRelative }))
    let copied = 0
    for (const entry of entries) {
        let name = entry.entryName.replace(/\\/g, '/')
        if (prefix && name.startsWith(prefix)) name = name.slice(prefix.length)
        if (!name || name.startsWith('__MACOSX/')) continue
        const match = allowed.find((item) => name === item.source || name.startsWith(item.source + '/'))
        if (!match) continue
        const relativeTail = name === match.source ? path.basename(match.target) : name.slice(match.source.length + 1)
        const destRelative = name === match.source ? match.target : path.posix.join(match.target, relativeTail)
        const dest = safeJoin(targetGame, destRelative)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.writeFileSync(dest, entry.getData())
        copied += 1
    }
    return copied
}

ipcMain.on('get-instance-content', (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        event.reply('instance-content-info', { projectId: project?.id || data.projectId, content: listInstanceContentFiles(project) })
    } catch (err) {
        event.reply('instance-content-info', { projectId: data.projectId, error: err.message, content: {} })
    }
})

ipcMain.on('toggle-instance-content-file', (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        const nextName = toggleInstanceContentFile(project, data.kind, data.fileName)
        event.reply('instance-content-info', { projectId: project.id, content: listInstanceContentFiles(project), message: 'Archivo actualizado: ' + nextName })
        log('Archivo de instancia alternado: ' + data.fileName + ' -> ' + nextName)
    } catch (err) {
        event.reply('instance-content-info', { projectId: data.projectId, error: err.message, content: {} })
        log('No se pudo alternar archivo de instancia: ' + err.message)
    }
})

ipcMain.on('delete-instance-content-file', (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        deleteInstanceContentFile(project, data.kind, data.fileName)
        event.reply('instance-content-info', { projectId: project.id, content: listInstanceContentFiles(project), message: 'Archivo eliminado: ' + data.fileName })
        log('Archivo quitado de instancia: ' + data.fileName)
    } catch (err) {
        event.reply('instance-content-info', { projectId: data.projectId, error: err.message, content: {} })
        log('No se pudo quitar archivo de instancia: ' + err.message)
    }
})

ipcMain.on('get-local-content', (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        event.reply('local-content-info', { projectId: project?.id || data.projectId, content: listLocalContentFiles(project) })
    } catch (err) {
        event.reply('local-content-info', { projectId: data.projectId, error: err.message, content: {} })
    }
})

ipcMain.on('delete-local-content-file', (event, data = {}) => {
    try {
        const project = findCatalogProject(data.projectId)
        deleteLocalContentFile(project, data.kind, data.fileName)
        event.reply('local-content-info', { projectId: project.id, content: listLocalContentFiles(project) })
        log('Archivo quitado de instancia local: ' + data.fileName)
    } catch (err) {
        event.reply('local-pack-import-error', { message: err.message })
        log('No se pudo quitar archivo local: ' + err.message)
    }
})

ipcMain.on('import-minecraft-config-preset', async (event, data = {}) => {
    try {
        const targetProject = findCatalogProject(data.targetProjectId)
        if (!targetProject?.id) throw new Error('Selecciona una instancia destino.')
        const groups = Array.isArray(data.groups) ? data.groups : []
        let copied = 0
        if (data.mode === 'instance') {
            const sourceProject = findCatalogProject(data.sourceProjectId)
            if (!sourceProject?.id) throw new Error('Selecciona una instancia origen.')
            if (sourceProject.id === targetProject.id) throw new Error('El origen y destino deben ser distintos.')
            copied = importConfigPresetFromInstance(sourceProject, targetProject, groups)
            log('Preset de Minecraft importado desde ' + sourceProject.name + ' hacia ' + targetProject.name + ': ' + copied + ' archivos.')
        } else {
            const result = await dialog.showOpenDialog(win, { title: 'Importar preset de Minecraft', properties: ['openFile'], filters: [{ name: 'Modpacks', extensions: ['zip', 'mrpack'] }] })
            if (result.canceled || !result.filePaths?.[0]) return
            copied = importConfigPresetFromArchive(result.filePaths[0], targetProject, groups)
            log('Preset de Minecraft importado desde archivo hacia ' + targetProject.name + ': ' + copied + ' archivos.')
        }
        event.reply('minecraft-config-imported', { projectId: targetProject.id, copied, message: 'Preset importado: ' + copied + ' archivos.' })
    } catch (err) {
        event.reply('minecraft-config-imported', { projectId: data.targetProjectId, error: err.message })
        log('No se pudo importar preset de Minecraft: ' + err.message)
    }
})

ipcMain.on('refresh-minecraft-profile', async () => {
    try {
        if (!minecraftProfile) loadMinecraftProfile()
        if (minecraftProfile?.mode === 'premium' && minecraftProfile?.microsoftRefreshToken) {
            await refreshMicrosoftProfile()
            log('Perfil y skin de Microsoft actualizados.')
            return
        }
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
        log('Perfil local actualizado.')
    } catch (err) {
        log(`No se pudo actualizar el perfil de Minecraft: ${formatMicrosoftError(err)}`)
    }
})

ipcMain.on('recheck-discord-access', async (event, data = {}) => {
    const requestId = Number(data.requestId || 0)
    if (requestId) latestAccessRequestId = requestId
    const project = cachedServerList.find((server) => server.id === data.serverId) || currentProject
    if (!project) {
        log('Selecciona una instancia antes de comprobar el acceso.')
        return
    }
    const responseMeta = { serverId: project.id, requestId }
    if (!discordUser) {
        log('Discord no esta vinculado. Pulsa Vincular Discord e inicia sesion otra vez.')
        event.reply('access-denied', responseMeta)
        return
    }
    log(`Comprobando acceso en servidor ${project.discord_guild_id || DISCORD_GUILD_ID} para [${project.name}]...`)
    const hasRole = await validateDiscordRole(project)
    if (requestId && requestId !== latestAccessRequestId) return
    if (hasRole === null) {
        event.reply('access-check-delayed', responseMeta)
        return
    }
    if (hasRole) {
        currentProject = project
        const instanceState = getInstanceState(project)
        event.reply('access-granted', { project, ...instanceState, ...responseMeta })
        return
    }
    event.reply('access-denied', responseMeta)
})

ipcMain.on('request-server-access', async (event, data) => {
    const { serverId, password } = data
    const requestId = Number(data.requestId || 0)
    if (requestId) latestAccessRequestId = requestId
    const project = cachedServerList.find((server) => server.id === serverId)
    if (!project) return

    let hasAccess = false
    let method = ''

    if (!project.codigo_acceso && !project.discord_role_id) {
        hasAccess = true
        method = 'Acceso libre'
    } else if (password && project.codigo_acceso === password) {
        hasAccess = true
        method = 'Clave privada'
    } else {
        const roleResult = await validateDiscordRole(project)
        if (roleResult === null) {
            if (!requestId || requestId === latestAccessRequestId) {
                event.reply('access-check-delayed', { serverId: project.id, requestId })
            }
            return
        }
        if (roleResult) {
            hasAccess = true
            method = 'Rol de Discord'
        }
    }

    if (requestId && requestId !== latestAccessRequestId) return
    const responseMeta = { serverId: project.id, requestId }

    if (hasAccess) {
        currentProject = project
        const instanceState = getInstanceState(project)
        log(`Conectado con exito a [${project.name}] via ${method}.`)
        if (instanceState.isUpdateAvailable) {
            log(`Actualizacion disponible para [${project.name}]: ${instanceState.installedVersion} -> ${instanceState.projectVersion}.`)
        }
        event.reply('access-granted', { project, ...instanceState, ...responseMeta })
    } else {
        log(`Contrasena incorrecta o credenciales insuficientes para [${project.name}].`)
        event.reply('access-denied', responseMeta)
    }
})

async function completeDiscordLogin(accessToken) {
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })

    const user = userResponse.data
    discordRoleCache.clear()
    discordRoleRequests.clear()
    discordUser = {
        id: user.id,
        username: user.username,
        global_name: user.global_name,
        avatar: user.avatar,
        avatarUrl: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : '',
        accessToken
    }

    saveSecureJson(SESSION_FILE, discordUser)
    sendToRenderer('discord-login-success', discordUser)
    log(`Discord vinculado: ${discordUser.global_name || discordUser.username}`)

    try {
        const memberResponse = await axios.get(
            `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${discordUser.accessToken}` } }
        )
        const detectedRoles = Array.isArray(memberResponse.data.roles) ? memberResponse.data.roles : []
        log(`Servidor Discord verificado (${DISCORD_GUILD_ID}). Roles detectados: ${detectedRoles.join(', ') || 'ninguno'}.`)
    } catch (err) {
        log(`No se pudo verificar la membresia en el servidor nuevo (${DISCORD_GUILD_ID}). Vuelve a vincular Discord y confirma que estas dentro del servidor. HTTP: ${err.response?.status || 'sin respuesta'}.`)
    }
}

function createDiscordCallbackPage() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Obsidian Launcher</title>
    <style>
        body {
            align-items: center;
            background: #101217;
            color: #f5f7fb;
            display: flex;
            font-family: Segoe UI, Arial, sans-serif;
            height: 100vh;
            justify-content: center;
            margin: 0;
        }
        main { max-width: 420px; padding: 32px; text-align: center; }
        h1 { font-size: 24px; margin: 0 0 10px; }
        p { color: #9aa3b2; line-height: 1.5; }
    </style>
</head>
<body>
    <main>
        <h1>Discord conectado</h1>
        <p>Ya puedes volver a Obsidian Launcher. Esta pestana se cerrara automaticamente.</p>
    </main>
    <script>
        const params = new URLSearchParams(location.hash.slice(1));
        const token = params.get('access_token');
        if (token) {
            fetch('/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: token })
            }).finally(() => setTimeout(() => window.close(), 800));
        } else {
            document.querySelector('p').textContent = 'No se recibio token de Discord.';
        }
    </script>
</body>
</html>`
}

function stopDiscordCallbackServer() {
    if (discordCallbackTimer) {
        clearTimeout(discordCallbackTimer)
        discordCallbackTimer = null
    }

    if (discordCallbackServer) {
        try { discordCallbackServer.close() } catch (e) {}
        discordCallbackServer = null
    }
}

function openDiscordAuthUrl() {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=token&scope=identify%20guilds.members.read&prompt=consent`
    openExternalSafe(authUrl).catch((err) => log(`No se pudo abrir Discord: ${err.message}`))
}

ipcMain.on('login-discord', () => {
    log('Abriendo Discord en tu navegador...')

    if (discordCallbackServer?.listening) {
        openDiscordAuthUrl()
        log(`Callback local ya activo. Redirect URI: ${DISCORD_REDIRECT_URI}`)
        return
    }

    const server = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url.startsWith('/callback')) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(createDiscordCallbackPage())
            return
        }

        if (req.method === 'POST' && req.url === '/token') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
                try {
                    const { accessToken } = JSON.parse(body)
                    await completeDiscordLogin(accessToken)
                    res.writeHead(204)
                    res.end()
                } catch (err) {
                    log(`Fallo la vinculacion con Discord: ${err.message}`)
                    res.writeHead(500)
                    res.end('Error')
                } finally {
                    setTimeout(stopDiscordCallbackServer, 1000)
                }
            })
            return
        }

        res.writeHead(404)
        res.end('Not found')
    })

    discordCallbackServer = server

    server.listen(DISCORD_REDIRECT_PORT, '127.0.0.1', () => {
        openDiscordAuthUrl()
        log(`Si Discord rechaza el login, registra este Redirect URI: ${DISCORD_REDIRECT_URI}`)
        discordCallbackTimer = setTimeout(() => {
            stopDiscordCallbackServer()
            log('Callback local de Discord cerrado por tiempo de espera.')
        }, 180000)
    })

    server.on('error', (err) => {
        discordCallbackServer = null
        if (err.code === 'EADDRINUSE') {
            log(`El callback de Discord ya esta ocupado en ${DISCORD_REDIRECT_URI}. Cierra otra ventana del launcher o espera un minuto y vuelve a intentar.`)
            return
        }
        log(`No se pudo iniciar callback local de Discord: ${err.message}`)
    })
})

ipcMain.on('logout-discord', () => {
    discordUser = null
    discordRoleCache.clear()
    discordRoleRequests.clear()
    if (fs.existsSync(SESSION_FILE)) {
        try { fs.unlinkSync(SESSION_FILE) } catch (e) {}
    }
    log('Sesion local eliminada limpiamente.')
})

ipcMain.on('get-playtime', () => {
    sendPlaytimeStats()
})

ipcMain.on('get-launcher-version', () => {
    sendToRenderer('launcher-version', { version: app.getVersion() })
})

ipcMain.on('open-external-url', (event, url) => {
    openExternalSafe(url).catch((err) => log(err.message))
})

ipcMain.on('get-minecraft-profile', () => {
    if (!minecraftProfile) loadMinecraftProfile()
    sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
})

ipcMain.on('save-minecraft-profile', (event, profile) => {
    if (!minecraftProfile) loadMinecraftProfile()

    minecraftProfile = {
        ...minecraftProfile,
        username: String(profile.username || 'PlayerTest').trim() || 'PlayerTest',
        skinUrl: profile.skinUrl === undefined ? minecraftProfile.skinUrl || '' : secureMinecraftAssetUrl(profile.skinUrl),
        skinSource: minecraftProfile.skinSource || (minecraftProfile.skinUrl ? 'microsoft' : 'default'),
        skinPath: minecraftProfile.skinPath || '',
        capeUrl: minecraftProfile.mode === 'premium' ? minecraftProfile.capeUrl || '' : '',
        skinAnimation: String(profile.skinAnimation || 'walk').trim() || 'walk',
        mode: minecraftProfile.mode === 'premium' ? 'premium' : 'offline'
    }

    saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
    sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    log(`Perfil de Minecraft guardado: ${minecraftProfile.username}`)
})

ipcMain.on('login-minecraft-premium', async () => {
    try {
        log('Abriendo login de Microsoft...')
        const authManager = createMicrosoftAuth()
        const xboxManager = await authManager.launch('electron', {
            width: 500,
            height: 650,
            resizable: false,
            title: 'Iniciar Microsoft',
            parent: win
        })
        const minecraftToken = await xboxManager.getMinecraft()
        saveMicrosoftProfile(minecraftToken, xboxManager.save())
    } catch (err) {
        log(`No se pudo iniciar sesion con Microsoft: ${formatMicrosoftError(err)}`)
        sendToRenderer('premium-login-unavailable')
    }
})

ipcMain.on('open-minecraft-skin-page', () => {
    openExternalSafe('https://www.minecraft.net/msaprofile/mygames/editskin').catch((err) => log(err.message))
})

ipcMain.on('select-local-skin', async (event, options = {}) => {
    try {
        const result = await dialog.showOpenDialog(win, {
            title: 'Agregar skin de Minecraft',
            properties: ['openFile'],
            filters: [{ name: 'Skin de Minecraft', extensions: ['png'] }]
        })
        if (result.canceled || !result.filePaths[0]) return
        const source = result.filePaths[0]
        const data = fs.readFileSync(source)
        const pngSignature = '89504e470d0a1a0a'
        if (data.length < 24 || data.subarray(0, 8).toString('hex') !== pngSignature) throw new Error('El archivo elegido no es un PNG valido.')
        const width = data.readUInt32BE(16)
        const height = data.readUInt32BE(20)
        if (width !== 64 || (height !== 64 && height !== 32)) throw new Error(`La skin debe medir 64x64 o 64x32. Este archivo mide ${width}x${height}.`)
        if (!minecraftProfile) loadMinecraftProfile()
        const variant = options.variant === 'slim' ? 'slim' : 'classic'
        const libraryItem = registerSkinInLibrary(source, data, variant)
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
        sendToRenderer('local-skin-selected', { id: libraryItem.id, fileName: path.basename(source), added: true, variant })
        log('Skin agregada a la biblioteca: ' + libraryItem.name + '.')
    } catch (err) {
        const detail = err?.response?.data?.errorMessage || err?.response?.data?.error || err.message || String(err)
        log(`No se pudo agregar la skin: ${detail}`)
        sendToRenderer('local-skin-error', { message: detail })
    }
})

ipcMain.on('apply-appearance-selection', async (event, selection = {}) => {
    const skinKind = String(selection.skinKind || 'current')
    const skinId = String(selection.skinId || '')
    const capeId = String(selection.capeId || '')
    const variant = selection.skinVariant === 'slim' ? 'slim' : 'classic'
    sendToRenderer('appearance-state', { loading: true, action: 'appearance', id: skinId || capeId })
    try {
        if (!minecraftProfile) loadMinecraftProfile()
        if (skinKind === 'saved') {
            const item = loadSkinLibrary().find((entry) => entry.id === skinId)
            if (!item) throw new Error('No se encontro esa skin en Mis skins.')
            await archiveCurrentSkinInLibrary()
            await activateSkinLibraryItem(item, variant)
        } else if (skinKind === 'default') {
            const item = DEFAULT_SKIN_ASSETS[skinId]
            if (!item) throw new Error('No se encontro esa skin predeterminada.')
            await archiveCurrentSkinInLibrary()
            await activateDefaultSkinItem(item)
        }
        const activeCapeId = normalizeMinecraftCapes(minecraftProfile?.availableCapes).find((cape) => cape.active)?.id || ''
        if (capeId !== activeCapeId) {
            if (minecraftProfile.mode !== 'premium') throw new Error('Inicia sesion con Microsoft para cambiar la capa.')
            await updateMinecraftCape(capeId)
        }
        sendToRenderer('appearance-success', { type: 'appearance', id: skinId, capeId })
        log('Apariencia de Minecraft aplicada.')
    } catch (err) {
        const detail = err?.response?.data?.errorMessage || err?.response?.data?.error || err.message || String(err)
        log('No se pudo aplicar la apariencia: ' + detail)
        sendToRenderer('appearance-error', { message: detail })
    } finally {
        sendToRenderer('appearance-state', { loading: false, action: 'appearance', id: skinId || capeId })
    }
})

ipcMain.on('apply-saved-skin', async (event, skinId) => {
    sendToRenderer('appearance-state', { loading: true, action: 'skin', id: String(skinId || '') })
    try {
        const item = loadSkinLibrary().find((entry) => entry.id === String(skinId || ''))
        if (!item) throw new Error('No se encontro esa skin en la biblioteca local.')
        await activateSkinLibraryItem(item)
        sendToRenderer('appearance-success', { type: 'skin', id: item.id })
        log('Skin aplicada desde la biblioteca: ' + item.name + '.')
    } catch (err) {
        const detail = err?.response?.data?.errorMessage || err?.response?.data?.error || err.message || String(err)
        log('No se pudo aplicar la skin guardada: ' + detail)
        sendToRenderer('appearance-error', { message: detail })
    } finally {
        sendToRenderer('appearance-state', { loading: false, action: 'skin', id: String(skinId || '') })
    }
})

ipcMain.on('remove-saved-skin', (event, skinId) => {
    try {
        const id = String(skinId || '')
        if (minecraftProfile?.activeSkinLibraryId === id) {
            throw new Error('Selecciona otra skin antes de eliminar la que esta activa.')
        }
        const items = loadSkinLibrary()
        const item = items.find((entry) => entry.id === id)
        if (!item) return
        if (fs.existsSync(item.filePath)) fs.unlinkSync(item.filePath)
        saveSkinLibrary(items.filter((entry) => entry.id !== id))
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
        sendToRenderer('appearance-success', { type: 'removed', id })
        log('Skin eliminada de la biblioteca: ' + item.name + '.')
    } catch (err) {
        sendToRenderer('appearance-error', { message: err.message || String(err) })
    }
})

ipcMain.on('rename-saved-skin', (event, payload = {}) => {
    try {
        const id = String(payload.id || '')
        const name = String(payload.name || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 48)
        if (!id || !name) throw new Error('Escribe un nombre valido para la skin.')
        const items = loadSkinLibrary()
        const index = items.findIndex((item) => item.id === id)
        if (index < 0) throw new Error('No se encontro esa skin en Mis skins.')
        items[index] = { ...items[index], name }
        saveSkinLibrary(items)
        sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
        sendToRenderer('appearance-success', { type: 'renamed', id, name })
        log('Skin renombrada: ' + name + '.')
    } catch (err) {
        sendToRenderer('appearance-error', { message: err.message || String(err) })
    }
})

ipcMain.on('set-minecraft-cape', async (event, capeId) => {
    const id = String(capeId || '')
    sendToRenderer('appearance-state', { loading: true, action: 'cape', id })
    try {
        await updateMinecraftCape(id)
        sendToRenderer('appearance-success', { type: 'cape', id })
        log(id ? 'Capa oficial de Minecraft activada.' : 'Capa de Minecraft desactivada.')
    } catch (err) {
        const detail = err?.response?.data?.errorMessage || err?.response?.data?.error || err.message || String(err)
        log('No se pudo cambiar la capa: ' + detail)
        sendToRenderer('appearance-error', { message: detail })
    } finally {
        sendToRenderer('appearance-state', { loading: false, action: 'cape', id })
    }
})
ipcMain.on('save-minecraft-defaults', (event, settings = {}) => {
    try {
        saveJson(MINECRAFT_DEFAULTS_FILE, settings || {})
        log('Configuracion predeterminada de Minecraft guardada.')
    } catch (err) {
        log('No se pudo guardar la configuracion de Minecraft: ' + err.message)
    }
})

ipcMain.on('get-system-info', () => {
    const totalMemoryGB = Math.max(1, Math.round(os.totalmem() / 1073741824))
    const maxRamGB = Math.max(8, Math.min(16, totalMemoryGB - 2))
    sendToRenderer('system-info', { totalMemoryGB, maxRamGB })
})

ipcMain.on('logout-minecraft', () => {
    minecraftProfile = {
        mode: 'offline',
        username: 'PlayerTest',
        skinUrl: '',
        capeUrl: '',
        skinAnimation: 'walk',
        skinSource: 'default',
        skinPath: '',
        premiumReady: false,
        auth: null,
        microsoftRefreshToken: ''
    }
        saveSecureJson(MINECRAFT_PROFILE_FILE, minecraftProfile)
    sendToRenderer('minecraft-profile', getSafeMinecraftProfile())
    log('Sesion de Minecraft eliminada.')
})

function readMinecraftDefaults() {
    try {
        if (fs.existsSync(MINECRAFT_DEFAULTS_FILE)) return JSON.parse(fs.readFileSync(MINECRAFT_DEFAULTS_FILE, 'utf8'))
    } catch (err) {}
    return { enabled: true }
}

function normalizeOptionPercent(value, fallback = 1) {
    const number = Number(value)
    if (!Number.isFinite(number)) return fallback
    return Math.max(0, Math.min(1, number / 100))
}

function mergeMinecraftOptionLines(existing, updates) {
    const lines = String(existing || '').split(/\r?\n/).filter((line) => line.trim())
    const seen = new Set()
    const merged = lines.map((line) => {
        const index = line.indexOf(':')
        if (index < 0) return line
        const key = line.slice(0, index)
        if (!Object.prototype.hasOwnProperty.call(updates, key)) return line
        seen.add(key)
        return key + ':' + updates[key]
    })
    for (const [key, value] of Object.entries(updates)) {
        if (!seen.has(key)) merged.push(key + ':' + value)
    }
    return merged.join('\\n') + '\\n'
}

function applyMinecraftDefaultSettings(gamePath) {
    const settings = readMinecraftDefaults()
    if (!settings || settings.enabled === false) return
    const updates = {
        fullscreen: Boolean(settings.fullscreen),
        bobView: settings.viewBobbing !== false,
        guiScale: Math.max(1, Math.min(4, Number(settings.guiScale) || 3)),
        gamma: normalizeOptionPercent(settings.gamma, 0.5),
        renderDistance: Math.max(2, Math.min(32, Number(settings.renderDistance) || 12)),
        fov: Math.max(-1, Math.min(1, ((Number(settings.fov) || 70) - 70) / 40)),
        autoJump: settings.autoJump !== false,
        invertYMouse: Boolean(settings.invertMouse),
        mouseSensitivity: Math.max(0, Math.min(1, (Number(settings.mouseSensitivity) || 100) / 200)),
        soundCategory_master: normalizeOptionPercent(settings.soundMaster, 1),
        soundCategory_music: normalizeOptionPercent(settings.soundMusic, 0),
        soundCategory_record: normalizeOptionPercent(settings.soundRecord, 1),
        soundCategory_weather: normalizeOptionPercent(settings.soundWeather, 1),
        soundCategory_block: normalizeOptionPercent(settings.soundBlock, 1),
        soundCategory_hostile: normalizeOptionPercent(settings.soundHostile, 1),
        soundCategory_neutral: normalizeOptionPercent(settings.soundFriendly, 1),
        soundCategory_player: normalizeOptionPercent(settings.soundPlayer, 1),
        soundCategory_ambient: normalizeOptionPercent(settings.soundAmbient, 0),
        soundCategory_voice: normalizeOptionPercent(settings.soundVoice, 0.93)
    }
    fs.mkdirSync(gamePath, { recursive: true })
    const optionsPath = path.join(gamePath, 'options.txt')
    const current = fs.existsSync(optionsPath) ? fs.readFileSync(optionsPath, 'utf8') : ''
    fs.writeFileSync(optionsPath, mergeMinecraftOptionLines(current, updates), 'utf8')
    log('Ajustes base de Minecraft aplicados a options.txt.')
}

function beginManagedContentTransaction(gamePath) {
    const managed = ['mods', 'resourcepacks', 'shaderpacks', 'config', 'defaultconfigs', 'kubejs']
    const backupRoot = path.join(path.dirname(gamePath), `.install-backup-${Date.now()}`)
    const moved = []
    fs.mkdirSync(backupRoot, { recursive: true })

    try {
        for (const relative of managed) {
            const target = path.join(gamePath, relative)
            const backup = path.join(backupRoot, relative)
            if (fs.existsSync(target)) {
                fs.mkdirSync(path.dirname(backup), { recursive: true })
                fs.renameSync(target, backup)
                moved.push(relative)
            }
            fs.mkdirSync(target, { recursive: true })
        }
        if (moved.length) log(`Contenido anterior protegido para recuperacion: ${moved.length} carpeta(s).`)
        return { gamePath, backupRoot, managed, moved }
    } catch (err) {
        rollbackManagedContentTransaction({ gamePath, backupRoot, managed, moved })
        throw new Error(`No se pudo preparar una instalacion recuperable: ${err.message}`)
    }
}

function commitManagedContentTransaction(transaction) {
    if (!transaction?.backupRoot) return
    fs.rmSync(transaction.backupRoot, { recursive: true, force: true })
    log('Punto de recuperacion temporal eliminado tras completar la instalacion.')
}

function rollbackManagedContentTransaction(transaction) {
    if (!transaction?.gamePath || !transaction?.backupRoot) return false
    try {
        for (const relative of transaction.managed || []) {
            const target = path.join(transaction.gamePath, relative)
            const backup = path.join(transaction.backupRoot, relative)
            fs.rmSync(target, { recursive: true, force: true })
            if (fs.existsSync(backup)) fs.renameSync(backup, target)
            else fs.mkdirSync(target, { recursive: true })
        }
        fs.rmSync(transaction.backupRoot, { recursive: true, force: true })
        log('La instalacion fallo y el contenido anterior fue restaurado correctamente.')
        return true
    } catch (err) {
        log(`No se pudo completar la recuperacion automatica: ${err.message}. Respaldo: ${transaction.backupRoot}`)
        return false
    }
}

ipcMain.on('install-pack', async () => {
    if (!currentProject) {
        log('Selecciona y desbloquea una instancia antes de instalar.')
        return
    }
    if (installInProgress) {
        log('Ya hay una instalacion en curso. Espera a que termine.')
        return
    }

    const basePath = getInstanceBasePath(currentProject)
    const gamePath = path.join(basePath, 'game')
    const localPackPath = currentProject.local_pack_path || ''
    const packageExt = localPackPath ? getPackExtension(localPackPath) : (currentProject.file_type || (currentProject.modpack_url?.toLowerCase().includes('.mrpack') ? 'mrpack' : 'zip'))
    const zipPath = path.join(basePath, `modpack.${packageExt || 'zip'}`)
    let contentTransaction = null

    try {
        const isEmptyLocalProject = currentProject.local && currentProject.local_pack_type === 'created' && !localPackPath && !currentProject.modpack_url
        if (!currentProject.modpack_url && !localPackPath && !isEmptyLocalProject) {
            throw new Error('Este proyecto no tiene URL ni archivo local de modpack configurado.')
        }
        if (localPackPath && packageExt !== 'mrpack') {
            throw new Error('Las importaciones locales solo aceptan modpacks .mrpack.')
        }
        if (currentProject.requires_curseforge_api) {
            throw new Error('Este ZIP parece ser un export de CurseForge con manifest.json y no incluye los mods. Sin CurseForge API no puedo descargar esas dependencias; exportalo con la carpeta mods completa o usa un ZIP con mods incluidos.')
        }
        if (localPackPath && !fs.existsSync(localPackPath)) {
            throw new Error('No se encontro el archivo local del modpack. Importalo de nuevo o mueve el archivo a una ruta disponible.')
        }

        installInProgress = true
        currentDownloadCancelled = false
        currentDownloadPaused = false
        sendToRenderer('install-state', true)
        sendDownloadActivity({ title: currentProject.name, phase: 'Preparando instalacion', percent: 0, filesDone: 0, filesTotal: 0 })
        log(`Preparando entorno local para ${currentProject.name}...`)
        if (!fs.existsSync(gamePath)) fs.mkdirSync(gamePath, { recursive: true })
        if (!isEmptyLocalProject && fs.existsSync(zipPath)) {
            try { fs.unlinkSync(zipPath) } catch (e) {}
        }

        let installInfo
        if (isEmptyLocalProject) {
            log('Creando estructura de instancia local vacia...')
            for (const folder of ['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves', 'screenshots']) {
                fs.mkdirSync(path.join(gamePath, folder), { recursive: true })
            }
            setProgress(30)
            installInfo = {
                minecraftVersion: currentProject.minecraft_version,
                loader: currentProject.loader || 'vanilla',
                loaderVersion: currentProject.loader_version || currentProject.fabric_version || ''
            }
        } else {
            if (localPackPath) {
                log('Copiando paquete local seleccionado...')
                setProgress(12)
                fs.copyFileSync(localPackPath, zipPath)
                setProgress(30)
            } else {
                log('Descargando paquete de mods desde servidor seguro...')
                setProgress(5)

                const cacheEntry = getModpackCacheEntry(currentProject, packageExt || 'zip')
                const cachedPackage = getCachedPackageInfo(cacheEntry, 1000)
                if (cachedPackage) {
                    log('Cache del paquete: usando archivo ya disponible para ' + currentProject.name + '.')
                    sendDownloadActivity({ title: currentProject.name, phase: 'Usando cache del paquete', percent: 28, downloaded: cachedPackage.size, total: cachedPackage.size, eta: '00:00' })
                    fs.copyFileSync(cachedPackage.path, zipPath)
                    setProgress(30)
                } else {
                    await downloadFile(currentProject.modpack_url, cacheEntry.file, {
                        expectZip: true,
                        minSize: 1000,
                        progressStart: 5,
                        progressEnd: 30,
                        downloadTitle: currentProject.name,
                        phase: 'Descargando paquete principal'
                    })
                    saveCachedPackageInfo(cacheEntry, currentProject, currentProject.modpack_url)
                    fs.copyFileSync(cacheEntry.file, zipPath)
                }
            }

            await verifyProjectPackage(zipPath, currentProject)
            log('Procesando paquete de mods...')
            setProgress(30)
            contentTransaction = beginManagedContentTransaction(gamePath)

            installInfo = packageExt === 'mrpack'
                ? await installMrpack(zipPath, gamePath, currentProject)
                : await installZip(zipPath, gamePath, currentProject)
        }
        currentProject.minecraft_version = installInfo.minecraftVersion
        currentProject.loader = installInfo.loader || currentProject.loader || (currentProject.local ? '' : 'fabric')
        currentProject.loader_version = installInfo.loaderVersion || currentProject.loader_version || currentProject.fabric_version
        currentProject.fabric_version = currentProject.loader === 'fabric' ? currentProject.loader_version : ''
        currentProject.loader_profile_id = ''

        if (!isEmptyLocalProject) {
            try { fs.unlinkSync(zipPath) } catch (e) {}
        }

        if (!currentProject.minecraft_version) {
            throw new Error('No se pudo detectar la version de Minecraft del paquete.')
        }
        if (!currentProject.loader) {
            throw new Error('No se pudo detectar el loader del paquete. Importalo de nuevo indicando Fabric, Forge, NeoForge o Vanilla.')
        }
        if (!currentProject.loader_version && currentProject.loader !== 'vanilla') {
            throw new Error(`No se pudo detectar la version del loader ${currentProject.loader}. Importalo de nuevo indicando la version del loader.`)
        }

        setProgress(80)
        const loaderInfo = await installLoader(basePath, gamePath, currentProject)
        if (loaderInfo?.customVersion) {
            currentProject.loader_profile_id = loaderInfo.customVersion
        }
        setProgress(90)
        applyMinecraftDefaultSettings(gamePath)

        setProgress(100)
        saveInstanceManifest(currentProject)
        commitManagedContentTransaction(contentTransaction)
        contentTransaction = null
        log(`Entorno de [${currentProject.name}] desplegado.`)
        finishDownloadActivity('Instalacion completada')
        sendToRenderer('access-granted', { project: currentProject, ...getInstanceState(currentProject) })
    } catch (err) {
        if (contentTransaction) rollbackManagedContentTransaction(contentTransaction)
        setProgress(0)
        sendDownloadActivity({ phase: 'Error', percent: 0, cancellable: false })
        log(`Error de instalacion: ${err.message}`)
    } finally {
        installInProgress = false
        activeDownloadStream = null
        currentDownloadPaused = false
        sendToRenderer('install-state', false)
    }
})

async function installFabric(gamePath, mcVersion, loaderVersion) {
    const profileId = `fabric-loader-${loaderVersion}-${mcVersion}`
    const profileFolder = path.join(gamePath, 'versions', profileId)
    if (!fs.existsSync(profileFolder)) fs.mkdirSync(profileFolder, { recursive: true })

    const response = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`)
    const fabricJson = response.data
    fabricJson.id = profileId
    fs.writeFileSync(path.join(profileFolder, `${profileId}.json`), JSON.stringify(fabricJson, null, 2))
}

ipcMain.on('launch-game', async () => {
    log('Solicitud de inicio recibida.')

    if (!currentProject) {
        log('No hay ninguna instancia activa. Selecciona una instancia y desbloqueala antes de jugar.')
        return
    }
    if (installInProgress) {
        log('No se puede iniciar mientras hay una instalacion en curso.')
        return
    }
    if (!currentProject.loader) {
        currentProject.loader = currentProject.fabric_version ? 'fabric' : 'vanilla'
    }
    if (currentProject.loader !== 'vanilla' && !currentProject.loader_version && currentProject.fabric_version) {
        currentProject.loader_version = currentProject.fabric_version
    }
    if (currentProject.loader !== 'vanilla' && !currentProject.loader_version) {
        return log(`No se puede iniciar: falta loader_version para ${currentProject.loader}.`)
    }

    const basePath = getInstanceBasePath(currentProject)
    const gamePath = path.join(basePath, 'game')
    const instanceState = getInstanceState(currentProject)
    if (!instanceState.isInstalled) {
        log(`La instancia [${currentProject.name}] no esta instalada todavia. Pulsa Instalar primero.`)
        sendToRenderer('access-granted', { project: currentProject, ...instanceState })
        return
    }

    const launcher = new Client()
    let loaderLaunchInfo
    let authOpts
    let javaInfo
    let assetIndexId
    try {
        javaInfo = await resolveJavaPath(currentProject, 8, 35)
        currentProject._resolved_java_path = javaInfo.path
        log(`Usando Java ${javaInfo.major} para Minecraft ${currentProject.minecraft_version}${javaInfo.managed ? ' (portable)' : ''}.`)
        loaderLaunchInfo = await installLoader(basePath, gamePath, currentProject)
        if (loaderLaunchInfo?.customVersion) {
            currentProject.loader_profile_id = loaderLaunchInfo.customVersion
        }
        applyMinecraftDefaultSettings(gamePath)
        assetIndexId = await getAssetIndexId(gamePath, currentProject.minecraft_version)
        log(`Asset index oficial detectado: ${assetIndexId}.`)
        authOpts = await getMinecraftAuthorization()
    } catch (err) {
        return log(`No se pudo preparar el inicio de Minecraft: ${err?.message || formatMicrosoftError(err)}`)
    }

    log(`Iniciando juego para ${currentProject.name}...`)

    launcher.on('debug', (msg) => log(redactSensitive(msg)))
    launcher.on('data', (msg) => {
        const text = redactSensitive(msg).trim()
        if (text) log(text)
    })
    launcher.on('arguments', (args) => {
        const launchArgs = Array.isArray(args) ? args.join(' ') : String(args)
        log(`Argumentos de arranque generados: ${redactSensitive(launchArgs)}`)
    })

    const startedAt = Date.now()
    const assetRoot = path.join(gamePath, 'assets')
    const launchAssetIndex = getLaunchAssetIndexName(currentProject, loaderLaunchInfo)
    log(`Assets configurados: ${assetRoot} (${launchAssetIndex}).`)

    const launchOptions = {
        customArgs: getProfileJvmArgs(gamePath, loaderLaunchInfo?.customVersion || currentProject.loader_profile_id),
        authorization: authOpts,
        root: gamePath,
        version: {
            number: currentProject.minecraft_version,
            type: 'release',
            custom: loaderLaunchInfo?.customVersion || currentProject.loader_profile_id || undefined
        },
        memory: { max: selectedRAM, min: '2G' },
        javaPath: javaInfo.path,
        javaVersion: javaInfo.major,
        overrides: {
            gameDirectory: gamePath,
            assetRoot,
            assetIndex: launchAssetIndex,
            cwd: gamePath
        }
    }

    if (launchOptions.customArgs.length) {
        log(`Argumentos JVM del perfil aplicados: ${launchOptions.customArgs.length}`)
    }

    launcher.launch(launchOptions)
        .then((process) => {
            minecraftProcess = process
            if (process) {
                startPlaytimeSession(currentProject)
                sendToRenderer('game-state', true)
            }
        })
        .catch((err) => log(`Fallo al inicializar nucleo de juego: ${err?.message || String(err)}`))

    launcher.on('progress', (e) => {
        if (e.total) setProgress((e.task / e.total) * 100)
    })
    launcher.on('close', (code) => {
        finishPlaytimeSession()
        setProgress(0)
        minecraftProcess = null
        sendToRenderer('game-state', false)
        log(`Instancia finalizada con codigo ${code}.`)
        if (Number(code) !== 0 || Date.now() - startedAt < 45000) {
            logLatestMinecraftFailure(gamePath)
        }
    })
})

ipcMain.on('kill-instance', () => {
    if (!minecraftProcess) return
    try {
        finishPlaytimeSession()
        minecraftProcess.kill()
        minecraftProcess = null
        sendToRenderer('game-state', false)
        setProgress(0)
        log('Proceso abortado forzosamente.')
    } catch (e) {}
})

ipcMain.on('set-ram', (e, ram) => {
    const requested = Math.round(Number.parseFloat(String(ram || '').replace(/[^0-9.]/g, '')))
    const systemLimit = Math.max(2, Math.min(32, Math.floor(os.totalmem() / 1024 ** 3) - 2))
    const safeRam = Math.max(2, Math.min(Number.isFinite(requested) ? requested : 4, systemLimit))
    selectedRAM = `${safeRam}G`
})

ipcMain.on('open-game-folder', async () => {
    if (!currentProject) {
        log('Selecciona una instancia del catalogo antes de abrir su carpeta.')
        return
    }

    const gamePath = path.join(getInstanceBasePath(currentProject), 'game')
    if (!fs.existsSync(gamePath)) {
        fs.mkdirSync(gamePath, { recursive: true })
    }

    const errorMessage = await shell.openPath(gamePath)
    if (errorMessage) {
        log(`No se pudo abrir la carpeta de la instancia: ${errorMessage}`)
        return
    }

    log(`Carpeta abierta: ${currentProject.name}`)
})

ipcMain.on('open-instance-folder', async (event, data = {}) => {
    const project = findCatalogProject(data.projectId) || currentProject
    if (!project?.id) {
        log('Selecciona una instancia antes de abrir su carpeta.')
        return
    }
    const gamePath = path.join(getInstanceBasePath(project), 'game')
    if (!fs.existsSync(gamePath)) fs.mkdirSync(gamePath, { recursive: true })
    const errorMessage = await shell.openPath(gamePath)
    if (errorMessage) log('No se pudo abrir la carpeta de la instancia: ' + errorMessage)
    else log('Carpeta abierta: ' + project.name)
})

ipcMain.on('delete-instance', (event, data = {}) => {
    const project = cachedServerList.find((server) => server.id === data.serverId) || currentProject
    if (!project) {
        log('Selecciona una instancia antes de eliminarla.')
        return
    }
    if (installInProgress) {
        log('No se puede eliminar una instancia mientras se esta instalando.')
        return
    }
    if (minecraftProcess) {
        log('Cierra Minecraft antes de eliminar la instancia.')
        return
    }

    const instancePath = getInstanceBasePath(project)
    if (!fs.existsSync(instancePath)) {
        log(`La instancia [${project.name}] no tiene archivos locales.`)
        event.reply('instance-deleted', { project, ...getInstanceState(project) })
        return
    }

    fs.rmSync(instancePath, { recursive: true, force: true })
    log(`Instancia local eliminada: ${project.name}.`)
    event.reply('instance-deleted', { project, ...getInstanceState(project) })
})


ipcMain.on('request-diagnostic-report', () => {
    sendToRenderer('diagnostic-report', buildDiagnosticReport(currentProject))
})

ipcMain.on('pause-current-download', () => {
    if (activeDownloadStream && !currentDownloadPaused) {
        activeDownloadStream.pause()
        currentDownloadPaused = true
        sendDownloadActivity({ phase: 'Pausado' })
        log('Descarga pausada.')
    }
})

ipcMain.on('resume-current-download', () => {
    if (activeDownloadStream && currentDownloadPaused) {
        currentDownloadPaused = false
        activeDownloadStream.resume()
        sendDownloadActivity({ phase: 'Reanudando' })
        log('Descarga reanudada.')
    }
})

ipcMain.on('cancel-current-download', () => {
    currentDownloadCancelled = true
    if (activeDownloadStream) {
        try { activeDownloadStream.destroy(new Error('Descarga cancelada por el usuario.')) } catch (err) {}
    }
    sendDownloadActivity({ phase: 'Cancelando', cancellable: false })
    log('Cancelando descarga actual...')
})
ipcMain.on('clear-cache', () => {
    if (!currentProject) {
        log('Selecciona una instancia del catalogo antes de vaciar cache.')
        return
    }
    if (installInProgress) {
        log('No se puede vaciar cache mientras hay una instalacion en curso.')
        return
    }
    fs.rmSync(getInstanceBasePath(currentProject), { recursive: true, force: true })
    log('Cache de archivos del proyecto purgado.')
    sendToRenderer('access-granted', { project: currentProject, ...getInstanceState(currentProject) })
})




























