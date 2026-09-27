import fs from 'fs';
import path from 'path';

import {
    obtenerUsuario
} from '../../database/economia.js';

import {
    obtenerPerfil,
    calcularEdad,
    GENEROS
} from '../../database/perfiles.js';

const RUTA_NIVELES =
    path.join(
        process.cwd(),
        'database',
        'niveles.json'
    );

const XP_POR_NIVEL = 100;

const TTL_FOTO = 10 * 60 * 1000;
const TIMEOUT_FOTO = 8000;
const TTL_NIVELES = 1500;

if (!global.picBufferCache) global.picBufferCache = {};

let cacheNiveles = null;
let cacheNivelesT = 0;

function leerNiveles() {
    const ahora = Date.now();
    if (cacheNiveles && ahora - cacheNivelesT < TTL_NIVELES) {
        return cacheNiveles;
    }
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
        if (porChat.usuarios && porChat.usuarios[id]) {
            return porChat.usuarios[id];
        }
    }

    if (db[id]) return db[id];

    if (db.usuarios && db.usuarios[id]) {
        return db.usuarios[id];
    }

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
    const url =
        await sock.profilePictureUrl(
            jid,
            'image'
        );

    if (!url) throw new Error('Sin URL');

    const respuesta =
        await fetch(url, {
            signal: AbortSignal.timeout(4000)
        });

    if (!respuesta.ok) {
        throw new Error('HTTP ' + respuesta.status);
    }

    const arrayBuffer =
        await respuesta.arrayBuffer();

    return Buffer.from(arrayBuffer);
}

async function obtenerFotoBuffer(sock, msg, id) {
    const cache = global.picBufferCache[id];

    if (cache && Date.now() - cache.t < TTL_FOTO) {
        return cache.buffer;
    }

    const candidatos = [];

    const push = (j) => {
        if (j && !candidatos.includes(j)) {
            candidatos.push(j);
        }
    };

    push(msg.key?.senderPn);
    push(msg.key?.participantAlt);

    if (id && !id.endsWith('@lid')) push(id);

    if (id && id.endsWith('@lid')) {
        try {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn =
                    await sock.signalRepository.lidMapper.getPNForLid(id);
                if (pn) {
                    push(pn.includes('@') ? pn : pn + '@s.whatsapp.net');
                }
            }
        } catch {}
    }

    push(id);

    let buffer = null;

    for (const jid of candidatos) {
        try {
            buffer = await descargarFoto(sock, jid);
            if (buffer) {
                console.log(`[PROFILE] Foto OK con: ${jid}`);
                break;
            }
        } catch (e) {
            console.log(`[PROFILE] Foto falló con ${jid}: ${e?.message}`);
        }
    }

    if (!buffer) throw new Error('Sin foto en ningún candidato');

    global.picBufferCache[id] = {
        buffer,
        t: Date.now()
    };

    return buffer;
}

export default {
    nombre: 'profile',

    categoria: 'economia',

    alias: [
        'perfil',
        'me',
        'yo'
    ],

    descripcion:
        'Muestra tu perfil económico, nivel y colección con foto y mención.',

    ejecutar: async ({
        sock,
        msg
    }) => {

        const t0 = Date.now();

        const id =
            msg.key.participant ||
            msg.key.participantAlt ||
            msg.key.remoteJid ||
            msg.key.remoteJidAlt;

        const chatJid =
            msg.key.remoteJid;

        if (!id || !chatJid) {
            return;
        }

        const usuario =
            obtenerUsuario(id);

        const perfil =
            obtenerPerfil(id);

        const datosNivel =
            buscarNivel(chatJid, id);

        const nivelActual =
            datosNivel?.nivel || 1;

        const xpActual =
            Number(
                datosNivel?.xp || 0
            );

        const xpNecesariaNivel =
            xpNecesaria(nivelActual);

        const progreso =
            porcentajeXP(datosNivel);

        const barra =
            barraXP(datosNivel, 10);

        const mensajes =
            Number(
                datosNivel?.mensajes || 0
            );

        const personajes =
            Array.isArray(
                usuario.personajes
            )
                ? usuario.personajes
                : [];

        const dinero =
            Number(
                usuario.dinero || 0
            );

        const numero =
            String(id)
                .split('@')[0]
                .split(':')[0];

        const mentions = [id];

        let lineaNombre = '';
        let lineaBio = '';
        let lineaEdad = '';
        let lineaGenero = '';
        let lineaPareja = '';

        if (perfil.nombre) {
            lineaNombre =
                `┃ 📛 Nombre › *${perfil.nombre}*\n`;
        }

        if (perfil.desc) {
            lineaBio =
                `┃ 📝 Bio › ${perfil.desc}\n`;
        }

        if (perfil.fechaNacimiento) {
            lineaEdad =
                `┃ 🎂 Edad › *${calcularEdad(perfil.fechaNacimiento)} años*\n`;
        } else {
            lineaEdad =
                '┃ 🎂 Edad › *No definida*\n';
        }

        if (
            perfil.genero &&
            GENEROS[
                perfil.genero
            ]
        ) {
            const info =
                GENEROS[
                    perfil.genero
                ];
            lineaGenero =
                `┃ ${info.emoji} Género › *${info.etiqueta}*\n`;
        } else {
            lineaGenero =
                '┃ ⚧️ Género › *No definido*\n';
        }

        if (perfil.pareja) {
            lineaPareja =
                `┃ 💍 Pareja › @${perfil.pareja.split('@')[0]}\n`;
            mentions.push(
                perfil.pareja
            );
        } else {
            lineaPareja =
                '┃ 💍 Pareja › *No definida*\n';
        }

        const texto =
`
╭〔  𝐎𝐓-𝐀𝐏𝐈 〕⬣
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
╰━━━━━━━━━━━━━━━━⬣
`;

        let fotoBuffer = null;

        try {
            fotoBuffer =
                await conTimeout(
                    obtenerFotoBuffer(sock, msg, id),
                    TIMEOUT_FOTO
                );
        } catch (e) {
            console.log(
                '[PROFILE] Foto falló:',
                e?.message || e
            );
        }

        console.log(
            `[PROFILE] Foto: ${fotoBuffer ? 'SÍ' : 'NO'} | total ${Date.now() - t0}ms`
        );

        if (fotoBuffer) {
            try {
                await sock.sendMessage(
                    chatJid,
                    {
                        image: fotoBuffer,
                        caption: texto,
                        mentions
                    },
                    {
                        quoted: msg
                    }
                );
                return;
            } catch {}
        }

        await sock.sendMessage(
            chatJid,
            {
                text: texto,
                mentions
            },
            {
                quoted: msg
            }
        );
    }
};