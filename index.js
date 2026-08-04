import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import { cargarComandos, crearManejador } from './handler.js';

const BOT_PHONE_NUMBER = process.env.BOT_PHONE_NUMBER;

if (!BOT_PHONE_NUMBER) throw new Error('FALTA la variable BOT_PHONE_NUMBER en Environment.');
if (!process.env.ALEX_API_KEY) throw new Error('FALTA la variable ALEX_API_KEY en Environment.');

const fastify = Fastify({ logger: false });
fastify.get('/', () => ({ status: 'Bot de WhatsApp activo' }));
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })
    .then(() => console.log('Servidor de keep-alive corriendo en el puerto ' + (process.env.PORT || 3000)));

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    const { mapaComandos, listaComandos } = await cargarComandos();
    console.log('Comandos cargados:', listaComandos.map(c => c.nombre).join(', '));

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    if (!sock.authState.creds.registered && BOT_PHONE_NUMBER) {
        setTimeout(async () => {
            try {
                const codigo = await sock.requestPairingCode(BOT_PHONE_NUMBER);
                console.log('=================================');
                console.log('TU CÓDIGO DE EMPAREJAMIENTO ES:', codigo);
                console.log('Ábrelo en WhatsApp > Dispositivos vinculados > Vincular con número de teléfono');
                console.log('=================================');
            } catch (e) {
                console.error('Error generando el código de emparejamiento:', e.message);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const debeReconectar = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada. Reconectando:', debeReconectar);
            if (debeReconectar) iniciarBot();
        } else if (connection === 'open') {
            console.log('✅ Bot de WhatsApp conectado correctamente.');
        }
    });

    sock.ev.on('messages.upsert', crearManejador(sock, mapaComandos, listaComandos));
}

iniciarBot();