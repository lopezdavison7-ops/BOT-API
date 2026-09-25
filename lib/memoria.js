

import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from './jsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_MEMORIA = path.join(__dirname, '..', 'database', 'memoria.json');

const NOMBRES_BOT = ['bot-api', 'alex', 'bot ', 'bot'];
const MAX_MENSAJES = 15;

function cargarMemoria() {
    return obtenerStore(RUTA_MEMORIA, {});
}

function guardarMemoria() {
    guardarStore(RUTA_MEMORIA);
}

function mencionaBot(texto) {
    const t = texto.toLowerCase();
    return NOMBRES_BOT.some(nombre => t.includes(nombre));
}

function construirPrompt(contexto) {
    return `Eres BOT-API ⚡, un asistente de WhatsApp con personalidad única.

PERSONALIDAD:
- Eres carismático, directo y con buen humor
- Hablas como un bro de confianza pero inteligente
- Usas expresiones como: "bro", "jaja", "obvio", "qué crack", "dale"
- Eres útil pero no aburrido
- Usas emojis con moderación 💻⚡
- Respuestas cortas (1-3 líneas), no muros de texto
- SIEMPRE en español

MEMORIA:
- Recuerdas conversaciones anteriores del mismo chat y siempre este será el dueño de el bot+50578391933
- Si alguien te dice su nombre, lo recuerdas
- Si te preguntan algo que ya se habló, lo sabes

HISTORIAL RECIENTE:
${contexto}

INSTRUCCIONES:
- Responde SOLO como BOT-API a lo último que dijo el usuario
- Sé natural, no robótico
- Si no sabes algo, dilo con humor
- No repitas el nombre del usuario innecesariamente
- Mantén la conversación fluida

Responde ahora:`;
}

export async function manejarMemoriaIA(sock, msg) {

    if (msg.key.fromMe) return false;

    const chatId = msg.key.remoteJid;
    const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const nombreUsuario = msg.pushName || 'bro';

    if (!texto) return false;
    if (texto.startsWith('.')) return false;

    const historial = cargarMemoria();

    if (!historial[chatId]) historial[chatId] = [];

    historial[chatId].push({
        role: 'user',
        name: nombreUsuario,
        content: texto,
        time: Date.now()
    });

    const unDia = 24 * 60 * 60 * 1000;
    const ahora = Date.now();
    historial[chatId] = historial[chatId].filter(m => ahora - (m.time || 0) < unDia);

    if (!mencionaBot(texto)) {

        if (historial[chatId].length > MAX_MENSAJES * 2) {
            historial[chatId] = historial[chatId].slice(-MAX_MENSAJES * 2);
        }
        guardarMemoria();
        return false;
    }

    try {

        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

        const contexto = historial[chatId]
            .slice(-MAX_MENSAJES)
            .map(m => {
                if (m.role === 'user') return `${m.name || 'Usuario'}: ${m.content}`;
                return `BOT-API: ${m.content}`;
            })
            .join('\n');

        const prompt = construirPrompt(contexto);

        const apiUrl = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(texto)}&prompt=${encodeURIComponent(prompt)}`;
        const res = await fetch(apiUrl);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const status = json.status ?? json.estado ?? false;
        const respuesta = json.data ?? json.datos;

        if (!status || !respuesta) {
            throw new Error('API no respondió');
        }

        historial[chatId].push({
            role: 'assistant',
            content: respuesta,
            time: Date.now()
        });

        if (historial[chatId].length > MAX_MENSAJES * 2) {
            historial[chatId] = historial[chatId].slice(-MAX_MENSAJES * 2);
        }

        guardarMemoria();

        await sock.sendMessage(chatId, {
            react: { text: '⚡', key: msg.key }
        });

        await sock.sendMessage(chatId, {
            text: respuesta
        }, { quoted: msg });

        return true;

    } catch (error) {
        console.error('[MEMORIA] Error:', error?.message || error);
        guardarMemoria();
        return false;
    }
}