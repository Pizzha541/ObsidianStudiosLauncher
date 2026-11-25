const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const outputDir = path.join(root, 'tmp')
const screenshotPath = path.join(outputDir, 'instances-qa.png')
const filtersScreenshotPath = path.join(outputDir, 'instances-filters-qa.png')
const compactScreenshotPath = path.join(outputDir, 'instances-compact-qa.png')
const settingsScreenshotPath = path.join(outputDir, 'settings-qa.png')
const reportPath = path.join(outputDir, 'instances-qa.json')
const content = JSON.parse(fs.readFileSync(path.join(root, 'content', 'launcher-content.json'), 'utf8'))

app.commandLine.appendSwitch('disable-gpu')

app.whenReady().then(async () => {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify({ status: 'starting' }, null, 2))
    const win = new BrowserWindow({
        width: 1380,
        height: 780,
        show: false,
        frame: false,
        webPreferences: {
            preload: path.join(root, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            offscreen: true,
            backgroundThrottling: false
        }
    })

    await win.loadFile(path.join(root, 'src', 'index.html'))
    await win.webContents.executeJavaScript(`
        window.switchTab('home');
    `)

    const projects = content.projects.map((project, index) => ({
        ...project,
        bg_image: project.image,
        isInstalled: index === 0,
        isUpdateAvailable: index === 1
    }))
    const news = content.news.map((item) => ({
        ...item,
        date: item.publish_at,
        body: item.content,
        label: item.type
    }))
    win.webContents.send('all-servers-info', projects)
    win.webContents.send('content-news', news)
    win.webContents.send('launcher-version', { version: '1.1.0' })
    win.webContents.send('minecraft-profile', { mode: 'premium', username: 'Martin' })
    win.webContents.send('diagnostic-report', {
        rows: [
            { key: 'Java', value: 'Listo (Java 21)', state: 'ok' },
            { key: 'Versión de Minecraft', value: 'v1.21.8', state: 'ok' },
            { key: 'Cargador de mods', value: 'neoforge 21.8.53', state: 'ok' },
            { key: 'Memoria asignada', value: '6 GB (correcto)', state: 'ok' },
            { key: 'Instalación', value: 'Lista', state: 'ok' },
            { key: 'Catálogo', value: 'Conectado', state: 'ok' },
            { key: 'Cuenta Microsoft', value: 'Martin', state: 'ok' },
            { key: 'Acceso privado', value: 'Pendiente de comprobar', state: 'warn' }
        ],
        report: 'Informe de prueba visual'
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    const layout = await win.webContents.executeJavaScript(`(() => {
        const intro = document.getElementById('intro-overlay');
        const onboarding = document.getElementById('onboarding-modal');
        if (intro) intro.style.display = 'none';
        if (onboarding) onboarding.style.display = 'none';
        const view = document.getElementById('view-home');
        const feature = document.getElementById('hero-panel');
        const rect = (node) => {
            const value = node?.getBoundingClientRect();
            return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null;
        };
        return {
            active: view?.classList.contains('active'),
            viewport: { width: innerWidth, height: innerHeight },
            feature: rect(feature),
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            cards: document.querySelectorAll('#instance-grid .card').length,
            cardActions: document.querySelectorAll('#instance-grid .card-actions').length,
            services: document.querySelectorAll('#service-strip > span').length,
            navItems: document.querySelectorAll('.nav-list .nav-item').length
        };
    })()`)

    if (!layout.active || layout.horizontalOverflow || layout.cards < 3 || layout.cardActions !== layout.cards || layout.services !== 3 || layout.navItems !== 4) {
        throw new Error(`Fallo visual de Instancias: ${JSON.stringify(layout)}`)
    }
    const image = await win.webContents.capturePage()
    fs.writeFileSync(screenshotPath, image.toPNG())

    const selectedId = await win.webContents.executeJavaScript(`document.querySelector('#instance-grid .card.active')?.dataset.serverId || document.querySelector('#instance-grid .card')?.dataset.serverId || ''`)
    const selectedFixture = projects.find((project) => project.id === selectedId) || projects[0]
    win.webContents.send('access-granted', { serverId: selectedFixture.id, project: selectedFixture, isInstalled: false, isUpdateAvailable: false })
    await new Promise((resolve) => setTimeout(resolve, 150))
    const actionButtons = await win.webContents.executeJavaScript(`(() => {
        const install = document.querySelector('.btn.install');
        document.querySelector('#instance-grid .card.active')?.click();
        const before = install ? getComputedStyle(install).display : 'missing';
        const checkingDisabled = install?.disabled === true;
        document.querySelector('.btn.more')?.click();
        const menuOpen = document.getElementById('instance-context-menu')?.classList.contains('open') === true;
        const after = install ? getComputedStyle(install).display : 'missing';
        const contentMenuButton = Array.from(document.querySelectorAll('#instance-context-menu button')).find((button) => button.textContent.trim() === 'Contenido');
        contentMenuButton?.click();
        const contentOpen = document.getElementById('instance-content-modal')?.classList.contains('open') === true;
        window.closeInstanceContent();
        return {
            before,
            after,
            checkingDisabled,
            menuOpen,
            contentOpen,
            duplicatedActions: document.querySelectorAll('.launch-actions .btn.content, .launch-actions .btn.folder, .launch-actions .btn.kill').length,
            trailerButtons: document.querySelectorAll('.launch-actions #trailer-button').length,
            primaryGameButtons: document.querySelectorAll('.launch-actions #game-action-button').length
        };
    })()`)
    win.webContents.send('install-state', true)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const installingLabel = await win.webContents.executeJavaScript(`document.querySelector('.btn.install span')?.textContent || ''`)
    win.webContents.send('install-state', false)
    win.webContents.send('game-state', true)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const stopState = await win.webContents.executeJavaScript(`(() => { const button = document.getElementById('game-action-button'); return { mode: button?.dataset.mode, label: button?.querySelector('span')?.textContent, visible: button ? getComputedStyle(button).display : 'missing', stopStyle: button?.classList.contains('is-stop') === true }; })()`)
    win.webContents.send('game-state', false)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const playState = await win.webContents.executeJavaScript(`(() => { const button = document.getElementById('game-action-button'); return { mode: button?.dataset.mode, label: button?.querySelector('span')?.textContent }; })()`)
    if (actionButtons.before === 'none' || actionButtons.after !== actionButtons.before || !actionButtons.checkingDisabled || !actionButtons.menuOpen || !actionButtons.contentOpen || actionButtons.duplicatedActions !== 0 || actionButtons.trailerButtons !== 1 || actionButtons.primaryGameButtons !== 1 || installingLabel !== 'Instalando' || stopState.mode !== 'stop' || stopState.label !== 'Parar' || stopState.visible === 'none' || !stopState.stopStyle || playState.mode !== 'play' || playState.label !== 'Jugar') {
        throw new Error(`Fallo de acciones del detalle: ${JSON.stringify({ ...actionButtons, installingLabel, stopState, playState })}`)
    }

    await win.webContents.executeJavaScript(`window.toggleCatalogFilters('filters')`)
    await new Promise((resolve) => setTimeout(resolve, 250))
    const filterLayout = await win.webContents.executeJavaScript(`(() => {
        const list = document.getElementById('instance-grid');
        list.scrollTop = 60;
        return {
            open: document.getElementById('catalog-filter-drawer')?.classList.contains('open') === true,
            listScrollable: list.scrollHeight > list.clientHeight,
            listMoved: list.scrollTop > 0,
            heroScrollable: document.getElementById('hero-panel').scrollHeight > document.getElementById('hero-panel').clientHeight
        };
    })()`)
    if (!filterLayout.open || !filterLayout.listScrollable || !filterLayout.listMoved) {
        throw new Error(`Fallo de filtros o desplazamiento: ${JSON.stringify(filterLayout)}`)
    }
    const filtersImage = await win.webContents.capturePage()
    fs.writeFileSync(filtersScreenshotPath, filtersImage.toPNG())
    await win.webContents.executeJavaScript(`window.closeCatalogFilters(); document.getElementById('instance-grid').scrollTop = 0;`)

    win.setSize(1024, 700)
    await new Promise((resolve) => setTimeout(resolve, 300))
    const compactLayout = await win.webContents.executeJavaScript(`(() => ({
        viewport: { width: innerWidth, height: innerHeight },
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        pageScrollable: document.getElementById('view-home').scrollHeight > document.getElementById('view-home').clientHeight,
        cards: document.querySelectorAll('#instance-grid .card').length
    }))()`)
    if (compactLayout.horizontalOverflow || !compactLayout.pageScrollable || compactLayout.cards < 3) {
        throw new Error(`Fallo del diseño compacto: ${JSON.stringify(compactLayout)}`)
    }
    const compactImage = await win.webContents.capturePage()
    fs.writeFileSync(compactScreenshotPath, compactImage.toPNG())
    win.setSize(1380, 780)
    await new Promise((resolve) => setTimeout(resolve, 250))
    const interactions = await win.webContents.executeJavaScript(`(() => {
        const tabs = ['home', 'news', 'account', 'settings'];
        const activeViews = tabs.map((tab) => {
            window.switchTab(tab);
            return document.getElementById('view-' + tab)?.classList.contains('active') === true;
        });
        window.openConsoleWindow();
        const consoleOpens = document.getElementById('console-modal')?.classList.contains('open') === true;
        window.closeConsoleWindow();
        window.openDownloadCenter();
        const downloadsOpen = document.getElementById('download-center-modal')?.classList.contains('open') === true;
        window.closeDownloadCenter();
        window.switchTab('home');
        return { activeViews, consoleOpens, downloadsOpen };
    })()`)
    if (!interactions.activeViews.every(Boolean) || !interactions.consoleOpens || !interactions.downloadsOpen) {
        throw new Error(`Fallo de interaccion: ${JSON.stringify(interactions)}`)
    }
    const diagnosticLayout = await win.webContents.executeJavaScript(`(() => {
        window.switchTab('settings');
        return {
            rows: document.querySelectorAll('#diagnostic-grid .diagnostic-row').length,
            icons: document.querySelectorAll('#diagnostic-grid .diagnostic-state-icon').length,
            consoleButton: Boolean(document.querySelector('.diagnostic-actions button[onclick="openConsoleWindow()"]'))
        };
    })()`)
    if (diagnosticLayout.rows !== 8 || diagnosticLayout.icons !== 8 || !diagnosticLayout.consoleButton) {
        throw new Error(`Fallo visual del diagnóstico: ${JSON.stringify(diagnosticLayout)}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
    const settingsImage = await win.webContents.capturePage()
    fs.writeFileSync(settingsScreenshotPath, settingsImage.toPNG())
    const report = { ...layout, actionButtons: { ...actionButtons, installingLabel, stopState, playState }, filterLayout, compactLayout, interactions, diagnosticLayout, screenshot: screenshotPath, filtersScreenshot: filtersScreenshotPath, compactScreenshot: compactScreenshotPath, settingsScreenshot: settingsScreenshotPath }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
    win.destroy()
    app.quit()
}).catch((error) => {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify({ error: error?.stack || String(error) }, null, 2))
    console.error(error)
    app.exit(1)
})
