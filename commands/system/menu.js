import moment from "moment-timezone"

const borders = ["🌌🔭🧪🔬👨‍💻👩‍💻", "🌌⚛️🧪⚗️🔬🔭", "⚛️⚗️🧪🔬🌌⚛️", "👨‍💻🔭⚛️🔬⚗️👩‍💻", "🧪⚗️🔬👨‍💻👩‍💻⚛️🔭"]
const randomBorder = () => borders[Math.floor(Math.random() * borders.length)]

let handler = async (m, { conn, usedPrefix }) => {
    let uptime = process.uptime()
    let h = Math.floor(uptime / 3600)
    let mnt = Math.floor((uptime % 3600) / 60)
    let s = Math.floor(uptime % 60)

    let totalcmd = Object.values(global.plugins).filter(p => p.help && p.tags).length

    const border = randomBorder()

    let txt = `${border}
*💻 BOT-API ⚡*
${border}

👑 *Creador:* Luis González
🤖 *Bot:* BOT-API ⚡
⚡ *Uptime:* ${h}h ${mnt}m ${s}s
🕒 *Hora:* ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 *Fecha:* ${moment.tz('America/Bogota').format('DD/MM/YYYY')}
📚 *Total Comandos:* ${totalcmd}
🔧 *Prefijo:* ${usedPrefix}

📢 *Canal:* BOT-API ⚡
🔗 https://whatsapp.com/channel/
${border}

*🗂️ LISTA DE CATEGORIAS*
${border}
`.trim()

    let categories = {}
    const blockedTags = ['nsfw', 'anime', 'convert', 'rpg'] // <-- BLOQUEADAS
    Object.values(global.plugins).filter(p => p.help && p.tags).forEach(plugin => {
        for (let tag of plugin.tags) {
            if (!blockedTags.includes(tag.toLowerCase())) { 
                if (!categories[tag]) categories[tag] = []
            }
        }
    })

    // Emojis por categoría chidos
    const catEmojis = {
        'main': '🏠',
        'system': '⚙️',
        'downloader': '📥',
        'sticker': '🎭',
        'tools': '🛠️',
        'fun': '🎮',
        'owner': '👑',
        'game': '🎲',
        'info': 'ℹ️',
        'search': '🔍',
        'group': '👥',
        'ai': '🧠',
        'economy': '💰',
        'store': '🛍️',
        'Otros': '📦'
    }

    for (let cat of Object.keys(categories).sort()) {
        let emoji = catEmojis[cat.toLowerCase()] || '📦'
        txt += `${emoji} *${cat}*\n`
    }

    txt += `\n${border}\n💡 *Usa:* ${usedPrefix}menu <categoria>\n📌 *Ejemplo:* ${usedPrefix}menu downloader\n${border}`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|menú|\?)$/i

export default handler