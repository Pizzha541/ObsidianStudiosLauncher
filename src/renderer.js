const { clipboard, ipcRenderer, webUtils } = require('electron')

let targetServerId = null
let selectedProject = null
let installButtonLabel = 'Instalar'
let skinViewer = null
let appearanceSkinViewer = null
let detectedCapeUrl = ''
let currentServers = []
let catalogFilter = ''
let accessRequestId = 0
let pendingAccess = null
let localProjects = []
let lobbyState = { code: 'LOCAL', ready: false, sharedProject: null }

const heroPanel = document.getElementById('hero-panel')
const heroBackdrop = document.getElementById('hero-backdrop')
const heroTitle = document.getElementById('hero-title')
const heroDesc = document.getElementById('hero-desc')
const heroDetails = document.getElementById('hero-details')
const heroAccess = document.getElementById('hero-access')
const launchStatusText = document.getElementById('launch-status-text')
const consoleLog = document.getElementById('log')
const logsWindow = document.getElementById('logs-window')
const toggleLogBtn = document.getElementById('toggle-log-btn')
const copyLogBtn = document.getElementById('copy-log-btn')
const logSearchInput = document.getElementById('log-search')
const logCount = document.getElementById('log-count')
const consoleModal = document.getElementById('console-modal')
const instanceContentTabs = document.getElementById('instance-content-tabs')
const instanceContentSearch = document.getElementById('instance-content-search')
const instanceContextMenu = document.getElementById('instance-context-menu')
const progressBar = document.getElementById('progressBar')
const minecraftName = document.getElementById('minecraft-name')
const minecraftMode = document.getElementById('minecraft-mode')
const minecraftUsername = document.getElementById('minecraft-username')
const skinUrlInput = document.getElementById('skin-url')
const skinAnimationSelect = document.getElementById('skin-animation')
const skinVariantSelect = document.getElementById('skin-variant')
const skinUploadButton = document.getElementById('skin-upload-button')
const appearanceModal = document.getElementById('appearance-modal')
const appearanceCurrentHead = document.getElementById('appearance-current-head')
const appearanceCurrentName = document.getElementById('appearance-current-name')
const appearanceCurrentDetail = document.getElementById('appearance-current-detail')
const appearanceVariantSelect = document.getElementById('appearance-skin-variant')
const skinLibraryGrid = document.getElementById('skin-library-grid')
const defaultSkinGrid = document.getElementById('default-skin-grid')
const appearanceViewer = document.getElementById('appearance-viewer')
const appearancePreviewName = document.getElementById('appearance-preview-name')
const appearancePreviewDetail = document.getElementById('appearance-preview-detail')
const appearanceAnimationSelect = document.getElementById('appearance-animation')
const appearanceApplyButton = document.getElementById('appearance-apply-button')
const capeLibraryGrid = document.getElementById('cape-library-grid')
const appearanceStatus = document.getElementById('appearance-status')
const capeSourceLabel = document.getElementById('cape-source-label')
const skinPreview = document.getElementById('skin-preview')
const profileBadges = document.getElementById('profile-badges')
const sidebarSkinHead = document.getElementById('sidebar-skin-head')
const titlebarSkinHead = document.getElementById('titlebar-skin-head')
const sidebarProfileName = document.getElementById('sidebar-profile-name')
const sidebarProfileMode = document.getElementById('sidebar-profile-mode')
const ramSlider = document.getElementById('ram-slider')
const ramValue = document.getElementById('ram-value')
const ramMaxLabel = document.getElementById('ram-max-label')
const ramSystemNote = document.getElementById('ram-system-note')
const skinSourceLabel = document.getElementById('skin-source-label')
const introOverlay = document.getElementById('intro-overlay')
const introVideo = document.getElementById('intro-video')
const introSkip = document.getElementById('intro-skip')
const introStart = document.getElementById('intro-start')
const changelogVersion = document.getElementById('changelog-version')
const changelogList = document.getElementById('changelog-list')
const trailerButton = document.getElementById('trailer-button')
const trailerModal = document.getElementById('trailer-modal')
const trailerTitle = document.getElementById('trailer-title')
const trailerMedia = document.getElementById('trailer-media')
const playtimeList = document.getElementById('playtime-list')
const announcementModal = document.getElementById('announcement-modal')
const announcementDate = document.getElementById('announcement-date')
const announcementLabel = document.getElementById('announcement-label')
const announcementImage = document.getElementById('announcement-image')
const announcementTitle = document.getElementById('announcement-title')
const announcementBody = document.getElementById('announcement-body')
const announcementAction = document.getElementById('announcement-action')
const launcherUpdateModal = document.getElementById('launcher-update-modal')
const launcherUpdateTitle = document.getElementById('launcher-update-title')
const launcherUpdateBody = document.getElementById('launcher-update-body')
const launcherUpdateChangelog = document.getElementById('launcher-update-changelog')
const launcherUpdateProgress = document.getElementById('launcher-update-progress')
const launcherUpdateProgressLabel = document.getElementById('launcher-update-progress-label')
const launcherUpdateProgressPercent = document.getElementById('launcher-update-progress-percent')
const launcherUpdateProgressBar = document.getElementById('launcher-update-progress-bar')
const launcherUpdateDownloadBtn = document.getElementById('launcher-update-download-btn')
const launcherUpdateLaterBtn = document.getElementById('launcher-update-later-btn')
const launcherCurrentVersion = document.getElementById('launcher-current-version')
const launcherVersionState = document.getElementById('launcher-version-state')
const toastStack = document.getElementById('toast-stack')
const diagnosticGrid = document.getElementById('diagnostic-grid')
const downloadCenterModal = document.getElementById('download-center-modal')
const downloadMini = document.getElementById('download-mini')
const downloadTitle = document.getElementById('download-title')
const downloadPhase = document.getElementById('download-phase')
const downloadPercent = document.getElementById('download-percent')
const downloadBar = document.getElementById('download-bar')
const downloadFiles = document.getElementById('download-files')
const downloadSize = document.getElementById('download-size')
const downloadSpeed = document.getElementById('download-speed')
const downloadEta = document.getElementById('download-eta')
const downloadBreakdown = document.getElementById('download-breakdown')
const onboardingModal = document.getElementById('onboarding-modal')
const accountLanguageList = document.getElementById('account-language-list')
const microsoftSyncStatus = document.getElementById('microsoft-sync-status')
const localGrid = document.getElementById('local-grid')
const localCount = document.getElementById('local-count')
const localEditorEmpty = document.getElementById('local-editor-empty')
const localEditorBody = document.getElementById('local-editor-body')
const localEditName = document.getElementById('local-edit-name')
const localEditDescription = document.getElementById('local-edit-description')
const localEditMinecraft = document.getElementById('local-edit-minecraft')
const localEditLoader = document.getElementById('local-edit-loader')
const localEditLoaderVersion = document.getElementById('local-edit-loader-version')
const modrinthQuery = document.getElementById('modrinth-query')
const modrinthType = document.getElementById('modrinth-type')
const modrinthResults = document.getElementById('modrinth-results')
const localContentList = document.getElementById('local-content-list')
const instanceContentModal = document.getElementById('instance-content-modal')
const instanceContentTitle = document.getElementById('instance-content-title')
const instanceContentSubtitle = document.getElementById('instance-content-subtitle')
const instanceContentList = document.getElementById('instance-content-list')
const instanceContentStatus = document.getElementById('instance-content-status')
const configTargetInstance = document.getElementById('config-target-instance')
const configSourceInstance = document.getElementById('config-source-instance')
const lobbyCode = document.getElementById('lobby-code')
const lobbyShare = document.getElementById('lobby-share')
const lobbyMembers = document.getElementById('lobby-members')
const lobbyReadyButton = document.getElementById('lobby-ready-button')
const localDropZone = document.getElementById('local-drop-zone')
const lobbyInstanceStrip = document.getElementById('lobby-instance-strip')
let activeAnnouncement = null
let currentTrailerUrl = ''
let activeLauncherUpdate = null
let logSearchTerm = ''
let installPulseTimer = null
let installPulseStep = 0
let lastImportantToast = ''
let lastImportantToastAt = 0
let lastToastSignature = ''
let lastToastAt = 0
let lastCompletionToastAt = 0
let currentLocalContent = {}
let currentInstanceContent = {}
let currentContentProjectId = ''
let currentContentTab = 'mods'
let contentSearchTerm = ''
let contextMenuProjectId = ''
let minecraftDefaults = null
let lastModrinthResults = []
let currentLanguage = localStorage.getItem('obsidian.language') || 'es'
let lastMinecraftProfile = {}
let lastSystemInfo = {}
let appearanceOperation = { loading: false, action: '', id: '' }
let appearanceSelection = null
let lastDiscordUser = null
let lastDiagnosticReport = ''
let lastDownloadState = null

const translations = {
    es: {
        'app.title': 'Obsidian Studios Launcher',
        'app.network': 'Studios Network',
        'support.discord': 'Discord',
        'support.feedback': 'Feedback',
        'status.online': 'Online',
        'action.search': 'Buscar',
        'action.unlock': 'Desbloquear',
        'action.checkRole': 'Comprobar rol',
        'search.instance': 'Buscar instancia...',
        'access.title': 'Acceso privado',
        'access.copy': 'Usa la clave de la instancia seleccionada.',
        'access.placeholder': 'Clave de acceso',
        'instance.status': 'Estado de la instancia',
        'instance.changes': 'Cambios de esta version',
        'instance.chooseChanges': 'Selecciona una instancia para ver sus cambios.',
        'instance.noChanges': 'No hay cambios publicados para esta version.',
        'instance.project': 'Proyecto',
        'instance.minecraft': 'Minecraft',
        'instance.loader': 'Loader',
        'instance.access': 'Acceso',
        'instance.private': 'Privado',
        'instance.public': 'Publico',
        'instance.state': 'Estado',
        'console.title': 'Consola del sistema',
        'console.filter': 'Filtrar log...',
        'console.copy': 'Copiar',
        'console.clear': 'Limpiar',
        'console.open': 'Abrir',
        'console.close': 'Cerrar',
        'nav.console': 'Consola',
        'nav.downloads': 'Descargas',
        'diagnostic.kicker': 'Soporte',
        'diagnostic.title': 'Diagnostico',
        'diagnostic.copy': 'Genera un informe rapido para soporte cuando algo no funciona.',
        'diagnostic.copyReport': 'Copiar informe',
        'downloads.kicker': 'Actividad',
        'downloads.title': 'Centro de descargas',
        'downloads.copy': 'Mira progreso, velocidad y archivos procesados durante instalaciones.',
        'downloads.idle': 'Sin descargas activas',
        'downloads.open': 'Abrir centro',
        'downloads.pause': 'Pausar',
        'downloads.resume': 'Reanudar',
        'downloads.cancel': 'Cancelar',
        'home.eyebrow': 'Obsidian Network',
        'news.eyebrow': 'Obsidian Broadcast',
        'account.minecraftProfile': 'Perfil de Minecraft',
        'account.microsoftLogin': 'Iniciar Microsoft',
        'account.refreshSkin': 'Actualizar skin',
        'account.offlineMode': 'Modo offline',
        'account.gameIdentity': 'Identidad del juego',
        'account.offlineName': 'Nombre offline',
        'account.skinUrl': 'Skin por URL',
        'account.saveProfile': 'Guardar perfil',
        'account.preview': 'Previsualizar',
        'account.officialSkin': 'Skin oficial',
        'account.files': 'Archivos',
        'account.integration': 'Integracion',
        'account.linkDiscord': 'Vincular Discord',
        'account.closeDiscord': 'Cerrar Discord',
        'account.performance': 'Rendimiento',
        'account.ram': 'Memoria RAM',
        'account.currentVersion': 'Version actual',
        'account.checkVersions': 'Comprobar versiones',
        'account.activity': 'Actividad',
        'account.playtime': 'Tiempo jugado',
        'nav.instances': 'Instancias',
        'nav.news': 'Noticias',
        'nav.account': 'Mi Cuenta',
        'nav.settings': 'Configuracion',
        'account.subtitle': 'Tu identidad, skin y conexiones.',
        'settings.kicker': 'Preferencias del launcher',
        'settings.title': 'Configuracion',
        'settings.subtitle': 'Ajusta rendimiento, idioma y actualizaciones.',
        'settings.ramCopy': 'Memoria maxima que Minecraft puede utilizar.',
        'settings.ramRecommended': 'Recomendado: 6-8 GB',
        'settings.updateCopy': 'Busca nuevas versiones del launcher y cambios del catalogo.',
        'settings.supportTitle': 'Ayuda y comunidad',
        'settings.supportCopy': 'Reporta errores o entra a la comunidad oficial.',
        'skin.walk': 'Caminar',
        'skin.idle': 'Reposo',
        'skin.run': 'Correr',
        'skin.wave': 'Saludar',
        'skin.fly': 'Volar',
        'skin.none': 'Sin animacion',
        'skin.current': 'Skin mostrada',
        'skin.default': 'Predeterminada',
        'skin.local': 'Archivo local',
        'skin.microsoft': 'Cuenta Microsoft',
        'skin.localHint': 'PNG 64x64 o 64x32. Con Microsoft se sincroniza tambien dentro del juego.',
        'skin.chooseLocal': 'Cambiar skin',
        'skin.useMicrosoft': 'Recargar skin de Microsoft',
        'skin.model': 'Modelo de brazos',
        'skin.classic': 'Clasico (Steve)',
        'skin.slim': 'Delgado (Alex)',
        'skin.uploading': 'Sincronizando...',
        'appearance.open': 'Seleccionar skin',
        'appearance.kicker': 'Personalizacion',
        'appearance.title': 'Tu apariencia',
        'appearance.subtitle': 'Cambia de skin y administra tus capas oficiales sin salir del launcher.',
        'appearance.active': 'Apariencia activa',
        'appearance.refresh': 'Actualizar perfil',
        'appearance.mySkins': 'Mis skins',
        'appearance.defaultSkins': 'Skins predeterminadas',
        'appearance.defaultSkinsHint': 'Personajes clasicos incluidos con Minecraft.',
        'appearance.preview': 'Vista previa',
        'appearance.animation': 'Animacion',
        'appearance.applySelection': 'Aplicar seleccion',
        'appearance.selected': 'Seleccionada',
        'appearance.added': 'Skin agregada a Mis skins.',
        'appearance.capes': 'Capas oficiales',
        'appearance.capesHint': 'Solo aparecen las capas asociadas a tu cuenta Microsoft.',
        'appearance.ready': 'Elige una apariencia para aplicarla.',
        'appearance.done': 'Listo',
        'appearance.addSkin': 'Agregar skin',
        'appearance.currentSkin': 'Skin actual',
        'appearance.noCape': 'Sin capa',
        'appearance.emptyCapes': 'No hay capas oficiales asociadas a esta cuenta.',
        'appearance.microsoftRequired': 'Inicia sesion con Microsoft para administrar capas.',
        'appearance.apply': 'Aplicar',
        'appearance.activeLabel': 'Activa',
        'appearance.remove': 'Eliminar',
        'appearance.rename': 'Renombrar',
        'appearance.renamePrompt': 'Nuevo nombre para la skin:',
        'appearance.renamed': 'Nombre de la skin actualizado.',
        'appearance.applying': 'Aplicando cambios...',
        'home.title': 'Instancias disponibles',
        'home.subtitle': 'Selecciona, actualiza y juega tus proyectos privados desde un solo lugar.',
        'home.library': 'Biblioteca',
        'home.projects': 'Proyectos',
        'home.featured': 'Proyecto destacado',
        'news.title': 'Noticias y anuncios',
        'account.kicker': 'Perfil de usuario',
        'account.title': 'Mi Cuenta',
        'account.languageKicker': 'Preferencias',
        'account.languageTitle': 'Idioma',
        'account.languageCopy': 'Elige el idioma principal del launcher. Si se agregan mas idiomas, apareceran aqui automaticamente.',
        'action.install': 'Instalar',
        'action.play': 'Jugar',
        'action.stop': 'Detener',
        'action.delete': 'Eliminar',
        'action.trailer': 'Ver trailer',
        'action.content': 'Contenido',
        'content.kicker': 'Biblioteca de instancia',
        'content.subtitle': 'Activa, desactiva o agrega archivos sin abrir carpetas manualmente.',
        'content.addMods': 'Agregar mods',
        'content.addResourcepacks': 'Agregar texturas',
        'content.addShaders': 'Agregar shaders',
        'content.refresh': 'Actualizar lista',
        'content.ready': 'Selecciona un archivo para cambiar su estado.',
        'content.search': 'Buscar archivo...',
        'content.files': 'Archivos',
        'content.addCurrent': 'Agregar',
        'content.enable': 'Activar',
        'content.disable': 'Desactivar',
        'content.remove': 'Eliminar',
        'settings.minecraftConfigKicker': 'Minecraft',
        'settings.minecraftConfigTitle': 'Configuracion del juego',
        'settings.minecraftConfigCopy': 'Importa presets de controles, opciones, resource packs, shaders y configs desde otra instancia o un modpack.',
        'settings.configTarget': 'Destino',
        'settings.configSource': 'Origen',
        'settings.importFromInstance': 'Importar desde instancia',
        'settings.importFromPack': 'Importar desde .zip/.mrpack',
        'settings.minecraftDefaultsKicker': 'Minecraft',
        'settings.minecraftDefaultsTitle': 'Minecraft In-Game Default Settings',
        'settings.minecraftDefaultsCopy': 'Opciones base que el launcher aplicara a las instancias instaladas.',
        'settings.enabled': 'Activo',
        'settings.videoSettings': 'Video Settings',
        'settings.controlSettings': 'Control Settings',
        'settings.soundSettings': 'Sound Settings',
        'settings.saveMinecraftDefaults': 'Guardar ajustes',
        'settings.resetMinecraftDefaults': 'Restablecer',
        'onboarding.title': 'Configura tu launcher',
        'onboarding.copy': 'Elige tu idioma e inicia sesion con Microsoft o Discord para desbloquear instancias privadas.',
        'onboarding.microsoft': 'Iniciar con Microsoft',
        'onboarding.discord': 'Vincular Discord',
        'onboarding.bugs': 'Reporta cualquier bug en nuestro Discord',
        'onboarding.continue': 'Continuar'
    },
    en: {
        'app.title': 'Obsidian Studios Launcher',
        'app.network': 'Studios Network',
        'support.discord': 'Discord',
        'support.feedback': 'Feedback',
        'status.online': 'Online',
        'action.search': 'Search',
        'action.unlock': 'Unlock',
        'action.checkRole': 'Check role',
        'search.instance': 'Search instance...',
        'access.title': 'Private access',
        'access.copy': 'Use the access key for the selected instance.',
        'access.placeholder': 'Access key',
        'instance.status': 'Instance status',
        'instance.changes': 'Version changes',
        'instance.chooseChanges': 'Select an instance to see its changes.',
        'instance.noChanges': 'No published changes for this version.',
        'instance.project': 'Project',
        'instance.minecraft': 'Minecraft',
        'instance.loader': 'Loader',
        'instance.access': 'Access',
        'instance.private': 'Private',
        'instance.public': 'Public',
        'instance.state': 'Status',
        'console.title': 'System Console',
        'console.filter': 'Filter log...',
        'console.copy': 'Copy',
        'console.clear': 'Clear',
        'console.open': 'Open',
        'console.close': 'Close',
        'nav.console': 'Console',
        'nav.downloads': 'Downloads',
        'diagnostic.kicker': 'Support',
        'diagnostic.title': 'Diagnostics',
        'diagnostic.copy': 'Generate a quick support report when something is not working.',
        'diagnostic.copyReport': 'Copy report',
        'downloads.kicker': 'Activity',
        'downloads.title': 'Download center',
        'downloads.copy': 'Track progress, speed, and processed files during installations.',
        'downloads.idle': 'No active downloads',
        'downloads.open': 'Open center',
        'downloads.pause': 'Pause',
        'downloads.resume': 'Resume',
        'downloads.cancel': 'Cancel',
        'home.eyebrow': 'Obsidian Network',
        'news.eyebrow': 'Obsidian Broadcast',
        'account.minecraftProfile': 'Minecraft profile',
        'account.microsoftLogin': 'Sign in Microsoft',
        'account.refreshSkin': 'Refresh skin',
        'account.offlineMode': 'Offline mode',
        'account.gameIdentity': 'Game identity',
        'account.offlineName': 'Offline name',
        'account.skinUrl': 'Skin URL',
        'account.saveProfile': 'Save profile',
        'account.preview': 'Preview',
        'account.officialSkin': 'Official skin',
        'account.files': 'Files',
        'account.integration': 'Integration',
        'account.linkDiscord': 'Link Discord',
        'account.closeDiscord': 'Close Discord',
        'account.performance': 'Performance',
        'account.ram': 'RAM memory',
        'account.currentVersion': 'Current version',
        'account.checkVersions': 'Check versions',
        'account.activity': 'Activity',
        'account.playtime': 'Play time',
        'nav.instances': 'Instances',
        'nav.news': 'News',
        'nav.account': 'My Account',
        'nav.settings': 'Settings',
        'account.subtitle': 'Your identity, skin, and connections.',
        'settings.kicker': 'Launcher preferences',
        'settings.title': 'Settings',
        'settings.subtitle': 'Adjust performance, language, and updates.',
        'settings.ramCopy': 'Maximum memory Minecraft can use.',
        'settings.ramRecommended': 'Recommended: 6-8 GB',
        'settings.updateCopy': 'Check launcher releases and catalog changes.',
        'settings.supportTitle': 'Help and community',
        'settings.supportCopy': 'Report issues or join the official community.',
        'skin.walk': 'Walk',
        'skin.idle': 'Idle',
        'skin.run': 'Run',
        'skin.wave': 'Wave',
        'skin.fly': 'Fly',
        'skin.none': 'No animation',
        'skin.current': 'Displayed skin',
        'skin.default': 'Default',
        'skin.local': 'Local file',
        'skin.microsoft': 'Microsoft account',
        'skin.localHint': '64x64 or 64x32 PNG. Microsoft accounts also sync it in game.',
        'skin.chooseLocal': 'Change skin',
        'skin.useMicrosoft': 'Reload Microsoft skin',
        'skin.model': 'Arm model',
        'skin.classic': 'Classic (Steve)',
        'skin.slim': 'Slim (Alex)',
        'skin.uploading': 'Syncing...',
        'appearance.open': 'Select skin',
        'appearance.kicker': 'Customization',
        'appearance.title': 'Your appearance',
        'appearance.subtitle': 'Switch skins and manage official capes without leaving the launcher.',
        'appearance.active': 'Active appearance',
        'appearance.refresh': 'Refresh profile',
        'appearance.mySkins': 'My skins',
        'appearance.defaultSkins': 'Default skins',
        'appearance.defaultSkinsHint': 'Classic characters included with Minecraft.',
        'appearance.preview': 'Preview',
        'appearance.animation': 'Animation',
        'appearance.applySelection': 'Apply selection',
        'appearance.selected': 'Selected',
        'appearance.added': 'Skin added to My skins.',
        'appearance.capes': 'Official capes',
        'appearance.capesHint': 'Only capes linked to your Microsoft account are shown.',
        'appearance.ready': 'Choose an appearance to apply it.',
        'appearance.done': 'Done',
        'appearance.addSkin': 'Add skin',
        'appearance.currentSkin': 'Current skin',
        'appearance.noCape': 'No cape',
        'appearance.emptyCapes': 'There are no official capes linked to this account.',
        'appearance.microsoftRequired': 'Sign in with Microsoft to manage capes.',
        'appearance.apply': 'Apply',
        'appearance.activeLabel': 'Active',
        'appearance.remove': 'Remove',
        'appearance.rename': 'Rename',
        'appearance.renamePrompt': 'New name for the skin:',
        'appearance.renamed': 'Skin name updated.',
        'appearance.applying': 'Applying changes...',
        'home.title': 'Available instances',
        'home.subtitle': 'Select, update, and play your private projects from one clean launcher.',
        'home.library': 'Library',
        'home.projects': 'Projects',
        'home.featured': 'Featured project',
        'news.title': 'News and announcements',
        'account.kicker': 'User profile',
        'account.title': 'My Account',
        'account.languageKicker': 'Preferences',
        'account.languageTitle': 'Language',
        'account.languageCopy': 'Choose the main launcher language. If more languages are added, they will appear here automatically.',
        'action.install': 'Install',
        'action.play': 'Play',
        'action.stop': 'Stop',
        'action.delete': 'Delete',
        'action.trailer': 'Watch trailer',
        'action.content': 'Content',
        'content.kicker': 'Instance library',
        'content.subtitle': 'Enable, disable, or add files without opening folders manually.',
        'content.addMods': 'Add mods',
        'content.addResourcepacks': 'Add resource packs',
        'content.addShaders': 'Add shaders',
        'content.refresh': 'Refresh list',
        'content.ready': 'Choose a file to change its state.',
        'content.search': 'Search file...',
        'content.files': 'Files',
        'content.addCurrent': 'Add',
        'content.enable': 'Enable',
        'content.disable': 'Disable',
        'content.remove': 'Remove',
        'settings.minecraftConfigKicker': 'Minecraft',
        'settings.minecraftConfigTitle': 'Game configuration',
        'settings.minecraftConfigCopy': 'Import controls, options, resource packs, shaders, and configs from another instance or modpack.',
        'settings.configTarget': 'Target',
        'settings.configSource': 'Source',
        'settings.importFromInstance': 'Import from instance',
        'settings.importFromPack': 'Import from .zip/.mrpack',
        'settings.minecraftDefaultsKicker': 'Minecraft',
        'settings.minecraftDefaultsTitle': 'Minecraft In-Game Default Settings',
        'settings.minecraftDefaultsCopy': 'Base options the launcher applies to installed instances.',
        'settings.enabled': 'Enabled',
        'settings.videoSettings': 'Video Settings',
        'settings.controlSettings': 'Control Settings',
        'settings.soundSettings': 'Sound Settings',
        'settings.saveMinecraftDefaults': 'Save settings',
        'settings.resetMinecraftDefaults': 'Reset',
        'onboarding.title': 'Set up your launcher',
        'onboarding.copy': 'Choose your language and sign in with Microsoft or Discord to unlock private instances.',
        'onboarding.microsoft': 'Sign in with Microsoft',
        'onboarding.discord': 'Link Discord',
        'onboarding.bugs': 'Report bugs in our Discord',
        'onboarding.continue': 'Continue'
    }
}

