export default {
    nombre: 'recordatorio',
    categoría: 'ultilidades',
    alias: ['recordar'],
    descripcion: 'Te manda un recordatorio en X minutos. Uso: .recordatorio minutos|mensaje',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const [minutosStr, ...resto] = argumento.split('|');
        const minutos = parseFloat(minutosStr);
        const mensaje = resto.join('|').trim();

        if (!minutos || minutos <= 0 || !mensaje) {
            return responder.texto('Formato: .recordatorio minutos|mensaje\nEj: .recordatorio 10|Sacar la comida del horno');
        }
        if (minutos > 1440) return responder.texto('Máximo 1440 minutos (24 horas).');

        await responder.texto(`⏰ Listo, te recuerdo en ${minutos} minuto(s):\n"${mensaje}"\n\n_(Nota: si el bot se reinicia antes de esa hora, el recordatorio se pierde)_`);

        setTimeout(() => {
            sock.sendMessage(msg.key.remoteJid, { text: `⏰ *RECORDATORIO*\n\n${mensaje}` }).catch(() => {});
        }, minutos * 60 * 1000);
    }
};