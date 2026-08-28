// ============================================================
// MENU - BOT-API 2.0 CON BOTONES INTERACTIVOS (estilo Senku)
// ============================================================

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import {
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from 'baileys';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';

// Imagen o video que se muestra arriba del menú (opcional).
// Pon aquí tu propia imagen/video (URL directa o ruta local).
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const VIDEO_MENU_URL = ''; // ej: 'https://files.catbox.moe/xxxxx.mp4'

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

// ============================================================
// ICONOS POR CATEGORÍA
// ============================================================
const ICONOS = {
    Owner: '👑',
    Economia: '💰',
    Diversion: '🎮',
    'Diversión': '🎮',
    Sistema: '⚙️',
    Otros: '📦',
    Descargas: '📥',
    Utilidades: '🛠️',
    Ai: '🤖',
    Sticker: '🖼️',
    Group: '👥',
    Interaction: '🎭',
    Gacha: '🎰'
};

// ============================================================
// HELPERS
// ============================================================
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

function obtenerCanal() {
    try {
        const d = obtenerStore(CANAL_FILE, { url: '' });
        return typeof d.url === 'string' ? d.url.trim() : '';
    } catch {
        return '';
    }
}

function formatUptime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const s2 = Math.floor(s % 60);
    return `${h}h ${m}m ${s2}s`;
}

function normalizarCategoria(c) {
    return String(c || 'Otros').trim().replace(/^\w/, ch => ch.toUpperCase());
}

function obtenerIcono(c) {
    return ICONOS[c] || '📦';
}

function organizarComandos(lista) {
    const cats = {};
    for (const cmd of lista || []) {
        if (!cmd || !cmd.nombre) continue;
        const cat = normalizarCategoria(cmd.categoria);
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
    }
    return cats;
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],

    async ejecutar({ sock, msg, args, listaComandos, prefijo }) {
        try {
            const jid = msg?.key?.remoteJid;
            const autor = obtenerAutor(msg);
            const menciones = autor ? [autor.jid] : [];
            const categorias = organizarComandos(listaComandos);
            const canal = obtenerCanal();

            // args[0] viene tanto de ".menu Categoria" (texto) como
            // del id del botón que se pulsó (ej: ".menu Descargas")
            const categoriaPedida = args?.[0];

            if (categoriaPedida) {
                const catNormal = normalizarCategoria(categoriaPedida);
                if (categorias[catNormal]) {
                    return await enviarMenuCategoria(sock, jid, msg, catNormal, categorias[catNormal], prefijo, menciones);
                }
            }

            // ----------------------------------------------------
            // CABECERA
            // ----------------------------------------------------
            const botName = global.botname || 'BOT-API 2.0';

            const headerText = `╭━━〔 🚀 *${botName}* 〕━━⬣
┃
┃ 👋 Hola${autor ? ` @${autor.num}` : ''}
┃ 👨‍💻 Creador: ${CREADOR}
┃ 📦 Versión: ${VERSION}
┃ 📚 Comandos: ${listaComandos.length}
┃ 🔧 Prefijo: ${prefijo}
┃ ⏱️ Uptime: ${formatUptime(process.uptime())}
┃ 📅 ${moment.tz(ZONA_HORARIA).format('DD/MM/YYYY')} | 🕐 ${moment.tz(ZONA_HORARIA).format('HH:mm:ss')}
╰━━━━⬣`;

            // ----------------------------------------------------
            // FILAS DEL LISTADO (una por categoría)
            // ----------------------------------------------------
            const rows = Object.keys(categorias)
                .sort()
                .map(cat => ({
                    title: `${obtenerIcono(cat)} ${cat}`,
                    description: `${categorias[cat].length} comando(s) disponibles`,
                    id: `${prefijo}menu ${cat}`
                }));

            if (canal) {
                rows.push({
                    title: '📢 Canal Oficial',
                    description: 'Únete a nuestro canal de WhatsApp',
                    id: `${prefijo}canal`
                });
            }

            // ----------------------------------------------------
            // MEDIA DE CABECERA (video si hay, si no imagen, si no nada)
            // ----------------------------------------------------
            let header = { title: '📋 MENÚ PRINCIPAL', hasMediaAttachment: false };

            try {
                if (VIDEO_MENU_URL) {
                    const media = await prepareWAMessageMedia(
                        { video: { url: VIDEO_MENU_URL }, gifPlayback: false },
                        { upload: sock.waUploadToServer }
                    );
                    header = { title: '📋 MENÚ PRINCIPAL', hasMediaAttachment: true, videoMessage: media.videoMessage };
                } else if (fs.existsSync(FOTO_MENU)) {
                    const media = await prepareWAMessageMedia(
                        { image: { url: FOTO_MENU } },
                        { upload: sock.waUploadToServer }
                    );
                    header = { title: '📋 MENÚ PRINCIPAL', hasMediaAttachment: true, imageMessage: media.imageMessage };
                }
            } catch (e) {
                console.error('[MENU] No se pudo preparar el media de cabecera:', e?.message || e);
                header = { title: '📋 MENÚ PRINCIPAL', hasMediaAttachment: false };
            }

            // ----------------------------------------------------
            // MENSAJE INTERACTIVO CON BOTONES (single_select)
            // ----------------------------------------------------
            const interactiveMessage = {
                body: { text: `${headerText}\n\n✨ *Elige una categoría para ver sus comandos:*` },
                footer: { text: canal ? '📢 Toca una opción para continuar' : '⚙️ Toca una opción para continuar' },
                header,
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: '📂 Ver categorías',
                                sections: [{ title: 'Categorías disponibles', rows }]
                            })
                        }
                    ],
                    messageParamsJson: ''
                }
            };

            const msgSend = generateWAMessageFromContent(
                jid,
                { viewOnceMessage: { message: { interactiveMessage } } },
                { userJid: sock.user.id, quoted: msg }
            );

            await sock.relayMessage(jid, msgSend.message, { messageId: msgSend.key.id });

        } catch (error) {
            console.error('[MENU] Error:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error al mostrar el menú: ${error.message}` }, { quoted: msg });
            } catch {}
        }
    }
};

// ============================================================
// MENÚ DE UNA CATEGORÍA (con botón para volver)
// ============================================================
async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, menciones) {
    const icono = obtenerIcono(categoria);

    let texto = `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣\n┃\n`;
    for (const cmd of comandos) {
        texto += `┃ ✦ *${prefijo}${cmd.nombre}*\n┃ ↳ ${cmd.descripcion || 'Sin descripción'}\n┃\n`;
    }
    texto += `╰━━━━⬣`;

    const interactiveMessage = {
        body: { text: texto },
        footer: { text: '⬅️ Toca para volver al menú principal' },
        header: { title: `${icono} ${categoria}`, hasMediaAttachment: false },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⬅️ Volver al menú',
                        id: `${prefijo}menu`
                    })
                }
            ],
            messageParamsJson: ''
        }
    };

    const msgSend = generateWAMessageFromContent(
        jid,
        { viewOnceMessage: { message: { interactiveMessage } } },
        { userJid: sock.user.id, quoted: msg }
    );

    await sock.relayMessage(jid, msgSend.message, { messageId: msgSend.key.id });
}
