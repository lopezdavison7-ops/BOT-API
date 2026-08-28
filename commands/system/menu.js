import fetch from "node-fetch"
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"
import fs from 'fs'
import path from 'path'
import { obtenerStore } from '../../lib/jsonStore.js'

const borders = ["🌌🔭🧪🔬👨‍💻👩‍💻", "🌌⚛️🧪⚗️🔬🔭", "⚛️⚗️🧪🔬🌌⚛️", "👨‍💻🔭⚛️🔬⚗️👩‍💻", "🧪⚗️🔬👨‍💻👩‍💻⚛️🔭"]
function randomBorder() { return borders[Math.floor(Math.random() * borders.length)] }

async function makeFkontak() {
  try {
    const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg')
    let thumb = fs.existsSync(FOTO_MENU)? fs.readFileSync(FOTO_MENU) : Buffer.from('')
    return { key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'BOTAPI' }, message: { locationMessage: { name: 'BOT-API 2.0', jpegThumbnail: thumb } }, participant: '0@s.whatsapp.net' }
  } catch { return null }
}

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json')
function obtenerCanal() { try { const d = obtenerStore(CANAL_FILE, { url: '' }); return typeof d.url === 'string'? d.url.trim() : ''; } catch { return ''; } }

function getHora() {
    const now = new Date()
    return now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/La_Paz' })
}
function getFecha() {
    const now = new Date()
    return now.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/La_Paz' })
}

let handler = async (m, { conn, args, command }) => {
  try {
    global.namecanal = 'BOT-API 2.0'
    global.canal = obtenerCanal() || 'https://whatsapp.com/channel/'
    global.idcanal = '120363399729727124@newsletter'
    const fkontak = (await makeFkontak()) || m

    let categories = {}
    Object.values(global.plugins).filter(p => p?.help).forEach(plugin => {
        let tags = plugin.tags || ['Otros']
        for (let tag of tags) {
          if (!categories[tag]) categories[tag] = []
          categories[tag].push(...plugin.help.map(h => h.split(' ')[0]))
        }
      })

    global.menuMap = global.menuMap || {}
    global.menuMap[m.chat] = {}
    Object.keys(categories).forEach((cat, i) => global.menuMap[m.chat][i+1] = cat)

    if (args[0] && categories[args[0]]) {
      let comandos = categories[args[0]].map(cmd => ` ✦ *.${cmd}*`).join('\n')
      let text = `${randomBorder()}\n *BOT-API 2.0* 🚀\n${randomBorder()}\n\n📦 *Categoría:* ${args[0]}\n📋 *Comandos:*\n\n${comandos}\n\n${randomBorder()}\nPara volver: *.menu*`
      return await conn.sendMessage(m.chat, { text }, { quoted: fkontak })
    }

    let uptimeSec = process.uptime()
    let h = Math.floor(uptimeSec / 3600)
    let mnt = Math.floor((uptimeSec % 3600) / 60)
    let s = Math.floor(uptimeSec % 60)
    let uptimeStr = `${h}h ${mnt}m ${s}s`
    let botName = global.botname || "BOT-API 2.0"

    const border = randomBorder()
    const headerText = `${border}
*🚀 BOT-API 2.0*
${border}

✨ *Creador:* Luis González
🤖 *Bot:* ${botName}
⏱️ *Uptime:* ${uptimeStr}
🕒 *Hora:* ${getHora()}
📅 *Fecha:* ${getFecha()}
📚 *Comandos:* ${Object.values(global.plugins).filter(p => p?.help).length}
🔧 *Prefijo:*.

📢 *Canal:* ${global.namecanal}
🔗 ${global.canal}
${border}`

    const rows = Object.keys(categories).map((cat, i) => ({ title: `📦 ${cat}`, description: `${categories[cat].length} comandos`, id: `.menu ${cat}` }))
    if (global.canal) rows.push({ title: `📢 VER CANAL`, description: `Canal oficial`, id: global.canal })

    const interactiveMessage = {
      body: { text: `${headerText}\n\n *Elige una categoría:*\nO responde con el número` },
      footer: { text: "⚡ BOT-API 2.0" },
      header: { title: " MENÚ PRINCIPAL" },
      nativeFlowMessage: { buttons: [{ name: "single_select", buttonParamsJson: JSON.stringify({ title: " Categorías", sections: [{ title: " BOT-API", rows }] }) }], messageParamsJson: "" }
    }

    try {
        const videos = ["https://files.catbox.moe/vgmwfj.mp4"]
        const randomVideo = videos[Math.floor(Math.random() * videos.length)]
        const mediaHeader = await prepareWAMessageMedia({ video: { url: randomVideo } }, { upload: conn.waUploadToServer })
        interactiveMessage.header.hasMediaAttachment = true
        interactiveMessage.header.videoMessage = mediaHeader.videoMessage
    } catch (e) { console.log('[MENU] Sin video:', e.message) }

    const msgSend = generateWAMessageFromContent(m.chat, { viewOnceMessage: { message: { interactiveMessage } }, { userJid: conn.user.jid, quoted: fkontak })
    await conn.relayMessage(m.chat, msgSend.message, { messageId: msgSend.key.id })

  } catch (e) {
    console.error('[MENU ERROR]', e)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${e.message}` }, { quoted: m })
  }
}

handler.command = /^menu$/i
export default handler