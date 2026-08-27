// ============================================================
// MENU - BOT-API 2.0 FIX FINAL PARA BAILEYS-BETA
// ============================================================

import fs from 'fs';
import path from 'path';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.senderPn, key.participantAlt, key.remoteJidAlt, key.participant, key.remoteJid];
    for (const c of candidatos) { if (!c) continue; const n = String(c).split('@')[0].split(':')[0].replace(/\D/g, ''); if (n) return { jid: c, num: n }; }
    return null;
}
function crearMencion(jid) { if (!jid) return '@usuario'; const n = String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); return `@${n}`; }
function obtenerCanal() { try { const d = obtenerStore(CANAL_FILE, { url: '' }); return typeof d.url === 'string'? d.url.trim() : ''; } catch { return ''; } }
function formatUptime(s) { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); const s2 = Math.floor(s % 60); return `${d}d ${h}h ${m}m ${s2}s`; }
function obtenerFecha() { return new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()); }
function obtenerHora() { return new Intl.DateTimeFormat('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date()); }
function normalizarCategoria(c) { return String(c || 'Otros').trim().toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
function obtenerIcono(c) { const i = { Owner: '👑', Economia: '💰', Diversion: '🎮', Sistema: '⚙️', Otros: '📦', Descargas: '📥', Utilidades: '🛠️' }; return i[c] || '📦'; }
function organizarComandos(lista) { const cats = {}; for (const cmd of lista || []) { if (!cmd ||!cmd.nombre) continue; const cat = normalizarCategoria(cmd.categoria); if (!cats[cat]) cats[cat] = []; cats[cat].push(cmd); } return cats; }

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],
    async ejecutar({ sock, msg, listaComandos, prefijo }) {
        try {
            const autor = obtenerAutor(msg);
            const jid = msg?.key?.remoteJid;
            const mencionTexto = autor? `@${autor.num}` : '@usuario';
            const menciones = autor? [autor.jid] : [];
            const categorias = organizarComandos(listaComandos);
            const canal = obtenerCanal();

            const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = textoMsg.split(' ').slice(1);
            const categoriaPedida = args[0];

            if (categoriaPedida) {
                const catNormal = normalizarCategoria(categoriaPedida);
                if (categorias[catNormal]) {
                    return await enviarMenuCategoria(sock, jid, msg, catNormal, categorias[catNormal], prefijo, menciones);
                }
            }

            const texto = `╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣
┃
┃ 👋 𝐇𝐎𝐋𝐀 ${mencionTexto}
┃ 📅 ${obtenerFecha()} | 🕐 ${obtenerHora()}
╰━━━━⬣

╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣
┃ 👨‍💻 ${CREADOR} | 📦 ${VERSION}
┃ 📚 ${listaComandos.length} cmds | 🔧 ${prefijo}
┃ ⏱️ ${formatUptime(process.uptime())}
╰━━━━⬣

╭━━〔 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 〕━━⬣
┃ Elige una categoría abajo
╰━━━━⬣`;

            // BOTONES HIDRATADOS - ESTE ES EL QUE USA TU BAILEYS-BETA
            const botones = Object.keys(categorias).slice(0, 4).map(cat => ({
                quickReplyButton: {
                    displayText: `${obtenerIcono(cat)} ${cat}`,
                    id: `${prefijo}menu ${cat}`
                }
            }));

            if (canal) {
                botones.push({
                    urlButton: {
                        displayText: '📢 VER CANAL',
                        url: canal
                    }
                });
            }

            const template = {
                caption: texto,
                mentions: menciones,
                footer: '⚡ BOT-API 2.0',
                templateButtons: botones
            };

            if (fs.existsSync(FOTO_MENU)) {
                template.image = { url: FOTO_MENU };
            }

            await sock.sendMessage(jid, template, { quoted: msg });

        } catch (error) {
            console.error('[MENU] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};

async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, menciones) {
    const icono = obtenerIcono(categoria);
    const botones = comandos.slice(0, 3).map(cmd => ({
        quickReplyButton: { displayText: `${prefijo}${cmd.nombre}`, id: `${prefijo}${cmd.nombre}` }
    }));
    botones.push({ quickReplyButton: { displayText: '⬅️ Volver', id: `${prefijo}menu` } });

    let texto = `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣\n┃\n`;
    for (const cmd of comandos) { texto += `┃ ✦ *${prefijo}${cmd.nombre}*\n┃ ↳ ${cmd.descripcion || 'Sin descripción'}\n`; }
    texto += `┃\n╰━━━━⬣`;

    await sock.sendMessage(jid, { text: texto, mentions: menciones, templateButtons: botones, footer: '⚡ BOT-API 2.0' }, { quoted: msg });
}