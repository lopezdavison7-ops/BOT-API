import moment from "moment-timezone"

const handler = async (m, { conn, command, usedPrefix }) => {
    let uptime = process.uptime()
    let h = Math.floor(uptime / 3600)
    let mnt = Math.floor((uptime % 3600) / 60)
    
    let menu = `🌌 *ALEX BOT*
    
✨ Creador: Luis
⏱️ Uptime: ${h}h ${mnt}m
🕒 Hora: ${moment.tz('America/Bogota').format('HH:mm:ss')}
📅 Fecha: ${moment.tz('America/Bogota').format('DD/MM/YYYY')}

Usa ${usedPrefix}menu para ver esto`
    
    conn.sendMessage(m.chat, { text: menu }, { quoted: m })
}

handler.help = ['menu']
handler.tags = ['system'] 
handler.command = ['menu', 'menú', '?']

export default handler