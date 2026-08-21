// commands/system/menu.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = '2.0.0';
const CREADOR = 'Alex y Luis';
const MOTOR = 'Baileys';

const FOTO_MENU = path.join(__dirname, '../..', 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(__dirname, '../..', 'database', 'canal.json');

function obtenerCanal() {
    try {
        if (!fs.existsSync(CANAL_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(CANAL_FILE, 'utf8'));
        return data.url || null;
    } catch { return null; }
}

export default {
    nombre: 'menu',
    alias: ['help', 'ayuda'],
    descripcion: 'Menú principal con botón de canal.',
    async ejecutar({ sock, msg, responder, listaComandos, prefijo }) {
        const cats = {};
        for (const cmd of listaComandos) {
            const cat = cmd.categoria || 'Otros';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(cmd);
        }

        const uptime = formatUptime(process.uptime());
        const total = listaComandos.length;

        // Encabezado bonito
        let texto = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
        texto += `┃   💎 *BOT-API v${VERSION}* 💎   ┃\n`;
        texto += `┃   🚀 *El Futuro de los Bots* 🚀   ┃\n`;
        texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        texto += `📅 *Fecha:* ${new Date().toLocaleDateString()}\n`;
        texto += `🕐 *Hora:* ${new Date().toLocaleTimeString()}\n`;
        texto += `⚡ *Uptime:* ${uptime}\n`;
        texto += `📚 *Comandos:* ${total}\n\n`;

        // Listar comandos por categoría con estilo > 
        for (const [cat, cmds] of Object.entries(cats)) {
            texto += `╭─❑ *${cat.toUpperCase()}* ❑─╮\n`;
            for (const cmd of cmds) {
                const desc = cmd.descripcion || 'Sin descripción';
                texto += `> ✦ *${prefijo}${cmd.nombre}*\n`;
                texto += `>    ↳ ${desc}\n`;
            }
            texto += `╰─────────────────╯\n\n`;
        }

        // Pie de página
        texto += `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n`;
        texto += `┃   ⚡ Creado por Alex y Luis ⚡   ┃\n`;
        texto += `┃   💫 Rápido • Seguro • Evolutivo   ┃\n`;
        texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        // Obtener canal y JID
        const canal = obtenerCanal();
        const jid = msg.key.remoteJid;

        // Construir el mensaje con botón interactivo (formato correcto Baileys)
        if (canal) {
            try {
                // 🔥 MÉTODO QUE SÍ FUNCIONA CON BAILEYS (BOTÓN REAL)
                const buttons = [
                    {
                        buttonId: 'btn_canal',
                        buttonText: { displayText: '📢 VER CANAL' },
                        type: 1
                    }
                ];

                await sock.sendMessage(jid, {
                    text: texto,
                    footer: '⚡ BOT-API v' + VERSION + ' ⚡',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: msg });
            } catch (error) {
                console.error('[MENU] Error con botón, enviando texto plano:', error?.message);
                await sock.sendMessage(jid, { text: texto + `\n\n📢 *Canal:* ${canal}` }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(jid, { text: texto }, { quoted: msg });
        }
    }
};

function formatUptime(s) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}d ${h}h ${m}m ${sec}s`;
}