const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const root = path.resolve(__dirname, '..')
const defaultFile = path.join(root, 'content', 'launcher-content.json')

function validateContent(document) {
    const errors = []
    if (!document || typeof document !== 'object' || Array.isArray(document)) return ['El contenido debe ser un objeto JSON.']
    if (document.schema_version !== 1) errors.push('schema_version debe ser 1.')
    if (!Array.isArray(document.projects) || !document.projects.length) errors.push('projects debe contener al menos un proyecto.')
    if (!Array.isArray(document.news)) errors.push('news debe ser una lista.')
    const projectIds = new Set()
    for (const [index, project] of (document.projects || []).entries()) {
        const label = `projects[${index}]`
        if (!/^[a-zA-Z0-9._-]{1,80}$/.test(String(project.id || ''))) errors.push(`${label}.id no es valido.`)
        if (projectIds.has(project.id)) errors.push(`${label}.id esta duplicado.`)
        projectIds.add(project.id)
        for (const field of ['name', 'description', 'project_version', 'minecraft_version', 'loader', 'loader_version']) {
            if (!String(project[field] || '').trim()) errors.push(`${label}.${field} es obligatorio.`)
        }
        if (!project.file || !/^https:\/\//.test(String(project.file.url || ''))) errors.push(`${label}.file.url debe ser HTTPS.`)
        if (!Number.isSafeInteger(project.file?.size) || project.file.size <= 0) errors.push(`${label}.file.size debe ser un entero positivo.`)
        if (!/^[a-f0-9]{64}$/i.test(String(project.file?.sha256 || ''))) errors.push(`${label}.file.sha256 debe tener 64 caracteres hexadecimales.`)
        if (project.codigo_acceso || project.access_code || project.access?.code) errors.push(`${label} contiene una clave publica. Usa validacion por rol o un backend privado.`)
        if (project.access?.type === 'discord_role' && !/^\d{15,22}$/.test(String(project.access.role_id || ''))) errors.push(`${label}.access.role_id no es valido.`)
    }
    const newsIds = new Set()
    for (const [index, item] of (document.news || []).entries()) {
        const label = `news[${index}]`
        if (!/^[a-zA-Z0-9._-]{1,80}$/.test(String(item.id || ''))) errors.push(`${label}.id no es valido.`)
        if (newsIds.has(item.id)) errors.push(`${label}.id esta duplicado.`)
        newsIds.add(item.id)
        if (!String(item.title || '').trim()) errors.push(`${label}.title es obligatorio.`)
        if (!['draft', 'published', 'archived'].includes(String(item.status || ''))) errors.push(`${label}.status debe ser draft, published o archived.`)
        if (Number.isNaN(Date.parse(item.publish_at || ''))) errors.push(`${label}.publish_at debe ser una fecha ISO valida.`)
        if (item.expires_at && Number.isNaN(Date.parse(item.expires_at))) errors.push(`${label}.expires_at debe ser una fecha ISO valida.`)
        if (item.project_id && !projectIds.has(item.project_id)) errors.push(`${label}.project_id no existe en projects.`)
    }
    return errors
}

function readAndValidate(file = defaultFile) {
    const document = JSON.parse(fs.readFileSync(file, 'utf8'))
    const errors = validateContent(document)
    if (errors.length) throw new Error(errors.join('\n'))
    return document
}

async function hashFile(file) {
    const hash = crypto.createHash('sha256')
    await new Promise((resolve, reject) => fs.createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('end', resolve).on('error', reject))
    return { sha256: hash.digest('hex'), size: fs.statSync(file).size }
}

async function main() {
    const command = process.argv[2] || 'validate'
    if (command === 'validate') {
        const file = path.resolve(process.argv[3] || defaultFile)
        const document = readAndValidate(file)
        console.log(`Contenido valido: ${document.projects.length} proyectos y ${document.news.length} noticias.`)
        return
    }
    if (command === 'hash') {
        if (!process.argv[3]) throw new Error('Uso: node scripts/content-tool.js hash <archivo>')
        console.log(JSON.stringify(await hashFile(path.resolve(process.argv[3])), null, 2))
        return
    }
    throw new Error(`Comando desconocido: ${command}`)
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1 })

module.exports = { defaultFile, readAndValidate, validateContent }
