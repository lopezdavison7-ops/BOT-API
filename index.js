// ============================================================
// ALEX WHATSAPP BOT
// Conexión por código de emparejamiento o QR
// ============================================================

import * as baileysNS from 'baileys';
import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import QRCode from 'qrcode';
import NodeCache from 'node-cache';
import readline from 'readline';

import { cargarComandos, crearManejador } from './handler.js';

const baileys = baileysNS.default ?? baileysNS;

const makeWASocket =
    typeof baileys === 'function' ? baileys : baileys.makeWASocket;

const useMultiFileAuthState =
    baileysNS.useMultiFileAuthState ?? baileys.useMultiFileAuthState;

const DisconnectReason =
    baileysNS.DisconnectReason ?? baileys.DisconnectReason;

const fetchLatestBaileysVersion =
    baileysNS.fetchLatestBaileysVersion ?? baileys.fetchLatestBaileysVersion;

const Browsers =
    baileysNS.Browsers ?? baileys.Browsers;

const makeCacheableSignalKeyStore =
    baileysNS.makeCacheableSignalKeyStore ??
    baileys.makeCacheableSignalKeyStore;

if (typeof makeWASocket !== 'function') {
    throw new Error('No se pudo cargar makeWASocket desde Baileys.');
}

const PORT = Number(process.env.PORT) || 3000;
const AUTH_FOLDER = './auth_info';

let metodoConexion = null;
let numeroTelefono = null;
let ultimoQR = null;
let intentos = 0;
let iniciando = false;

const app = Fastify({ logger: false });

app.get('/', async () => ({
    status: 'online',
    bot: 'Alex WhatsApp Bot'
}));