const DEFAULT_APPEARANCE_SKINS = [
    { id: 'steve', name: 'Steve', variant: 'classic', skinUrl: 'assets/skins/defaults/steve.png' },
    { id: 'alex', name: 'Alex', variant: 'slim', skinUrl: 'assets/skins/defaults/alex.png' },
    { id: 'noor', name: 'Noor', variant: 'slim', skinUrl: 'assets/skins/defaults/noor.png' },
    { id: 'sunny', name: 'Sunny', variant: 'classic', skinUrl: 'assets/skins/defaults/sunny.png' },
    { id: 'ari', name: 'Ari', variant: 'slim', skinUrl: 'assets/skins/defaults/ari.png' },
    { id: 'zuri', name: 'Zuri', variant: 'slim', skinUrl: 'assets/skins/defaults/zuri.png' },
    { id: 'makena', name: 'Makena', variant: 'classic', skinUrl: 'assets/skins/defaults/makena.png' },
    { id: 'kai', name: 'Kai', variant: 'slim', skinUrl: 'assets/skins/defaults/kai.png' },
    { id: 'efe', name: 'Efe', variant: 'classic', skinUrl: 'assets/skins/defaults/efe.png' }
]

function t(key, fallback = '') {
    return translations[currentLanguage]?.[key] || translations.es?.[key] || fallback || key
}

function renderLocalizedProfileState(profile = lastMinecraftProfile) {
    if (!profile || !profile.username) return
    if (minecraftMode) minecraftMode.innerText = currentLanguage === 'en' ? (profile.mode === 'premium' ? 'Premium account' : 'Offline mode') : (profile.mode === 'premium' ? 'Cuenta premium' : 'Modo offline')
    if (sidebarProfileMode) sidebarProfileMode.innerText = currentLanguage === 'en' ? (profile.mode === 'premium' ? 'Microsoft account' : 'Offline profile') : (profile.mode === 'premium' ? 'Cuenta Microsoft' : 'Perfil offline')
    renderProfileBadges(profile)
}

const DEFAULT_MINECRAFT_DEFAULTS = {
    enabled: true,
    fullscreen: false,
    viewBobbing: true,
    guiScale: 3,
    gamma: 50,
    renderDistance: 12,
    fov: 105,
    autoJump: true,
    invertMouse: false,
    mouseSensitivity: 100,
    soundMaster: 100,
    soundMusic: 0,
    soundRecord: 100,
    soundWeather: 100,
    soundBlock: 100,
    soundHostile: 100,
    soundFriendly: 100,
    soundPlayer: 100,
    soundAmbient: 0,
    soundVoice: 93
}

function getMinecraftDefaultInputs() {
    return Array.from(document.querySelectorAll('[data-mc-option]'))
}

function readMinecraftDefaultInputs() {
    const next = { ...DEFAULT_MINECRAFT_DEFAULTS }
    getMinecraftDefaultInputs().forEach((input) => {
        const key = input.dataset.mcOption
        if (!key) return
        next[key] = input.type === 'checkbox' ? input.checked : Number(input.value)
    })
    return next
}

function renderMinecraftDefaultSettings(settings = minecraftDefaults || DEFAULT_MINECRAFT_DEFAULTS) {
    minecraftDefaults = { ...DEFAULT_MINECRAFT_DEFAULTS, ...(settings || {}) }
    getMinecraftDefaultInputs().forEach((input) => {
        const key = input.dataset.mcOption
        if (!key || minecraftDefaults[key] === undefined) return
        if (input.type === 'checkbox') input.checked = Boolean(minecraftDefaults[key])
        else input.value = String(minecraftDefaults[key])
    })
    document.querySelectorAll('[data-mc-value]').forEach((node) => {
        const key = node.dataset.mcValue
        if (key && minecraftDefaults[key] !== undefined) node.innerText = String(minecraftDefaults[key])
    })
}

window.updateMinecraftDefaultSettings = function() {
    minecraftDefaults = readMinecraftDefaultInputs()
    renderMinecraftDefaultSettings(minecraftDefaults)
}
window.saveMinecraftDefaultSettings = function() {
    minecraftDefaults = readMinecraftDefaultInputs()
    localStorage.setItem('obsidian.minecraftDefaults', JSON.stringify(minecraftDefaults))
    ipcRenderer.send('save-minecraft-defaults', minecraftDefaults)
    showToast(currentLanguage === 'en' ? 'Minecraft defaults saved.' : 'Ajustes de Minecraft guardados.')
}
window.resetMinecraftDefaultSettings = function() {
    minecraftDefaults = { ...DEFAULT_MINECRAFT_DEFAULTS }
    renderMinecraftDefaultSettings(minecraftDefaults)
    localStorage.setItem('obsidian.minecraftDefaults', JSON.stringify(minecraftDefaults))
    ipcRenderer.send('save-minecraft-defaults', minecraftDefaults)
}

function renderSystemInfo(data = lastSystemInfo) {
    if (!data || !Object.keys(data).length) return
    const maxRam = Math.max(8, Number(data.maxRamGB) || 16)
    if (ramSlider) ramSlider.max = String(maxRam)
    if (ramMaxLabel) ramMaxLabel.innerText = `${maxRam} GB`
    if (ramSystemNote) ramSystemNote.innerText = currentLanguage === 'en' ? `${data.totalMemoryGB || maxRam} GB detected on this PC.` : `${data.totalMemoryGB || maxRam} GB detectados en este equipo.`
    if (ramSlider && Number(ramSlider.value) > maxRam) window.updateRamValue(maxRam)
}

function renderDiscordState(user = lastDiscordUser) {
    const name = document.getElementById('username')
    const status = document.getElementById('discord-status')
    const avatar = document.getElementById('discord-avatar')
    if (!name || !status || !avatar) return
    if (!user) {
        name.innerText = currentLanguage === 'en' ? 'Not linked' : 'Sin vincular'
        status.innerText = currentLanguage === 'en' ? 'Use your browser to sign in.' : 'Usa tu navegador para iniciar sesion.'
        avatar.style.backgroundImage = ''
        avatar.innerText = 'DC'
        return
    }
    name.innerText = user.global_name || user.username
    status.innerText = currentLanguage === 'en' ? 'Linked through your browser.' : 'Vinculado desde el navegador.'
    if (user.avatarUrl) { avatar.style.backgroundImage = `url('${user.avatarUrl}')`; avatar.innerText = '' }
    else { avatar.style.backgroundImage = ''; avatar.innerText = 'DC' }
}



function applyLanguage(language = currentLanguage) {
    currentLanguage = translations[language] ? language : 'es'
    localStorage.setItem('obsidian.language', currentLanguage)
    document.documentElement.lang = currentLanguage
    document.querySelectorAll('[data-i18n]').forEach((node) => {
        const value = translations[currentLanguage][node.dataset.i18n]
        if (value) node.innerText = value
    })
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
        const value = translations[currentLanguage][node.dataset.i18nPlaceholder]
        if (value) node.setAttribute('placeholder', value)
    })
    document.querySelectorAll('.language-option').forEach((button) => {
        const buttonLanguage = button.dataset.language || button.id.replace('lang-', '')
        button.classList.toggle('active', buttonLanguage === currentLanguage)
    })
    renderAccountLanguageOptions()
    renderSkinSource(lastMinecraftProfile)
    renderLocalizedProfileState(lastMinecraftProfile)
    if (appearanceModal?.classList.contains('open')) renderAppearanceManager(lastMinecraftProfile)
    renderSystemInfo(lastSystemInfo)
    renderDiscordState(lastDiscordUser)
}

const languageNames = { es: 'Espanol', en: 'English' }

function renderAccountLanguageOptions() {
    if (!accountLanguageList) return
    accountLanguageList.innerHTML = Object.keys(translations).map((language) => {
        const label = languageNames[language] || language.toUpperCase()
        const active = language === currentLanguage ? ' active' : ''
        return `<button class="language-option account-language-option${active}" data-language="${escapeHtml(language)}" onclick="setLanguage('${escapeHtml(language)}')"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(language.toUpperCase())}</span></button>`
    }).join('')
}

function initOnboarding() {
    applyLanguage(currentLanguage)
    if (!onboardingModal) return
    if (localStorage.getItem('obsidian.onboardingDone') === 'true') return
    setTimeout(() => {
        onboardingModal.classList.add('open')
        onboardingModal.setAttribute('aria-hidden', 'false')
    }, 420)
}

window.setLanguage = function(language) {
    applyLanguage(language)
    showToast(language === 'en' ? 'Language set to English.' : 'Idioma cambiado a Espanol.')
}

window.finishOnboarding = function() {
    localStorage.setItem('obsidian.onboardingDone', 'true')
    onboardingModal?.classList.remove('open')
    onboardingModal?.setAttribute('aria-hidden', 'true')
}

window.startMicrosoftFromOnboarding = function() {
    window.loginMinecraftPremium()
    window.finishOnboarding()
}

window.startDiscordFromOnboarding = function() {
    window.loginDiscord()
    window.finishOnboarding()
}

window.openBugDiscord = function() {
    ipcRenderer.send('open-external-url', BUG_DISCORD_URL)
}

function shouldToastImportantLine(line) {
    const value = String(line || '')
    if (/\[WARN\]|warning|Error loading class|ClassNotFound/i.test(value)) return false
    if (!/(Error de instalacion|No se pudo|crash|fatal|Exception in thread|fallo con codigo|invalid_request)/i.test(value)) return false
    const now = Date.now()
    const key = value.slice(0, 140)
    if (key === lastImportantToast && now - lastImportantToastAt < 4500) return false
    lastImportantToast = key
    lastImportantToastAt = now
    return true
}

