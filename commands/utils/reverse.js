import { downloadContentFromMessage } from 'baileys'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'

const run = promisify(exec)
const TMP_DIR = path.join(process.cwd(), 'tmp')

async function downloadMedia(msg) {
    try {
        const type = Object.keys(msg)[0]
        if (!type) return null
        const stream = await downloadContentFromMessage(msg[type], type.replace('Message', ''))
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        return { buffer, type }
    } catch (e) {
        console.error('[REVERSE] Error descargando:', e.message)
        return null
    }
}

export default {
    nombre: 'reverse',
    categoria: 'utils',
    alias: ['rev', 'balik', 'invertir'],
    descripcion: 'Invierte video o audio (reply al media)',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

        if (!quoted) {
            return responder.texto(
                '╭━━〔 🔄 𝐑𝐄𝐕𝐄𝐑𝐒𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Responde a un video o audio\n' +
                '┃\n' +
                '┃ 💡 Uso:\n' +
                '┃ ➪ Responde video/audio con .reverse\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            )
        }

        let mediaNode = null
        let mediaType = null

        if (quoted.videoMessage) {
            mediaNode = quoted.videoMessage
            mediaType = 'video'
        } else if (quoted.audioMessage) {
            mediaNode = quoted.audioMessage
            mediaType = 'audio'
        }

        if (!mediaNode) {
            return responder.texto(
                '╭━━〔 🔄 𝐑𝐄𝐕𝐄𝐑𝐒𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Solo funciona con video o audio\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            )
        }

        await responder.texto('⏳ Procesando media...')

        try {
            const media = await downloadMedia(quoted)
            if (!media) throw new Error('Error al descargar media')

            console.log(`[REVERSE] Media descargado: ${media.buffer.length} bytes`)

            if (!fs.existsSync(TMP_DIR)) {
                fs.mkdirSync(TMP_DIR, { recursive: true })
            }

            const id = crypto.randomBytes(4).toString('hex')
            const ext = mediaType === 'video' ? 'mp4' : 'mp3'
            const inPath = path.join(TMP_DIR, `rev_in_${id}.${ext}`)
            const outPath = path.join(TMP_DIR, `rev_out_${id}.${ext}`)

            fs.writeFileSync(inPath, media.buffer)
            console.log(`[REVERSE] Archivo temporal: ${inPath}`)

            let cmd = ''
            if (mediaType === 'video') {
                cmd = `ffmpeg -y -i "${inPath}" -vf reverse -af areverse -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 192k "${outPath}"`
                console.log('[REVERSE] Procesando video...')
            } else {
                cmd = `ffmpeg -y -i "${inPath}" -af areverse -c:a libmp3lame -q:a 2 "${outPath}"`
                console.log('[REVERSE] Procesando audio...')
            }

            const startTime = Date.now()
            await run(cmd, { timeout: 300000 })
            const duration = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(`[REVERSE] Procesamiento completado en ${duration}s`)

            if (!fs.existsSync(outPath)) {
                throw new Error('Error al generar archivo invertido')
            }

            const outBuffer = fs.readFileSync(outPath)
            console.log(`[REVERSE] Resultado: ${outBuffer.length} bytes`)

            if (mediaType === 'video') {
                await sock.sendMessage(jid, {
                    video: outBuffer,
                    mimetype: 'video/mp4',
                    caption: '🔄 *Video Invertido*'
                }, { quoted: msg })
            } else {
                await sock.sendMessage(jid, {
                    audio: outBuffer,
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: msg })
            }

            console.log('[REVERSE] ✅ Enviado correctamente')

            try { fs.unlinkSync(inPath) } catch (e) {}
            try { fs.unlinkSync(outPath) } catch (e) {}

        } catch (err) {
            console.error('[REVERSE] Error:', err.message)
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                `┃ ⚠️ ${err.message}\n` +
                '┃\n' +
                '┃ 💡 Asegúrate de que ffmpeg esté instalado\n' +
                '┃    y que el media no sea muy largo\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            )
        }
    }
}