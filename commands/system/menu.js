import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { aplicarEstilo } from '../../lib/estilos.js'; // <-- IMPORTANTE: Aplica el estilo

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';
const BOT_NAME = 'BOT-API';
const CANAL_URL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');

const ORDEN_CATEGORIAS = [
    'Sistema', 'Owner', 'Grupos', 'Moderación', 'Economía',
    'Diversión', 'Interacción', 'Descargas', 'Multimedia',
    'Utilidades', 'IA', 'Otros'
];

const ICONOS = {
    Owner: '👑', Economía: '💸', Diversión: '🎉', Sistema: '⚙️',
    Otros: '📦', Descargas: '📥', Utilidades: '️', IA: '🧠',
    Multimedia: '🎨', Grupos: '👥', Interacción: '', Moderación: '🛡️'
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

function normalizarCategoria(c) {
    const mapa = {
        'economia': 'Economía', 'economy': 'Economía', 'economía': 'Economía',
        'utilidades': 'Utilidades', 'utils': 'Utilidades', 'utility': 'Utilidades',
        'sistema': 'Sistema', 'system': 'Sistema',
        'owner': 'Owner', 'propietario': 'Owner',
        'grupos': 'Grupos', 'groups': 'Grupos',
        'moderación': 'Moderación', 'moderacion': 'Moderación', 'mod': 'Moderación',
        'diversión': 'Diversión', 'diversion': 'Diversión', 'fun': 'Diversión',
        'interacción': 'Interacción', 'interaccion': 'Interacción',
        'descargas': 'Descargas', 'downloads': 'Descargas',
        'multimedia': 'Multimedia', 'media': 'Multimedia',
        'ia': 'IA', 'ai': 'IA'
    };
    if (!c) return 'Otros';
    const raw = String(c).trim().toLowerCase();
    return mapa[raw] || raw.replace(/^\w/, ch => ch.toUpperCase());
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

function generarMenuCompleto(categorias, prefijo, mencionTexto, botName) {
    const totalCmds = Object.values(categorias).flat().length;
    const totalCats = Object.keys(categorias).length;
    const now = moment.tz(ZONA_HORARIA);

    let texto = '';

    // ══ ENCABEZADO PRINCIPAL ══
    texto += `╭━━━〔 ⚡ ${BOT_NAME} ⚡ 〕━━━⬣\n`;
    texto += `\n`;
    texto += `┃  👋 ¡Hola ${mencionTexto}!\n`;
    texto += `┃   *${botName}*\n`;
    texto += `┃\n`;
    texto += `┃  📊 *INFORMACIÓN DEL BOT*\n`;
    texto += `┃  ▸ Creador: ${CREADOR}\n`;
    texto += `┃  ▸ Versión: ${VERSION}\n`;
    texto += `┃  ▸ Comandos: ${totalCmds}\n`;
    texto += `┃  ▸ Categorías: ${totalCats}\n`;
    texto += `┃  ▸ Uptime: ${formatUptime(process.uptime())}\n`;
    texto += `  ▸ Fecha: ${now.format('DD/MM/YYYY HH:mm:ss')}\n`;
    texto += `┃\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;

    // ══ COMANDOS POR CATEGORÍA ══
    const catsOrdenadas = ordenarCategorias(categorias);
    
    for (const cat of catsOrdenadas) {
        const icono = obtenerIcono(cat);
        const cmds = categorias[cat];

        texto += `\n╭━━〔 ${icono} *${cat.toUpperCase()}* 〕━━⬣\n`;

        for (const cmd of cmds) {
            const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
            texto += `┃\n`;
            texto += `┃  ▸ *${prefijo}${cmd.nombre}*${alias}\n`;
            
            if (cmd.descripcion && cmd.descripcion !== 'Sin descripción') {
                const desc = cmd.descripcion.length > 50 ? cmd.descripcion.slice(0, 50) + '...' : cmd.descripcion;
                texto += `┃  > ${desc}\n`;
            }
        }

        texto += `┃\n`;
        texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
    }

    // ══ SECCIÓN DEL CANAL (IMPORTANTE: Enlace limpio para que WhatsApp muestre "Ver canal") ══
    texto += `\n╭━━〔 📢 *CANAL OFICIAL* 〕━━\n`;
    texto += `┃\n`;
    texto += `┃   Únete para novedades y soporte:\n`;
    texto += `┃\n`;
    texto += `┃  ${CANAL_URL}\n`;
    texto += `┃\n`;
    texto += `┃  💡 Usa *${prefijo}menu <comando>*\n`;
    texto += `┃     para ver información detallada.\n`;
    texto += `┃\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;

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

            // 1. Generar el menú base
            const menuTextoBase = generarMenuCompleto(categorias, prefijo, mencionTexto, botName);

            // 2. APLICAR EL ESTILO ACTIVO (Halloween, Neón, etc.) ← ESTO FALTABA
            const menuTextoFinal = aplicarEstilo(menuTextoBase);

            // 3. Enviar con imagen o texto + contexto del canal
            const mensajeOpciones = {
                mentions: menciones,
                contextInfo: {
                    externalAdReply: {
                        title: `⚡ ${BOT_NAME}`,
                        body: 'Canal Oficial - Únete aquí',
                        thumbnailUrl: 'https://i.imgur.com/default.jpg',
                        sourceUrl: CANAL_URL, // ← ESTO HACE QUE APAREZCA "VER CANAL"
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            };

            if (fs.existsSync(FOTO_MENU)) {
                await sock.sendMessage(jid, {
                    image: { url: FOTO_MENU },
                    caption: menuTextoFinal, // ← Texto con estilo aplicado
                    ...mensajeOpciones
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    text: menuTextoFinal, // ← Texto con estilo aplicado
                    ...mensajeOpciones
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('[MENU] Error:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
            } catch {}
        }
    }
};