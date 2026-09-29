import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    obtenerUsuario
} from '../../database/economia.js';

import {
    obtenerPerfil,
    calcularEdad,
    GENEROS
} from '../../database/perfiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUTA_NIVELES = path.join(__dirname, '..', '..', 'database', 'niveles.json');
const RUTA_LIDMAP = path.join(__dirname, '..', '..', 'database', 'lidmap.json');

const XP_POR_NIVEL = 100;
const TTL_FOTO = 10 * 60 * 1000;
const TIMEOUT_FOTO = 3500;
const TTL_NIVELES = 1500;

if (!global.picBufferCache) global.picBufferCache = {};

let lidMap = null;
let cacheNiveles = null;
let cacheNivelesT = 0;

function esPnValido(j) {
    return typeof j === 'string' && /^\d{5,15}@s\.whatsapp\.net$/.test(j);
}

function leerLidMap() {
    if (lidMap) return lidMap;
    try {
        const raw = fs.existsSync(RUTA_LIDMAP)
            ? JSON.parse(fs.readFileSync(RUTA_LIDMAP, 'utf8'))
            : {};
        lidMap = {};
        for (const [k, v] of Object.entries(raw)) {
            if (esPnValido(v)) lidMap[k] = v;
        }
    } catch {
        lidMap = {};
    }
    return lidMap;
}

function registrarLid(lid, pn) {
    if (!lid || !esPnValido(pn)) return;
    const map = leerLidMap();
    if (map[lid] === pn) return;
    map[lid] = pn;
    lidMap = map;
    try {
        fs.mkdirSync(path.dirname(RUTA_LIDMAP), { recursive: true });
        fs.writeFileSync(RUTA_LIDMAP, JSON.stringify(map, null, 2), 'utf8');
    } catch {}
}

async function resolverPn(sock, lid) {
    const map = leerLidMap();
    if (map[lid]) return map[lid];

    try {
        if (sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(lid);
            if (pn) {
                const j = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                if (esPnValido(j)) {
                    registrarLid(lid, j);
                    return j;
                }
            }
        }
    } catch {}

    return null;
}

function leerNiveles() {
    const ahora = Date.now();
    if (cacheNiveles && ahora - cacheNivelesT < TTL_NIVELES) return cacheNiveles;
    try {
        cacheNiveles = fs.existsSync(RUTA_NIVELES)
            ? JSON.parse(fs.readFileSync(RUTA_NIVELES, 'utf8'))
            : {};
        cacheNivelesT = ahora;
        return cacheNiveles;
    } catch {
        return {};
    }
}

function buscarNivel(chatJid, id) {
    const db = leerNiveles();
    const porChat = db[chatJid];
    if (porChat) {
        if (porChat[id]) return porChat[id];
        if (porChat.usuarios && porChat.usuarios[id]) return porChat.usuarios[id];
    }
    if (db[id]) return db[id];
    if (db.usuarios && db.usuarios[id]) return db.usuarios[id];
    return null;
}

function xpNecesaria(nivel) {
    return nivel * XP_POR_NIVEL;
}

function porcentajeXP(datosNivel) {
    const nivel = datosNivel?.nivel || 1;
    const xp = Number(datosNivel?.xp || 0);
    const necesaria = xpNecesaria(nivel);
    if (!necesaria) return 0;
    return Math.min(100, Math.round((xp / necesaria) * 100));
}

function barraXP(datosNivel, largo = 10) {
    const pct = porcentajeXP(datosNivel);
    const llenos = Math.round((pct / 100) * largo);
    return '█'.repeat(llenos) + '░'.repeat(largo - llenos);
}

function conTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(null), ms))
    ]);
}

async function descargarFoto(sock, jid) {
    const url = await sock.profilePictureUrl(jid, 'image');
    if (!url) throw new Error('Sin URL');

    const respuesta = await fetch(url, {
        signal: AbortSignal.timeout(3000)
    });

    if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);

    const arrayBuffer = await respuesta.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function obtenerFotoBuffer(sock, msg, id, jidReal) {
    const cache = global.picBufferCache[id];
    if (cache && Date.now() - cache.t < TTL_FOTO) return cache.buffer;

    const candidatos = [];
    const push = (j) => {
        if (j && !candidatos.includes(j)) candidatos.push(j);
    };

    if (esPnValido(jidReal)) push(jidReal);
    if (esPnValido(msg.key?.senderPn)) push(msg.key.senderPn);
    if (esPnValido(msg.key?.participantAlt)) push(msg.key.participantAlt);
    push(id);

    let buffer = null;

    for (const jid of candidatos.slice(0, 2)) {
        try {
            buffer = await descargarFoto(sock, jid);
            if (buffer) {
                if (id.endsWith('@lid') && esPnValido(jid)) registrarLid(id, jid);
                console.log(`[PROFILE] Foto OK con: ${jid}`);
                break;
            }
        } catch (e) {
            console.log(`[PROFILE] Foto falló con ${jid}: ${e?.message}`);
        }
    }

    if (!buffer) throw new Error('Sin foto disponible');

    global.picBufferCache[id] = { buffer, t: Date.now() };
    return buffer;
}

