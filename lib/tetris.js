// lib/tetris.js
// ============================================================
// TETRIS — motor del juego
// ============================================================
// Como no se puede hacer que las piezas caigan solas en tiempo
// real dentro de un chat (spamearía una imagen por segundo), el
// ritmo lo marca el jugador: cada movimiento que mandas también
// hace bajar la pieza un poco — tú decides qué tan rápido va.
//
// Solo la persona que inició la partida puede moverla (evita
// que cualquiera en el grupo interfiera). Los comandos son
// palabras completas exactas (sin el punto del bot), para no
// confundirse con conversación normal del chat.
// ============================================================

import sharp from 'sharp';

const FILAS = 16;
const COLUMNAS = 8;
const TIEMPO_LIMITE_INACTIVIDAD_MS = 5 * 60 * 1000; // 5 min sin jugar -> se cierra sola

// chatJid -> { jugador, tablero, pieza, siguiente, puntuacion,
//              lineas, terminado, timeoutId, messageKeyUltimo }
const partidasActivas = new Map();

// ============================================================
// PIEZAS (formas + color)
// ============================================================
const PIEZAS = {
    I: { color: '#22d3ee', estados: [
        [[1, 0], [1, 1], [1, 2], [1, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]]
    ] },
    O: { color: '#eab308', estados: [
        [[0, 0], [0, 1], [1, 0], [1, 1]]
    ] },
    T: { color: '#a855f7', estados: [
        [[0, 1], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 1]],
        [[0, 1], [1, 0], [1, 1], [2, 1]]
    ] },
    S: { color: '#22c55e', estados: [
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 1], [1, 1], [1, 2], [2, 2]]
    ] },
    Z: { color: '#ef4444', estados: [
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 2], [1, 1], [1, 2], [2, 1]]
    ] },
    J: { color: '#3b82f6', estados: [
        [[0, 0], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 0], [2, 1]]
    ] },
    L: { color: '#f97316', estados: [
        [[0, 2], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [1, 2], [2, 0]],
        [[0, 0], [0, 1], [1, 1], [2, 1]]
    ] }
};

const TIPOS = Object.keys(PIEZAS);

// ============================================================
// UTILIDADES DE JUEGO
// ============================================================
function piezaAleatoria() {
    const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
    return { tipo, rotacion: 0, fila: 0, columna: 2 };
}

function celdasDe(pieza) {
    const estados = PIEZAS[pieza.tipo].estados;
    const forma = estados[pieza.rotacion % estados.length];
    return forma.map(([r, c]) => [r + pieza.fila, c + pieza.columna]);
}

function tableroVacio() {
    return Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
}

function hayColision(tablero, pieza) {
    for (const [fila, columna] of celdasDe(pieza)) {
        if (columna < 0 || columna >= COLUMNAS) return true;
        if (fila >= FILAS) return true;
        if (fila >= 0 && tablero[fila][columna]) return true;
    }
    return false;
}

function fijarPieza(juego) {
    const color = PIEZAS[juego.pieza.tipo].color;
    for (const [fila, columna] of celdasDe(juego.pieza)) {
        if (fila >= 0 && fila < FILAS && columna >= 0 && columna < COLUMNAS) {
            juego.tablero[fila][columna] = color;
        }
    }
}

function limpiarLineas(juego) {
    let lineasLimpiadas = 0;

    juego.tablero = juego.tablero.filter(fila => {
        const llena = fila.every(celda => celda !== null);
        if (llena) lineasLimpiadas++;
        return !llena;
    });

    while (juego.tablero.length < FILAS) {
        juego.tablero.unshift(Array(COLUMNAS).fill(null));
    }

    if (lineasLimpiadas > 0) {
        const puntosPorLineas = [0, 100, 300, 500, 800];
        juego.puntuacion += puntosPorLineas[lineasLimpiadas] || lineasLimpiadas * 200;
        juego.lineas += lineasLimpiadas;
    }

    return lineasLimpiadas;
}

