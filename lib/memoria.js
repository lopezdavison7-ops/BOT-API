// lib/memoria.js
// ============================================================
// BOT-API — MEMORIA IA (conversación natural)
// ============================================================
// Responde cuando mencionan al bot por su nombre
// Guarda historial de conversación por chat
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_MEMORIA = path.join(__dirname, '..', 'database', 'memoria.json');

// ---------- CONFIGURACIÓN ----------
const NOMBRES_BOT = ['bot-api', 'alex', 'bot ', 'bot'];
const MAX_MENSAJES = 15;

// ---------- CARGAR/GUARDAR MEMORIA ----------
function cargarMemoria() {
    try {
        return JSON.parse(fs.readFileSync(RUTA_MEMORIA, 'utf8'));
    } catch {
        return {};
    }
}

function guardarMemoria(db) {
    fs.mkdirSync(path.dirname(RUTA_MEMORIA), { recursive: true });
    fs.writeFileSync(RUTA_MEMORIA, JSON.stringify(db, null, 2), 'utf8');
}

// ---------- VERIFICAR SI MENCIONAN AL BOT ----------
function mencionaBot(texto) {
    const t = texto.toLowerCase();
    return NOMBRES_BOT.some(nombre => t.includes(nombre));
}

// ---------- CONSTRUIR PROMPT ----------
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

// ============================================================
// FUNCIÓN PRINCIPAL — se llama desde handler.js
// Retorna true si el bot respondió, false si no
// ============================================================
export async function manejarMemoriaIA(sock, msg) {
    // Solo mensajes entrantes (no del bot)
    if (msg.key.fromMe) return false;

    const chatId = msg.key.remoteJid;
    const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const nombreUsuario = msg.pushName || 'bro';

    // Si no hay texto o es un comando, no procesar
    if (!texto) return false;
    if (texto.startsWith('.')) return false;

    // Cargar historial
    const historial = cargarMemoria();

    // Inicializar chat si no existe
    if (!historial[chatId]) historial[chatId] = [];

    // Guardar mensaje del usuario SIEMPRE (para tener contexto)
    historial[chatId].push({
        role: 'user',
        name: nombreUsuario,
        content: texto,
        time: Date.now()
    });

    // Limpiar mensajes viejos (más de 24h)
    const unDia = 24 * 60 * 60 * 1000;
    const ahora = Date.now();
    historial[chatId] = historial[chatId].filter(m => ahora - (m.time || 0) < unDia);

    // Verificar si mencionan al bot
    if (!mencionaBot(texto)) {
        // Solo guardar contexto, no responder
        if (historial[chatId].length > MAX_MENSAJES * 2) {
            historial[chatId] = historial[chatId].slice(-MAX_MENSAJES * 2);
        }
        guardarMemoria(historial);
        return false;
    }

    // ---------- RESPONDER COMO IA ----------
    try {
        // Efecto "escribiendo..."
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

        // Construir contexto
        const contexto = historial[chatId]
            .slice(-MAX_MENSAJES)
            .map(m => {
                if (m.role === 'user') return `${m.name || 'Usuario'}: ${m.content}`;
                return `BOT-API: ${m.content}`;
            })
            .join('\n');

        const prompt = construirPrompt(contexto);

        // Llamar a la API de Delirius
        const apiUrl = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(texto)}&prompt=${encodeURIComponent(prompt)}`;
        const res = await fetch(apiUrl);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const status = json.status ?? json.estado ?? false;
        const respuesta = json.data ?? json.datos;

        if (!status || !respuesta) {
            throw new Error('API no respondió');
        }

        // Guardar respuesta del bot en memoria
        historial[chatId].push({
            role: 'assistant',
            content: respuesta,
            time: Date.now()
        });

        // Limitar historial
        if (historial[chatId].length > MAX_MENSAJES * 2) {
            historial[chatId] = historial[chatId].slice(-MAX_MENSAJES * 2);
        }

        guardarMemoria(historial);

        // Reaccionar al mensaje
        await sock.sendMessage(chatId, {
            react: { text: '⚡', key: msg.key }
        });

        // Enviar respuesta
        await sock.sendMessage(chatId, {
            text: respuesta
        }, { quoted: msg });

        return true; // El mensaje fue manejado por la IA

    } catch (error) {
        console.error('[MEMORIA] Error:', error?.message || error);
        guardarMemoria(historial);
        return false;
    }
}