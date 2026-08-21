// commands/system/menu.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = '1.0.0';
const CREADOR = 'Alex y Luis';
const MOTOR = 'Baileys';

const FOTO_MENU = path.join(__dirname, '../..', 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(__dirname, '../..', 'database', 'canal.json');

// Función para leer el canal (ya la tienes)
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
        // 1. Organizar comandos por categoría (estilo Michi)
        const cats = {};
        for (const cmd of listaComandos) {
            const cat = cmd.categoria || 'Otros';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(cmd);
        }

        const uptime = formatUptime(process.uptime());
        const total = listaComandos.length;

        // 2. Construir el texto del menú (estilo Michi/Rin)
        let texto = `> .・。.・゜〄・.・〄・゜・。.\n`;
        texto += `✐ *Hola! Soy BOT-API* Principal 🅥\n`;
        texto += `> ⊹ *Hora* » ${new Date().toLocaleTimeString()}\n`;
        texto += `> ⊹ *Fecha* » ${new Date().toLocaleDateString()}\n`;
        texto += `> ⊹ *Comandos* » ${total}\n\n`;

        for (const [cat, cmds] of Object.entries(cats)) {
            texto += `➭ *✿》${cat.toUpperCase()}《✿*\n`;
            for (const cmd of cmds) {
                texto += `> ⟩ *.${cmd.nombre}*\n`;
            }
            texto += '\n';
        }

        texto += `> : *Actividad* » ${uptime}\n`;

        // 3. Obtener el canal
        const canal = obtenerCanal();
        const jid = msg.key.remoteJid;

        // 4. Construir el mensaje con botones
        const botones = [];
        if (canal) {
            botones.push({
                index: 1,
                urlButton: {
                    displayText: '📢 VER CANAL',
                    url: canal
                }
            });
        }

        // 5. Enviar usando sock.sendMessage (NO responder.texto)
        try {
            await sock.sendMessage(jid, {
                text: texto,
                templateButtons: botones
            }, { quoted: msg });
        } catch (error) {
            // Si falla el envío con botones, enviar solo texto
            console.error('[MENU] Error enviando con botones:', error?.message);
            await sock.sendMessage(jid, { text: texto }, { quoted: msg });
        }
    }
};

function formatUptime(s) {
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return `${d}d ${h}h ${m}m ${sec}s`;
}