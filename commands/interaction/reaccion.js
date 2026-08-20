// commands/interaction/reaccion.js
import fetch from 'node-fetch';

// ============================================================
// LISTA DE REACCIONES CON MÚLTIPLES URLs (internas)
// ============================================================

const REACCIONES = {
    hug: [
        'https://media.tenor.com/_T1L0wQ0jWwAAAAC/anime-hug.gif',
        'https://media.tenor.com/On7KV3VX1vAAAAAC/anime-hug.gif',
        'https://media.tenor.com/7fKjKqH9pDkAAAAC/anime-hug.gif'
    ],
    kiss: [
        'https://media.tenor.com/Gf4G9Xj0x7YAAAAC/anime-kiss.gif',
        'https://media.tenor.com/8f9Ff1FjFZ4AAAAC/anime-kiss.gif',
        'https://media.tenor.com/3bFzD8q4hYgAAAAC/anime-kiss.gif'
    ],
    pat: [
        'https://media.tenor.com/5lJg4kQgY2AAAAAC/anime-pat.gif',
        'https://media.tenor.com/7v3X5Q2tYfAAAAAC/anime-pat.gif',
        'https://media.tenor.com/9fX5Yf9qXfAAAAAC/anime-pat.gif'
    ],
    slap: [
        'https://media.tenor.com/oOqPz4xKvQAAAAAC/anime-slap.gif',
        'https://media.tenor.com/8N6t0zZbJ0AAAAAC/anime-slap.gif',
        'https://media.tenor.com/2sZ8z3T7t8AAAAAC/anime-slap.gif'
    ],
    poke: [
        'https://media.tenor.com/3VtY8yE3O6AAAAAC/anime-poke.gif',
        'https://media.tenor.com/2_89XZT_B7kAAAAC/anime-poke.gif',
        'https://media.tenor.com/4tXy9aZ8r8AAAAAC/anime-poke.gif'
    ],
    cuddle: [
        'https://media.tenor.com/L0qP8e7g5gAAAAAC/anime-cuddle.gif',
        'https://media.tenor.com/N8Y5Qo1Mf2AAAAAC/anime-cuddle.gif',
        'https://media.tenor.com/6rC9fQ2tYfAAAAAC/anime-cuddle.gif'
    ],
    wave: [
        'https://media.tenor.com/f7i3VlG5ZqAAAAAC/anime-wave.gif',
        'https://media.tenor.com/2D7uFbTt0oAAAAAC/anime-wave.gif',
        'https://media.tenor.com/8f9Ff1FjFZ4AAAAC/anime-wave.gif'
    ],
    smile: [
        'https://media.tenor.com/1F6E9yS5R4AAAAAC/anime-smile.gif',
        'https://media.tenor.com/3bU8T1lLp6gAAAAC/anime-smile.gif',
        'https://media.tenor.com/9fX5Yf9qXfAAAAAC/anime-smile.gif'
    ],
    dance: [
        'https://media.tenor.com/t5j4SxIeU4AAAAAC/anime-dance.gif',
        'https://media.tenor.com/PG5c7rVg3vAAAAAC/anime-dance.gif',
        'https://media.tenor.com/7rC9fQ2tYfAAAAAC/anime-dance.gif'
    ],
    cry: [
        'https://media.tenor.com/5LwWmH1Pq8AAAAAC/anime-cry.gif',
        'https://media.tenor.com/2B4zV2jHbXAAAAAC/anime-cry.gif',
        'https://media.tenor.com/4tXy9aZ8r8AAAAAC/anime-cry.gif'
    ],
    happy: [
        'https://media.tenor.com/1XmR5gC9xQAAAAAC/anime-happy.gif',
        'https://media.tenor.com/4SgJc8VpK3AAAAAC/anime-happy.gif',
        'https://media.tenor.com/6rC9fQ2tYfAAAAAC/anime-happy.gif'
    ],
    angry: [
        'https://media.tenor.com/7n1aN7H7Oa0AAAAC/anime-angry.gif',
        'https://media.tenor.com/8Tp9Jm9f8oAAAAAC/anime-angry.gif',
        'https://media.tenor.com/9fX5Yf9qXfAAAAAC/anime-angry.gif'
    ],
    love: [
        'https://media.tenor.com/7f9Xb3H2t8AAAAAC/anime-love.gif',
        'https://media.tenor.com/8PmS7rVhYAAAAAC/anime-love.gif',
        'https://media.tenor.com/2sZ8z3T7t8AAAAAC/anime-love.gif'
    ],
    bite: [
        'https://media.tenor.com/6K8H1rU5N4AAAAAC/anime-bite.gif',
        'https://media.tenor.com/4aM9e2rH7kAAAAAC/anime-bite.gif',
        'https://media.tenor.com/8N6t0zZbJ0AAAAAC/anime-bite.gif'
    ],
    blush: [
        'https://media.tenor.com/0Vq5m5T7JYAAAAAC/anime-blush.gif',
        'https://media.tenor.com/3bU8T1lLp6gAAAAC/anime-blush.gif',
        'https://media.tenor.com/6rC9fQ2tYfAAAAAC/anime-blush.gif'
    ],
    highfive: [
        'https://media.tenor.com/5lJg4kQgY2AAAAAC/anime-highfive.gif',
        'https://media.tenor.com/7v3X5Q2tYfAAAAAC/anime-highfive.gif'
    ],
    handhold: [
        'https://media.tenor.com/L0qP8e7g5gAAAAAC/anime-handhold.gif',
        'https://media.tenor.com/N8Y5Qo1Mf2AAAAAC/anime-handhold.gif'
    ],
    feed: [
        'https://media.tenor.com/1F6E9yS5R4AAAAAC/anime-feed.gif',
        'https://media.tenor.com/3bU8T1lLp6gAAAAC/anime-feed.gif'
    ],
    bonk: [
        'https://media.tenor.com/4tXy9aZ8r8AAAAAC/anime-bonk.gif',
        'https://media.tenor.com/8N6t0zZbJ0AAAAAC/anime-bonk.gif'
    ],
    yeet: [
        'https://media.tenor.com/oOqPz4xKvQAAAAAC/anime-yeet.gif',
        'https://media.tenor.com/2sZ8z3T7t8AAAAAC/anime-yeet.gif'
    ],
    wink: [
        'https://media.tenor.com/f7i3VlG5ZqAAAAAC/anime-wink.gif',
        'https://media.tenor.com/9fX5Yf9qXfAAAAAC/anime-wink.gif'
    ],
    stare: [
        'https://media.tenor.com/7n1aN7H7Oa0AAAAC/anime-stare.gif',
        'https://media.tenor.com/8Tp9Jm9f8oAAAAAC/anime-stare.gif'
    ],
    tickle: [
        'https://media.tenor.com/5lJg4kQgY2AAAAAC/anime-tickle.gif',
        'https://media.tenor.com/7v3X5Q2tYfAAAAAC/anime-tickle.gif'
    ],
    punch: [
        'https://media.tenor.com/oOqPz4xKvQAAAAAC/anime-punch.gif',
        'https://media.tenor.com/8N6t0zZbJ0AAAAAC/anime-punch.gif'
    ],
    kick: [
        'https://media.tenor.com/2B4zV2jHbXAAAAAC/anime-kick.gif',
        'https://media.tenor.com/4tXy9aZ8r8AAAAAC/anime-kick.gif'
    ]
};

// ============================================================
// FUNCIONES AUXILIARES
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

            // Obtener una URL aleatoria de la lista
            const urls = REACCIONES[tipo];
            if (!urls || urls.length === 0) {
                return responder.texto(`❌ No encontré GIFs para la reacción *${tipo}*.`);
            }
            const url = urls[Math.floor(Math.random() * urls.length)];

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

            // Intentar enviar la URL directamente
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
            await responder.texto(`❌ No pude enviar la reacción *${tipo}*.\n\n⚠️ El servidor bloqueó la descarga del GIF.`);
        }
    }
};