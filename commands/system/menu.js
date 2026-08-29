// ============================================================
// MENU - BOT-API 2.0 CON BOTONES INTERACTIVOS + MENCIONES
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

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const VIDEO_MENU_URL = '';

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

const ORDEN_CATEGORIAS = [
    'Descargas', 'Diversión', 'Economía', 'Multimedia',
    'Interacción', 'Grupos', 'Moderación', 'Utilidades',
    'IA', 'Sistema', 'Owner'
];

const ICONOS = {
    Owner: '👑', Economía: '💸', 'Diversión': '🎉', Sistema: '⚙️', Otros: '📦',
    Descargas: '📥', Utilidades: '🛠️', IA: '🧠', Multimedia: '🎨',
    Grupos: '👥', Interacción: '🎭', Moderación: '🛡️'
};

// ============================================================
// OBTENER AUTOR CON MENCIONES CORRECTAS (usa groupMetadata para JID real)
// ============================================================

async function obtenerAutor(sock, msg) {
    const key = msg?.key || {};
    const chatId = key.remoteJid;
    const esGrupo = chatId?.endsWith('@g.us');

    // Remitente en bruto (puede ser LID)
    const rawSender = key.participant || key.remoteJid;
    if (!rawSender || typeof rawSender !== 'string') return null;

    const num = String(rawSender).split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!num || num.length < 7) return null;

    // Si es grupo, buscar el JID real en metadata
    if (esGrupo) {
        try {
            const metadata = await sock.groupMetadata(chatId);
            const participante = metadata.participants?.find(
                p => String(p.id).split('@')[0].split(':')[0].replace(/\D/g, '') === num
            );
            if (participante?.id) {
                return {
                    jid: participante.id,  // JID real @s.whatsapp.net
                    num
                };
            }
        } catch {}
    }

    // Fallback: convertir LID a JID normal
    let jid = rawSender.includes('@') ? rawSender : `${rawSender}@s.whatsapp.net`;
    if (jid.endsWith('@lid')) {
        jid = jid.replace('@lid', '@s.whatsapp.net');
    }
    return { jid, num };
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
// COMANDO MENU
// ============================================================

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],

    async ejecutar({ sock, msg, args, listaComandos, prefijo }) {
        try {
            const jid = msg?.key?.remoteJid;
            const autor = await obtenerAutor(sock, msg);
            const categorias = organizarComandos(listaComandos);
            const canal = obtenerCanal();
            const categoriaPedida = args?.[0];

            // Texto de mención y array de JIDs
            const mencionTexto = autor ? `@${autor.num}` : '@usuario';
            const menciones = autor ? [autor.jid] : [];

            if (categoriaPedida) {
                const catNormal = normalizarCategoria(categoriaPedida);
                if (categorias[catNormal]) {
                    return await enviarMenuCategoria(
                        sock, jid, msg, catNormal, categorias[catNormal],
                        prefijo, mencionTexto, menciones
                    );
                }
            }

            const botName = global.botname || 'BOT-API 2.0';
            const totalCmds = listaComandos.length;
            const totalCats = Object.keys(categorias).length;

            // ========== TEXTO DEL MENÚ PRINCIPAL CON MENCIÓN ==========
            const headerText = `┏━━━ ⋆⋅☆⋅⋆ ━━━┓
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
╰──────────────`;

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

            // ========== HEADER CON IMAGEN/VIDEO ==========
            let header = { title: '🌸 MENÚ PRINCIPAL 🌸', hasMediaAttachment: false };
            try {
                if (VIDEO_MENU_URL) {
                    const media = await prepareWAMessageMedia(
                        { video: { url: VIDEO_MENU_URL }, gifPlayback: false },
                        { upload: sock.waUploadToServer }
                    );
                    header = {
                        title: '🌸 MENÚ PRINCIPAL 🌸',
                        hasMediaAttachment: true,
                        videoMessage: media.videoMessage
                    };
                } else if (fs.existsSync(FOTO_MENU)) {
                    const media = await prepareWAMessageMedia(
                        { image: { url: FOTO_MENU } },
                        { upload: sock.waUploadToServer }
                    );
                    header = {
                        title: '🌸 MENÚ PRINCIPAL 🌸',
                        hasMediaAttachment: true,
                        imageMessage: media.imageMessage
                    };
                }
            } catch (e) {
                console.error('[MENU] Error media:', e?.message || e);
            }

            // ========== ENVIAR MENCIÓN PRIMERO (texto simple) + MENÚ INTERACTIVO ==========
            // WhatsApp no renderiza menciones en viewOnceMessage + interactiveMessage
            // Workaround: enviar texto con mención primero, luego el menú
            if (menciones.length > 0) {
                await sock.sendMessage(jid, {
                    text: `👋 ¡Hola ${mencionTexto}! ✨`
                }, { quoted: msg, mentions: menciones });
            }

            // ========== MENSAJE INTERACTIVO ==========
            const interactiveMessage = {
                body: {
                    text: headerText + `\n\n✨ *Elige una categoría para ver sus comandos* ✨`
                },
                footer: { text: '🌙 Toca el botón de abajo para navegar 🌙' },
                header,
                nativeFlowMessage: {
                    buttons: [{
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: '📂 Ver categorías',
                            sections: [{
                                title: '✦ Categorías disponibles ✦',
                                rows
                            }]
                        })
                    }],
                    messageParamsJson: ''
                }
            };

            const msgSend = generateWAMessageFromContent(
                jid,
                { viewOnceMessage: { message: { interactiveMessage } } },
                {
                    userJid: sock.user.id,
                    quoted: msg
                }
            );

            await sock.relayMessage(jid, msgSend.message, { messageId: msgSend.key.id });

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

// ============================================================
// ENVIAR MENÚ DE CATEGORÍA CON BOTÓN VOLVER
// ============================================================

async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, mencionTexto, menciones) {
    const icono = obtenerIcono(categoria);

    let texto = `┏━━━ ⋆⋅☆⋅⋆ ━━━┓
   ${icono} *${categoria.toUpperCase()}* ${icono}
┗━━━ ⋆⋅☆⋅⋆ ━━━┛

👋 Hola ${mencionTexto}\n\n`;

    for (const cmd of comandos) {
        texto += `✦ *${prefijo}${cmd.nombre}*\n ↳ ${cmd.descripcion || 'Sin descripción'}\n\n`;
    }

    texto += `───────────────`;

    // Enviar mención primero (workaround para viewOnceMessage)
    if (menciones.length > 0) {
        await sock.sendMessage(jid, {
            text: `👋 Hola ${mencionTexto}`
        }, { quoted: msg, mentions: menciones });
    }

    const interactiveMessage = {
        body: { text: texto },
        footer: { text: '⬅️ Toca para volver al menú principal' },
        header: { title: `${icono} ${categoria}`, hasMediaAttachment: false },
        nativeFlowMessage: {
            buttons: [{
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '⬅️ Volver al menú',
                    id: `${prefijo}menu`
                })
            }],
            messageParamsJson: ''
        }
    };

    const msgSend = generateWAMessageFromContent(
        jid,
        { viewOnceMessage: { message: { interactiveMessage } } },
        {
            userJid: sock.user.id,
            quoted: msg
        }
    );

    await sock.relayMessage(jid, msgSend.message, { messageId: msgSend.key.id });
}