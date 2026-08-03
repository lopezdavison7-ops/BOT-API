export function crearRespondedor(sock, msg) {
    const remitente = msg.key.remoteJid;
    return {
        texto: (texto) => sock.sendMessage(remitente, { text: texto }, { quoted: msg }),
        imagen: (url, caption = '') => sock.sendMessage(remitente, { image: { url }, caption }, { quoted: msg }),
        video: (url, caption = '') => sock.sendMessage(remitente, { video: { url }, caption }, { quoted: msg }),
        audio: (url) => sock.sendMessage(remitente, { audio: { url }, mimetype: 'audio/mp4' }, { quoted: msg })
    };
}