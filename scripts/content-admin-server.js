const fs = require('fs')
const http = require('http')
const path = require('path')
const crypto = require('crypto')
const { defaultFile, validateContent } = require('./content-tool')

const host = '127.0.0.1'
const token = crypto.randomBytes(24).toString('hex')
const htmlFile = path.resolve(__dirname, '..', 'tools', 'content-admin.html')

function reply(response, status, body, type = 'application/json; charset=utf-8') {
    response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    response.end(body)
}

const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://${host}`)
    if (url.searchParams.get('token') !== token) return reply(response, 403, JSON.stringify({ error: 'Token local no valido.' }))
    if (request.method === 'GET' && url.pathname === '/') return reply(response, 200, fs.readFileSync(htmlFile), 'text/html; charset=utf-8')
    if (request.method === 'GET' && url.pathname === '/api/content') return reply(response, 200, fs.readFileSync(defaultFile))
    if (request.method === 'PUT' && url.pathname === '/api/content') {
        let body = ''
        request.setEncoding('utf8')
        request.on('data', (chunk) => {
            body += chunk
            if (body.length > 2 * 1024 * 1024) request.destroy()
        })
        request.on('end', () => {
            try {
                const document = JSON.parse(body)
                const errors = validateContent(document)
                if (errors.length) return reply(response, 422, JSON.stringify({ errors }))
                document.generated_at = new Date().toISOString()
                const temp = `${defaultFile}.${process.pid}.tmp`
                fs.writeFileSync(temp, JSON.stringify(document, null, 2) + '\n', 'utf8')
                fs.renameSync(temp, defaultFile)
                reply(response, 200, JSON.stringify({ ok: true, generated_at: document.generated_at }))
            } catch (error) {
                reply(response, 400, JSON.stringify({ error: error.message }))
            }
        })
        return
    }
    reply(response, 404, JSON.stringify({ error: 'Ruta no encontrada.' }))
})

server.listen(0, host, () => {
    const address = server.address()
    console.log(`Panel local: http://${host}:${address.port}/?token=${token}`)
    console.log('Solo escucha en este equipo. Ctrl+C para cerrarlo.')
})
