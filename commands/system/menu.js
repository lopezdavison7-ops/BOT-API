// commands/system/menu.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANAL_FILE = path.join(__dirname, '../..', 'database', 'canal.json');

function obtenerCanal() {
    try {
        if (!fs.existsSync(CANAL_FILE)) return null;
        return JSON.parse(fs.readFileSync(CANAL_FILE, 'utf8')).url || null;
    } catch { return null; }
}

export default {
    nombre: 'menu',
    alias: ['help'],
    async ejecutar({ sock, msg, listaComandos }) {
        // Agrupar categorías
        const cats = {};
        for (const cmd of listaComandos) {
            const cat = cmd.categoria || 'Otros';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(cmd);
        }

        // Crear botones por categoría
        const botones = [];
        let index = 1;
        for (const cat of Object.keys(cats)) {
            botones.push({
                index: index++,
                quickReplyButton: { displayText: cat.toUpperCase(), id: `cat_${cat.toLowerCase()}` }
            });
        }

        // Botón Ver canal
        const canal = obtenerCanal();
        if (canal) {
            botones.push({ index: index, urlButton: { displayText: '📢 Ver canal', url: canal } });
        }

        const jid = msg.key.remoteJid;
        await sock.sendMessage(jid, {
            text: '✐ *Menú principal*\nElige una categoría:',
            templateButtons: botones
        }, { quoted: msg });
    }
};