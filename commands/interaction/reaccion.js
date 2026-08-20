// commands/interaction/reaccion.js
import fs from 'fs';
import path from 'path';

const ANIME_FILE = path.join(process.cwd(), 'database', 'anime.json');

// ============================================================
// OBTENER TIPO
// ============================================================

function obtenerTipo(msg) {
    const texto = msg?.message?.conversation ||
                  msg?.message?.extendedTextMessage?.text ||
                  '';
    if (!texto) return 'hug';
    const partes = texto.trim().split(/\s+/);
    const comando = partes[0]?.replace(/^\./, '').toLowerCase();
    return comando || 'hug';
}

// ============================================================
// OBTENER AUTOR Y OBJETIVO
// ============================================================

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.participant, key.senderPn, key.participantAlt, key.remoteJid];
    for (const candidato of candidatos) {
        if (!candidato) continue;
        if (String(candidato).endsWith('@g.us')) continue;
        return candidato;
    }
    return null;
}

function obtenerMencion(msg) {
    const contexto = msg?.message?.extendedTextMessage?.contextInfo;
    const mencionados = contexto?.mentionedJid || [];
    if (mencionados.length > 0) return mencionados[0];
    return null;
}

function obtenerPersonaRespondida(msg) {
    const contexto = msg?.message?.extendedTextMessage?.contextInfo;
    if (!contexto?.quotedMessage) return null;
    return contexto.participant || contexto.participantAlt || null;
}

function crearMencion(jid) {
    if (!jid) return null;
    const numero = String(jid).split('@')[0].split(':')[0];
    return numero ? `@${numero}` : null;
}

// ============================================================
// ACCIONES
// ============================================================

function obtenerAccion(tipo) {
    const acciones = {
        hug: 'abraza', kiss: 'besa', pat: 'acaricia', slap: 'da una bofetada a',
        poke: 'molesta a', cuddle: 'se acurruca con', wave: 'saluda a',
        smile: 'sonríe a', dance: 'baila con', cry: 'llora con',
        happy: 'se alegra con', angry: 'se enoja con', love: 'ama a',
        bite: 'muerde a', blush: 'se sonroja con', highfive: 'choca la mano con',
        handhold: 'toma de la mano a', feed: 'alimenta a', bonk: 'golpea suavemente a',
        yeet: 'lanza a', wink: 'le guiña el ojo a', stare: 'mira a',
        tickle: 'hace cosquillas a', punch: 'golpea a', kick: 'patea a'
    };
    return acciones[tipo] || tipo;
}

function textoSinObjetivo(tipo, autorTexto) {
    const mensajes = {
        hug: `${autorTexto} quiere dar muchos abrazos 🤗`,
        kiss: `${autorTexto} quiere dar muchos besos 😘`,
        pat: `${autorTexto} quiere dar muchas caricias 🥰`,
        wave: `${autorTexto} quiere saludar a todos 👋`,
        dance: `${autorTexto} quiere bailar 💃`,
        smile: `${autorTexto} está sonriendo 😄`,
        love: `${autorTexto} está repartiendo amor ❤️`
    };
    return mensajes[tipo] || `${autorTexto} quiere hacer muchas reacciones 🎭`;
}

// ============================================================
// CARGAR JSON Y OBTENER URL
// ============================================================

function cargarAnime() {
    if (!fs.existsSync(ANIME_FILE)) {
        throw new Error('El archivo anime.json no existe.');
    }
    const contenido = fs.readFileSync(ANIME_FILE, 'utf8');
    return JSON.parse(contenido);
}

function obtenerUrl(tipo) {
    const datos = cargarAnime();
    const reaccion = datos[tipo];
    if (!reaccion || !Array.isArray(reaccion.videos) || reaccion.videos.length === 0) {
        return null;
    }
    const videos = reaccion.videos;
    return videos[Math.floor(Math.random() * videos.length)];
}

// ============================================================
// COMANDO PRINCIPAL
// ============================================================

export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: ['hug', 'kiss', 'pat', 'slap', 'poke', 'cuddle', 'wave', 'smile', 'dance', 'cry', 'happy', 'angry', 'love', 'bite', 'blush', 'highfive', 'handhold', 'feed', 'bonk', 'yeet', 'wink', 'stare', 'tickle', 'punch', 'kick'],
    descripcion: 'Reacciones GIF. Ejemplo: .hug, .kiss, .pat, etc.',

    async ejecutar({ sock, msg, responder }) {
        const tipo = obtenerTipo(msg);

        try {
            console.log(`[REACCION] Ejecutando: ${tipo}`);

            const url = obtenerUrl(tipo);
            if (!url) {
                return responder.texto(`❌ No encontré un GIF para la reacción *${tipo}*.`);
            }

            const autor = obtenerAutor(msg);
            const mencionado = obtenerMencion(msg);
            const respondido = obtenerPersonaRespondida(msg);
            const objetivo = mencionado || respondido || null;

            const textoAutor = crearMencion(autor) || '@usuario';
            const menciones = [];

            let caption = `🎭 *${tipo.toUpperCase()}*\n\n`;

            if (objetivo) {
                const textoObjetivo = crearMencion(objetivo);
                if (textoObjetivo) {
                    const accion = obtenerAccion(tipo);
                    caption += `💫 ${textoAutor} ${accion} ${textoObjetivo}`;
                    if (autor) menciones.push(autor);
                    if (objetivo && !menciones.includes(objetivo)) menciones.push(objetivo);
                } else {
                    caption += `💫 ${textoSinObjetivo(tipo, textoAutor)}`;
                }
            } else {
                caption += `💫 ${textoSinObjetivo(tipo, textoAutor)}`;
                if (autor) menciones.push(autor);
            }

            // Enviar GIF
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    video: { url },
                    gifPlayback: true,
                    caption,
                    mentions: menciones
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[REACCION] Error:', error?.message || error);
            await responder.texto(`❌ No pude enviar la reacción *${tipo}*.\n\n⚠️ ${error?.message || 'Error desconocido.'}`);
        }
    }
};