// ============================================================
// MENU - BOT-API 2.0 CON LISTA PARA BAILEYS-BETA
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
    for (const c of candidatos) {
        if (!c) continue;
        const n = String(c).split('@')[0].split(':')[0].replace(/\D/g, '');
        if (n) return { jid: c, num: n };
    }
    return null;
}
function crearMencion(jid) { if (!jid) return '@usuario'; const n = String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); return `@${n}`; }
function obtenerCanal() { try { const d = obtenerStore(CANAL_FILE, { url: '' }); return typeof d.url === 'string'? d.url.trim() : ''; } catch { return ''; } }
function formatUptime(s) { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); const s2 = Math.floor(s % 60); return `${d}d ${h}h ${m}m ${s2}s`; }
function obtenerFecha() { return new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()); }
function obtenerHora() { return new Intl.DateTimeFormat('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date()); }

// FIX: NORMALIZAR PARA QUITAR REPETIDOS
function normalizarCategoria(c) {
    return String(c || 'Otros').trim().toLowerCase().replace(/^\w/, c => c.toUpperCase());
}
function obtenerIcono(c) { const i = { Owner: '👑', Economia: '💰', Diversion: '🎮', Sistema: '⚙️', Otros: '📦', Descargas: '📥', Utilidades: '🛠️' }; return i[c] || '📦'; }
function organizarComandos(lista) {
    const cats = {};
    for (const cmd of lista || []) {
        if (!cmd ||!cmd.nombre) continue;
        const cat = normalizarCategoria(cmd.categoria); // Aqui se quitan los repetidos
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
    }
    return cats;
}

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

            // CREAR SECCIONES PARA LA LISTA
            const sections = Object.keys(categorias).map(cat => ({
                title: `${obtenerIcono(cat)} ${cat}`,
                rows: [
                    { title: `Ver ${cat}`, description: `${categorias[cat].length} comandos`, id: `.menu ${cat}` }
                ]
            }));

            if (canal) {
                sections.push({
                    title: '📢 OFICIAL',
                    rows: [{ title: 'Ver Canal', description: 'Únete al canal', id: `.canal` }]
                });
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
┃ Toca el botón y elige una categoría
╰━━━━⬣`;

            // ENVIAR IMAGEN + LISTA
            if (fs.existsSync(FOTO_MENU)) {
                await sock.sendMessage(jid, { image: { url: FOTO_MENU } }, { quoted: msg });
            }

            await sock.sendMessage(jid, {
                text: texto,
                mentions: menciones,
                footer: '⚡ BOT-API 2.0',
                title: 'Elige una categoría',
                buttonText: '📋 ABRIR MENÚ',
                sections
            }, { quoted: msg });

        } catch (error) {
            console.error('[MENU] Error:', error);
        }
    }
};

async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, menciones) {
    const icono = obtenerIcono(categoria);
    let texto = `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣\n┃\n`;
    for (const cmd of comandos) { texto += `┃ ✦ *${prefijo}${cmd.nombre}*\n┃ ↳ ${cmd.descripcion || 'Sin descripción'}\n`; }
    texto += `┃\n╰━━━━⬣\n\nToca.menu para volver`;

    await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: msg });
}