function startInstallPulse() {
    clearInterval(installPulseTimer)
    installPulseStep = 0
    document.body.classList.add('is-installing')
    installPulseTimer = setInterval(() => {
        installPulseStep += 1
        const labels = [
            'Preparando archivos de la instancia',
            'Verificando librerias y loader',
            'Minecraft sigue trabajando en segundo plano',
            'Casi listo, no cierres el launcher'
        ]
        setLaunchStatus(labels[installPulseStep % labels.length], 'installing')
    }, 5500)
}

function stopInstallPulse() {
    clearInterval(installPulseTimer)
    installPulseTimer = null
    document.body.classList.remove('is-installing')
}

const announcements = {
    'client-108': { date: '15 / 08 / 2026', label: 'Launcher', image: '../56x56-Logo.png', title: 'Obsidian Client - v1.0.8', body: 'Fixed\n- El boton de renombrar skins ahora actualiza el nombre al instante y conserva la seleccion.\n- Los botones de skins ya no disparan acciones dobles dentro de la tarjeta.\n- Los errores de descarga ahora muestran HTTP/status y la URL exacta que fallo.\n\nImproved\n- Diagnostico mas claro para modpacks, dependencias mrpack y loaders.\n- Preparado el versionado interno para la rama 1.0.8.', actionLabel: 'Comprobar versiones', action: { type: 'versions' } },
    'ltdn-update': { date: '23 / 06 / 2026', label: 'Actualizacion', image: 'https://files.catbox.moe/a3txg0.png', title: 'La Tierra de Nadie llega a la v1.0.1', body: 'Esta version incorpora optimizaciones de FPS, prepara el nuevo sistema de voz y corrige problemas de estabilidad detectados en Fabric.', actionLabel: 'Ver instancia', action: { type: 'project', value: 'ltdn' } },
    'restricted-event': { date: '20 / 06 / 2026', label: 'Evento', image: 'https://files.catbox.moe/xp4jjv.png', title: 'Nuevo evento: El Acceso Restringido', body: 'Una experiencia limitada de rol para miembros autorizados. Consulta la instancia para comprobar tu acceso mediante clave privada o rol de Discord.', actionLabel: 'Ver instancia', action: { type: 'project', value: 'proyecto_lore2' } },
    'discord-server': { date: '12 / 06 / 2026', label: 'Comunidad', title: 'Nuevo servidor de Discord', body: 'La validacion de roles ya utiliza el nuevo servidor de Obsidian Studios. Si el launcher todavia muestra "Sin vincular", vuelve a iniciar sesion desde Mi Cuenta.', actionLabel: 'Ir a Mi Cuenta', action: { type: 'tab', value: 'account' } },
    'automatic-java': { date: '03 / 06 / 2026', label: 'Launcher', title: 'Java automatico para cada instancia', body: 'El launcher detecta la version de Minecraft y prepara automaticamente el runtime de Java compatible, incluyendo Java 8, 17, 21 o 25 cuando sea necesario.', actionLabel: 'Ver configuracion', action: { type: 'tab', value: 'account' } }
}
const logHistory = ['Inicializando componentes base del entorno...']
const SUPPORT_URL = 'https://sites.google.com/view/obsidianstudios/feedback-launcher'
const BUG_DISCORD_URL = 'https://discord.gg/eU8n9PYN9Q'

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]))
}

function renderLauncherUpdate(update) {
    if (!launcherUpdateModal || !update) return
    activeLauncherUpdate = update
    const currentVersion = update.current_version || '0.0.0'
    const latestVersion = update.latest_version || '0.0.0'
    launcherUpdateTitle.innerText = `Nueva version v${latestVersion}`
    launcherUpdateBody.innerText = update.required
        ? `Tu launcher actual es v${currentVersion}. Esta actualizacion es obligatoria para seguir usando Obsidian Studios Launcher.`
        : `Tu launcher actual es v${currentVersion}. Puedes descargar la nueva version cuando quieras.`
    const changes = Array.isArray(update.changelog) ? update.changelog : []
    launcherUpdateChangelog.innerHTML = changes.length
        ? changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : `<li>${escapeHtml(t('instance.noChanges', 'No hay cambios publicados para esta version.'))}</li>`
    resetLauncherUpdateProgress()
    launcherUpdateModal.classList.add('open')
    launcherUpdateModal.setAttribute('aria-hidden', 'false')
}

function resetLauncherUpdateProgress() {
    if (launcherUpdateProgress) launcherUpdateProgress.hidden = true
    if (launcherUpdateProgressLabel) launcherUpdateProgressLabel.innerText = 'Preparando descarga...'
    if (launcherUpdateProgressPercent) launcherUpdateProgressPercent.innerText = '0%'
    if (launcherUpdateProgressBar) launcherUpdateProgressBar.style.width = '0%'
    if (launcherUpdateDownloadBtn) { launcherUpdateDownloadBtn.disabled = false; launcherUpdateDownloadBtn.innerText = 'Descargar e instalar' }
    if (launcherUpdateLaterBtn) launcherUpdateLaterBtn.disabled = false
}

function setLauncherUpdateProgress(percent, label) {
    const safe = Math.max(0, Math.min(100, Number(percent) || 0))
    if (launcherUpdateProgress) launcherUpdateProgress.hidden = false
    if (launcherUpdateProgressLabel) launcherUpdateProgressLabel.innerText = label || 'Descargando actualizacion...'
    if (launcherUpdateProgressPercent) launcherUpdateProgressPercent.innerText = `${Math.round(safe)}%`
    if (launcherUpdateProgressBar) launcherUpdateProgressBar.style.width = `${safe}%`
}

window.closeLauncherUpdate = function() {
    if (!launcherUpdateModal || launcherUpdateInDownload()) return
    launcherUpdateModal.classList.remove('open')
    launcherUpdateModal.setAttribute('aria-hidden', 'true')
}

function launcherUpdateInDownload() {
    return Boolean(launcherUpdateDownloadBtn?.disabled && launcherUpdateProgress && !launcherUpdateProgress.hidden)
}

window.downloadLauncherUpdate = function() {
    if (!activeLauncherUpdate?.download_url) return
    if (launcherUpdateDownloadBtn) { launcherUpdateDownloadBtn.disabled = true; launcherUpdateDownloadBtn.innerText = 'Descargando...' }
    if (launcherUpdateLaterBtn) launcherUpdateLaterBtn.disabled = true
    setLauncherUpdateProgress(0, 'Iniciando descarga...')
    showToast(currentLanguage === 'en' ? 'Downloading launcher update...' : 'Descargando actualizacion del launcher...')
    ipcRenderer.send('download-and-install-launcher-update', activeLauncherUpdate)
}
function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function showToast(message, type = 'info') {
    if (!toastStack) return
    const signature = type + '|' + String(message || '')
    const now = Date.now()
    if (signature === lastToastSignature && now - lastToastAt < 2200) return
    lastToastSignature = signature
    lastToastAt = now
    while (toastStack.children.length > 4) toastStack.firstElementChild?.remove()
    const toast = document.createElement('div')
    toast.className = 'toast ' + type
    const title = type === 'error' ? 'Atencion' : type === 'success' ? 'Listo' : 'Sistema'
    toast.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(message) + '</span>'
    toastStack.appendChild(toast)
    requestAnimationFrame(() => toast.classList.add('show'))
    setTimeout(() => {
        toast.classList.remove('show')
        setTimeout(() => toast.remove(), 220)
    }, type === 'error' ? 5200 : 2800)
}

function getProjectStatus(project = {}, state = {}) {
    const rawStatus = String(project.status || '').toLowerCase()
    if (project.maintenance || rawStatus === 'maintenance' || rawStatus === 'mantenimiento' || rawStatus === 'disabled') {
        return { mode: 'maintenance', label: 'No disponible', action: 'Mantenimiento' }
    }
    if (rawStatus === 'needs_curseforge_api' || project.requires_curseforge_api) return { mode: 'error', label: 'Pack incompleto', action: 'Reparar' }
    if (rawStatus === 'needs_config') return { mode: 'error', label: 'Configurar', action: 'Reparar' }
    if (state.error || rawStatus === 'error') return { mode: 'error', label: 'Reparar', action: 'Reparar' }
    if (state.installing) return { mode: 'installing', label: 'Instalando', action: 'Instalando' }
    if (state.isUpdateAvailable || project.isUpdateAvailable) return { mode: 'update', label: 'Actualizar', action: 'Actualizar' }
    if (state.isInstalled || project.isInstalled) return { mode: 'ready', label: 'Actualizado', action: 'Jugar' }
    return { mode: 'install', label: 'Sin instalar', action: 'Instalar' }
}

function syncHeroStatus(mode) {
    if (heroPanel) heroPanel.dataset.status = mode || 'idle'
    if (launchStatusText) launchStatusText.dataset.status = mode || 'idle'
}

