// commands/gacha/rw.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    registrarRW,
    puedeUsarRW,
    tiempoRestanteRW,
    obtenerUsuario,
    guardarUsuario
} from '../../database/economia.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RW_DIR = path.join(__dirname, '../../media/gacha');
const GACHA_DATABASE = path.join(__dirname, '../../database/gacha.json');

// ============================================================
// OBTENER IMÁGENES
// ============================================================

function obtenerImagenes() {
    if (!fs.existsSync(RW_DIR)) {
        throw new Error('No existe la carpeta de imágenes.');
    }
    const archivos = fs
        .readdirSync(RW_DIR)
        .filter(archivo => /\.(jpg|jpeg)$/i.test(archivo));
    if (archivos.length === 0) {
        throw new Error('No hay imágenes disponibles.');
    }
    return archivos;
}

// ============================================================
// ELEGIR IMAGEN ALEATORIA
// ============================================================

function elegirImagen() {
    const imagenes = obtenerImagenes();
    const nombre = imagenes[Math.floor(Math.random() * imagenes.length)];
    return {
        nombre,
        ruta: path.join(RW_DIR, nombre),
        total: imagenes.length
    };
}

// ============================================================
// CARGAR DATOS DEL GACHA
// ============================================================

function cargarDatosGacha() {
    if (!fs.existsSync(GACHA_DATABASE)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(GACHA_DATABASE, 'utf8'));
    } catch (error) {
        console.error('[RW] Error leyendo gacha.json:', error);
        return {};
    }
}

// ============================================================
// CONVERTIR NOMBRE DEL ARCHIVO
// ============================================================

function nombreDesdeArchivo(archivo) {
    return path
        .basename(archivo, path.extname(archivo))
        .replace(/^gacha_\d+_/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
        .toUpperCase();
}

// ============================================================
// OBTENER INFORMACIÓN DE LA CARTA (CON VALOR SEGURO)
// ============================================================

function obtenerDatosCarta(archivo) {
    const datos = cargarDatosGacha();
    const carta = datos[archivo];
    if (carta) {
        return {
            nombre: carta.nombre || nombreDesdeArchivo(archivo),
            genero: carta.genero || 'Desconocido',
            serie: carta.serie || 'Desconocida',
            // 🔥 VALOR SEGURO: si es 0 o no existe, le ponemos un valor aleatorio entre 1 y 100
            valor: (carta.valor && carta.valor > 0) ? carta.valor : Math.floor(Math.random() * 100) + 1
        };
    }
    return {
        nombre: nombreDesdeArchivo(archivo),
        genero: 'Desconocido',
        serie: 'Desconocida',
        valor: Math.floor(Math.random() * 100) + 1
    };
}

// ============================================================
// FORMATEAR VALOR
// ============================================================

function formatearValor(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        return '¥0';
    }
    return '¥' + numero.toLocaleString('en-US');
}

// ============================================================
// FORMATEAR TIEMPO
// ============================================================

