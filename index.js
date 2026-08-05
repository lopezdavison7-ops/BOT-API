import * as baileysNS from 'baileys';
const baileysDefault = baileysNS.default ?? baileysNS;
const makeWASocket = typeof baileysDefault === 'function' ? baileysDefault : baileysDefault.makeWASocket;
const useMultiFileAuthState = baileysNS.useMultiFileAuthState ?? baileysDefault.useMultiFileAuthState;
const DisconnectReason = baileysNS.DisconnectReason ?? baileysDefault.DisconnectReason;
const fetchLatestBaileysVersion = baileysNS.fetchLatestBaileysVersion ?? baileysDefault.fetchLatestBaileysVersion;
const Browsers = baileysNS.Browsers ?? baileysDefault.Browsers;

if (typeof makeWASocket !== 'function') {
    console.error('No se pudo cargar makeWASocket de la librería Baileys. Revisa la versión instalada.');
}
import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import fs from 'fs';
import QRCode from 'qrcode';
import { cargarComandos, crearManejador } from './handler.js';

const BOT_PHONE_NUMBER = process.env.BOT_PHONE_NUMBER; // ej: 50499999999 (con código de país, sin el +)
const USAR_QR = process.env.BOT_USAR_QR === 'true'; // si es true, usa QR en vez de código de emparejamiento

let ultimoQR = null;

if (!BOT_PHONE_NUMBER) console.error('FALTA la variable BOT_PHONE_NUMBER en Environment.');
if (!process.env.ALEX_API_KEY) console.error('FALTA la variable ALEX_API_KEY en Environment.');

// --- Servidor pequeño solo para mantener vivo el servicio (UptimeRobot le pega aquí) ---
const fastify = Fastify({ logger: false });
fastify.get('/', () => ({ status: 'Bot de WhatsApp activo' }));
fastify.get('/qr', async (req, reply) => {
    if (!ultimoQR) {
        reply.type('text/html').send('<h2>Aún no hay QR disponible, o el bot ya está vinculado. Refresca en unos segundos.</h2>');
        return;
    }
    const imagenQR = await QRCode.toDataURL(ultimoQR);
    reply.type('text/html').send(`
        <html><body style="text-align:center; font-family:sans-serif; background:#111; color:#fff;">
            <h2>Escanea este código con WhatsApp</h2>
            <p>Ajustes → Dispositivos vinculados → Vincular un dispositivo (con la cámara)</p>
            <img src="${imagenQR}" style="width:300px;" />
            <p><small>Se actualiza solo cada 20 seg. Refresca la página si expira.</small></p>
        </body></html>
    `);
});
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
        printQRInTerminal: false,
        mobile: false,
        browser: Browsers ? Browsers.ubuntu('Chrome') : ['Chrome (Linux)', 'Chrome', '121.0.0.0']
    });

    if (!sock.authState.creds.registered && BOT_PHONE_NUMBER && !USAR_QR) {
        setTimeout(async () => {
            try {
                const codigo = await sock.requestPairingCode(BOT_PHONE_NUMBER);
                const codigoFormateado = codigo?.match(/.{1,4}/g)?.join('-') || codigo;
                console.log('=================================');
                console.log('TU CÓDIGO DE EMPAREJAMIENTO ES:', codigoFormateado);
                console.log('Ábrelo en WhatsApp > Dispositivos vinculados > Vincular con número de teléfono');
                console.log('Tienes SOLO unos segundos para ingresarlo antes de que expire.');
                console.log('=================================');
            } catch (e) {
                console.error('Error generando el código de emparejamiento:', e.message);
            }
        }, 15000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && USAR_QR) {
            ultimoQR = qr;
            console.log('Nuevo QR generado. Visita https://TU-SERVICIO.onrender.com/qr para escanearlo.');
        }
        if (connection === 'close') {
            const debeReconectar = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            const seRegistroAlgunaVez = sock.authState.creds.registered;
            console.log('Conexión cerrada. Reconectando:', debeReconectar, '| Ya estaba emparejado:', seRegistroAlgunaVez);

            if (debeReconectar) {
                if (!seRegistroAlgunaVez) {
                    // El emparejamiento nunca se completó: borramos credenciales viejas
                    // para que el próximo intento use llaves de identidad 100% nuevas.
                    try {
                        fs.rmSync('./auth_info', { recursive: true, force: true });
                        console.log('auth_info limpiado — próximo código será completamente nuevo.');
                    } catch (e) {
                        console.error('No se pudo limpiar auth_info:', e.message);
                    }
                }
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot de WhatsApp conectado correctamente.');
        }
    });

    sock.ev.on('messages.upsert', crearManejador(sock, mapaComandos, listaComandos));
}

iniciarBot();

