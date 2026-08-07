// ============================================================
// ALEX WHATSAPP BOT
// index.js
// Conexión mediante código de emparejamiento o QR
// ============================================================

import * as baileysNS from 'baileys';

const baileysDefault = baileysNS.default ?? baileysNS;

const makeWASocket =
    typeof baileysDefault === 'function'
        ? baileysDefault
        : baileysDefault.makeWASocket;

const useMultiFileAuthState =
    baileysNS.useMultiFileAuthState ??
    baileysDefault.useMultiFileAuthState;

const DisconnectReason =
    baileysNS.DisconnectReason ??
    baileysDefault.DisconnectReason;

const fetchLatestBaileysVersion =
    baileysNS.fetchLatestBaileysVersion ??
    baileysDefault.fetchLatestBaileysVersion;

const Browsers =
    baileysNS.Browsers ??
    baileysDefault.Browsers;

const makeCacheableSignalKeyStore =
    baileysNS.makeCacheableSignalKeyStore ??
    baileysDefault.makeCacheableSignalKeyStore;

import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import fs from 'fs';
import QRCode from 'qrcode';
import NodeCache from 'node-cache';
import readline from 'readline';

import {
    cargarComandos,
    crearManejador
} from './handler.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PORT = Number(process.env.PORT) || 3000;

const AUTH_FOLDER = './auth_info';

const MAX_ESPERA_RECONEXION = 60000;

// ============================================================
// VARIABLES
// ============================================================

let ultimoQR = null;

let intentosReconexion = 0;

let botIniciando = false;

let metodoConexion = null;

let numeroSeleccionado = null;

let esperandoConfiguracion = false;

// ============================================================
// FASTIFY
// ============================================================

const fastify = Fastify({
    logger: false
});

// ============================================================
// RUTA PRINCIPAL
// ============================================================

fastify.get('/', async () => {

    return {
        status: 'online',
        bot: 'Alex WhatsApp Bot',
        conexion:
            ultimoQR
                ? 'esperando_qr'
                : 'activo'
    };
});

// ============================================================
// RUTA QR
// ============================================================

fastify.get('/qr', async (req, reply) => {

    if (!ultimoQR) {

        reply
            .type('text/html')
            .send(`
                <!DOCTYPE html>
                <html lang="es">

                <head>
                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width,
                        initial-scale=1.0"
                    >

                    <title>Alex Bot</title>
                </head>

                <body style="
                    margin:0;
                    padding:40px;
                    background:#111;
                    color:#fff;
                    font-family:Arial,sans-serif;
                    text-align:center;
                ">

                    <h2>🤖 Alex WhatsApp Bot</h2>

                    <p>
                        Actualmente no hay un QR disponible.
                    </p>

                    <p>
                        Si acabas de seleccionar QR,
                        espera unos segundos y actualiza.
                    </p>

                </body>

                </html>
            `);

        return;
    }

    try {

        const imagenQR =
            await QRCode.toDataURL(ultimoQR);

        reply
            .type('text/html')
            .send(`
                <!DOCTYPE html>

                <html lang="es">

                <head>

                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width,
                        initial-scale=1.0"
                    >

                    <title>Alex Bot - QR</title>

                </head>

                <body style="
                    margin:0;
                    min-height:100vh;
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    background:#111;
                    color:white;
                    font-family:Arial,sans-serif;
                    text-align:center;
                ">

                    <div>

                        <h1>
                            🤖 Alex Bot
                        </h1>

                        <h2>
                            📱 Escanea este QR
                        </h2>

                        <p>
                            WhatsApp → Dispositivos vinculados
                        </p>

                        <p>
                            → Vincular un dispositivo
                        </p>

                        <img
                            src="${imagenQR}"
                            alt="Código QR"
                            style="
                                width:300px;
                                max-width:90vw;
                                background:#fff;
                                padding:12px;
                                border-radius:15px;
                            "
                        >

                        <p>
                            <small>
                                Si expira, actualiza la página.
                            </small>
                        </p>

                    </div>

                </body>

                </html>
            `);

    } catch (error) {

        console.error(
            '❌ Error generando QR:',
            error.message
        );

        reply
            .type('text/html')
            .send(
                '<h2>Error generando el QR.</h2>'
            );
    }
});

// ============================================================
// SERVIDOR
// ============================================================

fastify.listen({
    port: PORT,
    host: '0.0.0.0'
})
.then(() => {

    console.log(
        `🌐 Servidor iniciado en puerto ${PORT}`
    );

})
.catch(error => {

    console.error(
        '❌ Error iniciando servidor:',
        error
    );

    process.exit(1);
});

// ============================================================
// CACHE
// ============================================================