export default {
    nombre: 'profile',

    categoria: 'economia',

    alias: ['perfil', 'me', 'yo'],

    descripcion: 'Muestra tu perfil económico, nivel y colección con foto y mención.',

    ejecutar: async ({ sock, msg }) => {

        const t0 = Date.now();

        const menciones =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        const id =
            menciones[0] ||
            msg.key.participant ||
            msg.key.participantAlt ||
            msg.key.remoteJid ||
            msg.key.remoteJidAlt;

        const chatJid = msg.key.remoteJid;

        if (!id || !chatJid) return;

        let jidReal = id;
        if (id.endsWith('@lid')) {
            jidReal = (await resolverPn(sock, id)) || id;
        }

        const usuario = obtenerUsuario(id);
        const perfil = obtenerPerfil(id);
        const datosNivel = buscarNivel(chatJid, id);

        const nivelActual = datosNivel?.nivel || 1;
        const xpActual = Number(datosNivel?.xp || 0);
        const xpNecesariaNivel = xpNecesaria(nivelActual);
        const progreso = porcentajeXP(datosNivel);
        const barra = barraXP(datosNivel, 10);
        const mensajes = Number(datosNivel?.mensajes || 0);

        const personajes = Array.isArray(usuario.personajes) ? usuario.personajes : [];
        const dinero = Number(usuario.dinero || 0);

        const numero = String(jidReal).split('@')[0].replace(/\D/g, '') ||
            String(id).split('@')[0].replace(/\D/g, '');

        const mentions = [id];

        let lineaNombre = '';
        let lineaBio = '';
        let lineaEdad = '';
        let lineaGenero = '';
        let lineaPareja = '';

        if (perfil.nombre) lineaNombre = `┃ 📛 Nombre › *${perfil.nombre}*\n`;
        if (perfil.desc) lineaBio = `┃ 📝 Bio › ${perfil.desc}\n`;

        if (perfil.fechaNacimiento) {
            lineaEdad = `┃ 🎂 Edad › *${calcularEdad(perfil.fechaNacimiento)} años*\n`;
        } else {
            lineaEdad = '┃ 🎂 Edad › *No definida*\n';
        }

        if (perfil.genero && GENEROS[perfil.genero]) {
            const info = GENEROS[perfil.genero];
            lineaGenero = `┃ ${info.emoji} Género › *${info.etiqueta}*\n`;
        } else {
            lineaGenero = '┃ ⚧️ Género › *No definido*\n';
        }

        if (perfil.pareja) {
            lineaPareja = `┃ 💍 Pareja › @${perfil.pareja.split('@')[0]}\n`;
            mentions.push(perfil.pareja);
        } else {
            lineaPareja = '┃ 💍 Pareja › *No definida*\n';
        }

        const texto =
`
╭〔 ⚡ 𝐎𝐓-𝐀𝐏𝐈 〕⬣
┃
┃ 👤 𝐏𝐄𝐑𝐅𝐈𝐋
┃
┃ 🆔 Usuario › @${numero}
${lineaNombre}${lineaBio}┃
┃ 💰 Dinero › *$${dinero.toLocaleString()}*
┃ 🎴 Cartas › *${personajes.length}*
┃
┃ ⭐ Nivel › *${nivelActual}*
┃ ✨ XP › *${xpActual} / ${xpNecesariaNivel}*
┃ 📊 Progreso › *${progreso}%*
┃ ${barra}
┃ 💬 Mensajes › *${mensajes}*
┃
${lineaEdad}${lineaGenero}${lineaPareja}┃
┃ 💡 Edita con:
┃ ➪ .setmyname / .setdesc
┃
╰━━━━━━━━━━━━━━━━
`;

        let fotoBuffer = null;

        try {
            fotoBuffer = await conTimeout(
                obtenerFotoBuffer(sock, msg, id, jidReal),
                TIMEOUT_FOTO
            );
        } catch (e) {
            console.log('[PROFILE] Foto falló:', e?.message || e);
        }

        console.log(`[PROFILE] Foto: ${fotoBuffer ? 'SÍ' : 'NO'} | total ${Date.now() - t0}ms`);

        if (fotoBuffer) {
            try {
                await sock.sendMessage(chatJid, {
                    image: fotoBuffer,
                    caption: texto,
                    mentions
                }, { quoted: msg });
                return;
            } catch {}
        }

        await sock.sendMessage(chatJid, {
            text: texto,
            mentions
        }, { quoted: msg });
    }
};