
// ============================================================
// MENU - BOT-API 2.0 CON BOTONES INTERACTIVOS + MENCION
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
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const VIDEO_MENU_URL = ''; // ej: 'https://files.catbox.moe/xxxxx.mp4'

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

// ID DEL GRUPO A MENCIONAR
const JID_MENCION = "120363429140811226@g.us"

// ============================================================
// ORDEN + ICONOS POR CATEGORÍA
// ============================================================
const ORDEN_CATEGORIAS = [
    'Descargas', 'Diversión', 'Economía', 'Multimedia',
    'Interacción', 'Grupos', 'Moderación', 'Utilidades',
    'IA', 'Sistema', 'Owner'
];

const ICONOS = {
    Owner: '👑',
    Economía: '💸',
    'Diversión': '🎉',
    Sistema: '⚙️',
    Otros: '📦',
    Descargas: '📥',
    Utilidades: '🛠️',
    IA: '🧠',
    Multimedia: '🎨',
    Grupos: '👥',
    Interacción: '🎭',
    Moderación: '🛡️'
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
        return typeof d.url === 'string'? d.url.trim() : '';
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
        if (!cmd ||!cmd.nombre) continue;
        const cat = normalizarCategoria(cmd.categoria);
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
    }
    return cats;
}

function ordenarCategorias(categorias) {
    const claves = Object.keys(categorias);
    return claves.sort((a, b) => {
        const ia = ORDEN_CATEGORIAS.indexOf(a);
        const ib = ORDEN_CATEGORIAS.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

// ============================================================
// FUNCION PARA MENCIONAR
// ============================================================
async function mencionarGrupo(sock) {
    try {
        let s = global.conns?.[0] || Object.values(global.conns)[0]
        let jid = JID_MENCION
        let meta = await s.groupMetadata(jid)
        let jids = meta.participants.slice(0,5).map(p => p.id) // taggea a 5 del grupo
        await s.sendMessage(jid, { text: `🔔 *Atención* 🔔\n` + jids.map(v => `@${v.split('@')[0]}`).join(' '), mentions: jids })
    } catch(e) {
        console.log('[MENU] Error al mencionar:', e.message)
    }
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
            const categorias = organizarComandos(listaComandos);
            const canal = obtenerCanal();

            // MENCIONAR A 5 DEL GRUPO ANTES DEL MENU
            await mencionarGrupo(sock)

            const categoriaPedida = args?.[0];

            if (categoriaPedida) {
                const catNormal = normalizarCategoria(categoriaPedida);
                if (categorias[catNormal]) {
                    return await enviarMenuCategoria(sock, jid, msg, catNormal, categorias[catNormal], prefijo);
                }
            }

            // ----------------------------------------------------
            // CABECERA
            // ----------------------------------------------------
            const botName = global.botname || 'BOT-API 2.0';
            const totalCmds = listaComandos.length;
            const totalCats = Object.keys(categorias).length;

            const headerText = `┏━━━ ⋆⋅☆⋅⋆ ━━━┓
   🌸 *${botName}* 🌸
┗━━━ ⋆⋅☆⋅⋆ ━━━┛

👋 ¡Hola${autor? `, @${autor.num}` : ''}! ✨

╭─❍ *INFORMACIÓN*
│ 👨‍💻 Creador ➤ ${CREADOR}
│ 📦 Versión ➤ ${VERSION}
│ 📚 Comandos ➤ ${totalCmds}
│ 🗂️ Categorías ➤ ${totalCats}
│ 🔧 Prefijo ➤ ${prefijo}
│ ⏱️ Uptime ➤ ${formatUptime(process.uptime())}
│ 📅 ${moment.tz(ZONA_HORARIA).format('DD/MM/YYYY')} 🕐 ${moment.tz(ZONA_HORARIA).format('HH:mm:ss')}
╰──────────────`;

            // ----------------------------------------------------
            // FILAS DEL LISTADO
            // ----------------------------------------------------
            const rows = ordenarCategorias(categorias).map(cat => ({
                title: `${obtenerIcono(cat)} ${cat}`,
                description: `${categorias[cat].length} comando(s) · toca para abrir`,
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
            // MEDIA DE CABECERA
            // ----------------------------------------------------
            let header = { title: '🌸 MENÚ PRINCIPAL 🌸', hasMediaAttachment: false };

            try {
                if (VIDEO_MENU_URL) {
                    const media = await prepareWAMessageMedia(
                        { video: { url: VIDEO_MENU_URL }, gifPlayback: false },
                        { upload: sock.waUploadToServer }
                    );
                    header = { title: '🌸 MENÚ PRINCIPAL 🌸', hasMediaAttachment: true, videoMessage: media.videoMessage };
                } else if (fs.existsSync(FOTO_MENU)) {
                    const media = await prepareWAMessageMedia(
                        { image: { url: FOTO_MENU } },
                        { upload: sock.waUploadToServer }
                    );
                    header = { title: '🌸 MENÚ PRINCIPAL 🌸', hasMediaAttachment: true, imageMessage: media.imageMessage };
                }
            } catch (e) {
                console.error('[MENU] No se pudo preparar el media de cabecera:', e?.message || e);
                header = { title: '🌸 MENÚ PRINCIPAL 🌸', hasMediaAttachment: false };
            }

            // ----------------------------------------------------
            // MENSAJE INTERACTIVO
            // ----------------------------------------------------
            const interactiveMessage = {
                body: { text: `${headerText}\n\n✨ *Elige una categoría para ver sus comandos* ✨` },
                footer: { text: '🌙 Toca el botón de abajo para navegar 🌙' },
                header,
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: '📂 Ver categorías',
                                sections: [{ title: '✦ Categorías disponibles ✦', rows }]
                            })
                        }
                    ],
                    messageParamsJson: ''
                }
            };

            const msgSend = generateWAMessageFromContent(
                jid,
                { viewOnceMessage: { message: { interactiveMessage } },
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
// MENÚ DE UNA CATEGORÍA
// ============================================================
async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo) {
    const icono = obtenerIcono(categoria);

    let texto = `┏━━━ ⋆⋅☆⋅⋆ ━━━┓
   ${icono} *${categoria.toUpperCase()}* ${icono}
┗━━━ ⋆⋅☆⋅⋆ ━━━┛\n\n`;

    for (const cmd of comandos) {
        texto += `✦ *${prefijo}${cmd.nombre}*\n ↳ ${cmd.descripcion || 'Sin descripción'}\n\n`;
    }

    texto += `───────────────`;

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