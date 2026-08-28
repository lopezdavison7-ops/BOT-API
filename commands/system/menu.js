import moment from "moment-timezone"
import fetch from "node-fetch"
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"
import fs from 'fs'
import path from 'path'
import { obtenerStore } from '../../lib/jsonStore.js'

// Bordes aleatorios
const borders = [
  "🌌🔭🧪🔬👨‍💻👩‍💻",
  "🌌⚛️🧪⚗️🔬🔭",
  "⚛️⚗️🧪🔬🌌⚛️",
  "👨‍💻🔭⚛️🔬⚗️👩‍💻",
  "🧪⚗️🔬👨‍💻👩‍💻⚛️🔭"
]

function randomBorder() {
  return borders[Math.floor(Math.random() * borders.length)]
}

// Genera un contacto falso con miniatura
async function makeFkontak() {
  try {
    const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg')
    let thumb = fs.existsSync(FOTO_MENU)? fs.readFileSync(FOTO_MENU) : Buffer.from('')
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'BOTAPI' },
      message: { locationMessage: { name: 'BOT-API 2.0', jpegThumbnail: thumb } },
      participant: '0@s.whatsapp.net'
    }
  } catch {
    return null
  }
}

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json')
function obtenerCanal() { try { const d = obtenerStore(CANAL_FILE, { url: '' }); return typeof d.url === 'string'? d.url.trim() : ''; } catch { return ''; } }

let handler = async (m, { conn, args, command }) => {
  try {
    global.namecanal = 'BOT-API 2.0'
    global.canal = obtenerCanal() || 'https://whatsapp.com/channel/'
    global.idcanal = '120363399729727124@newsletter'

    const videos = [
      "https://files.catbox.moe/vgmwfj.mp4",
      "https://files.catbox.moe/vgmwfj.mp4"
    ]
    const randomVideo = videos[Math.floor(Math.random() * videos.length)]

    const fkontak = (await makeFkontak()) || m

    // 📚 CATEGORÍAS
    let categories = {}
    Object.values(global.plugins)
     .filter(p => p?.help)
     .forEach(plugin => {
        let tags = plugin.tags || ['Otros']
        for (let tag of tags) {
          if (!categories[tag]) categories[tag] = []
          categories[tag].push(...plugin.help.map(h => h.split(' ')[0]))
        }
      })

    // Guardar mapa para responder con numero
    global.menuMap = global.menuMap || {}
    global.menuMap[m.chat] = {}
    let num = 1
    for (const cat of Object.keys(categories)) {
        global.menuMap[m.chat][num] = cat
        num++
    }

    // ❄️ Categoría seleccionada
    if (args[0] && categories[args[0]]) {
      let comandos = categories[args[0]]
       .map(cmd => ` ✦ *.${cmd}*`)
       .join('\n')

      let text = `${randomBorder()}\n *BOT-API 2.0* 🚀\n${randomBorder()}

📦 *Categoría:* ${args[0]}
📋 *Comandos disponibles:*

${comandos || 'No hay comandos en esta categoría.'}

${randomBorder()}
Para volver: *.menu*`

      await conn.sendMessage(m.chat, { text }, { quoted: fkontak })
      return
    }

    // 🕒 Datos del sistema
    let uptimeSec = process.uptime()
    let h = Math.floor(uptimeSec / 3600)
    let mnt = Math.floor((uptimeSec % 3600) / 60)
    let s = Math.floor(uptimeSec % 60)
    let uptimeStr = `${h}h ${mnt}m ${s}s`

    let botName = global.botname || "BOT-API 2.0"
    let creador = "Luis González"
    let prefijo = '.'

    // CABECERA
    const border = randomBorder()
    const headerText = `${border}
*🚀 BOT-API 2.0*
${border}

✨ *Creador:* ${creador}
🤖 *Bot:* ${botName}
⏱️ *Uptime:* ${uptimeStr}
🕒 *Hora:* ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 *Fecha:* ${moment.tz('America/Bogota').format('DD/MM/YYYY')}
📚 *Comandos:* ${Object.values(global.plugins).filter(p => p?.help).length}
🔧 *Prefijo:* ${prefijo}

📢 *Canal:* ${global.namecanal}
🔗 ${global.canal}
${border}`

    // VIDEO
    const mediaHeader = await prepareWAMessageMedia(
      { video: { url: randomVideo }, gifPlayback: false },
      { upload: conn.waUploadToServer }
    )

    // 📂 Lista de categorías
    const rows = Object.keys(categories).map((cat, i) => ({
      title: `📦 ${cat}`,
      description: `${categories[cat].length} comandos - Responde con ${i+1}`,
      id: `.menu ${cat}`
    }))

    if (global.canal) {
        rows.push({
            title: `📢 VER CANAL`,
            description: `Canal oficial del bot`,
            id: global.canal
        })
    }

    const interactiveMessage = {
      body: { text: `${headerText}\n\n *Elige una categoría para continuar:*\nO responde con el número` },
      footer: { text: "⚡ BOT-API 2.0" },
      header: {
        title: " MENÚ PRINCIPAL",
        hasMediaAttachment: true,
        videoMessage: mediaHeader.videoMessage
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: " Categorías disponibles",
              sections: [{ title: " BOT-API", rows }]
            })
          }
        ],
        messageParamsJson: ""
      }
    }

    const msgSend = generateWAMessageFromContent(
      m.chat,
      { viewOnceMessage: { message: { interactiveMessage } },
      { userJid: conn.user.jid, quoted: fkontak }
    )

    await conn.relayMessage(m.chat, msgSend.message, { messageId: msgSend.key.id })
  } catch (e) {
    console.error(e)
    m.reply("💥 Error en el menú.")
  }
}

handler.command = /^menu$/i
export default handler