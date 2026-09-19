import 'dotenv/config';
import * as baileysNS from 'baileys';
import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import QRCode from 'qrcode';
import NodeCache from 'node-cache';
import readline from 'readline';

import { handleMessage } from './handler.js';
import { loadCommands } from './controllers/cmdManager.js';
import { manejarDespedida } from './commands/group/despedida.js';

const baileys = baileysNS.default ?? baileysNS;
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore } = baileys;

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
let comandos = null;
let listaComandosUnicos = [];

const groupMetadataCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const app = Fastify({ logger: false });

app.get('/', async () => ({ status: 'online', bot: 'BOT-API' }));

app.get('/qr', async (req, reply) => {
    if (!ultimoQR) {
        return reply.type('text/html').send(`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BOT-API</title></head><body style="background:#0b0b12;color:#fff;font-family:Arial;text-align:center;padding:40px;"><h2>🤖 BOT-API</h2><p>No hay un QR disponible.</p><p>Actualiza la página en unos segundos.</p></body></html>`);
    }
    try {
        const imagen = await QRCode.toDataURL(ultimoQR);
        return reply.type('text/html').send(`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BOT-API QR</title></head><body style="background:linear-gradient(135deg,#080812,#15152b);color:#fff;font-family:Arial;text-align:center;padding:30px;"><h1>🤖 BOT-API</h1><h2>📱 Escanea el QR</h2><p>WhatsApp → Dispositivos vinculados</p><img src="${imagen}" style="width:300px;max-width:90%;background:#fff;padding:10px;border-radius:20px;"><p>Si el QR expira, actualiza la página.</p></body></html>`);
    } catch {
        return reply.type('text/html').send('<h2>Error generando QR.</h2>');
    }
});

app.listen({ port: PORT, host: '0.0.0.0' })
    .then(() => console.log(`🌐 Servidor activo en puerto ${PORT}`))
    .catch(() => process.exit(1));

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

function preguntarOpcion() {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n======================================\n             🤖 BOT-API\n======================================\n');
        console.log('¿Cómo quieres conectar el bot?\n\n1️⃣ Código de emparejamiento\n2️⃣ Código QR\n');
        rl.question('👉 Escribe 1 o 2: ', respuesta => {
            rl.close();
            const opcion = respuesta.trim();
            if (opcion !== '1' && opcion !== '2') return resolve(preguntarOpcion());
            resolve(opcion);
        });
    });
}

function preguntarNumero() {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n======================================\n📱 NÚMERO DE WHATSAPP\n======================================\n');
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
        if (!numeroTelefono || numeroTelefono.length < 8 || numeroTelefono.length > 15) return configurarConexion();
        console.log('\n✅ Número aceptado.\n⏳ Preparando código...');
    } else {
        numeroTelefono = null;
        console.log('\n📱 Preparando conexión mediante QR...');
    }
}

async function generarCodigo(sock) {
    if (metodoConexion !== '1' || !numeroTelefono) return;
    try {
        await esperar(3000);
        if (sock.authState?.creds?.registered) return;
        const codigo = await sock.requestPairingCode(numeroTelefono);
        if (!codigo) throw new Error();
        const codigoMostrar = String(codigo).replace(/[^a-zA-Z0-9]/g, '').match(/.{1,4}/g)?.join('-') || codigo;
        console.log('\n======================================\n       🔐 CÓDIGO DE EMPAREJAMIENTO\n======================================\n');
        console.log(`             ${codigoMostrar}\n`);
    } catch {}
}

async function obtenerMetadataGrupo(sock, id) {
    let metadata = groupMetadataCache.get(id);
    if (metadata) return metadata;
    metadata = await sock.groupMetadata(id).catch(() => null);
    if (metadata) groupMetadataCache.set(id, metadata);
    return metadata;
}