function spawnearNuevaPieza(juego) {
    juego.pieza = juego.siguiente;
    juego.siguiente = piezaAleatoria();

    if (hayColision(juego.tablero, juego.pieza)) {
        juego.terminado = true;
    }
}

// Intenta mover la pieza actual un paso hacia abajo. Si no puede
// (llegó al fondo o topó con algo), la fija, limpia líneas y
// saca la siguiente pieza. Devuelve info de lo que pasó.
function gravedadUnPaso(juego) {
    const intento = { ...juego.pieza, fila: juego.pieza.fila + 1 };

    if (!hayColision(juego.tablero, intento)) {
        juego.pieza = intento;
        return { bajo: true, fijada: false, lineas: 0 };
    }

    fijarPieza(juego);
    const lineas = limpiarLineas(juego);
    spawnearNuevaPieza(juego);
    return { bajo: false, fijada: true, lineas };
}

// ============================================================
// API PÚBLICA — CREAR / CANCELAR
// ============================================================
export function hayPartidaActiva(chatJid) {
    return partidasActivas.has(chatJid);
}

function limpiarPartida(chatJid) {
    const juego = partidasActivas.get(chatJid);
    if (juego?.timeoutId) clearTimeout(juego.timeoutId);
    partidasActivas.delete(chatJid);
}

export function cancelarPartida(chatJid) {
    const existia = partidasActivas.has(chatJid);
    limpiarPartida(chatJid);
    return existia;
}

function reiniciarInactividad(chatJid) {
    const juego = partidasActivas.get(chatJid);
    if (!juego) return;
    if (juego.timeoutId) clearTimeout(juego.timeoutId);
    juego.timeoutId = setTimeout(() => {
        partidasActivas.delete(chatJid);
    }, TIEMPO_LIMITE_INACTIVIDAD_MS);
}

export async function crearPartida(sock, chatJid, msg, jugador) {
    const juego = {
        jugador,
        tablero: tableroVacio(),
        pieza: piezaAleatoria(),
        siguiente: piezaAleatoria(),
        puntuacion: 0,
        lineas: 0,
        terminado: false,
        timeoutId: null
    };

    partidasActivas.set(chatJid, juego);
    reiniciarInactividad(chatJid);

    const buffer = await generarImagenTablero(juego);

    await sock.sendMessage(
        chatJid,
        {
            image: buffer,
            caption:
                '🧱 *TETRIS*\n\n' +
                '📌 Manda (sin el punto del bot):\n' +
                '› *izq* / *der* — mover\n' +
                '› *rot* — rotar\n' +
                '› *baj* — bajar más rápido\n' +
                '› *caer* — caída instantánea\n\n' +
                '⏱️ Cada movimiento hace bajar la pieza un poco — tú marcas el ritmo.'
        },
        { quoted: msg }
    );
}

// ============================================================
// PROCESAR UN MENSAJE ENTRANTE
// ============================================================
const COMANDOS = {
    izquierda: 'izq', izq: 'izq',
    derecha: 'der', der: 'der',
    rotar: 'rot', rot: 'rot',
    bajar: 'baj', baj: 'baj',
    caer: 'caer'
};

