// commands/economy/baltop.js - VERSIÓN FINAL PULIDA
import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'economia.json');

function cargarDB() {
    try {
        if (!fs.existsSync(RUTA_DB)) return {};
        const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
        // Tu DB es plana { "jid@lid": { dinero, banco, ... } }
        return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
        console.error('[BALTOP] Error leyendo economia.json:', e);
        return {};
    }
}

function num(v) { 
    const n = Number(v); 
    return Number.isFinite(n) ? n : 0; 
}

function nombreDe(u, jid) {
    if (u.nombre || u.name || u.username) return u.nombre || u.name || u.username;
    // Si no tiene nombre guardado, limpia el @lid o @s.whatsapp.net para mostrarlo bonito
    return jid.split('@')[0];
}

const fmt = n => '$' + n.toLocaleString('en-US');

export default {
    nombre: 'baltop',
    categoria: 'Economy',
    alias: ['topbanco', 'banktop', 'topbank'],
    descripcion: 'Ranking de usuarios con más dinero en el banco',
    uso: '.baltop',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const usuarios = cargarDB();
            const lista = Object.entries(usuarios);

            // Filtrar solo los que tienen algo en el banco y ordenar
            const top = lista
                .filter(([jid, u]) => num(u.banco) > 0)
                .sort((a, b) => num(b[1].banco) - num(a[1].banco))
                .slice(0, 10);

            if (!top.length) {
                return await responder.texto(
                    '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 👑 Aún no hay nadie con dinero\n' +
                    '┃ 🏦 en el banco. ¡Sé el primero!\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const medallas = ['👑', '🥈', '🥉'];
            let txt = '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n\n┃  𝐑𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐁𝐀𝐍𝐂𝐎\n┃\n';
            
            top.forEach(([jid, u], i) => {
                const icono = medallas[i] || `${i + 1}.`;
                const nombre = nombreDe(u, jid);
                
                txt += `┃ ${icono} *${nombre}*\n`;
                txt += `┃    🏦 Banco › *${fmt(num(u.banco))}*\n`;
                txt += `┃    💵 En mano › *${fmt(num(u.dinero))}*\n`;
                txt += '┃\n';
            });
            
            txt += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Usamos sock.sendMessage directamente para asegurar compatibilidad con menciones si lo necesitas después
            await sock.sendMessage(msg.key.remoteJid, { text: txt }, { quoted: msg });

        } catch (error) {
            console.error('[BALTOP] Error:', error);
            await responder.texto('❌ Error al leer el ranking del banco.');
        }
    }
};