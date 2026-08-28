import moment from "moment-timezone"
import fetch from "node-fetch"
import { prepareWAMessageMedia, generateWAMessageFromContent } from "@whiskeysockets/baileys"

//  Bordes aleatorios
const christmasBorders = [
  "🌌🔭🧪🔬👨‍🔬👩‍🔬",
  "🌌⚛️🧪⚗️🔬🔭",
  "⚛️⚗️🧪🔬🌌⚛️",
  "👨‍🔬🔭⚛️🔬⚗️👩‍🔬",
  "🧪⚗️🔬👨‍🔬👩‍🔬⚛️🔭"
]

function randomBorder() {
  return christmasBorders[Math.floor(Math.random() * christmasBorders.length)]
}

// Genera un contacto falso con miniatura
async function makeFkontak() {
  try {
    const res = await fetch('https://files.catbox.moe/kjg1hi.jpg')
    const thumb = Buffer.from(await res.arrayBuffer())
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Senku' },
      message: { locationMessage: { name: 'Laboratorio Senku ', jpegThumbnail: thumb } },
      participant: '0@s.whatsapp.net'
    }
  } catch {
    return null
  }
}

let handler = async (m, { conn, args, command }) => {
  try {
    global.namecanal = '𝖄𝕺 𝕾𝕺𝖄 𝖄𝕺'
    global.canal = 'https://whatsapp.com/channel/0029VbAmMiM96H4KgBHZUn1z'
    global.idcanal = '120363399729727124@newsletter'

    const senkuVideos = [
      "https://files.catbox.moe/vgmwfj.mp4",
      "https://files.catbox.moe/vgmwfj.mp4"
    ]
    const randomVideo = senkuVideos[Math.floor(Math.random() * senkuVideos.length)]

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

    // ❄️ Categoría seleccionada
    if (args[0] && categories[args[0]]) {
      let comandos = categories[args[0]]
        .map(cmd => ` *${cmd}*`)
        .join('\n')

      let text = `${randomBorder()}\n *Laboratorio de Senku* 🎅🏻\n${randomBorder()}

🧪 *Categoría:* ${args[0]}
❄️ *Comandos disponibles:*

${comandos || 'No hay comandos en esta categoría.'}

${randomBorder()}`

      await conn.sendMessage(m.chat, { text }, { quoted: fkontak })
      return
    }

    // 🕒 Datos del sistema
    let uptimeSec = process.uptime()
    let h = Math.floor(uptimeSec / 3600)
    let mnt = Math.floor((uptimeSec % 3600) / 60)
    let s = Math.floor(uptimeSec % 60)
    let uptimeStr = `${h}h ${mnt}m ${s}s`

    let botName = global.botname || "Breilesys Bot"
    let rolBot = conn.user.jid === global.conn.user.jid
      ? "🤖 𝔅𝔬𝔱 𝔓𝔯𝔦𝔫𝔠𝔦𝔭𝔞𝔩"
      : "🤖 𝒮𝓊𝒷 𝐵𝑜𝓉"

    // 🎄 CABECERA NAVIDEÑA
    const border = randomBorder()
    const headerText = `${border}
*LABORATORIO DE SENKU* 
${border}

✨ *Bot:* ${botName}
🔧 *Rol:* ${rolBot}
⏱️ *Uptime:* ${uptimeStr}
🕒 *Hora:* ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 *Fecha:* ${moment.tz('America/Bogota').format('DD/MM/YYYY')}

📢 *Canal:* ${global.namecanal}
🔗 ${global.canal}
${border}`

    // VIDEO
    const mediaHeader = await prepareWAMessageMedia(
      { video: { url: randomVideo }, gifPlayback: false },
      { upload: conn.waUploadToServer }
    )

    // 📂 Lista de categorías
    const rows = Object.keys(categories).map(cat => ({
      title: `🎄 ${cat}`,
      description: `Comandos navideños de ${cat}`,
      id: `.menu ${cat}`
    }))

    const interactiveMessage = {
      body: { text: `${headerText}\n\n *Elige una categoría para continuar:*` },
      footer: { text: "💻 BOT-API⚡" },
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
              sections: [{ title: " Laboratorio", rows }]
            })
          }
        ],
        messageParamsJson: ""
      }
    }

    const msgSend = generateWAMessageFromContent(
      m.chat,
      { viewOnceMessage: { message: { interactiveMessage } } },
      { userJid: conn.user.jid, quoted: fkontak }
    )

    await conn.relayMessage(m.chat, msgSend.message, { messageId: msgSend.key.id })
  } catch (e) {
    console.error(e)
    m.reply("💥❄️ Error.")
  }
}

handler.command = /^menu$/i
export default handler