function formatearTiempo(milisegundos) {
    const totalSegundos = Math.ceil(milisegundos / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    const partes = [];
    if (horas > 0) {
        partes.push(`${horas} hora${horas !== 1 ? 's' : ''}`);
    }
    if (minutos > 0) {
        partes.push(`${minutos} minuto${minutos !== 1 ? 's' : ''}`);
    }
    if (segundos > 0 && horas === 0) {
        partes.push(`${segundos} segundo${segundos !== 1 ? 's' : ''}`);
    }
    return partes.join(' y ');
}

// ============================================================
// CREAR MENSAJE
// ============================================================

function crearMensaje(carta) {
    return (
`╭〔 ✨ 𝐆𝐀𝐂𝐇𝐀 〕⬣
┃
┃ 👤 𝐍𝐎𝐌𝐁𝐑𝐄 › ${carta.nombre}
┃
┃ ⚥ 𝐆É𝐍𝐄𝐑𝐎 › ${carta.genero}
┃ 📖 𝐒𝐄𝐑𝐈𝐄 › ${carta.serie}
┃ 💴 𝐕𝐀𝐋𝐎𝐑 › ${formatearValor(carta.valor)}
┃
╰━━━━━━━━━━━━━━━━⬣

> 🔒 Solo tú puedes reclamarlo, responde con *.claim*

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
    );
}

// ============================================================
// COMANDO RW
// ============================================================

export default {
    nombre: 'rw',
    categoria: 'Diversión',
    alias: ['recompensa'],
    descripcion: 'Obtiene una recompensa aleatoria cada 4 horas.',
    ejecutar: async ({ msg, responder, sock }) => {
        const id = msg.key.participant || msg.key.remoteJid;
        try {
            // ------------------------------------------------
            // COMPROBAR COOLDOWN
            // ------------------------------------------------
            if (!puedeUsarRW(id)) {
                const restante = tiempoRestanteRW(id);
                await responder.texto(
                    `⏳ *RECOMPENSA EN COOLDOWN*\n\n` +
                    `Ya utilizaste tu recompensa aleatoria.\n\n` +
                    `🎁 Podrás volver a usar *.rw* en:\n` +
                    `⏱️ *${formatearTiempo(restante)}*\n\n` +
                    `🍀 ¡Vuelve cuando esté disponible!`
                );
                return;
            }

            // ============================================================
            // 🔥 SISTEMA DE PROGRESO EN VIVO (ESTILO BOT-API)
            // ============================================================

            const mensajeInicial = `
╭〔 🎲 𝐆𝐀𝐂𝐇𝐀 〕⬣
┃
┃ 📦 GENERANDO RECOMPENSA
┃
┃ ⏳ Buscando en la base de datos...
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            const sentMsg = await sock.sendMessage(msg.key.remoteJid, {
                text: mensajeInicial
            }, { quoted: msg });

            const messageId = sentMsg.key.id;

            const pasos = ['🔍 Analizando imágenes...', '📦 Seleccionando carta...', '✨ Preparando premio...'];

            for (let i = 0; i < pasos.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 1200));

                const porcentaje = Math.round(((i + 1) / pasos.length) * 100);
                const barra = '▰'.repeat(Math.round(porcentaje / 10)) + '▱'.repeat(10 - Math.round(porcentaje / 10));

                const textoProgreso = `
╭〔 🎲 𝐆𝐀𝐂𝐇𝐀 〕⬣
┃
┃ 📦 GENERANDO RECOMPENSA
┃
┃ ⏳ Progreso: [${barra}] ${porcentaje}%
┃
┃ ${pasos[i]}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoProgreso,
                    edit: {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            fromMe: true,
                            id: messageId
                        }
                    }
                });
            }

            // ============================================================
            // 🎁 LÓGICA ORIGINAL DEL RW
            // ============================================================

            const imagen = elegirImagen();
            const carta = obtenerDatosCarta(imagen.nombre);
            const buffer = fs.readFileSync(imagen.ruta);

            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                throw new Error('La imagen seleccionada no es válida.');
            }

            const mensaje = crearMensaje(carta);

            // ------------------------------------------------
            // ENVIAR IMAGEN
            // ------------------------------------------------
            await responder.imagen(buffer, mensaje);

            // ------------------------------------------------
            // GUARDAR CARTA PENDIENTE
            // ------------------------------------------------
            const usuario = obtenerUsuario(id);
            usuario.cartaPendiente = {
                nombre: carta.nombre,
                genero: carta.genero,
                serie: carta.serie,
                valor: Number(carta.valor || 0)
            };
            guardarUsuario(id, usuario);

            console.log(`[COMANDO rw] ✓ Carta pendiente guardada para ${id}`);

            // ------------------------------------------------
            // REGISTRAR USO
            // ------------------------------------------------
            registrarRW(id);

            console.log(`[COMANDO rw] ✓ Carta enviada: ${carta.nombre}`);
            console.log(`[COMANDO rw] Serie: ${carta.serie}`);
            console.log(`[COMANDO rw] Valor: ${formatearValor(carta.valor)}`);

        } catch (error) {
            console.error('[COMANDO rw] Error:', error);
            try {
                await responder.texto(
                    `⚠️ *RW*\n\n` +
                    `No se pudo enviar la recompensa en este momento.\n\n` +
                    `🍀 Inténtalo nuevamente más tarde.`
                );
            } catch (errorTexto) {
                console.error('[COMANDO rw] Error enviando aviso:', errorTexto);
            }
        }
    }
};