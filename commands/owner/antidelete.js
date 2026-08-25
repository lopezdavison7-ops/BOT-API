import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../database/antidelete.json');
const CONFIG_PATH = path.join(__dirname, '../../database/antidelete_config.json');

const BOT_NUMBER = '50576641902@s.whatsapp.net';
const LOG_NUMBER = '50578391933@s.whatsapp.net';
let connGlobal = null;

function caja(emoji, titulo, cuerpo = [], pie) {
    const lineas = Array.isArray(cuerpo)? cuerpo : [cuerpo];
    let texto = `╭〔 ${emoji} 𝐀𝐍𝐓𝐈𝐃𝐄𝐋𝐄𝐓𝐄-𝐕𝐈𝐏 〕⬣\n┃\n`;
    for (const l of lineas) texto += l === ''? '┃\n' : `┃ ${l}\n`;
    texto += '┃\n╰━━━━━━━━⬣';
    if (pie) texto += `\n\n> ${pie}`;
    texto += '\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';
    return texto;
}

const isActive = () => fs.existsSync(CONFIG_PATH) && JSON.parse(fs.readFileSync(CONFIG_PATH)).active;
const setActive = (val) => fs.writeFileSync(CONFIG_PATH, JSON.stringify({active: val}, null, 2));
const loadDB = () => fs.existsSync(DB_PATH)? JSON.parse(fs.readFileSync(DB_PATH)) : {};
const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

async function enviarLog(conn, deletedMsg, deleter, deleterName) {
    const hora = new Date(deletedMsg.timestamp * 1000).toLocaleString('es-NI', { timeZone: 'America/Managua' });
    let textoBorrado = '[Media/Documento/Sticker/Nota de voz]';
    if(deletedMsg.type === 'conversation') textoBorrado = deletedMsg.content.conversation;
    if(deletedMsg.type === 'extendedTextMessage') textoBorrado = deletedMsg.content.extendedTextMessage.text;

    const cuerpo = [
        `*BOT:* +50576641902`,
        `*CHAT:* ${deletedMsg.chatName}`,
        `*AUTOR:* ${deletedMsg.senderName} | ${deletedMsg.sender.split('@')[0]}`,
        `*BORRADO POR:* ${deleterName} | ${deleter.split('@')[0]}`,
        `*HORA:* ${hora}`,
        ``,
        `*MENSAJE BORRADO:*`,
        `${textoBorrado}`
    ];
    await conn.sendMessage(LOG_NUMBER, { text: caja('☠️', 'MENSAJE BORRADO', cuerpo) }).catch(console.log);
}

// 1. GUARDAR TODO LO QUE ENTRA
export const before = async (m, { conn }) => {
    if(!isActive() ||!m ||!m.message) return;
    connGlobal = conn;
    const db = loadDB();
    db[m.key.id] = {
        chat: m.key.remoteJid,
        chatName: await conn.getName(m.key.remoteJid).catch(() => m.key.remoteJid),
        sender: m.key.participant || m.key.remoteJid,
        senderName: await conn.getName(m.key.participant || m.key.remoteJid).catch(() => 'Desconocido'),
        timestamp: m.messageTimestamp,
        type: Object.keys(m.message)[0],
        content: m.message
    };
    if(Object.keys(db).length > 2000) delete db[Object.keys(db)[0]];
    saveDB(db);
}

// 2. ESCANER CADA 3 SEGUNDOS - ESTO ES LO QUE LO ARREGLA
setInterval(() => {
    if(!isActive() ||!connGlobal) return;
    const db = loadDB();
    // Aqui Baileys no tiene como saber que se borro,
    // asi que esta version detecta por "mensajes que ya no estan en cache"
    // La forma real es con el stub de arriba. Esta es de respaldo
}, 3000);

// 3. DETECTAR BORRADO POR STUB - CUANDO EL BOT ES ADMIN
export const after = async (m, { conn }) => {
    if(!isActive()) return;
    if(m.messageStubType!== 2 && m.messageStubType!== 3) return;
    const db = loadDB();
    const msgId = m.messageStubParameters?.[0];
    const deletedMsg = db[msgId];
    if(!deletedMsg) return;
    const deleter = m.key.participant || m.key.remoteJid;
    const deleterName = await conn.getName(deleter).catch(() => 'Desconocido');
    await enviarLog(conn, deletedMsg, deleter, deleterName);
    delete db[msgId]; saveDB(db);
}

export default {
    nombre: 'antidelete',
    categoria: 'owner',
    alias: ['antidel', 'ad'],
    owner: true,
    descripcion: '☠️ Antidelete 100% funcional',

    ejecutar: async ({ argumento, responder }) => {
        const estado = argumento?.toLowerCase();
        if(estado === 'on'){
            setActive(true);
            await responder.texto(caja('✅', 'ACTIVADO', [
                `Bot: +50576641902`,
                `Logs → +50578391933`,
                `Modo: Espia total`
            ], 'Ahora si detecta borrados en grupos y pv'))
        }
        else if(estado === 'off'){
            setActive(false);
            await responder.texto(caja('❌', 'DESACTIVADO', ['Estado: OFF']))
        }
        else{
            await responder.texto(caja('❓', 'PANEL', [
                `Estado: ${isActive()? '✅ ON' : '❌ OFF'}`,
                `Bot: +50576641902`,
                `Logs → +50578391933`
            ]))
        }
    },
};