function inferStatusMode(label) {
    const text = String(label || '').toLowerCase()
    if (text.includes('error') || text.includes('fall') || text.includes('no se pudo')) return 'error'
    if (text.includes('actualizacion') || text.includes('actualizar')) return 'update'
    if (text.includes('instalando') || text.includes('preparando') || text.includes('procesando')) return 'installing'
    if (text.includes('jugar') || text.includes('ejecucion') || text.includes('completada')) return 'ready'
    if (text.includes('restringido') || text.includes('clave')) return 'locked'
    if (text.includes('discord') || text.includes('comprobando')) return 'checking'
    return 'idle'
}
function titleCase(value) {
    const text = String(value || 'vanilla')
    return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatLoader(project) {
    const loader = titleCase(project?.loader || 'vanilla')
    return project?.loader_version ? `${loader} ${project.loader_version}` : loader
}

function isRestricted(project) {
    return Boolean(project?.codigo_acceso || project?.discord_role_id)
}

function cleanImageUrl(value) {
    let url = String(value || '').trim()
    if (url.startsWith('file://')) return url
    if (/^[a-zA-Z]:\\|^\\\\|^\//.test(url)) return 'file:///' + url.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!url.startsWith('http')) return ''
    if (url.includes('www.dropbox.com')) {
        url = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        if (!url.includes('dl=1')) url += url.includes('?') ? '&dl=1' : '?dl=1'
    }
    return url
}
function renderLogHistory() {
    const term = logSearchTerm.trim().toLowerCase()
    const lines = term ? logHistory.filter((line) => line.toLowerCase().includes(term)) : logHistory
    const pattern = term ? new RegExp(escapeRegExp(term), 'ig') : null
    consoleLog.innerHTML = lines.map((line) => {
        const safe = escapeHtml(line)
        return pattern ? safe.replace(pattern, (match) => `<mark>${match}</mark>`) : safe
    }).join('\n')
    if (logCount) logCount.innerText = `${lines.length} linea${lines.length === 1 ? '' : 's'}`
    consoleLog.scrollTop = consoleLog.scrollHeight
}

function setHeroImage(project) {
    if (!heroBackdrop) return
    const imageUrl = cleanImageUrl(project?.bg_image)
    heroBackdrop.style.backgroundImage = imageUrl ? `url("${imageUrl.replace(/"/g, '%22')}")` : ''
    heroBackdrop.classList.toggle('has-image', Boolean(imageUrl))
}

function setHeroAccess(label, state = 'locked') {
    if (!heroAccess) return
    heroAccess.innerText = label
    heroAccess.dataset.state = state
}

function setLaunchStatus(label, mode = '') {
    if (launchStatusText) launchStatusText.innerText = label
    syncHeroStatus(mode || inferStatusMode(label))
}

function renderHeroDetails(project, state = {}) {
    if (!heroDetails) return
    if (!project) {
        heroDetails.innerHTML = ''
        return
    }

    const status = getProjectStatus(project, state)
    const installedVersion = state.installedVersion || project.installedVersion || ''
    const projectVersion = state.projectVersion || project.projectVersion || project.project_version || '1.0.0'
    const installState = status.mode === 'update' && installedVersion
        ? `${installedVersion} -> ${projectVersion}`
        : status.label

    const chips = [
        [t('instance.project', 'Proyecto'), `v${projectVersion}`, 'version'],
        [t('instance.minecraft', 'Minecraft'), project.minecraft_version || '-', 'minecraft'],
        [t('instance.loader', 'Loader'), formatLoader(project), 'loader'],
        [t('instance.access', 'Acceso'), isRestricted(project) ? t('instance.private', 'Privado') : t('instance.public', 'Publico'), 'access'],
        [t('instance.state', 'Estado'), installState, status.mode]
    ]

    heroDetails.innerHTML = chips.map(([label, value, mode]) => `
        <div class="detail-chip" data-kind="${escapeHtml(mode)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
    `).join('')
}

function getProjectChangelog(project) {
    if (Array.isArray(project?.changelog)) return project.changelog.filter(Boolean).map(String)
    return String(project?.changelog || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function renderChangelog(project) {
    if (!changelogVersion || !changelogList) return
    const changes = getProjectChangelog(project)
    changelogVersion.innerText = project ? `v${project.project_version || '1.0.0'}` : 'v--'
    changelogList.innerHTML = changes.length
        ? changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('')
        : `<li>${escapeHtml(t('instance.noChanges', 'No hay cambios publicados para esta version.'))}</li>`
}

function renderTrailerAvailability(project) {
    if (!trailerButton) return
    trailerButton.style.display = String(project?.trailer_url || '').trim() ? 'inline-flex' : 'none'
}

function getFilteredServers() {
    if (!catalogFilter) return currentServers
    return currentServers.filter((server) => {
        const searchable = [server.name, server.description, server.minecraft_version, server.loader, server.loader_version, server.project_version, server.status, server.source]
            .join(' ').toLowerCase()
        return searchable.includes(catalogFilter)
    })
}

function renderCatalogStats() {
    const total = currentServers.length
    const visible = getFilteredServers().length
    const count = document.getElementById('catalog-count')
    if (count) count.innerText = catalogFilter ? `${visible} de ${total}` : `${total} ${currentLanguage === 'en' ? 'active' : 'activos'}`
}

function drawSkinHead(canvas, image) {
    const context = canvas.getContext('2d')
    const size = canvas.width
    const scale = image.naturalWidth / 64
    context.clearRect(0, 0, size, size)
    context.imageSmoothingEnabled = false
    context.drawImage(image, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size)
    if (image.naturalWidth >= 64) {
        context.drawImage(image, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size)
    }
}

function renderSidebarHead(skinUrl) {
    const canvases = [sidebarSkinHead, titlebarSkinHead].filter(Boolean)
    const fallbacks = document.querySelectorAll('.fallback-profile-logo, .titlebar-fallback-logo')
    if (!canvases.length) return

    if (!skinUrl) {
        canvases.forEach((canvas) => { canvas.style.display = 'none' })
        fallbacks.forEach((fallback) => { fallback.style.display = 'block' })
        return
    }

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
        canvases.forEach((canvas) => {
            drawSkinHead(canvas, image)
            canvas.style.display = 'block'
        })
        fallbacks.forEach((fallback) => { fallback.style.display = 'none' })
    }
    image.onerror = () => {
        canvases.forEach((canvas) => { canvas.style.display = 'none' })
        fallbacks.forEach((fallback) => { fallback.style.display = 'block' })
    }
    const separator = String(skinUrl).includes('?') ? '&' : '?'
    image.src = `${skinUrl}${separator}obsidian_refresh=${Date.now()}`
}
function paintAppearanceHead(canvas, skinUrl) {
    if (!canvas) return
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (!skinUrl) {
        context.fillStyle = '#17131f'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = '#7d718b'
        context.font = '700 28px sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText('?', canvas.width / 2, canvas.height / 2)
        return
    }
    const image = new Image()
    if (!String(skinUrl).startsWith('data:')) image.crossOrigin = 'anonymous'
    image.onload = () => drawSkinHead(canvas, image)
    image.onerror = () => paintAppearanceHead(canvas, '')
    image.src = skinUrl
}

function paintCapePreview(canvas, capeUrl) {
    if (!canvas || !capeUrl) return
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    const image = new Image()
    if (!String(capeUrl).startsWith('data:')) image.crossOrigin = 'anonymous'
    image.onload = () => {
        const scale = Math.max(1, image.naturalWidth / 64)
        context.imageSmoothingEnabled = false
        context.drawImage(image, 1 * scale, 1 * scale, 10 * scale, 16 * scale, 0, 0, canvas.width, canvas.height)
    }
    image.src = capeUrl
}
function appearanceSourceLabel(profile = {}) {
    const source = profile.skinSource || (profile.skinUrl ? 'microsoft' : 'default')
    if (source === 'local') return t('skin.local', 'Archivo local')
    if (source === 'microsoft') return t('skin.microsoft', 'Cuenta Microsoft')
    return t('skin.default', 'Predeterminada')
}

function paintSkinFigure(canvas, skinUrl, variant = 'classic') {
    if (!canvas || !skinUrl) return
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    const image = new Image()
    if (!String(skinUrl).startsWith('data:')) image.crossOrigin = 'anonymous'
    image.onload = () => {
        context.imageSmoothingEnabled = false
        const scale = Math.max(1, image.naturalWidth / 64)
        const slim = variant === 'slim'
        const armWidth = slim ? 3 : 4
        const unit = 3.7
        const center = canvas.width / 2
        const headSize = 8 * unit
        const torsoWidth = 8 * unit
        const torsoHeight = 12 * unit
        const limbWidth = armWidth * unit
        const legWidth = 4 * unit
        const top = 4
        const bodyTop = top + headSize
        const legTop = bodyTop + torsoHeight
        const torsoLeft = center - torsoWidth / 2
        const draw = (sx, sy, sw, sh, dx, dy, dw, dh) => context.drawImage(image, sx * scale, sy * scale, sw * scale, sh * scale, dx, dy, dw, dh)
        draw(8, 8, 8, 8, center - headSize / 2, top, headSize, headSize)
        draw(40, 8, 8, 8, center - headSize / 2, top, headSize, headSize)
        draw(20, 20, 8, 12, torsoLeft, bodyTop, torsoWidth, torsoHeight)
        draw(20, 36, 8, 12, torsoLeft, bodyTop, torsoWidth, torsoHeight)
        draw(44, 20, armWidth, 12, torsoLeft - limbWidth, bodyTop, limbWidth, torsoHeight)
        draw(44, 36, armWidth, 12, torsoLeft - limbWidth, bodyTop, limbWidth, torsoHeight)
        draw(36, 52, armWidth, 12, torsoLeft + torsoWidth, bodyTop, limbWidth, torsoHeight)
        draw(52, 52, armWidth, 12, torsoLeft + torsoWidth, bodyTop, limbWidth, torsoHeight)
        draw(4, 20, 4, 12, center - legWidth, legTop, legWidth, torsoHeight)
        draw(4, 36, 4, 12, center - legWidth, legTop, legWidth, torsoHeight)
        draw(20, 52, 4, 12, center, legTop, legWidth, torsoHeight)
        draw(4, 52, 4, 12, center, legTop, legWidth, torsoHeight)
    }
    image.src = skinUrl
}

function getActiveAppearanceSelection(profile = lastMinecraftProfile) {
    const safeProfile = profile || {}
    const skins = Array.isArray(safeProfile.skinLibrary) ? safeProfile.skinLibrary : []
    const capes = Array.isArray(safeProfile.availableCapes) ? safeProfile.availableCapes : []
    const activeCape = capes.find((cape) => cape.active)
    const activeSaved = skins.find((item) => item.id === safeProfile.activeSkinLibraryId)
    const activeDefault = DEFAULT_APPEARANCE_SKINS.find((item) => item.id === safeProfile.activeDefaultSkinId)
    const skin = activeSaved || activeDefault
    return {
        skinKind: activeSaved ? 'saved' : activeDefault ? 'default' : 'current',
        skinId: skin?.id || '',
        skinUrl: skin?.skinUrl || safeProfile.skinUrl || '',
        skinName: skin?.name || safeProfile.username || t('appearance.currentSkin', 'Skin actual'),
        skinVariant: skin?.variant || safeProfile.skinVariant || 'classic',
        capeId: activeCape?.id || '',
        capeUrl: activeCape?.url || '',
        capeName: activeCape?.alias || t('appearance.noCape', 'Sin capa')
    }
}

function normalizeAppearanceSelection(profile = lastMinecraftProfile) {
    const safeProfile = profile || {}
    const skins = Array.isArray(safeProfile.skinLibrary) ? safeProfile.skinLibrary : []
    const capes = Array.isArray(safeProfile.availableCapes) ? safeProfile.availableCapes : []
    if (!appearanceSelection) appearanceSelection = getActiveAppearanceSelection(safeProfile)
    if (appearanceSelection.skinKind === 'saved' && !skins.some((item) => item.id === appearanceSelection.skinId)) appearanceSelection = getActiveAppearanceSelection(safeProfile)
    if (appearanceSelection.skinKind === 'default' && !DEFAULT_APPEARANCE_SKINS.some((item) => item.id === appearanceSelection.skinId)) appearanceSelection = getActiveAppearanceSelection(safeProfile)
    if (appearanceSelection.capeId && !capes.some((cape) => cape.id === appearanceSelection.capeId)) {
        appearanceSelection.capeId = ''
        appearanceSelection.capeUrl = ''
        appearanceSelection.capeName = t('appearance.noCape', 'Sin capa')
    }
    return appearanceSelection
}

function renderAppearanceViewer(selection) {
    if (!appearanceViewer) return
    if (appearanceSkinViewer && typeof appearanceSkinViewer.dispose === 'function') {
        try { appearanceSkinViewer.dispose() } catch (err) {}
    }
    appearanceSkinViewer = null
    appearanceViewer.innerHTML = ''
    if (!selection?.skinUrl || !window.skinview3d?.SkinViewer) {
        appearanceViewer.innerHTML = '<span class="appearance-viewer-empty">SKIN</span>'
        return
    }
    const canvas = document.createElement('canvas')
    canvas.width = 290
    canvas.height = 410
    appearanceViewer.appendChild(canvas)
    try {
        const animationMode = appearanceAnimationSelect?.value || localStorage.getItem('obsidian.appearanceAnimation') || 'idle'
        appearanceSkinViewer = new window.skinview3d.SkinViewer({
            canvas,
            width: 290,
            height: 410,
            skin: selection.skinUrl,
            cape: selection.capeUrl || undefined,
            enableControls: true,
            animation: createSkinAnimation(animationMode)
        })
        appearanceSkinViewer.fov = 42
        appearanceSkinViewer.zoom = selection.capeUrl ? 0.76 : 0.84
        appearanceSkinViewer.globalLight.intensity = 2.8
        appearanceSkinViewer.cameraLight.intensity = 0.6
        appearanceSkinViewer.autoRotate = false
        appearanceSkinViewer.controls.enablePan = false
        appearanceSkinViewer.controls.enableZoom = true
        appearanceSkinViewer.controls.rotateSpeed = 0.72
        appearanceSkinViewer.playerObject.rotation.y = selection.capeUrl ? -0.62 : -0.34
    } catch (err) {
        appearanceViewer.innerHTML = '<span class="appearance-viewer-empty">SKIN</span>'
    }
}

function renderAppearanceManager(profile = lastMinecraftProfile) {
    if (!appearanceModal || !skinLibraryGrid || !defaultSkinGrid || !capeLibraryGrid) return
    const safeProfile = profile || {}
    const skins = Array.isArray(safeProfile.skinLibrary) ? safeProfile.skinLibrary : []
    const capes = Array.isArray(safeProfile.availableCapes) ? safeProfile.availableCapes : []
    const activeCape = capes.find((cape) => cape.active)
    const isPremium = safeProfile.mode === 'premium' && safeProfile.premiumReady !== false
    const isBusy = Boolean(appearanceOperation.loading)
    const selection = normalizeAppearanceSelection(safeProfile)
    const activeSelection = getActiveAppearanceSelection(safeProfile)
    const activeSkinKey = activeSelection.skinKind + ':' + activeSelection.skinId
    const selectedSkinKey = selection.skinKind + ':' + selection.skinId
    const hasChanges = activeSkinKey !== selectedSkinKey || activeSelection.capeId !== selection.capeId || String(activeSelection.skinVariant || 'classic') !== String(selection.skinVariant || 'classic')

    if (appearanceCurrentName) appearanceCurrentName.innerText = safeProfile.username || 'PlayerTest'
    if (appearanceCurrentDetail) appearanceCurrentDetail.innerText = appearanceSourceLabel(safeProfile) + ' - ' + (activeCape?.alias || t('appearance.noCape', 'Sin capa'))
    if (appearancePreviewName) appearancePreviewName.innerText = selection.skinName || safeProfile.username || 'PlayerTest'
    if (appearancePreviewDetail) appearancePreviewDetail.innerText = (selection.skinVariant === 'slim' ? t('skin.slim', 'Delgado (Alex)') : t('skin.classic', 'Clasico (Steve)')) + ' - ' + (selection.capeName || t('appearance.noCape', 'Sin capa'))
    if (appearanceVariantSelect) appearanceVariantSelect.value = selection.skinVariant === 'slim' ? 'slim' : 'classic'
    if (appearanceAnimationSelect && !appearanceAnimationSelect.dataset.ready) {
        appearanceAnimationSelect.value = localStorage.getItem('obsidian.appearanceAnimation') || 'idle'
        appearanceAnimationSelect.dataset.ready = 'true'
    }
    if (appearanceApplyButton) {
        appearanceApplyButton.disabled = isBusy || !hasChanges
        appearanceApplyButton.innerText = isBusy ? t('appearance.applying', 'Aplicando cambios...') : t('appearance.applySelection', 'Aplicar seleccion')
    }

    paintAppearanceHead(appearanceCurrentHead, safeProfile.skinUrl || '')
    renderAppearanceViewer(selection)

    const activeSavedId = safeProfile.activeSkinLibraryId || ''
    const activeDefaultId = safeProfile.activeDefaultSkinId || ''
    const skinCards = []
    skinCards.push('<button class="skin-add-card" onclick="chooseLocalSkin()" ' + (isBusy ? 'disabled' : '') + '><span>+</span><strong>' + escapeHtml(t('appearance.addSkin', 'Agregar skin')) + '</strong><small>PNG 64x64 / 64x32</small></button>')
    if (safeProfile.skinUrl && !activeSavedId && !activeDefaultId) {
        const selected = selection.skinKind === 'current'
        skinCards.push('<article class="skin-library-card active readonly' + (selected ? ' selected' : '') + '"><button type="button" class="skin-card-select" onclick="previewCurrentAppearance()"><div class="skin-card-preview"><canvas width="92" height="128" data-current-skin="true"></canvas><span>' + escapeHtml(selected ? t('appearance.selected', 'Seleccionada') : t('appearance.activeLabel', 'Activa')) + '</span></div><div class="skin-card-copy"><strong>' + escapeHtml(t('appearance.currentSkin', 'Skin actual')) + '</strong><small>' + escapeHtml(appearanceSourceLabel(safeProfile)) + '</small></div></button></article>')
    }
    skins.forEach((item, index) => {
        const active = item.id === activeSavedId
        const selected = selection.skinKind === 'saved' && selection.skinId === item.id
        skinCards.push('<article class="skin-library-card' + (active ? ' active' : '') + (selected ? ' selected' : '') + '"><button type="button" class="skin-card-select" onclick="previewSavedAppearance(\'' + escapeHtml(item.id) + '\')" ' + (isBusy ? 'disabled' : '') + '><div class="skin-card-preview"><canvas width="92" height="128" data-skin-index="' + index + '"></canvas><span>' + escapeHtml(selected ? t('appearance.selected', 'Seleccionada') : active ? t('appearance.activeLabel', 'Activa') : t('appearance.preview', 'Vista previa')) + '</span></div><div class="skin-card-copy"><strong>' + escapeHtml(item.name || 'Skin') + '</strong><small>' + escapeHtml(item.variant === 'slim' ? t('skin.slim', 'Delgado (Alex)') : t('skin.classic', 'Clasico (Steve)')) + '</small></div></button><button type="button" class="skin-card-rename" data-skin-id="' + escapeHtml(item.id) + '" title="' + escapeHtml(t('appearance.rename', 'Renombrar')) + '" aria-label="' + escapeHtml(t('appearance.rename', 'Renombrar')) + '" onclick="renameSavedSkin(event, \'' + escapeHtml(item.id) + '\')" ' + (isBusy ? 'disabled' : '') + '>&#9998;</button><button type="button" class="skin-card-remove" title="' + escapeHtml(t('appearance.remove', 'Eliminar')) + '" onclick="removeSavedSkin(event, \'' + escapeHtml(item.id) + '\')" ' + (isBusy || active ? 'disabled' : '') + '>x</button></article>')
    })
    skinLibraryGrid.innerHTML = skinCards.join('')
    skinLibraryGrid.querySelectorAll('.skin-card-rename').forEach((button) => button.addEventListener('click', (event) => window.renameSavedSkin(event, button.dataset.skinId)))
    skinLibraryGrid.querySelectorAll('canvas[data-skin-index]').forEach((canvas) => {
        const item = skins[Number(canvas.dataset.skinIndex)]
        if (item) paintSkinFigure(canvas, item.skinUrl, item.variant)
    })
    paintSkinFigure(skinLibraryGrid.querySelector('canvas[data-current-skin]'), safeProfile.skinUrl || '', safeProfile.skinVariant || 'classic')

    defaultSkinGrid.innerHTML = DEFAULT_APPEARANCE_SKINS.map((item, index) => {
        const active = item.id === activeDefaultId
        const selected = selection.skinKind === 'default' && selection.skinId === item.id
        return '<article class="skin-library-card default-skin-card' + (active ? ' active' : '') + (selected ? ' selected' : '') + '"><button type="button" class="skin-card-select" onclick="previewDefaultAppearance(\'' + item.id + '\')" ' + (isBusy ? 'disabled' : '') + '><div class="skin-card-preview"><canvas width="92" height="128" data-default-skin-index="' + index + '"></canvas><span>' + escapeHtml(selected ? t('appearance.selected', 'Seleccionada') : active ? t('appearance.activeLabel', 'Activa') : t('appearance.preview', 'Vista previa')) + '</span></div><div class="skin-card-copy"><strong>' + item.name + '</strong><small>' + escapeHtml(item.variant === 'slim' ? t('skin.slim', 'Delgado (Alex)') : t('skin.classic', 'Clasico (Steve)')) + '</small></div></button></article>'
    }).join('')
    defaultSkinGrid.querySelectorAll('canvas[data-default-skin-index]').forEach((canvas) => {
        const item = DEFAULT_APPEARANCE_SKINS[Number(canvas.dataset.defaultSkinIndex)]
        if (item) paintSkinFigure(canvas, item.skinUrl, item.variant)
    })

    const capeCards = []
    const noCapeActive = !activeCape
    const noCapeSelected = !selection.capeId
    capeCards.push('<button class="cape-library-card no-cape' + (noCapeActive ? ' active' : '') + (noCapeSelected ? ' selected' : '') + '" onclick="previewAppearanceCape(\'\')" ' + (isBusy ? 'disabled' : '') + '><span class="cape-none-icon">x</span><div><strong>' + escapeHtml(t('appearance.noCape', 'Sin capa')) + '</strong><small>' + escapeHtml(noCapeSelected ? t('appearance.selected', 'Seleccionada') : noCapeActive ? t('appearance.activeLabel', 'Activa') : t('appearance.preview', 'Vista previa')) + '</small></div></button>')
    capes.forEach((cape, index) => {
        const selected = selection.capeId === cape.id
        capeCards.push('<button class="cape-library-card' + (cape.active ? ' active' : '') + (selected ? ' selected' : '') + '" onclick="previewAppearanceCape(\'' + escapeHtml(cape.id) + '\')" ' + (isBusy ? 'disabled' : '') + '><span class="cape-preview"><canvas width="70" height="112" data-cape-index="' + index + '"></canvas></span><div><strong>' + escapeHtml(cape.alias || 'Minecraft Cape') + '</strong><small>' + escapeHtml(selected ? t('appearance.selected', 'Seleccionada') : cape.active ? t('appearance.activeLabel', 'Activa') : t('appearance.preview', 'Vista previa')) + '</small></div></button>')
    })
    if (!isPremium) capeCards.push('<div class="appearance-empty"><strong>' + escapeHtml(t('appearance.microsoftRequired', 'Inicia sesion con Microsoft para administrar capas.')) + '</strong></div>')
    else if (!capes.length) capeCards.push('<div class="appearance-empty"><strong>' + escapeHtml(t('appearance.emptyCapes', 'No hay capas oficiales asociadas a esta cuenta.')) + '</strong></div>')
    capeLibraryGrid.innerHTML = capeCards.join('')
    capeLibraryGrid.querySelectorAll('canvas[data-cape-index]').forEach((canvas) => {
        const cape = capes[Number(canvas.dataset.capeIndex)]
        if (cape) paintCapePreview(canvas, cape.url)
    })
    if (appearanceStatus) appearanceStatus.innerText = isBusy ? t('appearance.applying', 'Aplicando cambios...') : hasChanges ? t('appearance.ready', 'Elige una apariencia para aplicarla.') : (currentLanguage === 'en' ? 'This appearance is active.' : 'Esta apariencia ya esta activa.')
}

window.openAppearanceManager = function() {
    appearanceSelection = null
    renderAppearanceManager(lastMinecraftProfile)
    appearanceModal?.classList.add('open')
    appearanceModal?.setAttribute('aria-hidden', 'false')
}
window.closeAppearanceManager = function() {
    if (appearanceOperation.loading) return
    appearanceModal?.classList.remove('open')
    appearanceModal?.setAttribute('aria-hidden', 'true')
    if (appearanceSkinViewer && typeof appearanceSkinViewer.dispose === 'function') {
        try { appearanceSkinViewer.dispose() } catch (err) {}
    }
    appearanceSkinViewer = null
}
window.refreshAppearanceProfile = function() {
    if (appearanceStatus) appearanceStatus.innerText = currentLanguage === 'en' ? 'Refreshing Microsoft profile...' : 'Actualizando perfil de Microsoft...'
    ipcRenderer.send(lastMinecraftProfile?.mode === 'premium' ? 'refresh-minecraft-profile' : 'get-minecraft-profile')
}
window.previewCurrentAppearance = function() {
    const active = getActiveAppearanceSelection(lastMinecraftProfile)
    appearanceSelection = { ...active, skinKind: 'current', skinId: '', skinUrl: lastMinecraftProfile.skinUrl || '', skinName: lastMinecraftProfile.username || t('appearance.currentSkin', 'Skin actual'), skinVariant: lastMinecraftProfile.skinVariant || 'classic' }
    renderAppearanceManager(lastMinecraftProfile)
}
window.previewSavedAppearance = function(id) {
    const item = (lastMinecraftProfile.skinLibrary || []).find((skin) => skin.id === id)
    if (!item) return
    const current = normalizeAppearanceSelection(lastMinecraftProfile)
    appearanceSelection = { ...current, skinKind: 'saved', skinId: item.id, skinUrl: item.skinUrl, skinName: item.name || 'Skin', skinVariant: item.variant || 'classic' }
    renderAppearanceManager(lastMinecraftProfile)
}
window.previewDefaultAppearance = function(id) {
    const item = DEFAULT_APPEARANCE_SKINS.find((skin) => skin.id === id)
    if (!item) return
    const current = normalizeAppearanceSelection(lastMinecraftProfile)
    appearanceSelection = { ...current, skinKind: 'default', skinId: item.id, skinUrl: item.skinUrl, skinName: item.name, skinVariant: item.variant }
    renderAppearanceManager(lastMinecraftProfile)
}
window.previewAppearanceCape = function(id) {
    const cape = (lastMinecraftProfile.availableCapes || []).find((item) => item.id === id)
    const current = normalizeAppearanceSelection(lastMinecraftProfile)
    appearanceSelection = { ...current, capeId: cape?.id || '', capeUrl: cape?.url || '', capeName: cape?.alias || t('appearance.noCape', 'Sin capa') }
    renderAppearanceManager(lastMinecraftProfile)
}
window.updateAppearanceVariant = function(variant) {
    const current = normalizeAppearanceSelection(lastMinecraftProfile)
    appearanceSelection = { ...current, skinVariant: variant === 'slim' ? 'slim' : 'classic' }
    renderAppearanceManager(lastMinecraftProfile)
}
window.updateAppearanceAnimation = function(mode) {
    localStorage.setItem('obsidian.appearanceAnimation', mode)
    if (appearanceSkinViewer) appearanceSkinViewer.animation = createSkinAnimation(mode)
}
window.applyAppearanceSelection = function() {
    if (appearanceOperation.loading || !appearanceSelection) return
    ipcRenderer.send('apply-appearance-selection', {
        skinKind: appearanceSelection.skinKind,
        skinId: appearanceSelection.skinId,
        skinVariant: appearanceSelection.skinVariant,
        capeId: appearanceSelection.capeId
    })
}
window.applySavedSkin = function(id) {
    if (appearanceOperation.loading) return
    ipcRenderer.send('apply-saved-skin', id)
}
window.renameSavedSkin = function(event, id) {
    event?.preventDefault()
    event?.stopPropagation()
    if (appearanceOperation.loading) return
    const item = (lastMinecraftProfile.skinLibrary || []).find((skin) => skin.id === id)
    if (!item) return
    const nextName = window.prompt(t('appearance.renamePrompt', 'Nuevo nombre para la skin:'), item.name || 'Skin')
    if (nextName === null) return
    const normalized = String(nextName).trim().slice(0, 48)
    if (!normalized || normalized === item.name) return
    item.name = normalized
    if (appearanceSelection?.skinKind === 'saved' && appearanceSelection.skinId === id) appearanceSelection.skinName = normalized
    if (appearanceModal?.classList.contains('open')) renderAppearanceManager(lastMinecraftProfile)
    ipcRenderer.send('rename-saved-skin', { id, name: normalized })
}
window.removeSavedSkin = function(event, id) {
    event?.stopPropagation()
    if (appearanceOperation.loading) return
    const message = currentLanguage === 'en' ? 'Remove this skin from the launcher library?' : 'Eliminar esta skin de la biblioteca del launcher?'
    if (window.confirm(message)) {
        if (appearanceSelection?.skinKind === 'saved' && appearanceSelection.skinId === id) appearanceSelection = null
        ipcRenderer.send('remove-saved-skin', id)
    }
}
window.setMinecraftCape = function(id) {
    if (appearanceOperation.loading || lastMinecraftProfile?.mode !== 'premium') return
    ipcRenderer.send('set-minecraft-cape', id || '')
}
function renderMicrosoftSyncStatus(profile = {}) {
    if (!microsoftSyncStatus) return
    const synced = profile.mode === 'premium' && profile.premiumReady !== false
    microsoftSyncStatus.dataset.state = synced ? 'synced' : 'offline'
    const title = currentLanguage === 'en'
        ? (synced ? 'Microsoft synced' : 'Microsoft not synced')
        : (synced ? 'Microsoft sincronizado' : 'Microsoft no sincronizado')
    const detail = currentLanguage === 'en'
        ? (synced ? 'Premium account ready to play.' : 'Sign in to use your premium account.')
        : (synced ? 'Cuenta premium lista para jugar.' : 'Inicia sesion para usar tu cuenta premium.')
    microsoftSyncStatus.innerHTML = `<span class="sync-dot"></span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div>`
}

function renderSkinSource(profile = {}) {
    if (!skinSourceLabel) return
    const source = profile.skinSource || (profile.skinUrl ? 'microsoft' : 'default')
    const labels = {
        local: t('skin.local', 'Archivo local'),
        microsoft: t('skin.microsoft', 'Cuenta Microsoft'),
        default: t('skin.default', 'Predeterminada')
    }
    skinSourceLabel.innerText = labels[source] || labels.default
    skinSourceLabel.dataset.source = source
}

function renderProfileBadges(profile = {}) {
    if (!profileBadges) return
    const labels = currentLanguage === 'en'
        ? [profile.mode === 'premium' ? 'Premium' : 'Offline', profile.skinUrl ? 'Active skin' : 'Default skin', profile.capeUrl ? 'Cape detected' : 'No cape']
        : [profile.mode === 'premium' ? 'Premium' : 'Offline', profile.skinUrl ? 'Skin activa' : 'Skin por defecto', profile.capeUrl ? 'Capa detectada' : 'Sin capa']
    profileBadges.innerHTML = labels.map((label) => `<span>${escapeHtml(label)}</span>`).join('')
    renderMicrosoftSyncStatus(profile)
    renderSkinSource(profile)
}

function getMaintenanceMessage(project = selectedProject) {
    return project?.maintenance_message || remoteCatalogMessage?.message || (currentLanguage === 'en' ? 'Some features may be temporarily unavailable.' : 'Algunas funciones pueden no estar disponibles temporalmente.')
}

function renderProjectPreview(project) {
    selectedProject = project
    const status = getProjectStatus(project)
    heroTitle.innerText = project?.name || 'Selecciona una instancia'
    heroDesc.innerText = project
        ? `${project.description || 'Sin descripcion disponible.'}${status.mode === 'maintenance' ? `\n${getMaintenanceMessage(project)}` : `\nProyecto v${project.project_version || '1.0.0'}`}`
        : 'Elige una instancia del catalogo para ver sus detalles.'
    setHeroImage(project)
    renderHeroDetails(project)
    renderChangelog(project)
    renderTrailerAvailability(project)
    setHeroAccess(project && isRestricted(project) ? 'Acceso privado' : 'Acceso publico', project && isRestricted(project) ? 'locked' : 'public')
    setLaunchStatus(project ? (status.mode === 'maintenance' ? 'Instancia en mantenimiento' : 'Comprobando acceso') : 'Lista para seleccionar', status.mode === 'maintenance' ? 'maintenance' : 'checking')
    setButtonState({ canDelete: Boolean(project?.isInstalled), canInstall: false, canPlay: false })
    renderCatalogStats()
}

function requestProjectAccess(serverId, password = '', recheck = false) {
    if (!serverId) return
    const normalizedPassword = String(password || '')
    if (pendingAccess?.serverId === serverId && !normalizedPassword && !recheck) {
        setHeroAccess('Verificando acceso', 'checking')
        setLaunchStatus('Comprobando rol de Discord...')
        return
    }
    accessRequestId += 1
    pendingAccess = { serverId, requestId: accessRequestId }
    setHeroAccess('Verificando acceso', 'checking')
    setLaunchStatus('Comprobando rol de Discord...')
    const channel = recheck ? 'recheck-discord-access' : 'request-server-access'
    ipcRenderer.send(channel, { serverId, password: normalizedPassword, requestId: accessRequestId })
}

function finishAccessRequest(data = {}) {
    if (!isCurrentAccessResponse(data)) return false
    if (!data.requestId || pendingAccess?.requestId === Number(data.requestId)) pendingAccess = null
    return true
}

function isCurrentAccessResponse(data = {}) {
    if (data.requestId && Number(data.requestId) !== accessRequestId) return false
    if (data.serverId && String(data.serverId) !== String(targetServerId)) return false
    const responseProjectId = data.project?.id
    return !responseProjectId || String(responseProjectId) === String(targetServerId)
}

function renderMinecraftConfigSourceOptions() {
    const projects = currentServers.filter((project) => project && project.id)
    const options = projects.map((project) => '<option value="' + escapeHtml(project.id) + '">' + escapeHtml(project.name || project.id) + '</option>').join('')
    if (configTargetInstance) {
        configTargetInstance.innerHTML = options || '<option value="">Sin instancias</option>'
        configTargetInstance.value = selectedProject?.id || targetServerId || projects[0]?.id || ''
    }
    if (configSourceInstance) {
        configSourceInstance.innerHTML = options || '<option value="">Sin instancias</option>'
        const fallback = projects.find((project) => project.id !== (configTargetInstance?.value || targetServerId)) || projects[0]
        configSourceInstance.value = fallback?.id || ''
    }
}

function getConfigPresetGroups() {
    return Array.from(document.querySelectorAll('.config-preset-options input:checked')).map((node) => node.value)
}
function closeInstanceContextMenu() {
    if (!instanceContextMenu) return
    instanceContextMenu.classList.remove('open')
    instanceContextMenu.setAttribute('aria-hidden', 'true')
}

function openInstanceContextMenu(event, server) {
    if (!instanceContextMenu || !server) return
    event.preventDefault()
    contextMenuProjectId = server.id
    targetServerId = server.id
    selectedProject = server
    renderProjectPreview(server)
    renderServerCards()
    const status = getProjectStatus(server)
    instanceContextMenu.innerHTML = '<button onclick="openSelectedInstanceFolder(contextMenuProjectId); closeInstanceContextMenu()">Archivos</button><button onclick="openInstanceContent(contextMenuProjectId); closeInstanceContextMenu()">Contenido</button><button onclick="recheckDiscordAccess(); closeInstanceContextMenu()">Comprobar acceso</button>' + (status.mode !== 'missing' ? '<button class="danger" onclick="eliminarInstancia(); closeInstanceContextMenu()">Eliminar instalacion</button>' : '')
    instanceContextMenu.style.left = Math.min(event.clientX, window.innerWidth - 230) + 'px'
    instanceContextMenu.style.top = Math.min(event.clientY, window.innerHeight - 170) + 'px'
    instanceContextMenu.classList.add('open')
    instanceContextMenu.setAttribute('aria-hidden', 'false')
}

function renderServerCards() {
    const grid = document.getElementById('instance-grid')
    const servers = getFilteredServers()
    grid.innerHTML = ''

    if (!servers.length) {
        grid.innerHTML = `<div class="empty-state">${currentServers.length ? 'No hay coincidencias para esta busqueda.' : 'No hay instancias disponibles.'}</div>`
        renderCatalogStats()
        return
    }

    servers.forEach((server, index) => {
        const locked = isRestricted(server)
        const imageUrl = cleanImageUrl(server.bg_image)
        const status = getProjectStatus(server)
        const card = document.createElement('article')
        card.className = `card ${targetServerId === server.id ? 'active' : ''}`
        card.dataset.serverId = server.id
        card.dataset.status = status.mode
        card.style.animationDelay = `${Math.min(index * 35, 220)}ms`
        card.innerHTML = `
            <div class="card-media" style="${imageUrl ? `background-image:url('${escapeHtml(imageUrl)}')` : ''}">
                <span class="card-lock">${locked ? 'Privada' : 'Publica'}</span>
                <span class="card-state">${escapeHtml(status.label)}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${escapeHtml(server.name)}</div>
                <div class="card-description">${escapeHtml(server.description || 'Sin descripcion disponible.')}</div>
                <div class="card-meta"><span>${escapeHtml(server.minecraft_version || '-')}</span><span class="dot"></span><span>${escapeHtml(titleCase(server.loader || 'vanilla'))}</span><span class="card-version">v${escapeHtml(server.project_version || '1.0.0')}</span></div>
            </div>
        `

        card.oncontextmenu = (event) => openInstanceContextMenu(event, server)

        card.onclick = () => {
            targetServerId = server.id
            document.querySelectorAll('.card').forEach((item) => item.classList.toggle('active', item.dataset.serverId === server.id))
            renderProjectPreview(server)
            if (status.mode === 'maintenance') {
                setHeroAccess('No disponible', 'locked')
                setLaunchStatus('Instancia en mantenimiento', 'maintenance')
                setButtonState({ canDelete: Boolean(server.isInstalled) })
                showToast(getMaintenanceMessage(server), 'info')
                return
            }
            requestProjectAccess(server.id)
        }
        grid.appendChild(card)
    })

    renderCatalogStats()
}

function createSkinAnimation(mode) {
    if (!window.skinview3d) return null
    const animations = {
        idle: window.skinview3d.IdleAnimation,
        walk: window.skinview3d.WalkingAnimation,
        run: window.skinview3d.RunningAnimation,
        wave: window.skinview3d.WaveAnimation,
        fly: window.skinview3d.FlyingAnimation
    }
    const Animation = animations[mode]
    if (!Animation) return null
    const animation = new Animation()
    animation.speed = mode === 'run' ? 0.85 : mode === 'walk' ? 0.75 : 0.65
    if (mode === 'walk' && 'headBobbing' in animation) animation.headBobbing = true
    return animation
}

function closeIntro() {
    if (!introOverlay) return
    introOverlay.classList.add('hidden')
    if (introVideo) { introVideo.pause(); introVideo.currentTime = 0 }
}

function initIntro() {
    if (!introOverlay || !introVideo) return
    introVideo.volume = 0.08
    introVideo.addEventListener('ended', closeIntro)
    introSkip?.addEventListener('click', closeIntro)
    introOverlay.addEventListener('dblclick', closeIntro)
    introStart?.addEventListener('click', async () => {
        introOverlay.classList.remove('needs-start')
        try { await introVideo.play() } catch (err) { closeIntro() }
    })
    introVideo.play().catch(() => introOverlay.classList.add('needs-start'))
}

function setButtonState({ canInstall = false, canPlay = false, canStop = false, canDelete = false, installLabel = 'Instalar' } = {}) {
    const installButton = document.querySelector('.btn.install')
    const playButton = document.querySelector('.btn.play')
    const stopButton = document.querySelector('.btn.kill')
    const deleteButton = document.querySelector('.btn.delete-instance')
    installButtonLabel = installLabel
    if (installButton) {
        installButton.style.display = canInstall ? 'inline-flex' : 'none'
        installButton.innerText = installLabel
        installButton.dataset.action = installLabel.toLowerCase()
    }
    if (playButton) playButton.style.display = canPlay ? 'inline-flex' : 'none'
    if (stopButton) stopButton.style.display = canStop ? 'inline-flex' : 'none'
    if (deleteButton) deleteButton.style.display = canDelete ? 'inline-flex' : 'none'
}

function renderSkinPreview(skinUrl, capeUrl = '', animationMode = 'walk') {
    if (skinViewer && typeof skinViewer.dispose === 'function') { try { skinViewer.dispose() } catch (err) {} }
    skinViewer = null
    skinPreview.style.backgroundImage = ''
    skinPreview.innerHTML = ''

    if (!skinUrl) { skinPreview.classList.remove('has-skin-model'); skinPreview.innerText = 'SKIN'; return }
    skinPreview.classList.add('has-skin-model')
    const canvas = document.createElement('canvas')
    canvas.className = 'skin-viewer'
    canvas.width = 300
    canvas.height = 330
    skinPreview.appendChild(canvas)

    if (!window.skinview3d?.SkinViewer) { skinPreview.classList.remove('has-skin-model'); skinPreview.innerText = 'SKIN'; return }
    try {
        skinViewer = new window.skinview3d.SkinViewer({ canvas, width: 300, height: 330, skin: skinUrl, cape: capeUrl || undefined, enableControls: true, animation: createSkinAnimation(animationMode) })
        skinViewer.fov = 44
        skinViewer.zoom = capeUrl ? 0.82 : 0.9
        skinViewer.globalLight.intensity = 2.8
        skinViewer.cameraLight.intensity = 0.55
        skinViewer.autoRotate = false
        skinViewer.controls.enablePan = false
        skinViewer.controls.enableZoom = true
        skinViewer.controls.rotateSpeed = 0.75
        skinViewer.controls.zoomSpeed = 0.7
        skinViewer.playerObject.rotation.y = -0.38
    } catch (err) { skinPreview.classList.remove('has-skin-model'); skinPreview.innerText = 'SKIN' }
}


function getLocalImportOptions() {
    return {
        name: document.getElementById('local-pack-name')?.value || '',
        minecraft_version: document.getElementById('local-minecraft-version')?.value || '',
        loader: document.getElementById('local-loader')?.value || '',
        loader_version: document.getElementById('local-loader-version')?.value || ''
    }
}

function localProjectStatus(project) {
    if (project.requires_curseforge_api || project.status === 'needs_curseforge_api') return { label: 'Pack incompleto', mode: 'error' }
    const needsConfig = project.status === 'needs_config' || !project.minecraft_version || (!project.loader && project.loader !== 'vanilla') || (project.loader && project.loader !== 'vanilla' && !project.loader_version)
    if (needsConfig) return { label: 'Configurar', mode: 'warn' }
    if (project.isInstalled) return { label: 'Local instalado', mode: 'ready' }
    return { label: 'Local', mode: 'local' }
}

function renderLocalInstances(projects = localProjects) {
    if (!localGrid) return
    const entries = Array.isArray(projects) ? projects : []
    renderLocalEditor()
    if (localCount) localCount.innerText = entries.length + (entries.length === 1 ? ' local' : ' locales')
    if (!entries.length) {
        localGrid.innerHTML = '<div class="local-empty"><strong>Suelta tu primer modpack</strong><span>Tambien puedes usar el boton Elegir archivo.</span></div>'
        return
    }
    localGrid.innerHTML = entries.map((project) => {
        const imageUrl = cleanImageUrl(project.bg_image || project.local_image_path)
        const selected = targetServerId === project.id ? ' active' : ''
        const loader = project.loader ? titleCase(project.loader) : 'Configurar'
        const status = localProjectStatus(project)
        return '<article class="local-item visual' + selected + '" data-local-id="' + escapeHtml(project.id) + '">' +
            '<button class="local-remove" title="Quitar local" onclick="removeLocalProject(event, this.closest(\'.local-item\').dataset.localId)">x</button>' +
            '<div class="local-thumb" style="' + (imageUrl ? 'background-image:url(\'' + escapeHtml(imageUrl) + '\')' : '') + '"><span>Local</span><b>' + escapeHtml(project.local_pack_type || 'zip') + '</b></div>' +
            '<div class="local-info"><strong>' + escapeHtml(project.name || 'Modpack local') + '</strong><p>' + escapeHtml(project.description || 'Importado localmente') + '</p><div><span>' + escapeHtml(project.minecraft_version || 'Sin version') + '</span><span>' + escapeHtml(loader) + '</span><b class="' + status.mode + '">' + status.label + '</b></div></div>' +
            '</article>'
    }).join('')
    localGrid.querySelectorAll('.local-item').forEach((card) => {
        card.addEventListener('click', () => previewLocalProject(card.dataset.localId))
    })
}

function previewLocalProject(projectId) {
    const project = currentServers.find((server) => server.id === projectId) || localProjects.find((server) => server.id === projectId)
    if (!project) return
    targetServerId = project.id
    selectedProject = project
    renderProjectPreview(project)
    renderLocalInstances()
    renderLocalEditor(project)
    if (project.local) ipcRenderer.send('get-local-content', { projectId: project.id })
    renderServerCards()
    requestProjectAccess(project.id)
}

function getSelectedLocalProject() {
    if (selectedProject?.local) return selectedProject
    if (!targetServerId) return null
    return localProjects.find((project) => project.id === targetServerId) || currentServers.find((project) => project.id === targetServerId && project.local) || null
}

function renderLocalEditor(project = getSelectedLocalProject()) {
    const localProject = project?.local ? project : null
    if (localEditorEmpty) localEditorEmpty.hidden = Boolean(localProject)
    if (localEditorBody) localEditorBody.hidden = !localProject
    if (!localProject) return
    if (localEditName) localEditName.value = localProject.name || ''
    if (localEditDescription) localEditDescription.value = localProject.description || ''
    if (localEditMinecraft) localEditMinecraft.value = localProject.minecraft_version || ''
    if (localEditLoader) localEditLoader.value = localProject.loader || 'fabric'
    if (localEditLoaderVersion) localEditLoaderVersion.value = localProject.loader_version || localProject.fabric_version || ''
}

function formatBytes(value) {
    const size = Number(value || 0)
    if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB'
    if (size >= 1024) return Math.round(size / 1024) + ' KB'
    return size + ' B'
}

function getProjectById(projectId) {
    return currentServers.find((project) => String(project.id) === String(projectId)) || localProjects.find((project) => String(project.id) === String(projectId)) || null
}

function getSelectedContentProject() {
    return getProjectById(currentContentProjectId) || selectedProject || getProjectById(targetServerId)
}

function getContentGroupLabel(kind) {
    const labels = {
        mods: 'Mods',
        resourcepacks: currentLanguage === 'en' ? 'Resource packs' : 'Texturas',
        shaders: 'Shaders',
        config: 'Config'
    }
    return labels[kind] || kind
}

function getContentIcon(file, kind) {
    if (kind === 'mods') return 'JAR'
    if (kind === 'resourcepacks') return 'RP'
    if (kind === 'shaders') return 'FX'
    if (/\.(toml)$/i.test(file.name)) return 'TOML'
    if (/\.(json)$/i.test(file.name)) return 'JSON'
    return 'CFG'
}

function renderContentGroups(target, content = {}) {
    if (!target) return
    const groups = ['mods', 'resourcepacks', 'shaders', 'config']
    if (!groups.includes(currentContentTab)) currentContentTab = 'mods'
    if (instanceContentTabs) {
        instanceContentTabs.querySelectorAll('button').forEach((button) => {
            const kind = button.dataset.tab
            const count = Array.isArray(content[kind]) ? content[kind].length : 0
            button.classList.toggle('active', kind === currentContentTab)
            const badge = button.querySelector('b')
            if (badge) badge.innerText = String(count)
        })
    }
    const files = (Array.isArray(content[currentContentTab]) ? content[currentContentTab] : [])
        .filter((file) => !contentSearchTerm || String(file.name || '').toLowerCase().includes(contentSearchTerm))
    if (!files.length) {
        target.innerHTML = '<div class="content-empty wide">' + (contentSearchTerm ? (currentLanguage === 'en' ? 'No files match your search.' : 'No hay archivos con esa busqueda.') : (currentLanguage === 'en' ? 'Nothing here yet.' : 'Nada instalado aqui.')) + '</div>'
        return
    }
    target.innerHTML = files.map((file) => {
        const disabled = Boolean(file.disabled)
        const toggleLabel = disabled ? t('content.enable', 'Activar') : t('content.disable', 'Desactivar')
        const toggleButton = currentContentTab === 'config' ? '' : '<button class="content-toggle" data-action="toggle" data-kind="' + escapeHtml(currentContentTab) + '" data-file="' + escapeHtml(file.name) + '">' + escapeHtml(toggleLabel) + '</button>'
        return '<article class="content-file-row ' + (disabled ? 'disabled' : '') + '"><span class="content-file-icon">' + escapeHtml(getContentIcon(file, currentContentTab)) + '</span><div class="content-file-main"><strong>' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(formatBytes(file.size)) + (disabled ? ' - disabled' : '') + '</small></div><div class="content-file-actions">' + toggleButton + '<button class="content-remove" data-action="delete" data-kind="' + escapeHtml(currentContentTab) + '" data-file="' + escapeHtml(file.name) + '">' + escapeHtml(t('content.remove', 'Eliminar')) + '</button></div></article>'
    }).join('')
    target.querySelectorAll('[data-action="toggle"]').forEach((button) => button.addEventListener('click', () => window.toggleInstanceContentFile(button.dataset.kind, button.dataset.file)))
    target.querySelectorAll('[data-action="delete"]').forEach((button) => button.addEventListener('click', () => window.deleteInstanceContentFile(button.dataset.kind, button.dataset.file)))
}

window.setInstanceContentTab = function(kind) {
    currentContentTab = ['mods', 'resourcepacks', 'shaders', 'config'].includes(kind) ? kind : 'mods'
    renderInstanceContent(currentInstanceContent)
}

window.filterInstanceContent = function(value) {
    contentSearchTerm = String(value || '').trim().toLowerCase()
    renderInstanceContent(currentInstanceContent)
}

function renderLocalContent(content = currentLocalContent) {
    currentLocalContent = content || {}
    renderContentGroups(localContentList, currentLocalContent)
}

function renderInstanceContent(content = currentInstanceContent) {
    currentInstanceContent = content || {}
    renderContentGroups(instanceContentList, currentInstanceContent)
}

window.openInstanceContent = function(projectId = '') {
    const project = projectId ? getProjectById(projectId) : (selectedProject || getProjectById(targetServerId))
    if (!project) return showToast(currentLanguage === 'en' ? 'Choose an instance first.' : 'Selecciona una instancia primero.', 'error')
    currentContentProjectId = project.id
    if (instanceContentTitle) instanceContentTitle.innerText = project.name || 'Contenido'
    if (instanceContentSubtitle) instanceContentSubtitle.innerText = (currentLanguage === 'en' ? 'Managing files for ' : 'Administrando archivos de ') + (project.name || project.id)
    instanceContentModal?.classList.add('open')
    instanceContentModal?.setAttribute('aria-hidden', 'false')
    ipcRenderer.send('get-instance-content', { projectId: project.id })
}

window.closeInstanceContent = function() {
    instanceContentModal?.classList.remove('open')
    instanceContentModal?.setAttribute('aria-hidden', 'true')
}

window.refreshInstanceContent = function() {
    const project = getSelectedContentProject()
    if (!project) return showToast(currentLanguage === 'en' ? 'Choose an instance first.' : 'Selecciona una instancia primero.', 'error')
    ipcRenderer.send('get-instance-content', { projectId: project.id })
}

window.toggleInstanceContentFile = function(kind, fileName) {
    const project = getSelectedContentProject()
    if (!project) return showToast(currentLanguage === 'en' ? 'Choose an instance first.' : 'Selecciona una instancia primero.', 'error')
    ipcRenderer.send('toggle-instance-content-file', { projectId: project.id, kind, fileName })
}

window.deleteInstanceContentFile = function(kind, fileName) {
    const project = getSelectedContentProject()
    if (!project) return showToast(currentLanguage === 'en' ? 'Choose an instance first.' : 'Selecciona una instancia primero.', 'error')
    if (!window.confirm((currentLanguage === 'en' ? 'Remove ' : 'Quitar ') + '"' + fileName + '"?')) return
    ipcRenderer.send('delete-instance-content-file', { projectId: project.id, kind, fileName })
}

window.addInstanceContent = function(kind) {
    const project = getSelectedContentProject()
    if (!project) return showToast(currentLanguage === 'en' ? 'Choose an instance first.' : 'Selecciona una instancia primero.', 'error')
    ipcRenderer.send('choose-instance-assets', { projectId: project.id, kind })
}

window.refreshLocalContent = function() {
    const project = getSelectedLocalProject()
    if (!project) return showToast('Selecciona una instancia local primero.', 'error')
    ipcRenderer.send('get-local-content', { projectId: project.id })
}

window.deleteLocalContentFile = function(kind, fileName) {
    const project = getSelectedLocalProject()
    if (!project) return showToast('Selecciona una instancia local primero.', 'error')
    if (!window.confirm('Quitar "' + fileName + '" de esta instancia?')) return
    ipcRenderer.send('delete-local-content-file', { projectId: project.id, kind, fileName })
}

function updateLocalProjectInMemory(project) {
    if (!project?.id) return
    localProjects = [project, ...localProjects.filter((item) => item.id !== project.id)]
    currentServers = currentServers.map((item) => item.id === project.id ? { ...item, ...project } : item)
    if (!currentServers.some((item) => item.id === project.id)) currentServers.push(project)
    if (targetServerId === project.id || selectedProject?.id === project.id) selectedProject = { ...(selectedProject || {}), ...project }
}

window.saveLocalEditor = function() {
    const project = getSelectedLocalProject()
    if (!project) return showToast('Selecciona una instancia local primero.', 'error')
    ipcRenderer.send('update-local-instance', {
        projectId: project.id,
        updates: {
            name: localEditName?.value || '',
            description: localEditDescription?.value || '',
            minecraft_version: localEditMinecraft?.value || '',
            loader: localEditLoader?.value || '',
            loader_version: localEditLoaderVersion?.value || ''
        }
    })
}

window.addLocalAssets = function(kind) {
    const project = getSelectedLocalProject()
    if (!project) return showToast('Selecciona una instancia local primero.', 'error')
    ipcRenderer.send('choose-local-assets', { projectId: project.id, kind })
}

window.importMinecraftConfigFromInstance = function() {
    const targetProjectId = configTargetInstance?.value || targetServerId
    const sourceProjectId = configSourceInstance?.value || ''
    if (!targetProjectId || !sourceProjectId) return showToast('Selecciona origen y destino.', 'error')
    if (targetProjectId === sourceProjectId) return showToast('El origen y destino deben ser distintos.', 'error')
    ipcRenderer.send('import-minecraft-config-preset', { mode: 'instance', targetProjectId, sourceProjectId, groups: getConfigPresetGroups() })
}

window.importMinecraftConfigFromPack = function() {
    const targetProjectId = configTargetInstance?.value || targetServerId
    if (!targetProjectId) return showToast('Selecciona una instancia destino.', 'error')
    ipcRenderer.send('import-minecraft-config-preset', { mode: 'pack', targetProjectId, groups: getConfigPresetGroups() })
}

window.searchModrinth = function() {
    const projectType = modrinthType?.value || 'mod'
    const project = getSelectedLocalProject()
    const options = getLocalImportOptions()
    const minecraftVersion = project?.minecraft_version || options.minecraft_version
    const loader = project?.loader || options.loader
    if (projectType !== 'modpack') {
        if (!project) return showToast('Selecciona una instancia local primero.', 'error')
        if (!minecraftVersion || (!loader && loader !== 'vanilla')) return showToast('Configura Minecraft y loader antes de buscar.', 'error')
    }
    const query = modrinthQuery?.value || ''
    if (!query.trim()) return showToast('Escribe un nombre para buscar en Modrinth.', 'error')
    const copy = projectType === 'modpack' ? 'Buscando modpacks publicos.' : 'Filtrando por tu version y loader.'
    if (modrinthResults) modrinthResults.innerHTML = '<div class="local-empty"><strong>Buscando...</strong><span>' + copy + '</span></div>'
    ipcRenderer.send('modrinth-search', {
        projectId: project?.id || '',
        query,
        projectType,
        minecraft_version: minecraftVersion,
        loader
    })
}

function renderModrinthResults(items = [], error = '') {
    if (!modrinthResults) return
    lastModrinthResults = Array.isArray(items) ? items : []
    if (error) {
        modrinthResults.innerHTML = '<div class="local-empty error"><strong>No se pudo buscar</strong><span>' + escapeHtml(error) + '</span></div>'
        return
    }
    if (!items.length) {
        modrinthResults.innerHTML = '<div class="local-empty"><strong>Sin resultados</strong><span>Prueba otro nombre o revisa version/loader.</span></div>'
        return
    }
    modrinthResults.innerHTML = items.map((item) => {
        const type = item.project_type || 'mod'
        const action = type === 'modpack' ? 'Importar' : 'Instalar'
        return '<article class="modrinth-result ' + escapeHtml(type) + '"><span class="modrinth-icon" style="' + (item.icon_url ? 'background-image:url(\'' + escapeHtml(item.icon_url) + '\')' : '') + '"></span><div><strong>' + escapeHtml(item.title || item.slug) + '</strong><p>' + escapeHtml(item.description || 'Proyecto de Modrinth') + '</p><small>' + escapeHtml(type) + ' - ' + Number(item.downloads || 0).toLocaleString() + ' descargas</small></div><button class="btn-secondary modrinth-install" data-slug="' + escapeHtml(item.slug || item.project_id) + '" data-title="' + escapeHtml(item.title || item.slug) + '" data-type="' + escapeHtml(type) + '">' + action + '</button></article>'
    }).join('')
    modrinthResults.querySelectorAll('.modrinth-install').forEach((button) => {
        button.addEventListener('click', () => {
            const projectType = button.dataset.type || 'mod'
            const item = lastModrinthResults.find((result) => (result.slug || result.project_id) === button.dataset.slug) || {}
            button.disabled = true
            button.innerText = projectType === 'modpack' ? 'Importando...' : 'Instalando...'
            if (projectType === 'modpack') {
                const project = getSelectedLocalProject()
                const options = getLocalImportOptions()
                ipcRenderer.send('modrinth-install-modpack', {
                    slug: button.dataset.slug,
                    title: button.dataset.title,
                    description: item.description || '',
                    icon_url: item.icon_url || '',
                    minecraft_version: project?.minecraft_version || options.minecraft_version,
                    loader: project?.loader || options.loader
                })
                return
            }
            const project = getSelectedLocalProject()
            if (!project) {
                button.disabled = false
                button.innerText = 'Instalar'
                return showToast('Selecciona una instancia local primero.', 'error')
            }
            ipcRenderer.send('modrinth-install-project', { projectId: project.id, slug: button.dataset.slug, title: button.dataset.title, projectType })
        })
    })
}

function renderLobbyInstances() {
    if (!lobbyInstanceStrip) return
    const projects = currentServers.length ? currentServers : localProjects
    if (!projects.length) {
        lobbyInstanceStrip.innerHTML = '<div class="empty-state">No hay instancias para compartir.</div>'
        return
    }
    lobbyInstanceStrip.innerHTML = projects.map((project) => {
        const imageUrl = cleanImageUrl(project.bg_image || project.local_image_path)
        const active = lobbyState.sharedProject?.id === project.id ? ' active' : ''
        const source = project.local ? 'Local' : 'Remota'
        return '<button class="lobby-instance-card' + active + '" data-project-id="' + escapeHtml(project.id) + '" onclick="shareProjectToLobby(this.dataset.projectId)">' +
            '<span class="lobby-instance-art" style="' + (imageUrl ? 'background-image:url(\'' + escapeHtml(imageUrl) + '\')' : '') + '"></span>' +
            '<strong>' + escapeHtml(project.name) + '</strong><small>' + escapeHtml(source + ' - ' + (project.minecraft_version || '-') + ' - ' + titleCase(project.loader || 'vanilla')) + '</small>' +
            '</button>'
    }).join('')
}

function renderLobby() {
    if (lobbyCode) lobbyCode.innerText = lobbyState.code
    if (lobbyShare) {
        const imageUrl = cleanImageUrl(lobbyState.sharedProject?.bg_image || lobbyState.sharedProject?.local_image_path)
        lobbyShare.innerHTML = lobbyState.sharedProject
            ? '<div class="lobby-shared-art" style="' + (imageUrl ? 'background-image:url(\'' + escapeHtml(imageUrl) + '\')' : '') + '"></div><div><span>Instancia compartida</span><strong>' + escapeHtml(lobbyState.sharedProject.name) + '</strong><small>' + escapeHtml((lobbyState.sharedProject.minecraft_version || '-') + ' - ' + titleCase(lobbyState.sharedProject.loader || 'vanilla')) + '</small></div>'
            : '<div><span>Sin instancia</span><strong>Elige un proyecto</strong><small>El host decide que instancia se prepara para todos.</small></div>'
    }
    if (lobbyMembers) {
        const displayName = minecraftName?.innerText || sidebarProfileName?.innerText || 'Tu jugador'
        lobbyMembers.innerHTML = '<div class="lobby-member"><span class="member-dot"></span><div><strong>' + escapeHtml(displayName) + '</strong><small>Host local</small></div><b class="' + (lobbyState.ready ? 'ready' : '') + '">' + (lobbyState.ready ? 'Listo' : 'Esperando') + '</b></div><div class="lobby-member ghost"><span class="member-dot muted"></span><div><strong>Invitado pendiente</strong><small>Codigo o link de invitacion</small></div><b>Offline</b></div>'
    }
    if (lobbyReadyButton) lobbyReadyButton.innerText = lobbyState.ready ? 'No listo' : 'Listo'
    renderLobbyInstances()
}

window.importLocalPack = function() {
    showToast('Selecciona un archivo .mrpack o .zip local.')
    ipcRenderer.send('import-local-pack', getLocalImportOptions())
}

window.createLocalInstance = function() {
    const options = getLocalImportOptions()
    if (!options.name) options.name = 'Nueva instancia local'
    ipcRenderer.send('create-local-instance', options)
}

window.importLocalPackFiles = function(filePaths) {
    const paths = Array.isArray(filePaths) ? filePaths.filter(Boolean) : []
    if (!paths.length) return showToast('No se pudo leer la ruta del archivo arrastrado.', 'error')
    ipcRenderer.send('import-local-pack-files', { filePaths: paths, options: getLocalImportOptions() })
}

window.refreshLocalInstances = function() {
    ipcRenderer.send('get-local-instances')
    showToast('Actualizando instancias locales...')
}

window.selectLocalProject = function(projectId) { previewLocalProject(projectId) }

window.removeLocalProject = function(event, projectId) {
    event?.stopPropagation()
    const project = localProjects.find((item) => item.id === projectId)
    if (!project) return
    if (!window.confirm('Quitar "' + project.name + '" de Local?\n\nEsto borra el pack importado guardado por el launcher, pero no toca tu ZIP original.')) return
    ipcRenderer.send('delete-local-instance', projectId)
}

window.createLocalLobby = function() {
    lobbyState.code = 'OBS-' + Math.random().toString(36).slice(2, 7).toUpperCase()
    lobbyState.ready = false
    renderLobby()
    showToast('Lobby local creado.')
}

window.shareProjectToLobby = function(projectId) {
    const project = currentServers.find((server) => server.id === projectId) || localProjects.find((server) => server.id === projectId)
    if (!project) return
    lobbyState.sharedProject = project
    selectedProject = project
    targetServerId = project.id
    renderLobby()
    showToast('Instancia enviada al lobby.')
}

window.shareSelectedToLobby = function() {
    if (!selectedProject) return showToast('Selecciona una instancia primero.', 'info')
    window.shareProjectToLobby(selectedProject.id)
}

window.copyLobbyCode = function() { clipboard.writeText(lobbyState.code); showToast('Codigo de lobby copiado.') }
window.copyLobbyLink = function() {
    clipboard.writeText('obsidian://lobby/' + encodeURIComponent(lobbyState.code))
    showToast('Link de lobby copiado. Funciona en equipos con el launcher instalado.', 'success')
}
window.toggleLobbyReady = function() { lobbyState.ready = !lobbyState.ready; renderLobby() }

window.switchTab = function(tabId) {
    const requestedTab = ['home', 'news', 'account', 'settings'].includes(tabId) ? tabId : 'home'
    document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.remove('active'))
    document.querySelectorAll('.tab-view').forEach((view) => view.classList.remove('active'))
    document.getElementById(`tab-${requestedTab}`)?.classList.add('active')
    document.getElementById(`view-${requestedTab}`)?.classList.add('active')
}
window.openSupport = function() { ipcRenderer.send('open-external-url', SUPPORT_URL) }
window.openCommunityDiscord = function() { ipcRenderer.send('open-external-url', BUG_DISCORD_URL) }
window.focusAccountLanguage = function() {
    window.switchTab('settings')
    const languageCard = document.querySelector('#view-settings .language-card')
    languageCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    languageCard?.classList.add('attention')
    setTimeout(() => languageCard?.classList.remove('attention'), 1200)
}
window.openAnnouncement = function(id) {
    const item = announcements[id]
    if (!item || !announcementModal) return
    activeAnnouncement = item
    announcementDate.innerText = item.date
    announcementLabel.innerText = item.label
    if (announcementImage) {
        const relatedProject = item.action?.type === 'project' ? currentServers.find((project) => project.id === item.action.value) : null
        const imageUrl = cleanImageUrl(item.image || relatedProject?.announcement_image || relatedProject?.bg_image)
        announcementImage.hidden = !imageUrl
        announcementImage.src = imageUrl
        announcementImage.alt = imageUrl ? item.title : ''
    }
    announcementTitle.innerText = item.title
    announcementBody.innerText = item.body
    announcementAction.innerText = item.actionLabel
    announcementAction.style.display = item.action ? 'inline-flex' : 'none'
    announcementModal.classList.add('open')
    announcementModal.setAttribute('aria-hidden', 'false')
}
window.closeAnnouncement = function() {
    if (!announcementModal) return
    announcementModal.classList.remove('open')
    announcementModal.setAttribute('aria-hidden', 'true')
}
window.runAnnouncementAction = function() {
    const action = activeAnnouncement?.action
    if (!action) return
    window.closeAnnouncement()
    if (action.type === 'project') window.selectProjectById(action.value)
    if (action.type === 'tab') window.switchTab(action.value)
    if (action.type === 'versions') window.checkVersions()
}
window.activateAnnouncement = function(event, id) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        window.openAnnouncement(id)
    }
}
window.selectProjectById = function(projectId) {
    const project = currentServers.find((server) => server.id === projectId)
    if (!project) return
    targetServerId = project.id
    window.switchTab('home')
    renderProjectPreview(project)
    renderServerCards()
    requestProjectAccess(project.id)
}
window.openTrailer = function() {
    const url = String(selectedProject?.trailer_url || '').trim()
    if (!url) return showToast('Esta instancia no tiene trailer configurado.', 'info')
    currentTrailerUrl = url
    ipcRenderer.send('open-external-url', url)
    showToast(currentLanguage === 'en' ? 'Opening trailer in your browser.' : 'Abriendo trailer en tu navegador.')
}
window.openTrailerExternal = function() {
    if (currentTrailerUrl) ipcRenderer.send('open-external-url', currentTrailerUrl)
}
window.closeTrailer = function() {
    if (!trailerModal || !trailerMedia) return
    trailerModal.classList.remove('open')
    trailerModal.setAttribute('aria-hidden', 'true')
    trailerMedia.innerHTML = ''
}
window.filterCatalog = function(value) { catalogFilter = String(value || '').trim().toLowerCase(); renderServerCards() }
window.minimize = function() { ipcRenderer.send('minimize-app') }
window.toggleMaximize = function() { ipcRenderer.send('toggle-maximize-app') }
window.closeApp = function() { ipcRenderer.send('close-app') }
window.openConsoleWindow = function() {
    consoleModal?.classList.add('open')
    consoleModal?.setAttribute('aria-hidden', 'false')
    if (toggleLogBtn) toggleLogBtn.innerText = t('console.close', 'Cerrar')
    setTimeout(() => logSearchInput?.focus(), 80)
}
window.closeConsoleWindow = function() {
    consoleModal?.classList.remove('open')
    consoleModal?.setAttribute('aria-hidden', 'true')
    if (toggleLogBtn) toggleLogBtn.innerText = t('console.open', 'Abrir')
}
window.toggleLogPanel = function() {
    if (consoleModal?.classList.contains('open')) window.closeConsoleWindow()
    else window.openConsoleWindow()
}
function openLogPanel() {
    if (logCount) logCount.classList.add('pulse')
    setTimeout(() => logCount?.classList.remove('pulse'), 450)
}
window.copyLogContent = async function() {
    const content = logHistory.join('\n')
    try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(content); else clipboard.writeText(content) } catch (err) { clipboard.writeText(content) }
    copyLogBtn.innerText = 'Copiado'
    showToast(currentLanguage === 'en' ? 'Console copied.' : 'Consola copiada.')
    setTimeout(() => { copyLogBtn.innerText = 'Copiar' }, 1200)
}
window.clearLogContent = function() {
    logHistory.splice(0, logHistory.length, 'Consola limpiada.')
    logSearchTerm = ''
    if (logSearchInput) logSearchInput.value = ''
    renderLogHistory()
    showToast(currentLanguage === 'en' ? 'Console cleared.' : 'Consola limpiada.')
}
window.searchLogContent = function(value) {
    logSearchTerm = String(value || '')
    renderLogHistory()
}
window.updateSkinAnimation = function(mode) { localStorage.setItem('obsidian.skinAnimation', mode); if (skinViewer) skinViewer.animation = createSkinAnimation(mode) }
window.enviarCodigo = function() { if (!targetServerId) return; openLogPanel(); requestProjectAccess(targetServerId, document.getElementById('code-input').value) }
window.refreshCatalog = function() { openLogPanel(); setLaunchStatus('Actualizando catalogo'); ipcRenderer.send('refresh-catalog') }

