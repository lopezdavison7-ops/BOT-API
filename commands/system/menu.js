// ============================================================
// MENU - BOT-API 2.0 MENÚ ÚNICO AUTO-GENERADO
// ============================================================

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import {
    prepareWAMessageMedia
} from 'baileys';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const VIDEO_MENU_URL = '';

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

// Orden de categorías (se detectan automáticamente, esto es solo para ordenar)
const ORDEN_CATEGORIAS = [
    'Sistema', 'Owner', 'Grupos', 'Moderación',
    'Economía', 'Diversión', 'Interacción',
    'Descargas', 'Multimedia', 'Utilidades', 'IA', 'Otros'
];

const ICONOS = {
    Owner: '👑', Economía: '💸', 'Diversión': '🎉', Sistema: '⚙️', Otros: '📦',
    Descargas: '📥', Utilidades: '🛠️', IA: '🧠', Multimedia: '🎨',
    Grupos: '👥', Interacción: '🎭', Moderación: '🛡️'
};

// ============================================================
// HELPERS
// ============================================================

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [
        key.participant,
        key.remoteJid,
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt
    ];

    for (const c of candidatos) {
        if (!c || typeof c !== 'string') continue;
        const n = String(c).split('@')[0].split(':')[0].replace(/\D/g, '');
        if (n && n.length >= 7) {
            return {
                jid: c.includes('@') ? c : `${c}@s.whatsapp.net`,
                num: n
            };
        }
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
// GENERAR TEXTO DEL MENÚ COMPLETO (TODAS LAS CATEGORÍAS)
// ============================================================

function generarMenuCompleto(categorias, prefijo, mencionTexto, botName) {
    const totalCmds = Object.values(categorias).flat().length;
    const totalCats = Object.keys(categorias).length;

    let texto = `┏━━━ ⋆⋅☆⋅⋆ ━━━┓
   🌸 *${botName}* 🌸
┗━━━ ⋆⋅☆⋅⋆ ━━━┛

👋 ¡Hola ${mencionTexto}! ✨

╭─❍ *INFORMACIÓN*
│ 👨‍💻 Creador ➤ ${CREADOR}
│ 📦 Versión ➤ ${VERSION}
│ 📚 Comandos ➤ ${totalCmds}
│ 🗂️ Categorías ➤ ${totalCats}
│ 🔧 Prefijo ➤ ${prefijo}
│ ⏱️ Uptime ➤ ${formatUptime(process.uptime())}
│ 📅 ${moment.tz(ZONA_HORARIA).format('DD/MM/YYYY')} 🕐 ${moment.tz(ZONA_HORARIA).format('HH:mm:ss')}
╰──────────────

`;

    const catsOrdenadas = ordenarCategorias(categorias);

    for (const cat of catsOrdenadas) {
        const icono = obtenerIcono(cat);
        const cmds = categorias[cat];

        texto += `┏━━━〔 ${icono} *${cat.toUpperCase()}* ${icono} 〕━━━┓\n`;

        for (const cmd of cmds) {
            const alias = cmd.alias && cmd.alias.length ? ` (${cmd.alias.join(', ')})` : '';
            texto += `┃ ✦ *${prefijo}${cmd.nombre}*${alias}\n`;
            texto += `┃    ↳ ${cmd.descripcion || 'Sin descripción'}\n`;
        }

        texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
    }

    const canal = obtenerCanal();
    if (canal) {
        texto += `┃ 📢 *Canal Oficial*\n`;
        texto += `┃    ${canal}\n\n`;
    }

    texto += `> 💡 Usa *.menu <comando>* para info detallada\n`;
    texto += `> 🤖 *${botName}* - ${moment.tz(ZONA_HORARIA).format('DD/MM/YYYY HH:mm')}`;

    return texto;
}

// ============================================================
// COMANDO MENU
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

            // Texto de mención y array de JIDs
            const mencionTexto = autor ? `@${autor.num}` : '@usuario';
            const menciones = autor ? [autor.jid] : [];

            const botName = global.botname || 'BOT-API 2.0';

            // ========== HEADER CON IMAGEN/VIDEO ==========
            let header = { title: '🌸 MENÚ COMPLETO 🌸', hasMediaAttachment: false };
            try {
                if (VIDEO_MENU_URL) {
                    const media = await prepareWAMessageMedia(
                        { video: { url: VIDEO_MENU_URL }, gifPlayback: false },
                        { upload: sock.waUploadToServer }
                    );
                    header = {
                        title: '🌸 MENÚ COMPLETO 🌸',
                        hasMediaAttachment: true,
                        videoMessage: media.videoMessage
                    };
                } else if (fs.existsSync(FOTO_MENU)) {
                    const media = await prepareWAMessageMedia(
                        { image: { url: FOTO_MENU } },
                        { upload: sock.waUploadToServer }
                    );
                    header = {
                        title: '🌸 MENÚ COMPLETO 🌸',
                        hasMediaAttachment: true,
                        imageMessage: media.imageMessage
                    };
                }
            } catch (e) {
                console.error('[MENU] Error media:', e?.message || e);
            }

            // ========== GENERAR MENÚ COMPLETO ==========
            const menuTexto = generarMenuCompleto(categorias, prefijo, mencionTexto, botName);

            // ========== ENVIAR MENÚ ==========
            // Enviar mención primero (workaround para que se vea la mención)
            if (menciones.length > 0) {
                await sock.sendMessage(jid, {
                    text: `👋 ¡Hola ${mencionTexto}! ✨`
                }, { quoted: msg, mentions: menciones });
            }

            // Enviar menú con imagen/video si existe
            if (header.hasMediaAttachment) {
                if (header.imageMessage) {
                    await sock.sendMessage(jid, {
                        image: { url: FOTO_MENU },
                        caption: menuTexto
                    }, { quoted: msg });
                } else if (header.videoMessage) {
                    await sock.sendMessage(jid, {
                        video: { url: VIDEO_MENU_URL },
                        caption: menuTexto,
                        gifPlayback: false
                    }, { quoted: msg });
                }
            } else {
                // Solo texto
                await sock.sendMessage(jid, {
                    text: menuTexto
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('[MENU] Error:', error);
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: `❌ Error al mostrar el menú: ${error.message}` },
                { quoted: msg }
            );
        }
    }
};