const msgRetryCounterCache =
    new NodeCache({
        stdTTL: 3600,
        checkperiod: 600
    });

// ============================================================
// FUNCIONES
// ============================================================

function esperar(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// ============================================================
// PREGUNTAR MÉTODO DE CONEXIÓN
// ============================================================

function preguntarMetodoConexion() {

    return new Promise(resolve => {

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('');
        console.log(
            '=========================================='
        );
        console.log(
            '        🤖 ALEX WHATSAPP BOT'
        );
        console.log(
            '=========================================='
        );
        console.log('');
        console.log(
            '¿Cómo quieres conectar el bot?'
        );
        console.log('');
        console.log(
            '1️⃣  Código de emparejamiento'
        );
        console.log(
            '2️⃣  Código QR'
        );
        console.log('');

        rl.question(
            '👉 Escribe 1 o 2: ',
            respuesta => {

                rl.close();

                const opcion =
                    respuesta.trim();

                if (
                    opcion !== '1' &&
                    opcion !== '2'
                ) {

                    console.log('');
                    console.log(
                        '❌ Opción inválida.'
                    );

                    console.log(
                        'Debes escribir 1 o 2.'
                    );

                    console.log('');

                    resolve(
                        preguntarMetodoConexion()
                    );

                    return;
                }

                resolve(opcion);
            }
        );
    });
}

// ============================================================
// PEDIR NÚMERO
// ============================================================

function preguntarNumero() {

    return new Promise(resolve => {

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('');
        console.log(
            '=========================================='
        );

        console.log(
            '📱 NÚMERO DE WHATSAPP'
        );

        console.log(
            '=========================================='
        );

        console.log('');

        console.log(
            'Escribe tu número con código de país.'
        );

        console.log('');

        console.log(
            'Ejemplo Nicaragua:'
        );

        console.log(
            '50588888888'
        );

        console.log('');

        console.log(
            '⚠️ No utilices +, espacios ni guiones.'
        );

        console.log('');

        rl.question(
            '👉 Número: ',
            numero => {

                rl.close();

                const limpio =
                    numero
                        .trim()
                        .replace(/\D/g, '');

                resolve(limpio);
            }
        );
    });
}

// ============================================================
// VALIDAR NÚMERO
// ============================================================

function numeroValido(numero) {

    if (!numero) {
        return false;
    }

    if (!/^\d+$/.test(numero)) {
        return false;
    }

    if (numero.length < 8) {
        return false;
    }

    if (numero.length > 15) {
        return false;
    }

    return true;
}

// ============================================================
// CONFIGURAR MÉTODO
// ============================================================

async function configurarConexion() {

    if (esperandoConfiguracion) {
        return;
    }

    esperandoConfiguracion = true;

    try {

        metodoConexion =
            await preguntarMetodoConexion();

        // ----------------------------------------------------
        // OPCIÓN 1
        // ----------------------------------------------------

        if (metodoConexion === '1') {

            console.log('');

            numeroSeleccionado =
                await preguntarNumero();

            if (
                !numeroValido(
                    numeroSeleccionado
                )
            ) {

                console.log('');
                console.log(
                    '❌ Número inválido.'
                );

                console.log(
                    'Ejemplo: 50588888888'
                );

                console.log('');

                esperandoConfiguracion = false;

                return configurarConexion();
            }

            console.log('');

            console.log(
                '✅ Número recibido correctamente.'
            );

            console.log(
                `📱 Número: ${numeroSeleccionado}`
            );

            console.log('');

            console.log(
                '⏳ Preparando conexión...'
            );
        }

        // ----------------------------------------------------
        // OPCIÓN 2
        // ----------------------------------------------------

        if (metodoConexion === '2') {

            console.log('');

            console.log(
                '📱 Has seleccionado QR.'
            );

            console.log('');

            console.log(
                '⏳ Preparando código QR...'
            );

            console.log('');

            numeroSeleccionado = null;
        }

    } finally {

        esperandoConfiguracion = false;
    }
}

// ============================================================
// GENERAR CÓDIGO
// ============================================================

async function generarCodigo(sock) {

    if (metodoConexion !== '1') {
        return;
    }

    if (!numeroSeleccionado) {
        return;
    }

    if (sock.authState.creds.registered) {
        return;
    }

    try {

        console.log('');
        console.log(
            '⏳ Esperando conexión de WhatsApp...'
        );

        await esperar(3000);

        if (sock.authState.creds.registered) {
            return;
        }

        console.log('');
        console.log(
            '🔐 Generando código...'
        );

        const codigo =
            await sock.requestPairingCode(
                numeroSeleccionado
            );

        if (!codigo) {

            throw new Error(
                'No se recibió ningún código.'
            );
        }

        const codigoLimpio =
            String(codigo)
                .replace(/[^a-zA-Z0-9]/g, '');

        /*
         * Baileys devuelve el código que WhatsApp
         * debe recibir. Aquí solamente añadimos
         * un guion visual cada 4 caracteres.
         */
        const codigoFormateado =
            codigoLimpio
                .match(/.{1,4}/g)
                ?.join('-') ||
            codigoLimpio;

        console.log('');

        console.log(
            '=========================================='
        );

        console.log(
            '       🔐 CÓDIGO DE EMPAREJAMIENTO'
        );

        console.log(
            '=========================================='
        );

        console.log('');

        console.log(
            `          ${codigoFormateado}`
        );

        console.log('');

        console.log(
            '=========================================='
        );

        console.log(
            '📱 AHORA EN WHATSAPP'
        );

        console.log('');

        console.log(
            '1. Ajustes'
        );

        console.log(
            '2. Dispositivos vinculados'
        );

        console.log(
            '3. Vincular un dispositivo'
        );

        console.log(
            '4. Vincular con número de teléfono'
        );

        console.log('');

        console.log(
            '⚠️ Introduce el código mostrado arriba.'
        );

        console.log(
            '=========================================='
        );

        console.log('');

    } catch (error) {

        console.error('');

        console.error(
            '❌ No se pudo generar el código.'
        );

        console.error(
            error?.message || error
        );

        console.error('');
    }
}

// ============================================================
// INICIAR BOT
// ============================================================

async function iniciarBot() {

    if (botIniciando) {
        return;
    }

    botIniciando = true;

    try {

        console.log('');
        console.log(
            '🚀 Iniciando Alex WhatsApp Bot...'
        );

        // ----------------------------------------------------
        // AUTENTICACIÓN
        // ----------------------------------------------------

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                AUTH_FOLDER
            );

        // ----------------------------------------------------
        // SI YA ESTÁ VINCULADO
        // ----------------------------------------------------

        if (state.creds.registered) {

            console.log('');
            console.log(
                '✅ Ya existe una sesión vinculada.'
            );

            console.log(
                '🔄 Iniciando sesión automáticamente...'
            );

            metodoConexion = 'sesion';
        }

        // ----------------------------------------------------
        // SI NO ESTÁ VINCULADO
        // ----------------------------------------------------

        if (!state.creds.registered) {

            await configurarConexion();
        }

        // ----------------------------------------------------
        // VERSIÓN BAILEYS
        // ----------------------------------------------------

        let version;

        try {

            const resultado =
                await fetchLatestBaileysVersion();

            version =
                resultado.version;

            console.log(
                `📦 WhatsApp version: ${version.join('.')}`
            );

        } catch (error) {

            console.warn(
                '⚠️ No se pudo obtener la versión de WhatsApp.'
            );
        }

        // ----------------------------------------------------
        // COMANDOS
        // ----------------------------------------------------

        const {
            mapaComandos,
            listaComandos
        } =
            await cargarComandos();

        console.log(
            '🧩 Comandos cargados:',
            listaComandos
                .map(c => c.nombre)
                .join(', ')
        );

        // ----------------------------------------------------
        // LOGGER
        // ----------------------------------------------------

        const logger =
            pino({
                level: 'silent'
            });

        // ----------------------------------------------------
        // CONFIGURACIÓN SOCKET
        // ----------------------------------------------------

        const opciones = {

            logger,

            printQRInTerminal: false,

            mobile: false,

            browser:
                Browsers
                    ? Browsers.macOS('Chrome')
                    : [
                        'Chrome',
                        'Chrome',
                        '121.0.0.0'
                    ],

            auth: {

                creds: state.creds,

                keys:
                    makeCacheableSignalKeyStore
                        ? makeCacheableSignalKeyStore(
                            state.keys,
                            logger
                        )
                        : state.keys
            },

            markOnlineOnConnect: true,

            syncFullHistory: false,

            msgRetryCounterCache,

            connectTimeoutMs: 60000,

            defaultQueryTimeoutMs: 30000,

            keepAliveIntervalMs: 20000,

            emitOwnEvents: true,

            getMessage:
                async () => undefined
        };

        if (version) {
            opciones.version =
                version;
        }

        // ----------------------------------------------------
        // CREAR SOCKET
        // ----------------------------------------------------

        const sock =
            makeWASocket(opciones);

        // ----------------------------------------------------
        // GUARDAR CREDENCIALES
        // ----------------------------------------------------

        sock.ev.on(
            'creds.update',
            saveCreds
        );

        // ----------------------------------------------------
        // EVENTOS DE CONEXIÓN
        // ----------------------------------------------------

        sock.ev.on(
            'connection.update',
            async update => {

                const {
                    connection,
                    lastDisconnect,
                  