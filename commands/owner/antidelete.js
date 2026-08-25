import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../database/antidelete.json');
const CONFIG_PATH = path.join(__dirname, '../../database/antidelete_config.json');
const LOG_NUMBER = '50578391933@s.whatsapp.net'; // TU NUMERO - SIN EL +

function caja(emoji, titulo, cuerpo = [], pie) {
    const lineas = Array.isArray(cuerpo)? cuerpo : [cuerpo];
    let texto = `╭〔 ${emoji} 𝐀𝐍𝐓𝐈𝐃𝐄𝐋𝐄𝐓𝐄-𝐎𝐖𝐍𝐄𝐑 〕⬣\n┃\n`;
    for (const l of lineas) texto += l === ''? '┃\n' : `┃ ${l}\n`;
    texto += '┃\n╰━━━━━━━━⬣';
    if (pie) texto += `\n\n> ${pie}`;
    texto += '\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';
    return texto;
}

const isActive = () => {
    if(!fs.existsSync(CONFIG_PATH)) return false;
    return JSON.parse(fs.readFileSync(CONFIG_PATH)).active;
}
const setActive = (val) => fs.writeFileSync(CONFIG_PATH, JSON.stringify({active: val}, null, 2));
const loadDB = () => fs.existsSync(DB_PATH)? JSON.parse(fs.readFileSync(DB_PATH)) : {};
const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// GUARDAR CADA MENSAJE QUE ENTRA
export const before = async (m, { conn }) => {
    if(!isActive() ||!m ||!m.message || m.isBaileys) return;

    const db = loadDB();
    const msgId = m.key.id;
    const chatId = m.key.remoteJid;

    db[msgId] = {
        chat: chatId,
        chatName: await conn.getName(chatId).catch(() => chatId),
        sender: m.key.participant || m.key.remoteJid,
        senderName: await conn.getName(m.key.participant || m.key.remoteJid).catch(() => 'Desconocido'),
        timestamp: m.messageTimestamp,
        type: Object.keys(m.message)[0],
        content: m.message
    };

    // Limite de 1000 mensajes
    const keys = Object.keys(db);
    if(keys.length > 1000) delete db[keys[0]];
    saveDB(db);
}

// DETECTAR BORRADO Y REENVIAR SIEMPRE
export const after = async (m, { conn }) => {
    if(!isActive()) return;
    if(m.messageStubType!== 2 && m.messageStubType!== 3) return; // 2=borrado, 3=borrado admin

    const db = loadDB();
    const msgId = m.messageStubParameters?.[0];
    const deletedMsg = db[msgId];
    if(!deletedMsg) return;

    const deleter = m.key.participant || m.key.remoteJid;
    const deleterName = await conn.getName(deleter).catch(() => 'Desconocido');
    const hora = new Date(deletedMsg.timestamp * 1000).toLocaleString('es-NI', { timeZone: 'America/Managua' });

    // SACAR TEXTO
    let textoBorrado = '[Media/Documento/Sticker/Nota de voz]';
    if(deletedMsg.type === 'conversation') textoBorrado = deletedMsg.content.conversation;
    if(deletedMsg.type === 'extendedTextMessage') textoBorrado = deletedMsg.content.extendedTextMessage.text;
    if(deletedMsg.type === 'imageMessage') textoBorrado = `*Imagen:* ${deletedMsg.content.imageMessage.caption || 'Sin texto'}`;
    if(deletedMsg.type === 'videoMessage') textoBorrado = `*Video:* ${deletedMsg.content.videoMessage.caption || 'Sin texto'}`;

    const cuerpo = [
        `*CHAT:* ${deletedMsg.chatName}`,
        `*AUTOR:* ${deletedMsg.senderName} | ${deletedMsg.sender.split('@')[0]}`,
        `*BORRADO POR:* ${deleterName} | ${deleter.split('@')[0]}`, // AQUI SALE SI FUISTE TU
        `*HORA:* ${hora}`,
        ``,
        `*MENSAJE BORRADO:*`,
        `${textoBorrado}`
    ];

    // FORZAR ENVIO A TU NUMERO SIEMPRE
    try {
        await conn.sendMessage(LOG_NUMBER, { text: caja('☠️', 'LOG BORRADO', cuerpo, 'Detectado por Antidelete') });
    } catch(e) {
        console.log('Error enviando log antidelete:', e)
    }

    delete db[msgId];
    saveDB(db);
}

export default {
    nombre: 'antidelete',
    categoria: 'owner',
    alias: ['antidel', 'ad'],
    owner: true, // SOLO OWNER
    descripcion: '☠️ Guarda y reenvía mensajes borrados a tu numero',

    ejecutar: async ({ argumento, responder }) => {
        const estado = argumento?.toLowerCase();
        const numLog = LOG_NUMBER.split('@')[0];

        if(estado === 'on'){
            setActive(true);
            await responder.texto(caja('✅', 'ACTIVADO', [
                `Estado: ON`,
                `Destino: +${numLog}`,
                `Modo: Forzar envio incluso si borras tu`
            ], 'Todos los borrados llegarán a tu pv'));
        }
        else if(estado === 'off'){
            setActive(false);
            await responder.texto(caja('❌', 'DESACTIVADO', [
                `Estado: OFF`,
                `No se guardará ni reenviará nada`
            ]));
        }
        else{
            await responder.texto(caja('❓', 'PANEL OWNER', [
                `Uso: *.antidelete on*`,
                `Uso: *.antidelete off*`,
                ``,
                `Estado actual: ${isActive()? '✅ ON' : '❌ OFF'}`,
                `Logs van a: +${numLog}`
            ], 'Solo Owner puede usar esto'));
        }
    },
};