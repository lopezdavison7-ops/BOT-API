// ============================================================
// MENU - BOT-API 2.0 CON BOTONES PARA BAILEYS-BETA
// ============================================================

import fs from 'fs';
import path from 'path';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const MOTOR = 'Baileys-Beta';
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

//... pega aquí todas tus funciones: obtenerAutor, crearMencion, obtenerCanal, etc
// Las mismas que me pasaste arriba

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.senderPn, key.participantAlt, key.remoteJidAlt, key.participant, key.remoteJid];
    for (const candidato of candidatos) { if (!candidato) continue; const numero = String(candidato).split('@')[0].split(':')[0].replace(/\D/g, ''); if (numero) return candidato; }
    return null;
}
function crearMencion(jid) { if (!jid) return null; const numero = String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); return numero? `@${numero}` : null; }
function obtenerCanal() { try { const datos = obtenerStore(CANAL_FILE, { url: '' }); return typeof datos.url === 'string'? datos.url.trim() : ''; } catch { return ''; } }
function formatUptime(s) { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); const s2 = Math.floor(s % 60); return `${d}d ${h}h ${m}m ${s2}s`; }
function obtenerFecha() { return new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()); }
function obtenerHora() { return new Intl.DateTimeFormat('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date()); }
function normalizarCategoria(c) { return String(c || 'Otros').trim(); }
function obtenerIcono(c) { const iconos = { Owner: '👑', Administrador: '🛡️', Economia: '💰', Diversión: '🎮', Sistema: '⚙️', Otros: '📦' }; return iconos[c] || iconos[c.toLowerCase()] || '📦'; }
function organizarComandos(lista) { const cats = {}; for (const cmd of lista || []) { if (!cmd ||!cmd.nombre) continue; const cat = normalizarCategoria(cmd.categoria); if (!cats[cat]) cats[cat] = []; cats[cat].push(cmd); } return cats; }

// ============================================================
// COMANDO PRINCIPAL
// ============================================================
export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles.',

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

            // BOTONES PARA BAILEYS-BETA
            const botones = Object.keys(categorias).slice(0, 5).map(cat => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: `${obtenerIcono(cat)} ${cat}`,
                    id: `${prefijo}menu ${cat}`
                })
            }));

            if (canal) {
                botones.push({
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📢 VER CANAL",
                        url: canal,
                        merchant_url: canal
                    })
                });
            }

            const texto = `╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣\n┃\n┃ 👋 𝐇𝐎𝐋𝐀 ${mencion}\n┃ 📅 𝐅𝐄𝐂𝐇𝐀 › ${obtenerFecha()}\n┃ 🕐 𝐇𝐎𝐑𝐀 › ${obtenerHora()}\n╰━━━━⬣\n\n╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣\n┃ 👨‍💻 𝐂𝐑𝐄𝐀𝐃𝐎𝐑 › ${CREADOR}\n┃ 📦 𝐕𝐄𝐑𝐒𝐈Ó𝐍 › ${VERSION}\n┃ 📚 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 › ${listaComandos.length}\n╰━━━━⬣\n\n╭━━〔 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 〕━━⬣\n┃ Elige una categoría\n╰━━━━⬣`;

            await sock.sendMessage(jid, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {},
                        interactiveMessage: {
                            body: { text: texto },
                            footer: { text: '⚡ BOT-API 2.0' },
                            header: fs.existsSync(FOTO_MENU)? {
                                title: "",
                                hasMediaAttachment: true,
                                imageMessage: (await sock.uploadMedia({ url: FOTO_MENU })).imageMessage
                            } : { hasMediaAttachment: false },
                            nativeFlowMessage: { buttons: botones }
                        }
                    }
                }
            }, { quoted: msg });

        } catch (error) {
            console.error('[MENU] Error:', error);
        }
    }
};

async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, menciones) {
    const icono = obtenerIcono(categoria);
    const botones = comandos.slice(0, 4).map(cmd => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: `${prefijo}${cmd.nombre}`, id: `${prefijo}${cmd.nombre}` })
    }));
    botones.push({ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: '⬅️ Volver', id: `${prefijo}menu` }) });

    let texto = `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣\n┃\n`;
    for (const comando of comandos) { texto += `┃ ✦ *${prefijo}${comando.nombre}*\n┃ ↳ ${comando.descripcion || 'Sin descripción'}\n`; }
    texto += `┃\n╰━━━━⬣`;

    await sock.sendMessage(jid, {
        text: texto,
        mentions: menciones,
        interactiveButtons: botones // baileys-beta usa esto para texto
    }, { quoted: msg });
}