export async function manejarMensajeTetris(sock, msg) {
    const chatJid = msg.key.remoteJid;
    if (!chatJid) return false;

    const juego = partidasActivas.get(chatJid);
    if (!juego || juego.terminado) return false;

    const remitente = msg.key.participant || msg.key.remoteJid;
    if (remitente !== juego.jugador) return false;

    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''
    ).trim().toLowerCase();

    const accion = COMANDOS[texto];
    if (!accion) return false;

    reiniciarInactividad(chatJid);

    let lineasEsteTurno = 0;

    if (accion === 'izq' || accion === 'der') {
        const delta = accion === 'izq' ? -1 : 1;
        const intento = { ...juego.pieza, columna: juego.pieza.columna + delta };
        if (!hayColision(juego.tablero, intento)) juego.pieza = intento;
        const resultado = gravedadUnPaso(juego);
        lineasEsteTurno = resultado.lineas;

    } else if (accion === 'rot') {
        const estados = PIEZAS[juego.pieza.tipo].estados;
        const intento = { ...juego.pieza, rotacion: (juego.pieza.rotacion + 1) % estados.length };
        if (!hayColision(juego.tablero, intento)) juego.pieza = intento;
        const resultado = gravedadUnPaso(juego);
        lineasEsteTurno = resultado.lineas;

    } else if (accion === 'baj') {
        gravedadUnPaso(juego);
        const resultado = gravedadUnPaso(juego);
        lineasEsteTurno = resultado.lineas;

    } else if (accion === 'caer') {
        let seguirBajando = true;
        while (seguirBajando && !juego.terminado) {
            const resultado = gravedadUnPaso(juego);
            lineasEsteTurno += resultado.lineas;
            if (resultado.fijada) seguirBajando = false;
        }
    }

    if (juego.terminado) {
        const buffer = await generarImagenTablero(juego);
        limpiarPartida(chatJid);

        await sock.sendMessage(chatJid, {
            image: buffer,
            caption:
                '💥 *GAME OVER*\n\n' +
                `🏆 Puntuación final: ${juego.puntuacion}\n` +
                `📊 Líneas completadas: ${juego.lineas}\n\n` +
                'Manda *.tetris* para jugar otra vez.'
        }, { quoted: msg });

        return true;
    }

    const buffer = await generarImagenTablero(juego);
    const pieDePagina = lineasEsteTurno > 0 ? `\n\n🎉 ¡${lineasEsteTurno} línea(s) completada(s)!` : '';

    await sock.sendMessage(chatJid, {
        image: buffer,
        caption: `🧱 Puntos: ${juego.puntuacion} · Líneas: ${juego.lineas}${pieDePagina}`
    }, { quoted: msg });

    return true;
}

// ============================================================
// RENDER (SVG -> PNG con sharp)
// ============================================================
async function generarImagenTablero(juego) {
    const celda = 32;
    const anchoTablero = COLUMNAS * celda;
    const altoTablero = FILAS * celda;
    const margenX = 40;
    const margenTop = 90;
    const ancho = anchoTablero + margenX * 2;
    const alto = altoTablero + margenTop + 40;

    // Tablero + pieza actual combinados en una sola matriz para dibujar
    const vista = juego.tablero.map(fila => [...fila]);
    if (!juego.terminado) {
        const color = PIEZAS[juego.pieza.tipo].color;
        for (const [fila, columna] of celdasDe(juego.pieza)) {
            if (fila >= 0 && fila < FILAS && columna >= 0 && columna < COLUMNAS) {
                vista[fila][columna] = color;
            }
        }
    }

    let celdas = '';
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            const x = margenX + c * celda;
            const y = margenTop + f * celda;
            const relleno = vista[f][c] || '#111827';
            const borde = vista[f][c] ? '#000000' : '#1f2937';
            celdas += `<rect x="${x}" y="${y}" width="${celda - 2}" height="${celda - 2}" rx="4" fill="${relleno}" stroke="${borde}" stroke-width="1.5" />`;
        }
    }

    const siguienteColor = juego.siguiente ? PIEZAS[juego.siguiente.tipo].color : '#374151';

    return sharp(Buffer.from(`
<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${ancho}" height="${alto}" fill="#050709" />
  <rect x="10" y="10" width="${ancho - 20}" height="${alto - 20}" rx="18" fill="#0d1420" stroke="#374151" stroke-width="2" />

  <text x="${margenX}" y="42" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" font-weight="bold">🧱 TETRIS</text>
  <text x="${ancho - margenX}" y="42" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">Sig:</text>
  <rect x="${ancho - margenX - 26}" y="24" width="20" height="20" rx="4" fill="${siguienteColor}" />

  <text x="${margenX}" y="68" font-family="Arial, sans-serif" font-size="15" fill="#22d3ee">Puntos: ${juego.puntuacion}</text>
  <text x="${ancho - margenX}" y="68" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#22d3ee">Líneas: ${juego.lineas}</text>

  ${celdas}
</svg>`))
        .png()
        .toBuffer();
}
