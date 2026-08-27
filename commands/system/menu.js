// ============================================================
// MENU - BOT-API 2.0 CON BOTONES
// ============================================================

import fs from 'fs';
import path from 'path';
import { obtenerStore } from '../../lib/jsonStore.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const MOTOR = 'Baileys';
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const CANAL_FILE = path.join(process.cwd(), 'database', 'canal.json');

// ============================================================
// FUNCIONES BASE
// ============================================================
function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.senderPn, key.participantAlt, key.remoteJidAlt, key.participant, key.remoteJid];
    for (const candidato of candidatos) {
        if (!candidato) continue;
        const numero = String(candidato).split('@')[0].split(':')[0].replace(/\D/g, '');
        if (numero) return candidato;
    }
    return null;
}

function crearMencion(jid) {
    if (!jid) return null;
    const numero = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
    return numero? `@${numero}` : null;
}

function obtenerCanal() {
    try {
        const datos = obtenerStore(CANAL_FILE, { url: '' });
        return typeof datos.url === 'string'? datos.url.trim() : '';
    } catch (error) {
        return '';
    }
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function obtenerFecha() {
    return new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
}

function obtenerHora() {
    return new Intl.DateTimeFormat('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date());
}

function normalizarCategoria(categoria) {
    return String(categoria || 'Otros').trim();
}

function obtenerIcono(categoria) {
    const iconos = {
        Owner: '👑', Administrador: '🛡️', Moderación: '🛡️', Grupos: '👥', Economia: '💰',
        IA: '🤖', Multimedia: '🎨', Descargas: '📥', Diversión: '🎮', Interacción: '💬',
        Utilidades: '🛠️', Sistema: '⚙️', Otros: '📦'
    };
    return iconos[categoria] || iconos[categoria.toLowerCase()] || '📦';
}

function organizarComandos(listaComandos) {
    const categorias = {};
    for (const comando of listaComandos || []) {
        if (!comando ||!comando.nombre) continue;
        const categoria = normalizarCategoria(comando.categoria);
        if (!categorias[categoria]) categorias[categoria] = [];
        categorias[categoria].push(comando);
    }
    return categorias;
}

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

            // SI PUSO.menu economia -> muestra solo esa categoría con botones
            const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = textoMsg.split(' ').slice(1);
            const categoriaPedida = args[0];

            if (categoriaPedida && categorias[categoriaPedida]) {
                return await enviarMenuCategoria(sock, jid, msg, categoriaPedida, categorias[categoriaPedida], prefijo, menciones);
            }

            // MENÚ PRINCIPAL CON BOTONES DE CATEGORÍAS
            const botones = Object.keys(categorias).slice(0, 5).map(cat => ({
                index: 1,
                quickReplyButton: {
                    displayText: `${obtenerIcono(cat)} ${cat}`,
                    id: `${prefijo}menu ${cat}`
                }
            }));

            // Agrega botón de canal
            if (canal) {
                botones.push({
                    index: 2,
                    urlButton: {
                        displayText: '📢 VER CANAL',
                        url: canal
                    }
                });
            }

            const texto = `╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣
┃
┃ 👋 𝐇𝐎𝐋𝐀 ${mencion}
┃ 📅 𝐅𝐄𝐂𝐇𝐀 › ${obtenerFecha()}
┃ 🕐 𝐇𝐎𝐑𝐀 › ${obtenerHora()}
┃
╰━━━━━━━━━━━━⬣

╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣
┃ 👨‍💻 𝐂𝐑𝐄𝐀𝐃𝐎𝐑 › ${CREADOR}
┃ 📦 𝐕𝐄𝐑𝐒𝐈Ó𝐍 › ${VERSION}
┃ 📚 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 › ${listaComandos.length}
┃ 🔧 𝐏𝐑𝐄𝐅𝐈𝐉𝐎 › ${prefijo}
┃ ⏱️ 𝐔𝐏𝐓𝐈𝐌𝐄 › ${formatUptime(process.uptime())}
╰━━━━━━━━━━━━⬣

╭━━〔 📋 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐀𝐒 〕━━⬣
┃ Elige una categoría para ver sus comandos
╰━━━━━━━━━━━━⬣`;

            await sock.sendMessage(jid, {
                image: fs.existsSync(FOTO_MENU)? { url: FOTO_MENU } : undefined,
                caption: texto,
                mentions: menciones,
                templateButtons: botones
            }, { quoted: msg });

        } catch (error) {
            console.error('[MENU] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};

// ============================================================
// ENVIAR MENU POR CATEGORIA CON BOTONES DE COMANDOS
// ============================================================
async function enviarMenuCategoria(sock, jid, msg, categoria, comandos, prefijo, menciones) {
    const icono = obtenerIcono(categoria);

    // Crea botones para los primeros 4 comandos
    const botones = comandos.slice(0, 4).map(cmd => ({
        index: 1,
        quickReplyButton: {
            displayText: `${prefijo}${cmd.nombre}`,
            id: `${prefijo}${cmd.nombre}`
        }
    }));

    // Botón para volver
    botones.push({
        index: 2,
        quickReplyButton: {
            displayText: '⬅️ Volver al Menú',
            id: `${prefijo}menu`
        }
    });

    let texto = `╭━━〔 ${icono} 𝐌𝐄𝐍Ú ${categoria.toUpperCase()} 〕━━⬣
┃
`;

    for (const comando of comandos) {
        texto += `┃ ✦ *${prefijo}${comando.nombre}*
┃ ↳ ${comando.descripcion || 'Sin descripción'}
`;
    }

    texto += `┃
╰━━━━━━━━━━━━⬣`;

    await sock.sendMessage(jid, {
        text: texto,
        mentions: menciones,
        templateButtons: botones
    }, { quoted: msg });
}