// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (API externa + avatares auto-generados)
// ============================================================

// ---------- LIMPIAR JID ----------
function limpiarJid(jid) {
    const raw = jid.split('@')[0].split(':')[0];
    return (jid.includes('@lid') || raw.length > 12) ? raw.slice(-4) : raw;
}

// ---------- OBTENER NOMBRE ----------
function obtenerNombre(jid, pushName) {
    if (pushName && !/^\d+$/.test(pushName)) return pushName;
    return limpiarJid(jid);
}

// ---------- AVATAR PÚBLICO (ui-avatars.com - instantáneo) ----------
function avatarUrl(nombre, color) {
    const name = encodeURIComponent(nombre);
    return `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff&size=256&bold=true&format=png`;
}

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad',
    uso: '.ship @persona',
    ejecutar: async ({ sock, msg, argumento }) => {
        const remoteJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];

        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctxInfo?.mentionedJid || [];
        const quotedParticipant = ctxInfo?.participant;

        let userA = msg.key.participant || msg.key.remoteJid;
        let userB = quotedParticipant || mentioned[0];

        if (!userB) {
            return await s.sendMessage(
                remoteJid,
                { text: '❌ Usa: `.ship @persona` o responde a un mensaje' },
                { quoted: msg }
            );
        }

        const percent = Math.floor(Math.random() * 101);
        const mensaje = percent >= 90 ? '¡BODA!' :
                       percent >= 75 ? '¡AMOR!' :
                       percent >= 60 ? '¡QUÍMICA!' :
                       percent >= 40 ? 'TAL VEZ' :
                       percent >= 25 ? 'AMIGOS' : 'NO';

        // Nombres
        const nombreA = obtenerNombre(userA, msg.pushName);
        const nombreB = obtenerNombre(userB, null);

        // Avatares públicos (ui-avatars genera al instante)
        const img1 = avatarUrl(nombreA, 'ff6b9d');
        const img2 = avatarUrl(nombreB, '4ecdc4');

        // URL de la API de Delirius
        const apiUrl = `https://api.delirius.online/canvas/ship?` +
            `image1=${encodeURIComponent(img1)}` +
            `&image2=${encodeURIComponent(img2)}` +
            `&name1=${encodeURIComponent(nombreA)}` +
            `&name2=${encodeURIComponent(nombreB)}` +
            `&percentage=${percent}` +
            `&text=${encodeURIComponent(mensaje)}`;

        const n1 = limpiarJid(userA);
        const n2 = limpiarJid(userB);

        try {
            await s.sendMessage(
                remoteJid,
                {
                    image: { url: apiUrl },
                    caption: `💑 @${n1} + @${n2}\n📊 *${percent}%* ${mensaje}`,
                    mentions: [userA, userB]
                },
                { quoted: msg }
            );
        } catch (e) {
            // Fallback: texto simple si falla la API
            const barra = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
            await s.sendMessage(
                remoteJid,
                {
                    text: `💑 @${n1} + @${n2}\n📊 *${percent}%* ${barra}\n${mensaje}`,
                    mentions: [userA, userB]
                },
                { quoted: msg }
            );
        }
    }
};