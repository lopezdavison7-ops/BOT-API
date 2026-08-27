// ============================================================
// MENU - BOT-API 2.0 FIX PARA BAILEYS-BETA
// ============================================================

import fs from 'fs';
import path from 'path';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

//...pega aqui todas tus funciones de antes

function obtenerAutor(msg) { const key = msg?.key || {}; const candidatos = [key.senderPn, key.participantAlt, key.remoteJidAlt, key.participant, key.remoteJid]; for (const c of candidatos) { if (!c) continue; const n = String(c).split('@')[0].split(':')[0].replace(/\D/g, ''); if (n) return c; } return null; }
function crearMencion(jid) { if (!jid) return null; const n = String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); return n? `@${n}` : null; }
function obtenerCanal() { try { const d = obtenerStore(CANAL_FILE, { url: '' }); return typeof d.url === 'string'? d.url.trim() : ''; } catch { return ''; } }
function formatUptime(s) { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); const s2 = Math.floor(s % 60); return `${d}d ${h}h ${m}m ${s2}s`; }
function obtenerFecha() { return new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()); }
function obtenerHora() { return new Intl.DateTimeFormat('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date()); }
function normalizarCategoria(c) { return String(c || 'Otros').trim(); }
function obtenerIcono(c) { const i = { Owner: '👑', Economia: '💰', Diversión: '🎮', Sistema: '⚙️', Otros: '📦' }; return i[c] || i[c.toLowerCase()] || '📦'; }
function organizarComandos(lista) { const cats = {}; for (const cmd of lista || []) { if (!cmd ||!cmd.nombre) continue; const cat = normalizarCategoria(cmd.categoria); if (!cats[cat]) cats[cat] = []; cats[cat].push(cmd); } return cats; }

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],
    async ejecutar({ sock, msg, listaComandos, prefijo }) {
        try {
            const autor = obtenerAutor(msg);
            const jid = msg?.key?.remoteJid;
            const mencion = crearMencion(autor) || '@usuario';
            const menciones = autor? [autor] : [];
            const categorias = organizarComandos(listaComandos);
            const canal = obtenerCanal();

            const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = textoMsg.split(' ').slice(1);
            const categoriaPedida = args[0];

            if (categoriaPedida && categorias[categoriaPedida]) {
                return await enviarMenuCategoria(sock, jid, msg, categoriaPedida, categorias[categoriaPedida], prefijo, menciones);
            }

            const botones = Object.keys(categorias).slice(0, 5).map(cat => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: `${obtenerIcono(cat)} ${cat}`, id: `${prefijo}menu ${cat}` })
            }));

            if (canal) botones.push({ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 VER CANAL", url: canal, merchant_url: canal }) });

            const texto = `╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣\n┃\n┃ 👋 𝐇𝐎𝐋𝐀 ${mencion}\n┃ 📅 ${obtenerFecha()} | 🕐 ${obtenerHora()}\n╰━━━━⬣\n\n╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣\n┃ 👨‍💻 ${CREADOR} | 📦 ${VERSION}\n┃ 📚 ${listaComandos.length} cmds | 🔧 ${prefijo}\n┃ ⏱️ ${formatUptime(process.uptime())}\n╰━━━━⬣\n\n╭━━〔 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 〕━━⬣\n┃ Elige una categoría\n╰━━━━⬣`;

            // ENVIAR IMAGEN PRIMERO
            if (fs.existsSync(FOTO_MENU)) {
                await sock.sendMessage(jid, { image: { url: FOTO_MENU } }, { quoted: msg });
            }

            // LUEGO ENVIAR EL MENU CON BOTONES
            await sock.sendMessage(jid, {
                text: texto,
                mentions: menciones,
                interactiveButtons: botones, // ESTE ES EL QUE JALA EN BAILEYS-BETA
                footer: '⚡ BOT-API 2.0'
            }, { quoted: msg });

        } catch (error) {
            console.error('[MENU] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};

async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, menciones) {
    const icono = obtenerIcono(categoria);
    const botones = comandos.slice(0, 4).map(cmd => ({ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: `${prefijo}${cmd.nombre}`, id: `${prefijo}${cmd.nombre}` }) }));
    botones.push({ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: '⬅️ Volver', id: `${prefijo}menu` }) });

    let texto = `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣\n┃\n`;
    for (const cmd of comandos) { texto += `┃ ✦ *${prefijo}${cmd.nombre}*\n┃ ↳ ${cmd.descripcion || 'Sin descripción'}\n`; }
    texto += `┃\n╰━━━━⬣`;

    await sock.sendMessage(jid, { text: texto, mentions: menciones, interactiveButtons: botones }, { quoted: msg });
}