app.get('/qr', async (req, reply) => {
    if (!ultimoQR) {
        return reply.type('text/html').send(`
            <!doctype html>
            <html>
            <body style="background:#111;color:#fff;font-family:Arial;text-align:center;padding:40px">
                <h2>🤖 Alex Bot</h2>
                <p>No hay un QR disponible.</p>
                <p>Actualiza la página en unos segundos.</p>
            </body>
            </html>
        `);
    }

    try {
        const imagen = await QRCode.toDataURL(ultimoQR);

        return reply.type('text/html').send(`
            <!doctype html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Alex Bot QR</title>
            </head>
            <body style="background:#111;color:#fff;font-family:Arial;text-align:center;padding:30px">
                <h1>🤖 Alex Bot</h1>
                <h2>📱 Escanea el QR</h2>
                <p>WhatsApp → Dispositivos vinculados</p>
                <img src="${imagen}" style="width:300px;max-width:90%;background:#fff;padding:10px;border-radius:15px">
                <p>Si expira, actualiza la página.</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error creando QR:', error.message);
        return reply.type('text/html').send('<h2>Error generando QR.</h2>');
    }
});

app.listen({ port: PORT, host: '0.0.0.0' })
    .then(() => console.log(`🌐 Servidor activo en puerto ${PORT}`))
    .catch(error => console.error('❌ Error iniciando servidor:', error.message));

const msgRetryCounterCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 600
});

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

function preguntarOpcion() {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\n======================================');
        console.log('        🤖 ALEX WHATSAPP BOT');
        console.log('======================================\n');
        console.log('¿Cómo quieres conectar el bot?\n');
        console.log('1️⃣ Código de emparejamiento');
        console.log('2️⃣ Código QR\n');

        rl.question('👉 Escribe 1 o 2: ', respuesta => {
            rl.close();
            const opcion = respuesta.trim();

            if (opcion !== '1' && opcion !== '2') {
                console.log('❌ Opción inválida.');
                resolve(preguntarOpcion());
                return;
            }

            resolve(opcion);
        });
    });
}

function preguntarNumero() {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\n======================================');
        console.log('📱 NÚMERO DE WHATSAPP');
        console.log('======================================\n');
        console.log('Escribe tu número con código de país.');
        console.log('Ejemplo Nicaragua: 50588888888');
        console.log('⚠️ Solo números, sin +, espacios ni guiones.\n');

        rl.question('👉 Número: ', numero => {
            rl.close();
            resolve(numero.trim().replace(/\D/g, ''));
        });
    });
}

async function configurarConexion() {
    metodoConexion = await preguntarOpcion();

    if (metodoConexion === '1') {
        numeroTelefono = await preguntarNumero();

        if (
            !numeroTelefono ||
            numeroTelefono.length < 8 ||
            numeroTelefono.length > 15
        ) {
            console.log('❌ Número inválido.');
            return configurarConexion();
        }

        console.log('\n✅ Número aceptado.');
        console.log('⏳ Preparando código...');
    } else {
        numeroTelefono = null;
        console.log('\n📱 Preparando conexión mediante QR...');
    }
}

async function generarCodigo(sock) {
    if (metodoConexion !== '1' || !numeroTelefono) return;

    try {
        await esperar(3000);

        if (sock.authState.creds.registered) return;

        console.log('\n🔐 Generando código...');

        const codigo = await sock.requestPairingCode(numeroTelefono);

        if (!codigo) {
            throw new Error('Baileys no devolvió el código.');
        }

        const codigoLimpio = String(codigo).replace(/[^a-zA-Z0-9]/g, '');
        const codigoMostrar =
            codigoLimpio.match(/.{1,4}/g)?.join('-') || codigoLimpio;

        console.log('\n======================================');
        console.log('       🔐 CÓDIGO DE EMPAREJAMIENTO');
        console.log('======================================\n');
        console.log(`             ${codigoMostrar}`);
        console.log('\n======================================');
        console.log('📱 En WhatsApp:');
        console.log('Dispositivos vinculados');
        console.log('→ Vincular un dispositivo');
        console.log('→ Vincular con número de teléfono');
        console.log('\nIntroduce el código mostrado arriba.');
        console.log('======================================\n');
    } catch (error) {
        console.error('\n❌ Error generando código:', error?.message || error);
    }
}

async function iniciarBot() {
    if (iniciando) return;
    iniciando = true;

    try {
        console.log('\n🚀 Iniciando Alex Bot...');

        const { state, saveCreds } =
            await useMultiFileAuthState(AUTH_FOLDER);

        if (!state.creds.registered) {
            await configurarConexion();
        } else {
            metodoConexion = 'sesion';
            console.log('\n✅ Sesión existente encontrada.');
            console.log('🔄 Conectando automáticamente...');
        }

        let version;

        try {
            const resultado = await fetchLatestBaileysVersion();
            version = resultado.version;
        } catch {
            console.warn('⚠️ No se pudo obtener la versión de Baileys.');
        }

        const { mapaComandos, listaComandos } = await cargarComandos();

        console.log(
            '🧩 Comandos:',
            listaComandos.map(c => c.nombre).join(', ')
        );

        const logger = pino({ level: 'silent' });

        const opciones = {
            logger,
            printQRInTerminal: false,
            mobile: false,
            browser: Browsers
                ? Browsers.macOS('Chrome')
                : ['Chrome', 'Chrome', '121.0.0.0'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore
                    ? makeCacheableSignalKeyStore(state.keys, logger)
                    : state.keys
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            msgRetryCounterCache,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 20000,
            emitOwnEvents: true,
            getMessage: async () => undefined
        };

        if (version) opciones.version = version;

        const sock = makeWASocket(opciones);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async update => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && metodoConexion === '2') {
                ultimoQR = qr;
                console.log('\n======================================');
                console.log('📱 QR GENERADO');
                console.log('======================================');
                console.log('Abre la ruta /qr de tu servidor y escanea el QR.');
                console.log('======================================\n');
            }

            if (connection === 'open') {
                intentos = 0;
                ultimoQR = null;

                console.log('\n======================================');
                console.log('       ✅ WHATSAPP CONECTADO');
                console.log('======================================\n');
                console.log('🤖 Alex Bot está funcionando.');
                console.log('Prueba: .ping o .menu\n');
            }

            if (connection === 'close') {
                const codigoError =
                    new Boom(lastDisconnect?.error)?.output?.statusCode || 0;

                const registrado = sock.authState.creds.registered;

                const reconectar =
                    codigoError !== DisconnectReason.loggedOut;

                console.log('\n❌ Conexión cerrada.');
                console.log(`Código: ${codigoError}`);
                console.log(`Sesión registrada: ${registrado}`);

                if (!reconectar) {
                    console.log('🔒 Sesión cerrada por logout.');
                    console.log('No se reconectará automáticamente.');
                    iniciando = false;
                    return;
                }

                intentos++;

                const espera = Math.min(5000 * intentos, 60000);

                console.log(
                    `🔄 Reconectando en ${espera / 1000}s...`
                );

                setTimeout(() => {
                    iniciando = false;
                    iniciarBot();
                }, espera);
            }
        });

        sock.ev.on(
            'messages.upsert',
            crearManejador(sock, mapaComandos, listaComandos)
        );

        if (!state.creds.registered && metodoConexion === '1') {
            setTimeout(() => generarCodigo(sock), 4000);
        }

        iniciando = false;

        console.log('📡 Socket de WhatsApp preparado.');
    } catch (error) {
        iniciando = false;

        console.error('\n❌ Error iniciando el bot:');
        console.error(error?.message || error);

        intentos++;

        const espera = Math.min(5000 * intentos, 60000);

        console.log(
            `🔄 Reintentando en ${espera / 1000}s...`
        );

        setTimeout(iniciarBot, espera);
    }
}

iniciarBot();
