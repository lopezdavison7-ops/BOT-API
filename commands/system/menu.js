import moment from "moment-timezone"

let handler = async (m, { conn, usedPrefix }) => {
    let uptime = process.uptime()
    let h = Math.floor(uptime / 3600)
    let mnt = Math.floor((uptime % 3600) / 60)
    
    let totalCommands = Object.values(global.plugins).filter(p => p.help).length
    
    let menu = `
🌌 *ALEX BOT v1.0*
🌌────────────────

✨ *Creador:* Luis González
🤖 *Bot:* ${global.botname || 'ALEX BOT'}
⏱️ *Uptime:* ${h}h ${mnt}m
🕒 *Hora:* ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 *Fecha:* ${moment.tz('America/Bogota').format('DD/MM/YYYY')}
📚 *Total Comandos:* ${totalCommands}

🌌────────────────
*LISTA DE CATEGORIAS:*

`.trim()

    let categories = {}
    Object.values(global.plugins).filter(p => p.help).forEach(plugin => {
        let tags = plugin.tags || ['Otros']
        for (let tag of tags) {
            if (!categories[tag]) categories[tag] = []
        }
    })
    
    for (let cat of Object.keys(categories)) {
        menu += `📦 *${cat}*\n`
    }
    
    menu += `\nUsa: *${usedPrefix}menu <categoria>* para ver comandos\n🌌────────────────`
    
    await conn.sendMessage(m.chat, { text: menu }, { quoted: m })
}

handler.command = /^(menu|menú|\?)$/i
handler.help = ['menu']
handler.tags = ['system']

export default handler