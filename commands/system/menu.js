import moment from "moment-timezone"
import fetch from "node-fetch"
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"
import fs from 'fs'
import path from 'path'

// Bordes
const borders = ["🌌🔭🧪🔬👨‍💻👩‍💻", "🌌⚛️🧪⚗️🔬🔭", "⚛️⚗️🧪🔬🌌⚛️", "👨‍💻🔭⚛️🔬⚗️👩‍💻", "🧪⚗️🔬👨‍💻👩‍💻⚛️🔭"]
const randomBorder = () => borders[Math.floor(Math.random() * borders.length)]

async function makeFkontak() {
  try {
    const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg')
    let thumb = fs.existsSync(FOTO_MENU)? fs.readFileSync(FOTO_MENU) : Buffer.alloc(0)
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'ALEXBOT' },
      message: { locationMessage: { name: 'ALEX WHATSAPP BOT', jpegThumbnail: thumb } },
      participant: '0@s.whatsapp.net'
    }
  } catch { return null }
}

let handler = async (m, { conn, args, command }) => {
  try {
    global.namecanal = 'ALEX BOT'
    global.canal = 'https://whatsapp.com/channel/'

    const fkontak = await makeFkontak() || m

    // 📚 CATEGORÍAS
    let categories = {}
    Object.values(global.plugins).filter(p => p?.help).forEach(plugin => {
        let tags = plugin.tags || ['Otros']
        for (let tag of tags) {
          if (!categories[tag]) categories[tag] = []
          categories[tag].push(...plugin.help.map(h => h.split(' ')[0]))
        }
      })

    // Guardar mapa para responder con numero 1 2 3
    global.menuMap = global.menuMap || {}
    global.menuMap[m.chat] = {}
    Object.keys(categories).forEach((cat, i) => global.menuMap[m.chat][i+1] = cat)

    // Si eligió categoría
    if (args[0] && categories[args[0]]) {
      let comandos = categories[args[0]].map(cmd => ` ✦ *.${cmd}*`).join('\n')
      let text = `${randomBorder()}\n *ALEX BOT* 🚀\n${randomBorder()}\n\n📦 *Categoría:* ${args[0]}\n📋 *Comandos:*\n\n${comandos}\n\n${randomBorder()}\nPara volver: *.menu*`
      return await conn.sendMessage(m.chat, { text }, { quoted: fkontak })
    }

    // Datos
    let uptimeSec = process.uptime()
    let h = Math.floor(uptimeSec / 3600)
    let mnt = Math.floor((uptimeSec % 3600) / 60)
    let s = Math.floor(uptimeSec % 60)
    let uptimeStr = `${h}h ${mnt}m ${s}s`
    let botName = global.botname || "ALEX BOT"

    const border = randomBorder()
    const headerText = `${border}
*🚀 ALEX WHATSAPP BOT*
${border}

✨ *Creador:* Luis González
🤖 *Bot:* ${botName}
⏱️ *Uptime:* ${uptimeStr}
🕒 *Hora:* ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 *Fecha:* ${moment.tz('America/Bogota').format('DD/MM/YYYY')}
📚 *Comandos:* ${Object.values(global.plugins).filter(p => p?.help).length}
🔧 *Prefijo:*.

📢 *Canal:* ${global.namecanal}
🔗 ${global.canal}
${border}`

    const rows = Object.keys(categories).map((cat, i) => ({
      title: `📦 ${cat}`,
      description: `${categories[cat].length} comandos`,
      id: `.menu ${cat}`
    }))

    const interactiveMessage = {
      body: { text: `${headerText}\n\n *Elige una categoría:*\nO responde con el número` },
      footer: { text: "⚡ ALEX BOT" },
      header: { title: " MENÚ PRINCIPAL" },
      nativeFlowMessage: {
        buttons: [{
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: " Categorías disponibles",
            sections: [{ title: " ALEX BOT", rows }]
          })
        }],
        messageParamsJson: ""
      }
    }

    // INTENTAR CON VIDEO
    try {
        const videos = ["https://files.catbox.moe/vgmwfj.mp4"]
        const randomVideo = videos[Math.floor(Math.random() * videos.length)]
        const mediaHeader = await prepareWAMessageMedia({ video: { url: randomVideo } }, { upload: conn.waUploadToServer })
        interactiveMessage.header.hasMediaAttachment = true
        interactiveMessage.header.videoMessage = mediaHeader.videoMessage
    } catch (e) {
        console.log('[MENU] Sin video:', e.message)
    }

    const msgSend = generateWAMessageFromContent(
        m.chat,
        { viewOnceMessage: { message: { interactiveMessage } }, // <-- AQUI ESTABA EL ERROR
        { userJid: conn.user.jid, quoted: fkontak }
    )
    await conn.relayMessage(m.chat, msgSend.message, { messageId: msgSend.key.id })

  } catch (e) {
    console.error('[MENU ERROR]', e)
    await conn.sendMessage(m.chat, { text: `❌ Error en menú: ${e.message}` }, { quoted: m })
  }
}

handler.command = /^menu$/i
export default handler