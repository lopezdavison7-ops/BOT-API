// ============================================================
// MENU - BOT-API 2.0 CON MENCIONES CORREGIDAS
// ============================================================

import fs from 'fs';
import path from 'path';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

// ============================================================
// OBTENER AUTOR CON MENCIONES CORRECTAS
// ============================================================

function obtenerAutor(msg) {
    // En grupos: msg.key.participant es quien envió el mensaje
    // En privado: msg.key.remoteJid es el usuario
    const key = msg?.key || {};
    const candidatos = [
        key.participant,        // Grupo: el que escribió (PRIORIDAD #1)
        key.remoteJid,          // Privado: el chat
        key.senderPn,           // Número de teléfono
        key.participantAlt      // Alternativo
    ];

    for (const c of candidatos) {
        if (!c || typeof c !== 'string') continue;
        // Extraer solo el número
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
    return `${d}d ${h}h ${m}m ${s2}s`;
}

function obtenerFecha() {
    return new Intl.DateTimeFormat('es-NI', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date());
}

function obtenerHora() {
    return new Intl.DateTimeFormat('es-NI', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).format(new Date());
}

function normalizarCategoria(c) {
    return String(c || 'Otros').trim().toLowerCase().replace(/^\w/, ch => ch.toUpperCase());
}

function obtenerIcono(c) {
    const i = {
        Owner: '👑', Economia: '💰', Diversion: '🎮', Sistema: '⚙️',
        Otros: '📦', Descargas: '📥', Utilidades: '🛠️', Multimedia: '🎨',
        Grupos: '👥', Interaccion: '🎭', Moderacion: '🛡️', IA: '🧠',
        Stickers: '🎭', Diversión: '🎉'
    };
    return i[c] || '📦';
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
// COMANDO MENU
// ============================================================

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help'],

    async ejecutar({ sock, msg, listaComandos, prefijo }) {
        try {
            const autor = obtenerAutor(msg);
            const jid = msg?.key?.remoteJid;

            // Texto de mención: DEBE contener @numero literal para que WhatsApp lo reconozca
            const mencionTexto = autor ? `@${autor.num}` : '@usuario';
            // Array de JIDs completos para el campo mentions
            const menciones = autor ? [autor.jid] : [];

            const categorias = organizarComandos(listaComandos);
            const canal = obtenerCanal();

            const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = textoMsg.split(' ').slice(1);
            const categoriaPedida = args[0];

            // Si pidió una categoría específica
            if (categoriaPedida) {
                const catNormal = normalizarCategoria(categoriaPedida);
                if (categorias[catNormal]) {
                    return await enviarMenuCategoria(
                        sock, jid, msg, catNormal, categorias[catNormal],
                        prefijo, mencionTexto, menciones
                    );
                }
            }

            // ========== MENÚ PRINCIPAL ==========

            let numero = 1;
            let listaCategorias = '';
            const mapaNumeros = {};

            for (const cat of Object.keys(categorias)) {
                listaCategorias += `┃ ${numero}. ${obtenerIcono(cat)} *${cat}*\n`;
                mapaNumeros[numero] = cat;
                numero++;
            }

            if (canal) {
                listaCategorias += `┃ ${numero}. 📢 *VER CANAL*\n`;
            }

            const texto =
                `╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣\n` +
                `┃\n` +
                `┃ 👋 𝐇𝐎𝐋𝐀 ${mencionTexto}\n` +
                `┃ 📅 ${obtenerFecha()} | 🕐 ${obtenerHora()}\n` +
                `╰━━━━⬣\n\n` +
                `╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣\n` +
                `┃ 👨‍💻 ${CREADOR} | 📦 ${VERSION}\n` +
                `┃ 📚 ${listaComandos.length} cmds | 🔧 ${prefijo}\n` +
                `┃ ⏱️ ${formatUptime(process.uptime())}\n` +
                `╰━━━━⬣\n\n` +
                `╭━━〔 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 〕━━⬣\n` +
                `${listaCategorias}` +
                `┃\n` +
                `┃ Responde con el número. Ej: *${prefijo}menu 1*\n` +
                `╰━━━━⬣`;

            // Enviar con mentions explícito
            if (fs.existsSync(FOTO_MENU)) {
                await sock.sendMessage(
                    jid,
                    {
                        image: { url: FOTO_MENU },
                        caption: texto,
                        mentions: menciones
                    },
                    { quoted: msg }
                );
            } else {
                await sock.sendMessage(
                    jid,
                    {
                        text: texto,
                        mentions: menciones
                    },
                    { quoted: msg }
                );
            }

            // Guardar mapa en memoria temporal para respuestas numéricas
            global.menuMap = global.menuMap || {};
            global.menuMap[jid] = mapaNumeros;

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
// ENVIAR MENÚ DE CATEGORÍA
// ============================================================

async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, mencionTexto, menciones) {
    const icono = obtenerIcono(categoria);

    let texto =
        `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣\n` +
        `┃\n` +
        `┃ 👋 Hola ${mencionTexto}\n` +
        `┃\n`;

    for (const cmd of comandos) {
        texto += `┃ ✦ *${prefijo}${cmd.nombre}*\n┃ ↳ ${cmd.descripcion || 'Sin descripción'}\n`;
    }

    texto +=
        `┃\n` +
        `╰━━━━⬣\n\n` +
        `Para volver: *${prefijo}menu*`;

    await sock.sendMessage(
        jid,
        {
            text: texto,
            mentions: menciones
        },
        { quoted: msg }
    );
}