async function iniciarBot() {
    if (iniciando) return;
    iniciando = true;

    try {
        if (!comandos) {
            comandos = await loadCommands();
            listaComandosUnicos = Array.from(comandos.values()).filter((v, i, self) => self.indexOf(v) === i);
            console.log(`📦 Comandos cargados: ${comandos.size}`);
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        if (!state.creds.registered) {
            await configurarConexion();
        } else {
            metodoConexion = 'sesion';
            console.log('\n✅ Sesión existente encontrada.\n🔄 Conectando automáticamente...');
        }

        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
        const logger = pino({ level: 'silent' });

        const sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            mobile: false,
            browser: Browsers ? Browsers.macOS('Chrome') : ['Chrome', 'Chrome', '121.0.0.0'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, logger) : state.keys
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            msgRetryCounterCache,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 30000,
            mediaUploadTimeoutMs: 120000,
            keepAliveIntervalMs: 20000,
            emitOwnEvents: true,
            getMessage: async () => undefined
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            if (action === 'remove') {
                return manejarDespedida(sock, { id, participants, action }).catch(() => {});
            }

            if (action !== 'add' || !participants?.length) return;

            const metadata = await obtenerMetadataGrupo(sock, id);
            const nombreGrupo = metadata?.subject || 'este grupo';

            for (const participante of participants) {
                const participanteJid = typeof participante === 'string' ? participante : (participante?.id || '');
                if (!participanteJid) continue;

                const numeroLimpio = participanteJid.split('@')[0].split(':')[0];
                let nombreUsuario = `+${numeroLimpio}`;

                const participanteMetadata = metadata?.participants?.find(item => (item?.id || item) === participanteJid);
                const contacto = sock?.store?.contacts?.[participanteJid];

                const posibleNombre = participanteMetadata?.name || participanteMetadata?.notify || contacto?.name || contacto?.notify;
                if (posibleNombre && posibleNombre !== '[object Object]') {
                    nombreUsuario = posibleNombre.slice(0, 35) + (posibleNombre.length > 35 ? '…' : '');
                }

                const bienvenida = `╭━━━〔 ✨ *BIENVENIDO/A* 〕━━━╮\n┃\n┃ 👤 *${nombreUsuario}*\n┃\n┃ 🎉 ¡Bienvenido/a a\n┃    *${nombreGrupo}*!\n┃\n┃ 🤝 Esperamos que disfrutes\n┃    tu estancia con nosotros.\n┃\n┃ 📜 Escribe *.menu* para\n┃    ver los comandos.\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n              🤖 *BOT-API*`;

                let buffer = null;
                try {
                    const fotoPerfil = await sock.profilePictureUrl(participanteJid, 'image').catch(() => null);
                    if (fotoPerfil) {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 5000);
                        const respuesta = await fetch(fotoPerfil, { signal: controller.signal });
                        clearTimeout(timeout);
                        if (respuesta.ok) buffer = Buffer.from(await respuesta.arrayBuffer());
                    }
                } catch {}

                if (buffer) {
                    await sock.sendMessage(id, { image: buffer, caption: bienvenida, mentions: [participanteJid] }).catch(() => {});
                } else {
                    await sock.sendMessage(id, { text: bienvenida, mentions: [participanteJid] }).catch(() => {});
                }
            }
        });

        sock.ev.on('connection.update', async update => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && metodoConexion === '2') {
                ultimoQR = qr;
                console.log('\n======================================\n📱 QR GENERADO\n======================================\n');
            }

            if (connection === 'open') {
                intentos = 0;
                ultimoQR = null;
                console.log('\n✅ BOT CONECTADO\n');
            }

            if (connection === 'close') {
                ultimoQR = null;
                const codigoError = new Boom(lastDisconnect?.error)?.output?.statusCode || 0;
                const reconectar = codigoError !== DisconnectReason.loggedOut;

                if (!reconectar) {
                    iniciando = false;
                    return;
                }

                intentos++;
                setTimeout(() => {
                    iniciando = false;
                    iniciarBot();
                }, Math.min(5000 * intentos, 60000));
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.remoteJid === 'status@broadcast') return;
            handleMessage(sock, m, '.', listaComandosUnicos);
        });

        if (!state.creds.registered && metodoConexion === '1') {
            setTimeout(() => generarCodigo(sock), 4000);
        }

        iniciando = false;

    } catch (error) {
        iniciando = false;
        intentos++;
        setTimeout(iniciarBot, Math.min(5000 * intentos, 60000));
    }
}

iniciarBot();
