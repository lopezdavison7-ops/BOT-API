import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { aplicarEstilo, obtenerCanal } from '../../lib/estilos.js';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA_HORARIA = 'America/Managua';
const BOT_NAME = 'BOT-API';

const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');

const ALIAS_CATEGORIAS = {
    'descargas': 'Descargas', 'downloads': 'Descargas', 'dl': 'Descargas',
    'juegos': 'Diversión', 'fun': 'Diversión', 'diversion': 'Diversión', 'diversión': 'Diversión',
    'economia': 'Economía', 'economy': 'Economía',
    'utilidades': 'Utilidades', 'utils': 'Utilidades', 'tools': 'Utilidades',
    'grupos': 'Grupos', 'groups': 'Grupos', 'grupo': 'Grupos',
    'moderacion': 'Moderación', 'moderación': 'Moderación', 'mod': 'Moderación',
    'owner': 'Owner', 'propietario': 'Owner', 'admin': 'Owner',
    'sistema': 'Sistema', 'system': 'Sistema',
    'interaccion': 'Interacción', 'interacción': 'Interacción',
    'multimedia': 'Multimedia', 'media': 'Multimedia',
    'ia': 'IA', 'ai': 'IA',
    'otros': 'Otros', 'random': 'Otros'
};

const ICONOS = {
    Owner: '👑', Economía: '💸', Diversión: '🎉', Sistema: '⚙️',
    Otros: '📦', Descargas: '📥', Utilidades: '🛠️', IA: '🧠',
    Multimedia: '🎨', Grupos: '👥', Interacción: '🎭', Moderación: '🛡️'
};

// ══ FIX DE LID: Resuelve el @lid al número real o usa el nombre de perfil ══
async function obtenerAutor(sock, msg) {
    const key = msg?.key || {};
    const candidatos = [key.participant, key.senderPn, key.participantAlt, key.remoteJid];
    let jid = null;

    for (const c of candidatos) {
        if (c && typeof c === 'string') { jid = c; break; }
    }

    // Si es un LID, intentar resolverlo al número real
    if (jid && jid.endsWith('@lid')) {
        try {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
                if (pn) jid = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
            }
        } catch (e) {}
    }

    // Si ya tenemos un JID válido (no lid), extraer número
    if (jid && !jid.endsWith('@lid')) {
        const n = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
        // Los números que empiezan con 2599 suelen ser LIDs sin resolver
        if (n && n.length >= 7 && !n.startsWith('2599')) {
            return { nombre: msg.pushName || n, num: n };
        }
    }

    // Respaldo: usar el nombre de perfil de WhatsApp
    return { nombre: msg.pushName || 'usuario', num: null };
}

function formatUptime(s) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
}

function normalizarCategoria(c) {
    if (!c) return 'Otros';
    const raw = String(c).trim().toLowerCase();
    return ALIAS_CATEGORIAS[raw] || raw.replace(/^\w/, ch => ch.toUpperCase());
}

function obtenerIcono(c) { return ICONOS[c] || '📦'; }

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

function generarMenuFiltrado(categoriaReal, cmds, prefijo, botName) {
    const icono = obtenerIcono(categoriaReal);
    let texto = `╭━━━〔 ⚡ ${botName} ⚡ 〕━━━⬣\n\n`;
    texto += `┃  📂 *CATEGORÍA:* ${categoriaReal.toUpperCase()}\n`;
    texto += `┃   *COMANDOS:* ${cmds.length}\n┃\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const cmd of cmds.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
        const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
        texto += `┃  ▸ *${prefijo}${cmd.nombre}*${alias}\n`;
        if (cmd.descripcion && cmd.descripcion !== 'Sin descripción') {
            const desc = cmd.descripcion.length > 45 ? cmd.descripcion.slice(0, 45) + '...' : cmd.descripcion;
            texto += `┃     └ ${desc}\n`;
        }
        texto += `\n`;
    }
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n\n💡 Usa *${prefijo}menu* para ver todo.`;
    return texto;
}

