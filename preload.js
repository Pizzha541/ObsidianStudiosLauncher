const { contextBridge, ipcRenderer, clipboard, webUtils } = require('electron')

const SEND_CHANNELS = new Set([
    'apply-appearance-selection',
    'apply-saved-skin',
    'cancel-current-download',
    'check-launcher-update',
    'choose-instance-assets',
    'choose-local-assets',
    'clear-cache',
    'close-app',
    'create-local-instance',
    'delete-instance',
    'delete-instance-content-file',
    'delete-local-content-file',
    'delete-local-instance',
    'download-and-install-launcher-update',
    'get-instance-content',
    'get-launcher-version',
    'get-local-content',
    'get-local-instances',
    'get-minecraft-profile',
    'get-playtime',
    'get-system-info',
    'import-local-pack',
    'import-local-pack-files',
    'import-minecraft-config-preset',
    'install-pack',
    'kill-instance',
    'launch-game',
    'login-discord',
    'login-minecraft-premium',
    'logout-discord',
    'logout-minecraft',
    'minimize-app',
    'modrinth-install-modpack',
    'modrinth-install-project',
    'modrinth-search',
    'open-external-url',
    'open-game-folder',
    'open-instance-folder',
    'open-minecraft-skin-page',
    'pause-current-download',
    'recheck-discord-access',
    'refresh-catalog',
    'refresh-minecraft-profile',
    'remove-saved-skin',
    'rename-saved-skin',
    'request-diagnostic-report',
    'request-server-access',
    'renderer-error',
    'resume-current-download',
    'save-minecraft-defaults',
    'save-minecraft-profile',
    'select-local-skin',
    'set-minecraft-cape',
    'set-ram',
    'toggle-instance-content-file',
    'toggle-maximize-app',
    'update-local-instance'
])

const RECEIVE_CHANNELS = new Set([
    'access-check-delayed',
    'access-denied',
    'access-granted',
    'all-servers-info',
    'appearance-error',
    'appearance-state',
    'appearance-success',
    'catalog-message',
    'content-news',
    'content-status',
    'diagnostic-report',
    'discord-login-success',
    'download-center-update',
    'game-state',
    'install-state',
    'instance-assets-added',
    'instance-content-info',
    'instance-deleted',
    'launcher-update-available',
    'launcher-update-current',
    'launcher-update-download-progress',
    'launcher-update-download-started',
    'launcher-update-downloaded',
    'launcher-update-error',
    'launcher-update-installing',
    'launcher-version',
    'local-assets-added',
    'local-content-info',
    'local-instance-deleted',
    'local-instance-updated',
    'local-instances-info',
    'local-pack-import-error',
    'local-pack-imported',
    'local-skin-error',
    'local-skin-selected',
    'log',
    'lobby-invite-code',
    'minecraft-config-imported',
    'minecraft-profile',
    'modrinth-install-complete',
    'modrinth-install-error',
    'modrinth-modpack-imported',
    'modrinth-search-results',
    'playtime-stats',
    'premium-login-unavailable',
    'progress',
    'skin-upload-state',
    'system-info'
])

function assertAllowed(channels, channel) {
    if (!channels.has(channel)) throw new Error(`Canal IPC no permitido: ${channel}`)
}

contextBridge.exposeInMainWorld('obsidianDesktop', {
    send(channel, payload) {
        assertAllowed(SEND_CHANNELS, channel)
        ipcRenderer.send(channel, payload)
    },
    on(channel, listener) {
        assertAllowed(RECEIVE_CHANNELS, channel)
        if (typeof listener !== 'function') throw new TypeError('El listener IPC debe ser una funcion.')
        const wrapped = (_event, ...args) => listener(...args)
        ipcRenderer.on(channel, wrapped)
        return () => ipcRenderer.removeListener(channel, wrapped)
    },
    clipboard: {
        writeText(value) {
            clipboard.writeText(String(value ?? ''))
        }
    },
    getPathForFile(file) {
        return webUtils.getPathForFile(file)
    }
})
