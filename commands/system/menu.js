// ============================================================
// MENU - BOT-API 2.0 MENÚ AESTHETIC (CORREGIDO)
// ============================================================

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { prepareWAMessageMedia } from 'baileys';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const VIDEO_MENU_URL = '';

const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

// ── GRUPO FIJO PARA MENCIONES ──
const GRUPO_MENCIONES = '120363429140811226@g.us';
const CANTIDAD_MENCIONES = 5;

// Orden de categorías
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
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const s2 = Math.floor(s % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
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

// ── OBTENER MENCIONES DEL GRUPO FIJO ──
async function obtenerMencionesFijas() {
    try {
        const s = global.conns?.[0] || Object.values(global.conns)[0];
        if (!s) return { jids: [], texto: '' };

        const meta = await s.groupMetadata(GRUPO_MENCIONES);
        const jids = meta.participants
            .slice(0, CANTIDAD_MENCIONES)
            .map(p => p.id);

        const texto = jids.map(v => `@${v.split('@')[0]}`).join(' ');
        return { jids, texto };
    } catch (e) {
        console.error('[MENU] Error menciones fijas:', e);
        return { jids: [], texto: '' };
    }
}

// ============================================================
// GENERAR TEXTO DEL MENÚ (TODO EN UN SOLO MENSAJE)
// ============================================================

function generarMenuCompleto(categorias, prefijo, mencionTexto, botName, extra = {}) {
    const totalCmds = Object.values(categorias).flat().length;
    const totalCats = Object.keys(categorias).length;
    const now = moment.tz(ZONA_HORARIA);

    let texto = ``;

    // ═════ SALUDO ARRIBA (INTEGRADO EN EL MENÚ) ═════
    texto += `👋 ¡Hola ${mencionTexto}! ✨\n`;
    if (extra.mencionesTexto) {
        texto += `\n👥 *Menciones:* ${extra.mencionesTexto}\n`;
    }
    texto += `\n`;

    // ═════ HEADER ═════
    texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    texto += `\n`;
    texto += `              🌸  *${botName}*  🌸\n`;
    texto += `           · · ·  𝑀𝐸𝒩𝒰  · · ·\n`;
    texto += `\n`;
    texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    texto += `\n`;

    // ═════ INFO BOX ═════
    texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `         📊  *I N F O R M A C I Ó N*  📊\n`;
    texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `\n`;
    texto += `  👨‍💻  Creador    ▸  ${CREADOR}\n`;
    texto += `  📦  Versión    ▸  ${VERSION}\n`;
    texto += `  📚  Comandos   ▸  ${totalCmds}\n`;
    texto += `  🗂️  Categorías ▸  ${totalCats}\n`;
    texto += `  🔧  Prefijo    ▸  ${prefijo}\n`;
    texto += `  ⏱️  Uptime     ▸  ${formatUptime(process.uptime())}\n`;
    texto += `\n`;
    texto += `  📅  ${now.format('DD/MM/YYYY')}\n`;
    texto += `  🕐  ${now.format('HH:mm:ss')}\n`;
    texto += `\n`;
    texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    // ═════ CATEGORÍAS ═════
    const catsOrdenadas = ordenarCategorias(categorias);

    for (const cat of catsOrdenadas) {
        const icono = obtenerIcono(cat);
        const cmds = categorias[cat];

        // Separador arriba de la categoría
        texto += `\n`;
        texto += `\n`;
        texto += `  ────── ⋆  ${icono}  *${cat.toUpperCase()}*  ${icono}  ⋆ ──────\n`;
        texto += `\n`;

        // Comandos con ESPACIADO para que no se peguen
        for (const cmd of cmds) {
            const alias = cmd.alias && cmd.alias.length ? `(${cmd.alias.join(', ')})` : '';
            
            // Línea del comando
            if (alias) {
                texto += `  ◇ *${prefijo}${cmd.nombre}* ${alias}\n`;
            } else {
                texto += `  ◇ *${prefijo}${cmd.nombre}*\n`;
            }
            
            // Descripción en línea nueva con >
            texto += `  > ${cmd.descripcion || 'Sin descripción'}\n`;
            
            // LÍNEA EN BLANCO IMPORTANTE entre cada comando
            // Esto evita que se peguen cuando WhatsApp rompe líneas largas
            texto += `\n`;
        }

        // Separador final de categoría
        texto += `  ─────────────────────────────────────\n`;
    }

    // ═════ FOOTER ═════
    texto += `\n`;
    
    const canal = obtenerCanal();
    if (canal) {
        texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `  📢  *Canal Oficial*\n`;
        texto += `  ${canal}\n`;
        texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        texto += `\n`;
    }

    texto += `  💡  Usa *${prefijo}menu <comando>* para más info\n`;
    texto += `\n`;
    texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    texto += `\n`;
    texto += `       _${botName}_  ·  ${now.format('HH:mm')}`;

    return texto;
}

// ============================================================
// COMANDO MENU
// ============================================================

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help', 'comandos', 'cmds'],

    async ejecutar({ sock, msg, args, listaComandos, prefijo }) {
        try {
            const jid = msg?.key?.remoteJid;
            const autor = obtenerAutor(msg);
            const categorias = organizarComandos(listaComandos);

            // ── SIEMPRE OBTENER MENCIONES DEL GRUPO FIJO ──
            const { jids: mencionesFijas, texto: textoMenciones } = await obtenerMencionesFijas();

            const mencionTexto = autor ? `@${autor.num}` : '@usuario';
            const mencionesAutor = autor ? [autor.jid] : [];

            // Combinar autor + menciones fijas del grupo
            const todasLasMenciones = [...new Set([...mencionesAutor, ...mencionesFijas])];

            const botName = global.botname || 'BOT-API 2.0';

            // ========== HEADER CON IMAGEN/VIDEO ==========
            let header = { hasMediaAttachment: false };
            try {
                if (VIDEO_MENU_URL) {
                    const media = await prepareWAMessageMedia(
                        { video: { url: VIDEO_MENU_URL }, gifPlayback: false },
                        { upload: sock.waUploadToServer }
                    );
                    header = { hasMediaAttachment: true, videoMessage: media.videoMessage };
                } else if (fs.existsSync(FOTO_MENU)) {
                    const media = await prepareWAMessageMedia(
                        { image: { url: FOTO_MENU } },
                        { upload: sock.waUploadToServer }
                    );
                    header = { hasMediaAttachment: true, imageMessage: media.imageMessage };
                }
            } catch (e) {
                console.error('[MENU] Error media:', e?.message || e);
            }

            // ========== GENERAR MENÚ COMPLETO (UN SOLO MENSAJE) ==========
            const menuTexto = generarMenuCompleto(categorias, prefijo, mencionTexto, botName, {
                mencionesTexto: textoMenciones
            });

            // ========== ENVIAR TODO EN UN SOLO MENSAJE ==========
            if (header.hasMediaAttachment) {
                if (header.imageMessage) {
                    await sock.sendMessage(jid, {
                        image: { url: FOTO_MENU },
                        caption: menuTexto,
                        mentions: todasLasMenciones
                    }, { quoted: msg });
                } else if (header.videoMessage) {
                    await sock.sendMessage(jid, {
                        video: { url: VIDEO_MENU_URL },
                        caption: menuTexto,
                        gifPlayback: false,
                        mentions: todasLasMenciones
                    }, { quoted: msg });
                }
            } else {
                // Solo texto - TODO EN UN SOLO MENSAJE
                await sock.sendMessage(jid, {
                    text: menuTexto,
                    mentions: todasLasMenciones
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