function formatDownloadBytes(bytes = 0) {
    const value = Number(bytes) || 0
    if (value >= 1024 * 1024 * 1024) return (value / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(1) + ' MB'
    if (value >= 1024) return (value / 1024).toFixed(1) + ' KB'
    return Math.round(value) + ' B'
}

function renderDiagnosticReport(data = {}) {
    lastDiagnosticReport = data.report || ''
    if (!diagnosticGrid) return
    const rows = Array.isArray(data.rows) ? data.rows : []
    diagnosticGrid.innerHTML = rows.length
        ? rows.map((row) => '<div class="diagnostic-row" data-state="' + escapeHtml(row.state || 'warn') + '"><strong>' + escapeHtml(row.key) + '</strong><span>' + escapeHtml(row.value) + '</span></div>').join('')
        : '<div class="diagnostic-empty">No hay diagnostico disponible.</div>'
}

window.copyDiagnosticReport = function() {
    if (!lastDiagnosticReport) ipcRenderer.send('request-diagnostic-report')
    setTimeout(() => {
        if (!lastDiagnosticReport) return showToast('El diagnostico aun se esta generando.', 'info')
        clipboard.writeText(lastDiagnosticReport)
        showToast('Informe de diagnostico copiado.', 'success')
    }, 80)
}

function renderDownloadCenter(data = {}) {
    lastDownloadState = { ...lastDownloadState, ...data }
    const state = lastDownloadState || {}
    const percent = Math.max(0, Math.min(100, Number(state.percent) || 0))
    const title = state.title || t('downloads.idle', 'Sin descargas activas')
    const phase = state.phase || 'Preparado'
    if (downloadTitle) downloadTitle.innerText = title
    if (downloadPhase) downloadPhase.innerText = phase
    if (downloadPercent) downloadPercent.innerText = Math.round(percent) + '%'
    if (downloadBar) downloadBar.style.width = percent + '%'
    if (downloadFiles) downloadFiles.innerText = 'Archivos ' + (state.filesDone || 0) + ' / ' + (state.filesTotal || 0)
    if (downloadSize) downloadSize.innerText = formatDownloadBytes(state.downloaded || 0) + ' / ' + formatDownloadBytes(state.total || 0)
    if (downloadSpeed) downloadSpeed.innerText = 'Velocidad: ' + formatDownloadBytes(state.speed || 0) + '/s'
    if (downloadEta) downloadEta.innerText = 'Tiempo restante: ' + (state.eta || '--:--')
    if (downloadBreakdown) downloadBreakdown.innerHTML = '<span>Mods ' + (state.modsDone || 0) + ' / ' + (state.modsTotal || 0) + '</span><span>Texturas ' + (state.resourcepacksDone || 0) + ' / ' + (state.resourcepacksTotal || 0) + '</span><span>Configuraciones ' + (state.configDone || 0) + ' / ' + (state.configTotal || 0) + '</span>'
    if (downloadMini) downloadMini.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + Math.round(percent) + '%</span>'
}

window.openDownloadCenter = function() {
    downloadCenterModal?.classList.add('open')
    downloadCenterModal?.setAttribute('aria-hidden', 'false')
    renderDownloadCenter(lastDownloadState || {})
}

window.closeDownloadCenter = function() {
    downloadCenterModal?.classList.remove('open')
    downloadCenterModal?.setAttribute('aria-hidden', 'true')
}

window.pauseDownloadCenter = function() { ipcRenderer.send('pause-current-download') }
window.resumeDownloadCenter = function() { ipcRenderer.send('resume-current-download') }
window.cancelDownloadCenter = function() { ipcRenderer.send('cancel-current-download') }

window.checkVersions = function() {
    openLogPanel()
    setLaunchStatus(currentLanguage === 'en' ? 'Checking launcher and instance versions' : 'Comprobando versiones del launcher e instancias', 'checking')
    showToast(currentLanguage === 'en' ? 'Checking versions...' : 'Comprobando versiones...')
    ipcRenderer.send('check-launcher-update')
    ipcRenderer.send('refresh-catalog')
}
window.refreshMinecraftProfile = function() { openLogPanel(); ipcRenderer.send('refresh-minecraft-profile') }
window.chooseLocalSkin = function() { ipcRenderer.send('select-local-skin', { variant: appearanceVariantSelect?.value || skinVariantSelect?.value || 'classic' }) }
window.recheckDiscordAccess = function() { if (!targetServerId) return; openLogPanel(); requestProjectAccess(targetServerId, '', true) }
window.loginDiscord = function() { ipcRenderer.send('login-discord') }
window.logoutDiscord = function() { ipcRenderer.send('logout-discord'); lastDiscordUser = null; renderDiscordState() }
window.instalar = function() {
    if (selectedProject?.maintenance) return showToast(getMaintenanceMessage(selectedProject), 'error')
    if (selectedProject?.isUpdateAvailable) {
        const message = currentLanguage === 'en'
            ? 'Update ' + selectedProject.name + '? The launcher will replace managed modpack files. Custom mods, shaders, resource packs or configs you added manually may need to be installed again.'
            : 'Actualizar ' + selectedProject.name + '? El launcher reemplazara los archivos del modpack. Si agregaste mods, shaders, texturas o configs manualmente, puede que tengas que instalarlos otra vez.'
        if (!window.confirm(message)) return
    }
    openLogPanel()
    ipcRenderer.send('install-pack', { update: Boolean(selectedProject?.isUpdateAvailable) })
}
window.eliminarInstancia = function() {
    if (!targetServerId || !selectedProject) return
    const confirmed = window.confirm(`Eliminar los archivos locales de "${selectedProject.name}"?\n\nPodras instalarla de nuevo despues.`)
    if (!confirmed) return
    openLogPanel()
    setLaunchStatus('Eliminando archivos locales')
    ipcRenderer.send('delete-instance', { serverId: targetServerId })
}
window.jugar = function() { if (selectedProject?.maintenance) return showToast(getMaintenanceMessage(selectedProject), 'error'); openLogPanel(); ipcRenderer.send('launch-game') }
window.detenerJuego = function() { ipcRenderer.send('kill-instance') }
window.abrirCarpeta = function() { ipcRenderer.send('open-game-folder') }
window.openSelectedInstanceFolder = function(projectId = '') {
    const project = projectId ? getProjectById(projectId) : getSelectedContentProject()
    ipcRenderer.send('open-instance-folder', { projectId: project?.id || targetServerId || '' })
}
window.limpiarCache = function() { ipcRenderer.send('clear-cache') }
window.loginMinecraftPremium = function() { ipcRenderer.send('login-minecraft-premium') }
window.openMinecraftSkinPage = function() { ipcRenderer.send('open-minecraft-skin-page') }
window.logoutMinecraft = function() { ipcRenderer.send('logout-minecraft') }
window.updateRamValue = function(val) { ramValue.innerText = val; localStorage.setItem('obsidian.ram', val); ipcRenderer.send('set-ram', `${val}G`) }
window.previewSkin = function() { renderSkinPreview((skinUrlInput?.value || '').trim(), detectedCapeUrl, skinAnimationSelect?.value || 'walk') }
window.saveMinecraftProfile = function() { ipcRenderer.send('save-minecraft-profile', { username: minecraftUsername.value, skinAnimation: skinAnimationSelect?.value || 'walk' }) }

ipcRenderer.on('launcher-update-available', (event, update) => {
    renderLauncherUpdate(update)
})
ipcRenderer.on('diagnostic-report', (event, data = {}) => { renderDiagnosticReport(data) })
ipcRenderer.on('download-center-update', (event, data = {}) => { renderDownloadCenter(data) })

ipcRenderer.on('launcher-update-download-started', () => {
    if (launcherUpdateDownloadBtn) { launcherUpdateDownloadBtn.disabled = true; launcherUpdateDownloadBtn.innerText = 'Descargando...' }
    if (launcherUpdateLaterBtn) launcherUpdateLaterBtn.disabled = true
    setLauncherUpdateProgress(0, currentLanguage === 'en' ? 'Downloading update...' : 'Descargando actualizacion...')
})

ipcRenderer.on('launcher-update-download-progress', (event, data = {}) => {
    setLauncherUpdateProgress(data.percent, currentLanguage === 'en' ? 'Downloading update...' : 'Descargando actualizacion...')
})

ipcRenderer.on('launcher-update-installing', () => {
    setLauncherUpdateProgress(100, currentLanguage === 'en' ? 'Installing and restarting...' : 'Instalando y reiniciando...')
    if (launcherUpdateDownloadBtn) launcherUpdateDownloadBtn.innerText = 'Instalando...'
})

ipcRenderer.on('launcher-update-error', (event, data = {}) => {
    if (launcherUpdateDownloadBtn) { launcherUpdateDownloadBtn.disabled = false; launcherUpdateDownloadBtn.innerText = 'Reintentar' }
    if (launcherUpdateLaterBtn) launcherUpdateLaterBtn.disabled = false
    setLauncherUpdateProgress(0, currentLanguage === 'en' ? 'Update failed.' : 'No se pudo actualizar.')
    showToast(data.message || 'No se pudo actualizar automaticamente el launcher.', 'error')
})


ipcRenderer.on('launcher-update-current', (event, update) => {
    activeLauncherUpdate = update
    const version = update?.current_version ? 'v' + update.current_version : ''
    if (launcherCurrentVersion && update?.current_version) launcherCurrentVersion.innerText = version
    if (launcherVersionState) launcherVersionState.innerText = currentLanguage === 'en' ? 'Up to date' : 'Actualizado'
    showToast(currentLanguage === 'en' ? 'Launcher is up to date ' + version + '.' : 'Launcher actualizado ' + version + '.')
    setLaunchStatus(currentLanguage === 'en' ? 'Launcher version checked' : 'Version del launcher comprobada', 'ready')
})

ipcRenderer.on('launcher-version', (event, data = {}) => {
    const version = data.version ? 'v' + data.version : 'v--'
    if (launcherCurrentVersion) launcherCurrentVersion.innerText = version
    if (launcherVersionState) launcherVersionState.innerText = currentLanguage === 'en' ? 'Current installation' : 'Instalacion actual'
})

ipcRenderer.on('system-info', (event, data = {}) => { lastSystemInfo = data; renderSystemInfo(data) })

ipcRenderer.on('local-skin-selected', (event, data = {}) => {
    const item = (lastMinecraftProfile.skinLibrary || []).find((skin) => skin.id === data.id)
    if (item) {
        const current = normalizeAppearanceSelection(lastMinecraftProfile)
        appearanceSelection = { ...current, skinKind: 'saved', skinId: item.id, skinUrl: item.skinUrl, skinName: item.name || 'Skin', skinVariant: item.variant || 'classic' }
        if (appearanceModal?.classList.contains('open')) renderAppearanceManager(lastMinecraftProfile)
    }
    showToast(t('appearance.added', currentLanguage === 'en' ? 'Skin added to My skins.' : 'Skin agregada a Mis skins.'), 'success')
})
ipcRenderer.on('local-skin-error', (event, data = {}) => {
    showToast(data.message || (currentLanguage === 'en' ? 'Could not load the skin.' : 'No se pudo cargar la skin.'), 'error')
})
ipcRenderer.on('skin-upload-state', (event, data = {}) => {
    const loading = Boolean(data.loading)
    if (skinUploadButton) {
        skinUploadButton.disabled = loading
        skinUploadButton.dataset.loading = loading ? 'true' : 'false'
        skinUploadButton.innerText = loading ? t('skin.uploading', 'Sincronizando...') : t('skin.chooseLocal', 'Cambiar skin')
    }
    appearanceOperation = { loading, action: 'skin', id: appearanceOperation.id || '' }
    if (appearanceModal?.classList.contains('open')) renderAppearanceManager(lastMinecraftProfile)
})
ipcRenderer.on('appearance-state', (event, data = {}) => {
    appearanceOperation = { loading: Boolean(data.loading), action: data.action || '', id: data.id || '' }
    if (!appearanceOperation.loading && data.action === 'appearance') appearanceSelection = null
    if (appearanceModal?.classList.contains('open')) renderAppearanceManager(lastMinecraftProfile)
})
ipcRenderer.on('appearance-success', (event, data = {}) => {
    const messages = {
        skin: currentLanguage === 'en' ? 'Skin applied to your profile.' : 'Skin aplicada a tu perfil.',
        cape: currentLanguage === 'en' ? 'Official cape updated.' : 'Capa oficial actualizada.',
        appearance: currentLanguage === 'en' ? 'Appearance applied to your Minecraft profile.' : 'Apariencia aplicada a tu perfil de Minecraft.',
        removed: currentLanguage === 'en' ? 'Skin removed from the library.' : 'Skin eliminada de la biblioteca.',
        renamed: t('appearance.renamed', 'Nombre de la skin actualizado.')
    }
    showToast(messages[data.type] || (currentLanguage === 'en' ? 'Appearance updated.' : 'Apariencia actualizada.'), 'success')
})
ipcRenderer.on('appearance-error', (event, data = {}) => {
    showToast(data.message || (currentLanguage === 'en' ? 'Could not update appearance.' : 'No se pudo actualizar la apariencia.'), 'error')
})
ipcRenderer.on('local-instances-info', (event, projects) => {
    localProjects = Array.isArray(projects) ? projects : []
    renderLocalInstances()
    renderLocalEditor()
    renderLobby()
})

ipcRenderer.on('local-pack-imported', (event, project) => {
    if (project) {
        updateLocalProjectInMemory(project)
        renderLocalInstances()
        renderLocalEditor(project)
        renderLobby()
        if (targetServerId === project.id) renderProjectPreview(project)
    }
    showToast('Modpack local importado.', 'success')
})

ipcRenderer.on('local-pack-import-error', (event, data = {}) => {
    showToast(data.message || 'No se pudo importar el modpack local.', 'error')
})

ipcRenderer.on('local-instance-deleted', (event, data = {}) => {
    localProjects = localProjects.filter((item) => item.id !== data.id)
    currentServers = currentServers.filter((item) => item.id !== data.id)
    if (targetServerId === data.id) { targetServerId = null; selectedProject = null }
    renderLocalInstances()
    renderLobby()
    showToast('Instancia local quitada.')
})
ipcRenderer.on('local-instance-updated', (event, project) => {
    updateLocalProjectInMemory(project)
    renderLocalInstances()
    renderLocalEditor(project)
    renderServerCards()
    renderLobby()
    if (targetServerId === project.id) renderProjectPreview(project)
    showToast('Configuracion local guardada.', 'success')
})
ipcRenderer.on('local-assets-added', (event, data = {}) => {
    if (data.content) renderLocalContent(data.content)
    showToast('Archivos agregados: ' + (data.copied || 0), 'success')
})
ipcRenderer.on('instance-assets-added', (event, data = {}) => {
    if (data.content) renderInstanceContent(data.content)
    showToast('Archivos agregados: ' + (data.copied || 0), 'success')
})
ipcRenderer.on('modrinth-search-results', (event, data = {}) => {
    renderModrinthResults(data.items || [], data.error || '')
})
ipcRenderer.on('modrinth-install-complete', (event, data = {}) => {
    if (data.content) renderLocalContent(data.content)
    showToast('Instalado desde Modrinth: ' + (data.title || data.file || 'contenido'), 'success')
})
ipcRenderer.on('modrinth-modpack-imported', (event, project) => {
    if (project) {
        updateLocalProjectInMemory(project)
        targetServerId = project.id
        selectedProject = project
        renderLocalInstances()
        renderLocalEditor(project)
        renderServerCards()
        renderLobby()
        renderProjectPreview(project)
    }
    showToast('Modpack de comunidad agregado a Local.', 'success')
})
ipcRenderer.on('modrinth-install-error', (event, data = {}) => {
    showToast(data.message || 'No se pudo instalar desde Modrinth.', 'error')
})
ipcRenderer.on('local-content-info', (event, data = {}) => {
    if (data.error) return showToast(data.error, 'error')
    renderLocalContent(data.content || {})
})
ipcRenderer.on('instance-content-info', (event, data = {}) => {
    if (data.error) return showToast(data.error, 'error')
    currentContentProjectId = data.projectId || currentContentProjectId
    renderInstanceContent(data.content || {})
    if (instanceContentStatus) instanceContentStatus.innerText = data.message || (currentLanguage === 'en' ? 'Content list updated.' : 'Contenido actualizado.')
})
ipcRenderer.on('minecraft-config-imported', (event, data = {}) => {
    if (data.error) return showToast(data.error, 'error')
    showToast(data.message || 'Preset importado.', 'success')
})
ipcRenderer.on('lobby-invite-code', () => {
    window.switchTab('home')
    showToast('Lobby esta desactivado temporalmente.', 'info')
})
ipcRenderer.on('catalog-message', (event, message = null) => {
    remoteCatalogMessage = message && typeof message === 'object' ? message : null
    const signature = remoteCatalogMessage ? `${remoteCatalogMessage.maintenance ? '1' : '0'}|${remoteCatalogMessage.message || ''}` : ''
    if (signature && signature !== lastCatalogMessageSignature) {
        lastCatalogMessageSignature = signature
        showToast(remoteCatalogMessage.message || (currentLanguage === 'en' ? 'Catalog notice received.' : 'Aviso del catalogo recibido.'), remoteCatalogMessage.maintenance ? 'error' : 'info')
    }
})
ipcRenderer.on('all-servers-info', (event, servers) => {
    currentServers = Array.isArray(servers) ? servers : []
    if (currentServers.length && !selectedProject) { const initialProject = currentServers.find((server) => server.featured) || currentServers[0]; targetServerId = initialProject.id; renderProjectPreview(initialProject) }
    renderServerCards()
    renderMinecraftConfigSourceOptions()
})

ipcRenderer.on('access-granted', (event, data) => {
    if (!finishAccessRequest(data)) return
    const project = data.project ? data.project : data
    const isInstalled = data.isInstalled || false
    const isUpdateAvailable = data.isUpdateAvailable || false
    const projectVersion = data.projectVersion || project.project_version || '1.0.0'
    const installedVersion = data.installedVersion || 'sin registro'
    selectedProject = { ...project, isInstalled, isUpdateAvailable, installedVersion, projectVersion }
    currentServers = currentServers.map((server) => server.id === project.id ? { ...server, isInstalled, isUpdateAvailable, installedVersion, projectVersion } : server)
    targetServerId = project.id
    heroTitle.innerText = project.name
    heroDesc.innerText = project.maintenance ? `${project.description}\n${getMaintenanceMessage(project)}` : (isUpdateAvailable ? `${project.description}\nActualizacion disponible: v${installedVersion} -> v${projectVersion}.` : `${project.description}\nProyecto v${projectVersion}.`)
    setHeroImage(project)
    renderHeroDetails(project, { isInstalled, isUpdateAvailable, installedVersion, projectVersion })
    renderChangelog(project)
    renderTrailerAvailability(project)
    setHeroAccess('Acceso concedido', 'granted')
    const status = getProjectStatus(selectedProject, { isInstalled, isUpdateAvailable, installedVersion, projectVersion })
    setLaunchStatus(isUpdateAvailable ? 'Actualizacion disponible' : isInstalled ? 'Lista para jugar' : 'Lista para instalar', status.mode)
    renderServerCards()
    setButtonState({ canInstall: !isInstalled || isUpdateAvailable, canPlay: isInstalled && !isUpdateAvailable, canStop: false, canDelete: isInstalled, installLabel: isUpdateAvailable ? 'Actualizar' : 'Instalar' })
})

ipcRenderer.on('access-check-delayed', (event, data = {}) => {
    if (!finishAccessRequest(data)) return
    setHeroAccess('Discord ocupado', 'checking')
    setLaunchStatus('Discord limito la consulta. Reintenta en unos segundos.')
    setButtonState({ canDelete: Boolean(selectedProject?.isInstalled) })
})

ipcRenderer.on('access-denied', (event, data = {}) => {
    if (!finishAccessRequest(data)) return
    setHeroAccess('Acceso restringido', 'locked')
    setLaunchStatus('Introduce una clave o vincula Discord')
    renderHeroDetails(selectedProject)
    setButtonState({ canDelete: Boolean(selectedProject?.isInstalled) })
})

ipcRenderer.on('discord-login-success', (event, user) => {
    lastDiscordUser = user || null
    renderDiscordState(lastDiscordUser)
    if (targetServerId) requestProjectAccess(targetServerId)
})

ipcRenderer.on('game-state', (event, running) => {
    const playButton = document.querySelector('.btn.play')
    const stopButton = document.querySelector('.btn.kill')
    if (playButton) playButton.style.display = running ? 'none' : (selectedProject?.isInstalled ? 'inline-flex' : 'none')
    if (stopButton) stopButton.style.display = running ? 'inline-flex' : 'none'
    setLaunchStatus(running ? 'Minecraft en ejecucion' : 'Lista para jugar')
})

ipcRenderer.on('install-state', (event, isInstalling) => {
    const installButton = document.querySelector('.btn.install')
    const playButton = document.querySelector('.btn.play')
    const deleteButton = document.querySelector('.btn.delete-instance')
    if (installButton) { installButton.disabled = isInstalling; installButton.innerText = isInstalling ? 'Instalando...' : installButtonLabel }
    if (playButton) playButton.disabled = isInstalling
    if (deleteButton) deleteButton.disabled = isInstalling
    if (isInstalling) {
        setLaunchStatus('Preparando archivos de la instancia', 'installing')
        startInstallPulse()
        showToast('Instalacion iniciada.')
    } else {
        stopInstallPulse()
    }
})

ipcRenderer.on('minecraft-profile', (event, profile) => {
    lastMinecraftProfile = profile || {}
    minecraftUsername.value = profile.username || 'PlayerTest'
    skinUrlInput.value = profile.skinUrl || ''
    detectedCapeUrl = profile.capeUrl || ''
    skinAnimationSelect.value = profile.skinAnimation || localStorage.getItem('obsidian.skinAnimation') || 'walk'
    if (skinVariantSelect) skinVariantSelect.value = String(profile.skinVariant || 'classic').toLowerCase() === 'slim' ? 'slim' : 'classic'
    minecraftName.innerText = profile.username || 'PlayerTest'
    minecraftMode.innerText = currentLanguage === 'en' ? (profile.mode === 'premium' ? 'Premium account' : 'Offline mode') : (profile.mode === 'premium' ? 'Cuenta premium' : 'Modo offline')
    sidebarProfileName.innerText = profile.username || 'Obsidian'
    sidebarProfileMode.innerText = currentLanguage === 'en' ? (profile.mode === 'premium' ? 'Microsoft account' : 'Offline profile') : (profile.mode === 'premium' ? 'Cuenta Microsoft' : 'Perfil offline')
    renderSidebarHead(profile.skinUrl || '')
    renderLocalizedProfileState(profile)
    const activeCape = Array.isArray(profile.availableCapes) ? profile.availableCapes.find((cape) => cape.active) : null
    if (capeSourceLabel) capeSourceLabel.innerText = activeCape?.alias || (currentLanguage === 'en' ? 'No active cape' : 'Sin capa activa')
    if (appearanceModal?.classList.contains('open') && !appearanceOperation.loading) renderAppearanceManager(profile)
    previewSkin()
})

ipcRenderer.on('playtime-stats', (event, projects) => {
    if (!playtimeList) return
    const entries = Array.isArray(projects) ? projects : []
    playtimeList.innerHTML = entries.length
        ? entries.map((project) => {
            const totalMinutes = Math.floor(Math.max(0, Number(project.milliseconds) || 0) / 60000)
            const hours = Math.floor(totalMinutes / 60)
            const minutes = totalMinutes % 60
            const time = hours ? `${hours} h ${minutes} min` : `${minutes} min`
            return `<div class="playtime-entry"><div><strong>${escapeHtml(project.name)}</strong><span>Tiempo registrado</span></div><b>${time}</b></div>`
        }).join('')
        : '<div class="playtime-empty">Todavia no hay sesiones registradas.</div>'
})

ipcRenderer.on('instance-deleted', (event, data) => {
    selectedProject = { ...(data.project || selectedProject), isInstalled: false, isUpdateAvailable: false }
    currentServers = currentServers.map((server) => server.id === selectedProject.id ? { ...server, isInstalled: false, isUpdateAvailable: false } : server)
    progressBar.style.width = '0%'
    renderHeroDetails(selectedProject, data)
    renderServerCards()
    setLaunchStatus('Instancia eliminada   lista para instalar')
    setButtonState({ canInstall: true, canPlay: false, canStop: false, canDelete: false, installLabel: 'Instalar' })
})
ipcRenderer.on('premium-login-unavailable', () => { minecraftMode.innerText = 'No se pudo iniciar Microsoft'; renderMicrosoftSyncStatus({ mode: 'offline', premiumReady: false }) })
ipcRenderer.on('log', (event, msg) => { const lines = String(msg || '').split(/\r?\n/).filter((line) => line.trim()); logHistory.push(...lines); if (logHistory.length > 400) logHistory.splice(0, logHistory.length - 400); renderLogHistory(); const important = lines.find(shouldToastImportantLine); if (important) { setLaunchStatus('Error detectado', 'error'); showToast(important.slice(0, 140), 'error') } })
ipcRenderer.on('progress', (event, percent) => { const safe = Math.max(0, Math.min(100, Number(percent) || 0)); progressBar.style.width = `${safe}%`; if (progressBar) progressBar.dataset.value = String(Math.round(safe)); if (safe > 0 && safe < 100) setLaunchStatus(`Procesando instancia - ${Math.round(safe)}%`, 'installing'); if (safe === 100) { setLaunchStatus('Preparacion completada', 'ready'); showToast('Instancia preparada.'); setButtonState({ canPlay: true, canStop: false, canDelete: true }) } })

setButtonState()
try { renderMinecraftDefaultSettings(JSON.parse(localStorage.getItem('obsidian.minecraftDefaults') || 'null') || DEFAULT_MINECRAFT_DEFAULTS) } catch (err) { renderMinecraftDefaultSettings(DEFAULT_MINECRAFT_DEFAULTS) }
initIntro()
initOnboarding()
const savedRam = localStorage.getItem('obsidian.ram') || '4'
ramSlider.value = savedRam
updateRamValue(savedRam)
ipcRenderer.send('get-minecraft-profile')
ipcRenderer.send('get-playtime')
ipcRenderer.send('get-launcher-version')
ipcRenderer.send('get-system-info')
ipcRenderer.send('request-diagnostic-report') // request-diagnostic-report-initial

document.getElementById('code-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') window.enviarCodigo()
})
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        document.getElementById('catalog-search')?.focus()
    }
    if (event.key === 'Escape' && appearanceModal?.classList.contains('open')) {
        window.closeAppearanceManager()
        return
    }
    if (event.key === 'Escape' && announcementModal?.classList.contains('open')) {
        window.closeAnnouncement()
        return
    }
    if (event.key === 'Escape' && trailerModal?.classList.contains('open')) {
        window.closeTrailer()
        return
    }
    if (event.key === 'Escape' && consoleModal?.classList.contains('open')) window.closeConsoleWindow()
    closeInstanceContextMenu()
})
















localDropZone?.addEventListener('dragover', (event) => {
    event.preventDefault()
    localDropZone.classList.add('drag-over')
})
localDropZone?.addEventListener('dragleave', () => localDropZone.classList.remove('drag-over'))
localDropZone?.addEventListener('drop', (event) => {
    event.preventDefault()
    localDropZone.classList.remove('drag-over')
    const files = Array.from(event.dataTransfer?.files || [])
    const paths = files.map((file) => {
        try {
            return webUtils?.getPathForFile ? webUtils.getPathForFile(file) : file.path
        } catch (err) {
            return file.path || ''
        }
    }).filter((filePath) => /\.(zip|mrpack)$/i.test(filePath || ''))
    window.importLocalPackFiles(paths)
})




document.addEventListener('click', (event) => { if (instanceContextMenu?.classList.contains('open') && !instanceContextMenu.contains(event.target)) closeInstanceContextMenu() })