function generarMenuCompleto(categorias, prefijo, saludo, botName) {
    const totalCmds = Object.values(categorias).flat().length;
    const totalCats = Object.keys(categorias).length;
    const now = moment.tz(ZONA_HORARIA);

    let texto = `╭━━━〔 ⚡ ${botName} ⚡ 〕━━━⬣\n\n`;
    texto += `┃  👋 ¡Hola ${saludo}!\n\n`;
    texto += `┃   *INFO DEL BOT*\n`;
    texto += `┃  ▸ Creador: ${CREADOR}\n`;
    texto += `┃  ▸ Versión: ${VERSION}\n`;
    texto += `┃  ▸ Comandos: ${totalCmds}\n`;
    texto += `┃  ▸ Uptime: ${formatUptime(process.uptime())}\n`;
    texto += `┃  ▸ ${now.format('DD/MM/YYYY HH:mm')}\n┃\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;

    for (const cat of Object.keys(categorias).sort()) {
        const icono = obtenerIcono(cat);
        const cmds = categorias[cat];
        texto += `\n╭━━〔 ${icono} *${cat.toUpperCase()}* 〕━━⬣\n`;
        for (const cmd of cmds) {
            const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
            texto += `\n┃  ▸ *${prefijo}${cmd.nombre}*${alias}\n`;
            if (cmd.descripcion && cmd.descripcion !== 'Sin descripción') {
                const desc = cmd.descripcion.length > 45 ? cmd.descripcion.slice(0, 45) + '...' : cmd.descripcion;
                texto += `┃     └ ${desc}\n`;
            }
        }
        texto += `\n╰━━━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
    }
    return texto;
}

export default {
    nombre: 'menu',
    categoria: 'Sistema',
    alias: ['ayuda', 'help', 'comandos', 'cmds'],

    async ejecutar({ sock, msg, listaComandos, prefijo, args }) {
        try {
            const jid = msg?.key?.remoteJid;
            if (!jid) return;

            // ══ Obtener autor con fix de LID ══
            const autor = await obtenerAutor(sock, msg);
            const saludo = `*${autor.nombre}*`; // Siempre usa el nombre, nunca el LID
            const botName = global.botname || BOT_NAME;
            const categorias = organizarComandos(listaComandos);
            
            const busqueda = args && args[0] ? args[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : null;
            let menuTextoBase = '';

            if (busqueda && ALIAS_CATEGORIAS[busqueda]) {
                const catReal = ALIAS_CATEGORIAS[busqueda];
                const cmds = categorias[catReal] || [];
                menuTextoBase = cmds.length > 0 ? generarMenuFiltrado(catReal, cmds, prefijo, botName) : `❌ No hay comandos en *${catReal}*.`;
            } else if (busqueda && !ALIAS_CATEGORIAS[busqueda]) {
                const catsDisp = [...new Set(Object.values(ALIAS_CATEGORIAS))].map(c => `• ${c}`).join('\n');
                menuTextoBase = `❌ Categoría "*${args[0]}*" no existe.\n\n*Categorías disponibles:*\n${catsDisp}\n\n💡 Ejemplo: *${prefijo}menu descargas*`;
            } else {
                menuTextoBase = generarMenuCompleto(categorias, prefijo, saludo, botName);
            }

            const menuTextoFinal = aplicarEstilo(menuTextoBase);
            const urlCanal = obtenerCanal();

            // ══ Menú con botón interactivo "VER CANAL" ══
            await sock.relayMessage(jid, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: `⚡ ${botName}`,
                                subtitle: 'Menú de Comandos',
                                hasMediaAttachment: false
                            },
                            body: {
                                text: menuTextoFinal
                            },
                            footer: {
                                text: 'Canal Oficial'
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '📢 VER CANAL',
                                            url: urlCanal,
                                            merchant_url: urlCanal
                                        })
                                    }
                                ],
                                messageParamsJson: ''
                            }
                        }
                    }
                }
            }, {});

        } catch (error) {
            console.error('[MENU] Error:', error);
            try { 
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg }); 
            } catch {}
        }
    }
};