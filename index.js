// ============================================================
// BOT-API
// Conexión por código de emparejamiento o QR
// Sistema de bienvenida con foto de perfil
// ============================================================

import * as baileysNS from 'baileys';
import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import QRCode from 'qrcode';
import NodeCache from 'node-cache';
import readline from 'readline';

import {
    cargarComandos,
    crearManejador
} from './handler.js';

// ============================================================
// BAILEYS
// ============================================================

const baileys =
    baileysNS.default ?? baileysNS;

const makeWASocket =
    typeof baileys === 'function'
        ? baileys
        : baileys.makeWASocket;

const useMultiFileAuthState =
    baileysNS.useMultiFileAuthState ??
    baileys.useMultiFileAuthState;

const DisconnectReason =
    baileysNS.DisconnectReason ??
    baileys.DisconnectReason;

const fetchLatestBaileysVersion =
    baileysNS.fetchLatestBaileysVersion ??
    baileys.fetchLatestBaileysVersion;

const Browsers =
    baileysNS.Browsers ??
    baileys.Browsers;

const makeCacheableSignalKeyStore =
    baileysNS.makeCacheableSignalKeyStore ??
    baileys.makeCacheableSignalKeyStore;

// ============================================================
// VALIDAR BAILEYS
// ============================================================

if (typeof makeWASocket !== 'function') {
    throw new Error(
        'No se pudo cargar makeWASocket desde Baileys.'
    );
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PORT =
    Number(process.env.PORT) || 3000;

const AUTH_FOLDER =
    './auth_info';

let metodoConexion = null;
let numeroTelefono = null;
let ultimoQR = null;
let intentos = 0;
let iniciando = false;

// ============================================================
// FASTIFY
// ============================================================

const app =
    Fastify({
        logger: false
    });

// ============================================================
// RUTA PRINCIPAL
// ============================================================

app.get('/', async () => ({
    status: 'online',
    bot: 'BOT-API'
}));

// ============================================================
// RUTA QR
// ============================================================

app.get('/qr', async (req, reply) => {

    if (!ultimoQR) {

        return reply
            .type('text/html')
            .send(`
                <!doctype html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >
                    <title>BOT-API</title>
                </head>

                <body
                    style="
                        background:#0b0b12;
                        color:#fff;
                        font-family:Arial;
                        text-align:center;
                        padding:40px;
                    "
                >

                    <h2>🤖 BOT-API</h2>

                    <p>
                        No hay un QR disponible.
                    </p>

                    <p>
                        Actualiza la página en unos segundos.
                    </p>

                </body>
                </html>
            `);
    }

    try {

        const imagen =
            await QRCode.toDataURL(
                ultimoQR
            );

        return reply
            .type('text/html')
            .send(`
                <!doctype html>

                <html>

                <head>

                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >

                    <title>BOT-API QR</title>

                </head>

                <body
                    style="
                        background:
                            linear-gradient(
                                135deg,
                                #080812,
                                #15152b
                            );

                        color:#fff;

                        font-family:Arial;

                        text-align:center;

                        padding:30px;
                    "
                >

                    <h1>🤖 BOT-API</h1>

                    <h2>📱 Escanea el QR</h2>

                    <p>
                        WhatsApp →
                        Dispositivos vinculados
                    </p>

                    <img
                        src="${imagen}"
                        style="
                            width:300px;
                            max-width:90%;
                            background:#fff;
                            padding:10px;
                            border-radius:20px;
                        "
                    >

                    <p>
                        Si el QR expira,
                        actualiza la página.
                    </p>

                </body>

                </html>
            `);

    } catch (error) {

        console.error(
            'Error creando QR:',
            error?.message || error
        );

        return reply
            .type('text/html')
            .send(
                '<h2>Error generando QR.</h2>'
            );
    }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen({
    port: PORT,
    host: '0.0.0.0'
})
    .then(() => {

        console.log(
            `🌐 Servidor activo en puerto ${PORT}`
        );

    })
    .catch(error => {

        console.error(
            '❌ Error iniciando servidor:',
            error?.message || error
        );

    });

// ============================================================
// CACHE DE REINTENTOS
// ============================================================

const msgRetryCounterCache =
    new NodeCache({
        stdTTL: 3600,
        checkperiod: 600
    });

// ============================================================
// UTILIDAD
// ============================================================

const esperar =
    ms =>
        new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );

// ============================================================
// PREGUNTAR MÉTODO DE CONEXIÓN
// ============================================================

function preguntarOpcion() {

    return new Promise(resolve => {

        const rl =
            readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

        console.log(
            '\n======================================'
        );

        console.log(
            '             🤖 BOT-API'
        );

        console.log(
            '======================================\n'
        );

        console.log(
            '¿Cómo quieres conectar el bot?\n'
        );

        console.log(
            '1️⃣ Código de emparejamiento'
        );

        console.log(
            '2️⃣ Código QR\n'
        );

        rl.question(
            '👉 Escribe 1 o 2: ',
            respuesta => {

                rl.close();

                const opcion =
                    respuesta
                        .trim();

                if (
                    opcion !== '1' &&
                    opcion !== '2'
                ) {

                    console.log(
                        '❌ Opción inválida.'
                    );

                    resolve(
                        preguntarOpcion()
                    );

                    return;
                }

                resolve(opcion);
            }
        );
    });
}

// ============================================================
// PREGUNTAR NÚMERO
// ============================================================

function preguntarNumero() {

    return new Promise(resolve => {

        const rl =
            readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

        console.log(
            '\n======================================'
        );

        console.log(
            '📱 NÚMERO DE WHATSAPP'
        );

        console.log(
            '======================================\n'
        );

        console.log(
            'Escribe tu número con código de país.'
        );

        console.log(
            'Ejemplo Nicaragua: 50588888888'
        );

        console.log(
            '⚠️ Solo números, sin +, espacios ni guiones.\n'
        );

        rl.question(
            '👉 Número: ',
            numero => {

                rl.close();

                resolve(
                    numero
                        .trim()
                        .replace(/\D/g, '')
                );
            }
        );
    });
}

// ============================================================
// CONFIGURAR CONEXIÓN
// ============================================================

async function configurarConexion() {

    metodoConexion =
        await preguntarOpcion();

    if (
        metodoConexion === '1'
    ) {

        numeroTelefono =
            await preguntarNumero();

        if (
            !numeroTelefono ||
            numeroTelefono.length < 8 ||
            numeroTelefono.length > 15
        ) {

            console.log(
                '❌ Número inválido.'
            );

            return configurarConexion();
        }

        console.log(
            '\n✅ Número aceptado.'
        );

        console.log(
            '⏳ Preparando código...'
        );

    } else {

        numeroTelefono = null;

        console.log(
            '\n📱 Preparando conexión mediante QR...'
        );
    }
}

// ============================================================
// GENERAR CÓDIGO DE EMPAREJAMIENTO
// ============================================================

async function generarCodigo(sock) {

    if (
        metodoConexion !== '1' ||
        !numeroTelefono
    ) {
        return;
    }

    try {

        await esperar(3000);

        if (
            sock.authState?.creds?.registered
        ) {
            return;
        }

        console.log(
            '\n🔐 Generando código...'
        );

        const codigo =
            await sock.requestPairingCode(
                numeroTelefono
            );

        if (!codigo) {

            throw new Error(
                'Baileys no devolvió el código.'
            );
        }

        const codigoLimpio =
            String(codigo)
                .replace(
                    /[^a-zA-Z0-9]/g,
                    ''
                );

        const codigoMostrar =
            codigoLimpio
                .match(/.{1,4}/g)
                ?.join('-') ||
            codigoLimpio;

        console.log(
            '\n======================================'
        );

        console.log(
            '       🔐 CÓDIGO DE EMPAREJAMIENTO'
        );

        console.log(
            '======================================\n'
        );

        console.log(
            `             ${codigoMostrar}`
        );

        console.log(
            '\n======================================'
        );

        console.log(
            '📱 En WhatsApp:'
        );

        console.log(
            'Dispositivos vinculados'
        );

        console.log(
            '→ Vincular un dispositivo'
        );

        console.log(
            '→ Vincular con número de teléfono'
        );

        console.log(
            '\nIntroduce el código mostrado arriba.'
        );

        console.log(
            '======================================\n'
        );

    } catch (error) {

        console.error(
            '\n❌ Error generando código:',
            error?.message || error
        );
    }
}

// ============================================================
// INICIAR BOT
// ============================================================

async function iniciarBot() {

    if (iniciando) {
        return;
    }

    iniciando = true;

    try {

        console.log(
            '\n🚀 Iniciando BOT-API...'
        );

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                AUTH_FOLDER
            );

        if (
            !state.creds.registered
        ) {

            await configurarConexion();

        } else {

            metodoConexion =
                'sesion';

            console.log(
                '\n✅ Sesión existente encontrada.'
            );

            console.log(
                '🔄 Conectando automáticamente...'
            );
        }

        let version;

        try {

            const resultado =
                await fetchLatestBaileysVersion();

            version =
                resultado.version;

        } catch {

            console.warn(
                '⚠️ No se pudo obtener la versión de Baileys.'
            );
        }

        const {
            mapaComandos,
            listaComandos
        } =
            await cargarComandos();

        console.log(
            '🧩 Comandos:',
            listaComandos
                .map(
                    c => c.nombre
                )
                .join(', ')
        );

        const logger =
            pino({
                level: 'debug'
            });

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

                creds:
                    state.creds,

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

            mediaUploadTimeoutMs: 120000,

            keepAliveIntervalMs: 20000,

            emitOwnEvents: true,

            getMessage:
                async () => undefined
        };

        if (version) {

            opciones.version =
                version;
        }

        const sock =
            makeWASocket(opciones);
// ============================================================
// GUARDAR CREDENCIALES
// ============================================================

sock.ev.on(
    'creds.update',
    saveCreds
);

// ============================================================
// BIENVENIDA AL GRUPO
// ============================================================

sock.ev.on(
    'group-participants.update',
    async ({ id, participants, action }) => {

        try {

            // Solo cuando alguien entra
            if (action !== 'add') {
                return;
            }

            if (
                !Array.isArray(participants) ||
                participants.length === 0
            ) {
                return;
            }

            // ====================================================
            // INFORMACIÓN DEL GRUPO
            // ====================================================

            let metadata;

            try {

                metadata =
                    await sock.groupMetadata(id);

            } catch (error) {

                console.error(
                    '[BIENVENIDA] Error obteniendo grupo:',
                    error?.message || error
                );

                return;
            }

            const nombreGrupo =
                metadata?.subject ||
                'este grupo';

            // ====================================================
            // ====================================================
            // PROCESAR CADA PARTICIPANTE
            // ====================================================

            for (const participante of participants) {

                try {

                    // ------------------------------------------------
                    // OBTENER IDENTIFICADOR Y NÚMERO REAL
                    // ------------------------------------------------

                    const participanteJid =
                        typeof participante === 'string'
                            ? participante
                            : (
                                participante?.phoneNumber ||
                                participante?.jid ||
                                participante?.id ||
                                participante?.participant ||
                                ''
                            );

                    if (!participanteJid) {
                        console.log(
                            '[BIENVENIDA] Participante sin JID válido.'
                        );
                        continue;
                    }

                    // ------------------------------------------------
                    // NÚMERO REAL
                    // ------------------------------------------------

                    const numeroLimpio =
                        String(
                            typeof participante === 'object'
                                ? (
                                    participante?.phoneNumber ||
                                    participante?.jid ||
                                    participante?.id ||
                                    ''
                                )
                                : participante
                        )
                            .split('@')[0]
                            .split(':')[0]
                            .replace(/\D/g, '');

                    const numeroMostrar =
                        numeroLimpio
                            ? `+${numeroLimpio}`
                            : 'Usuario';

                    // ------------------------------------------------
                    // OBTENER NOMBRE REAL
                    // ------------------------------------------------

                    let nombreUsuario = '';

                    try {

                        // Buscar en metadata del grupo
                        const participanteMetadata =
                            metadata?.participants?.find(item => {

                                const itemJid =
                                    typeof item === 'string'
                                        ? item
                                        : (
                                            item?.phoneNumber ||
                                            item?.jid ||
                                            item?.id ||
                                            item?.participant ||
                                            ''
                                        );

                                const limpioItem =
                                    String(itemJid)
                                        .split('@')[0]
                                        .split(':')[0];

                                const limpioParticipante =
                                    String(participanteJid)
                                        .split('@')[0]
                                        .split(':')[0];

                                return (
                                    limpioItem === limpioParticipante
                                );
                            });

                        // Buscar contacto usando el JID real
                        const contactos = [
                            sock?.store?.contacts?.[participanteJid],
                            sock?.store?.contacts?.[participante?.id],
                            sock?.store?.contacts?.[participante?.phoneNumber]
                        ];

                        const nombres = [
                            participanteMetadata?.name,
                            participanteMetadata?.notify,
                            participanteMetadata?.verifiedName
                        ];

                        for (const contacto of contactos) {

                            if (!contacto) continue;

                            nombres.push(
                                contacto.name,
                                contacto.notify,
                                contacto.verifiedName
                            );
                        }

                        for (const nombre of nombres) {

                            if (
                                typeof nombre === 'string' &&
                                nombre.trim() &&
                                nombre.trim() !== '[object Object]' &&
                                !/^\+?\d+$/.test(nombre.trim())
                            ) {
                                nombreUsuario =
                                    nombre.trim();
                                break;
                            }
                        }

                    } catch (error) {

                        console.error(
                            '[BIENVENIDA] Error obteniendo nombre:',
                            error?.message || error
                        );
                    }

                    // ------------------------------------------------
                    // RESPALDO: NÚMERO REAL
                    // ------------------------------------------------

                    if (
                        !nombreUsuario ||
                        nombreUsuario === '[object Object]'
                    ) {
                        nombreUsuario =
                            numeroMostrar;
                    }

                    // ------------------------------------------------
                    // LIMITAR NOMBRE
                    // ------------------------------------------------

                    if (nombreUsuario.length > 35) {

                        nombreUsuario =
                            nombreUsuario.slice(0, 35) + '…';
                    }

                    // ------------------------------------------------
                    // FOTO DE PERFIL
                    // ------------------------------------------------

                    let fotoPerfil = null;

                    try {

                        fotoPerfil =
                            await sock.profilePictureUrl(
                                participanteJid,
                                'image'
                            );

                    } catch {
                        fotoPerfil = null;
                    }

                    // ------------------------------------------------
                    // MENSAJE
                    // ------------------------------------------------

                    const bienvenida =
                        `╭━━━〔 ✨ *BIENVENIDO/A* 〕━━━╮\n` +
                        `┃\n` +
                        `┃ 👤 *${nombreUsuario}*\n` +
                        `┃\n` +
                        `┃ 🎉 ¡Bienvenido/a a\n` +
                        `┃    *${nombreGrupo}*!\n` +
                        `┃\n` +
                        `┃ 🤝 Esperamos que disfrutes\n` +
                        `┃    tu estancia con nosotros.\n` +
                        `┃\n` +
                        `┃ 📜 Escribe *.menu* para\n` +
                        `┃    ver los comandos.\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                        `              🤖 *BOT-API*`;

                    // ------------------------------------------------
                    // ENVIAR CON FOTO
                    // ------------------------------------------------

                    if (fotoPerfil) {

                        try {

                            const respuesta =
                                await fetch(fotoPerfil);

                            if (respuesta.ok) {

                                const datos =
                                    await respuesta.arrayBuffer();

                                const buffer =
                                    Buffer.from(datos);

                                if (buffer.length > 0) {

                                    await sock.sendMessage(
                                        id,
                                        {
                                            image: buffer,
                                            caption: bienvenida
                                        }
                                    );

                                    continue;
                                }
                            }

                        } catch (error) {

                            console.error(
                                '[BIENVENIDA] Error descargando foto:',
                                error?.message || error
                            );
                        }
                    }

                    // ------------------------------------------------
                    // SIN FOTO
                    // ------------------------------------------------

                    await sock.sendMessage(
                        id,
                        {
                            text: bienvenida
                        }
                    );

                } catch (error) {

                    console.error(
                        '[BIENVENIDA] Error procesando usuario:',
                        error?.message || error
                    );
                }
            }

        } catch (error) {

            console.error(
                '[BIENVENIDA] Error general:',
                error?.message || error
            );
        }
    }
);

// ============================================================
// EVENTO DE CONEXIÓN
// ============================================================

sock.ev.on(
    'connection.update',
    async update => {

        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        // ====================================================
        // QR
        // ====================================================

        if (
            qr &&
            metodoConexion === '2'
        ) {

            ultimoQR = qr;

            console.log(
                '\n======================================'
            );

            console.log(
                '📱 QR GENERADO'
            );

            console.log(
                '======================================'
            );

            console.log(
                'Abre la ruta /qr de tu servidor y escanea el QR.'
            );

            console.log(
                '======================================\n'
            );
        }

        // ====================================================
        // CONECTADO
        // ====================================================

        if (
            connection === 'open'
        ) {

            intentos = 0;

            ultimoQR = null;

            console.log(
                '\n======================================'
            );

            console.log(
                '          ✅ BOT CONECTADO'
            );

            console.log(
                '======================================\n'
            );

            console.log(
                '🤖 BOT-API está funcionando.'
            );

            console.log(
                '🎉 Sistema de bienvenida: ACTIVO'
            );

            console.log(
                '🖼️ Foto de perfil: ACTIVA'
            );

            console.log(
                '\nPrueba: .ping o .menu\n'
            );
        }

        // ====================================================
        // CONEXIÓN CERRADA
        // ====================================================

        if (
            connection === 'close'
        ) {

            const codigoError =
                new Boom(
                    lastDisconnect?.error
                )?.output?.statusCode || 0;

            const registrado =
                sock.authState?.creds?.registered;

            const reconectar =
                codigoError !==
                DisconnectReason.loggedOut;

            console.log(
                '\n❌ Conexión cerrada.'
            );

            console.log(
                `Código: ${codigoError}`
            );

            console.log(
                `Sesión registrada: ${registrado}`
            );

            // ====================================================
            // LOGOUT
            // ====================================================

            if (!reconectar) {

                console.log(
                    '🔒 Sesión cerrada por logout.'
                );

                console.log(
                    'No se reconectará automáticamente.'
                );

                iniciando = false;

                return;
            }

            // ====================================================
            // RECONEXIÓN
            // ====================================================

            intentos++;

            const espera =
                Math.min(
                    5000 * intentos,
                    60000
                );

            console.log(
                `🔄 Reconectando en ${espera / 1000}s...`
            );

            setTimeout(
                () => {

                    iniciando = false;

                    iniciarBot();

                },
                espera
            );
        }
    }
);

// ============================================================
// MENSAJES
// ============================================================

sock.ev.on(
    'messages.upsert',
    crearManejador(
        sock,
        mapaComandos,
        listaComandos
    )
);

// ============================================================
// CÓDIGO DE EMPAREJAMIENTO
// ============================================================

if (
    !state.creds.registered &&
    metodoConexion === '1'
) {

    setTimeout(
        () => generarCodigo(sock),
        4000
    );
}

// ============================================================
// SOCKET PREPARADO
// ============================================================

iniciando = false;

console.log(
    '📡 Socket de WhatsApp preparado.'
);

// ============================================================
// ERROR AL INICIAR
// ============================================================

} catch (error) {

    iniciando = false;

    console.error(
        '\n❌ Error iniciando BOT-API:'
    );

    console.error(
        error?.message || error
    );

    intentos++;

    const espera =
        Math.min(
            5000 * intentos,
            60000
        );

    console.log(
        `🔄 Reintentando en ${espera / 1000}s...`
    );

    setTimeout(
        iniciarBot,
        espera
    );
}

// ============================================================
// INICIAR
// ============================================================

}

iniciarBot();
