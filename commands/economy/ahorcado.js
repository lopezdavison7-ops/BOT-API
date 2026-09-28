import { createCanvas } from 'canvas';
import fetch from 'node-fetch';
import { modificarDinero } from '../../database/economia.js';

const API_URL = 'https://app.siputzx.my.id/api/game/tebak-kalimat';

if (!global.ahorcadoGames) global.ahorcadoGames = {};
if (!global.ahorcadoMsgIds) global.ahorcadoMsgIds = {};

const VIDAS_MAX = 5;

function dibujarCorazon(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const topY = y - size * 0.4;
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, topY, x - size, topY, x - size, y);
    ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size * 1.2);
    ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y);
    ctx.bezierCurveTo(x + size, topY, x, topY, x, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function dibujarJuego(pregunta, palabraOculta, vidas, letrasUsadas, respuesta) {
    const canvas = createCanvas(400, 500);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 400, 500);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 AHORCADO', 200, 40);

    for (let i = 0; i < VIDAS_MAX; i++) {
        const x = 60 + i * 70;
        const color = i < vidas ? '#ff4757' : '#2d2d44';
        dibujarCorazon(ctx, x, 100, 25, color);
    }

    ctx.fillStyle = '#ffd93d';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('❓ PREGUNTA:', 200, 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    const preguntaLines = wrapText(ctx, pregunta, 360);
    preguntaLines.forEach((line, i) => {
        ctx.fillText(line, 200, 190 + i * 25);
    });

    ctx.fillStyle = '#6bcf7f';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🔤 PALABRA:', 200, 280);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(palabraOculta, 200, 320);

    if (letrasUsadas.length > 0) {
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '14px Arial';
        ctx.fillText('Letras usadas: ' + letrasUsadas.join(', ').toUpperCase(), 200, 370);
    }

    ctx.fillStyle = '#4a90e2';
    ctx.font = '14px Arial';
    ctx.fillText('❤️ Vidas: ' + vidas + '/' + VIDAS_MAX, 200, 410);

    if (vidas === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 200, 400, 100);
        ctx.fillStyle = '#ff4757';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('💀 GAME OVER', 200, 250);
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.fillText('Respuesta: ' + respuesta.toUpperCase(), 200, 285);
    }

    return canvas.toBuffer();
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

function calcularRecompensa(respuesta, vidasRestantes) {
    const longitud = respuesta.replace(/ /g, '').length;
    let coinsBase = 50;

    if (longitud >= 9) {
        coinsBase = 150;
    } else if (longitud >= 6) {
        coinsBase = 100;
    }

    const bonusVidas = vidasRestantes * 10;
    const total = coinsBase + bonusVidas;

    return {
        total,
        coinsBase,
        bonusVidas,
        dificultad: longitud >= 9 ? 'Difícil' : longitud >= 6 ? 'Media' : 'Fácil'
    };
}

async function obtenerPregunta() {
    try {
        const res = await fetch(API_URL, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error('API falló');
        const data = await res.json();
        if (!data.status || !data.data) throw new Error('Sin datos');
        return {
            pregunta: data.data.pertanyaan,
            respuesta: data.data.jawaban
        };
    } catch (e) {
        const fallback = [
            { pregunta: 'El ___ es el mejor amigo del hombre', respuesta: 'perro' },
            { pregunta: 'La ___ es la capital de Francia', respuesta: 'paris' },
            { pregunta: 'El agua hierve a ___ grados', respuesta: 'cien' },
            { pregunta: 'Kecil-kecil cabai ___', respuesta: 'rawit' },
            { pregunta: 'Después de la ___ viene la calma', respuesta: 'tormenta' }
        ];
        return fallback[Math.floor(Math.random() * fallback.length)];
    }
}

function palabraOculta(respuesta, letrasAdivinadas) {
    return respuesta.split('').map(letra => {
        if (letra === ' ') return '  ';
        return letrasAdivinadas.has(letra.toLowerCase()) ? letra.toUpperCase() : '_';
    }).join(' ');
}

export default {
    nombre: 'ahorcado',
    categoria: 'economia',
    alias: ['hangman', 'juegoahorcado', 'vidas'],
    descripcion: 'Juego del ahorcado con vidas y recompensas en coins',
    uso: '.ahorcado',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        if (global.ahorcadoGames[jid]) {
            return await responder.texto('⚠️ Ya hay un juego en curso. Responde al mensaje con letras o usa `.ahorcado stop` para cancelarlo.');
        }

        await responder.texto('🎮 Obteniendo pregunta...');

        const { pregunta, respuesta } = await obtenerPregunta();

        global.ahorcadoGames[jid] = {
            pregunta,
            respuesta: respuesta.toLowerCase(),
            letrasAdivinadas: new Set(),
            vidas: VIDAS_MAX,
            jugador: msg.key.participant || msg.key.remoteJid,
            inicio: Date.now()
        };

        const recompensa = calcularRecompuesta(respuesta, VIDAS_MAX);
        const imagen = dibujarJuego(pregunta, palabraOculta(respuesta, new Set()), VIDAS_MAX, [], respuesta);

        const msgSent = await sock.sendMessage(jid, {
            image: imagen,
            caption:
                '╭━━〔 🎮 𝐀𝐇𝐎𝐑𝐂𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 💡 Responde a este mensaje\n' +
                '┃    con *una letra* para adivinar\n' +
                '┃\n' +
                '┃ ❤️ Tienes *' + VIDAS_MAX + ' vidas*\n' +
                '┃ ❌ Cada error = 1 corazón 🖤\n' +
                '┃\n' +
                '┃ 💰 Recompensa:\n' +
                '┃    Base: $' + recompensa.coinsBase + ' (' + recompensa.dificultad + ')\n' +
                '┃    +$10 por cada vida restante\n' +
                '┃\n' +
                '┃ 🛑 Para cancelar:\n' +
                '┃    `.ahorcado stop`\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });

        global.ahorcadoMsgIds[jid] = msgSent.key.id;
    }
};

export async function manejarRespuestaAhorcado(sock, msg) {
    const jid = msg.key.remoteJid;
    const juego = global.ahorcadoGames[jid];

    if (!juego) return false;

    const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const msgId = global.ahorcadoMsgIds[jid];

    if (!quotedId || quotedId !== msgId) return false;

    const texto = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();

    if (texto === 'stop' || texto === 'cancelar') {
        delete global.ahorcadoGames[jid];
        delete global.ahorcadoMsgIds[jid];
        await sock.sendMessage(jid, {
            text:
                '╭━━〔 🛑 𝐉𝐔𝐄𝐆𝐎 𝐂𝐀𝐍𝐂𝐄𝐋𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ La palabra era: *' + juego.respuesta.toUpperCase() + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
        return true;
    }

    if (texto.length !== 1 || !/[a-záéíóúüñ]/i.test(texto)) return false;

    const letra = texto;

    if (juego.letrasAdivinadas.has(letra)) {
        await sock.sendMessage(jid, {
            text: '⚠️ Ya intentaste esa letra. Prueba otra.'
        }, { quoted: msg });
        return true;
    }

    juego.letrasAdivinadas.add(letra);

    const esCorrecta = juego.respuesta.includes(letra);

    if (!esCorrecta) {
        juego.vidas--;
    }

    const letrasCorrectas = juego.respuesta.split('').filter(l => l !== ' ' && juego.letrasAdivinadas.has(l.toLowerCase()));
    const totalLetras = juego.respuesta.replace(/ /g, '').length;

    if (letrasCorrectas.length === totalLetras) {
        const recompensa = calcularRecompensa(juego.respuesta, juego.vidas);
        
        modificarDinero(juego.jugador, recompensa.total);

        const imagen = dibujarJuego(juego.pregunta, palabraOculta(juego.respuesta, juego.letrasAdivinadas), juego.vidas, Array.from(juego.letrasAdivinadas), juego.respuesta);
        delete global.ahorcadoGames[jid];
        delete global.ahorcadoMsgIds[jid];

        await sock.sendMessage(jid, {
            image: imagen,
            caption:
                '╭━━〔 🎉 𝐆𝐀𝐍𝐀𝐒𝐓𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ ¡Completaste la palabra!\n' +
                '┃\n' +
                '┃ 📝 Pregunta: ' + juego.pregunta + '\n' +
                '┃ 🔤 Respuesta: *' + juego.respuesta.toUpperCase() + '*\n' +
                '┃ ❤️ Vidas restantes: ' + juego.vidas + '/' + VIDAS_MAX + '\n' +
                '┃\n' +
                '┃ 💰 *RECOMPENSA:*\n' +
                '┃    Base: $' + recompensa.coinsBase + ' (' + recompensa.dificultad + ')\n' +
                '┃    Bonus vidas: +$' + recompensa.bonusVidas + '\n' +
                '┃    *TOTAL: +$' + recompensa.total + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
        return true;
    }

    if (juego.vidas <= 0) {
        const imagen = dibujarJuego(juego.pregunta, palabraOculta(juego.respuesta, juego.letrasAdivinadas), 0, Array.from(juego.letrasAdivinadas), juego.respuesta);
        delete global.ahorcadoGames[jid];
        delete global.ahorcadoMsgIds[jid];

        await sock.sendMessage(jid, {
            image: imagen,
            caption:
                '╭━━〔 💀 𝐏𝐄𝐑𝐃𝐈𝐒𝐓𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Se acabaron tus vidas\n' +
                '┃\n' +
                '┃ 📝 Pregunta: ' + juego.pregunta + '\n' +
                '┃ 🔤 Respuesta: *' + juego.respuesta.toUpperCase() + '*\n' +
                '┃\n' +
                '┃ 💡 Usa `.ahorcado` para jugar de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
        return true;
    }

    const imagen = dibujarJuego(juego.pregunta, palabraOculta(juego.respuesta, juego.letrasAdivinadas), juego.vidas, Array.from(juego.letrasAdivinadas), juego.respuesta);

    const estado = esCorrecta ? '✅ ¡Correcto!' : '❌ Incorrecto - Perdiste 1 ❤️';

    await sock.sendMessage(jid, {
        image: imagen,
        caption:
            '╭━━〔 🎮 𝐀𝐇𝐎𝐑𝐂𝐀𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ ' + estado + '\n' +
            '┃\n' +
            '┃ 💡 Responde con otra letra\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
    }, { quoted: msg });

    return true;
}