import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';
const BOT_NAME = 'BOT-API';
const CANAL_URL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');

// 1. MAPA DE CATEGORÍAS (Soluciona los duplicados por errores de escritura)
const MAPA_CATEGORIAS = {
    'economia': 'Economía', 'economy': 'Economía', 'economía': 'Economía',
    'utilidades': 'Utilidades', 'utils': 'Utilidades', 'utility': 'Utilidades', 'utilities': 'Utilidades',
    'sistema': 'Sistema', 'system': 'Sistema', 'sys': 'Sistema',
    'owner': 'Owner', 'propietario': 'Owner', 'dueño': 'Owner',
    'grupos': 'Grupos', 'groups': 'Grupos', 'group': 'Grupos', 'grupo': 'Grupos',
    'moderación': 'Moderación', 'moderacion': 'Moderación', 'mod': 'Moderación', 'mods': 'Moderación',
    'diversión': 'Diversión', 'diversion': 'Diversión', 'fun': 'Diversión', 'juegos': 'Diversión', 'funny': 'Diversión',
    'interacción': 'Interacción', 'interaccion': 'Interacción', 'interact': 'Interacción', 'interactions': 'Interacción',
    'descargas': 'Descargas', 'downloads': 'Descargas', 'download': 'Descargas', 'dl': 'Descargas',
    'multimedia': 'Multimedia', 'media': 'Multimedia', 'audio': 'Multimedia', 'video': 'Multimedia',
    'ia': 'IA', 'ai': 'IA', 'inteligencia artificial': 'IA', 'intelligence': 'IA',
    'otros': 'Otros', 'others': 'Otros', 'otro': 'Otros', 'random': 'Otros'
};

const ORDEN_CATEGORIAS = [
    'Sistema', 'Owner', 'Grupos', 'Moderación', 'Economía',
    'Diversión', 'Interacción', 'Descargas', 'Multimedia',
    'Utilidades', 'IA', 'Otros'
];

const ICONOS = {
    Owner: '👑', Economía: '💸', Diversión: '🎉', Sistema: '⚙️',
    Otros: '📦', Descargas: '📥', Utilidades: '🛠️', IA: '🧠',
    Multimedia: '🎨', Grupos: '👥', Interacción: '🎭', Moderación: '🛡️'
};

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.participant, key.remoteJid, key.senderPn, key.participantAlt];
    for (const c of candidatos) {
        if (!c || typeof c !== 'string') continue;
        const n = String(c).split('@')[0].split(':')[0].replace(/\D/g, '');
        if (n && n.length >= 7) {
            return { jid: c.includes('@') ? c : `${c}@s.whatsapp.net`, num: n };
        }
    }
    return null;
}

function formatUptime(s) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
}

// 2. FUNCIÓN MEJORADA PARA NORMALIZAR (Agrupa sin duplicar)
function normalizarCategoria(c) {
    if (!c) return 'Otros';
    const raw = String(c).trim().toLowerCase();
    return MAPA_CATEGORIAS[raw] || raw.replace(/^\w/, ch => ch.toUpperCase());
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
    return Object.keys(categorias).sort((a, b) => {
        const ia = ORDEN_CATEGORIAS.indexOf(a);
        const ib = ORDEN_CATEGORIAS.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

function acortarDesc(texto) {
    if (!texto) return 'Sin descripción';
    const limpio = String(texto).trim();
    return limpio.length <= 45 ? limpio : `${limpio.slice(0, 45).trim()}...`;
}

function generarMenuCompleto(categorias, prefijo, mencionTexto, botName) {
    const totalCmds = Object.values(categorias).flat().length;
    const totalCats = Object.keys(categorias).length;
    const now = moment.tz(ZONA_HORARIA);

    let texto = '';

    // 3. ENCABEZADO CHIDO Y LIMPIO
    texto += `╭━━━〔 ⚡ ${BOT_NAME} ⚡ 〕━━━⬣\n`;
    texto += `┃\n`;
    texto += `┃  👋 ¡Hola ${mencionTexto}!\n`;
    texto += `┃  🤖 Bienvenido al panel de control\n`;
    texto += `┃\n`;
    texto += `┃  📊 *ESTADÍSTICAS DEL SISTEMA*\n`;
    texto += `┃  👨‍💻 Creador   : ${CREADOR}\n`;
    texto += `┃  📦 Versión    : ${VERSION}\n`;
    texto += `┃  📚 Comandos   : ${totalCmds}\n`;
    texto += `┃  🗂️ Categorías : ${totalCats}\n`;
    texto += `┃  ⏱️ Uptime     : ${formatUptime(process.uptime())}\n`;
    texto += `┃  📅 ${now.format('DD/MM/YYYY')} - ${now.format('HH:mm:ss')}\n`;
    texto += `┃\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;

    // 4. CUERPO DEL MENÚ (Categorías y comandos)
    const catsOrdenadas = ordenarCategorias(categorias);
    
    for (const cat of catsOrdenadas) {
        const icono = obtenerIcono(cat);
        const cmds = categorias[cat];

        texto += `\n╭━━〔 ${icono} *${cat.toUpperCase()}* 〕━━⬣\n`;
        texto += `┃\n`;

        for (const cmd of cmds) {
            const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
            texto += `┃  ➤ *${prefijo}${cmd.nombre}*${alias}\n`;
            
            const desc = acortarDesc(cmd.descripcion);
            if (desc && desc !== 'Sin descripción') {
                texto += `┃     └─ ${desc}\n`;
            }
        }

        texto += `┃\n`;
        texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
    }

    // 5. PIE DE PÁGINA CON EL CANAL
    texto += `\n╭━━〔 📢 *CANAL OFICIAL* 〕━━⬣\n`;
    texto += `┃\n`;
    texto += `┃  🔗 Únete para novedades y soporte:\n`;
    texto += `┃  ${CANAL_URL}\n`;
    texto += `┃\n`;
    texto += `┃  💡 Usa *${prefijo}menu <comando>*\n`;
    texto += `┃     para ver información detallada.\n`;
    texto += `┃\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
    texto += `\n _${BOT_NAME} • ${now.format('HH:mm')}_`;

    return texto;
}

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help', 'comandos', 'cmds'],

    async ejecutar({ sock, msg, listaComandos, prefijo }) {
        try {
            const jid = msg?.key?.remoteJid;
            if (!jid) return;

            const autor = obtenerAutor(msg);
            const categorias = organizarComandos(listaComandos);
            const mencionTexto = autor ? `@${autor.num}` : 'usuario';
            const menciones = autor ? [autor.jid] : [];
            const botName = global.botname || BOT_NAME;

            const menuTexto = generarMenuCompleto(categorias, prefijo, mencionTexto, botName);

            // Envío con preview del canal (externalAdReply)
            const mensajeOpciones = {
                mentions: menciones,
                contextInfo: {
                    externalAdReply: {
                        title: `⚡ ${BOT_NAME} - Canal Oficial`,
                        body: '¡Toca aquí para unirte a la comunidad!',
                        thumbnailUrl: 'https://i.imgur.com/8Qj8Qj8.jpg', // Puedes cambiar esta URL por la foto de tu bot
                        sourceUrl: CANAL_URL,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            };

            if (fs.existsSync(FOTO_MENU)) {
                await sock.sendMessage(jid, {
                    image: { url: FOTO_MENU },
                    caption: menuTexto,
                    ...mensajeOpciones
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    text: menuTexto,
                    ...mensajeOpciones
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('[MENU] Error:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error al mostrar el menú: ${error.message}` }, { quoted: msg });
            } catch {}
        }
    }
};