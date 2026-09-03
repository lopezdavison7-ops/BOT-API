// ============================================================
// BOT-API
// COMANDO: REPORT
// ============================================================
// Permite a los usuarios reportar errores o problemas del bot.
//
// Uso:
// .report <mensaje>
//
// Los reportes son enviados automáticamente al grupo definido
// en REPORT_GROUP_JID.
// ============================================================

// ============================================================
// CONFIGURACIÓN
// ============================================================

const REPORT_GROUP_JID =
    '120363429140811226@g.us';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function obtenerUsuario(msg, isGroup) {

    if (isGroup) {

        return (
            msg?.key?.participantAlt ||
            msg?.key?.participant ||
            msg?.key?.remoteJid ||
            null
        );
    }

    return (
        msg?.key?.remoteJidAlt ||
        msg?.key?.remoteJid ||
        msg?.key?.participant ||
        null
    );
}

// ============================================================
// NORMALIZAR JID
// ============================================================

function obtenerNumero(jid) {

    if (!jid) {
        return 'Desconocido';
    }

    const numero =
        String(jid)
            .split('@')[0]
            .split(':')[0]
            .replace(/\D/g, '');

    return numero || 'Desconocido';
}

// ============================================================
// OBTENER NOMBRE
// ============================================================

function obtenerNombre(msg) {

    return (
        msg?.pushName ||
        msg?.verifiedBizName ||
        'Usuario'
    );
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'report',

    categoria: 'Sistema',

    alias: [
        'reporte',
        'bug',
        'reportar'
    ],

    descripcion:
        'Envía un reporte al grupo de soporte del bot.',

    ejecutar: async ({
        msg,
        sock,
        responder,
        argumento,
        isGroup
    }) => {

        try {

            // ==================================================
            // COMPROBAR REPORTE
            // ==================================================

            const reporte =
                String(
                    argumento || ''
                ).trim();

            if (!reporte) {

                await responder.texto(
                    `╭〔 🚨 𝐑𝐄𝐏𝐎𝐑𝐓𝐄 〕⬣\n` +
                    `┃\n` +
                    `┃ ❌ Debes escribir el problema\n` +
                    `┃ que quieres reportar.\n` +
                    `┃\n` +
                    `┃ 📌 Ejemplo:\n` +
                    `┃ .report El comando .tiktok no funciona\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );

                return;
            }

            // ==================================================
            // DATOS DEL USUARIO
            // ==================================================

            const usuario =
                obtenerUsuario(
                    msg,
                    isGroup
                );

            const numero =
                obtenerNumero(
                    usuario
                );

            const nombre =
                obtenerNombre(
                    msg
                );

            const chatJid =
                msg?.key?.remoteJid ||
                'Desconocido';

            const tipoChat =
                isGroup
                    ? 'Grupo'
                    : 'Privado';

            // ==================================================
            // MENCIÓN
            // ==================================================

            const mentionJid =
                usuario &&
                String(usuario)
                    .endsWith(
                        '@s.whatsapp.net'
                    )
                    ? usuario
                    : null;

            const textoUsuario =
                mentionJid
                    ? `@${numero}`
                    : nombre;

            // ==================================================
            // MENSAJE DEL REPORTE
            // ==================================================

            const mensajeReporte =

                `╭〔 🚨 𝐍𝐔𝐄𝐕𝐎 𝐑𝐄𝐏𝐎𝐑𝐓𝐄 〕⬣\n` +
                `┃\n` +
                `┃ 👤 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 › ${textoUsuario}\n` +
                `┃ 📱 𝐍𝐔𝐌𝐄𝐑𝐎 › @${numero}\n` +
                `┃ 💬 𝐓𝐈𝐏𝐎 𝐃𝐄 𝐂𝐇𝐀𝐓 › ${tipoChat}\n` +
                `┃ 🆔 𝐉𝐈𝐃 › ${chatJid}\n` +
                `┃\n` +
                `┃ 📝 𝐑𝐄𝐏𝐎𝐑𝐓𝐄:\n` +
                `┃ ${reporte}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

            // ==================================================
            // ENVIAR AL GRUPO DE REPORTES
            // ==================================================

            const opciones = {};

            if (mentionJid) {

                opciones.mentions = [
                    mentionJid
                ];
            }

            await sock.sendMessage(
                REPORT_GROUP_JID,
                {
                    text:
                        mensajeReporte,
                    ...opciones
                }
            );

            // ==================================================
            // CONFIRMACIÓN AL USUARIO
            // ==================================================

            await responder.texto(
                `╭〔 ✅ 𝐑𝐄𝐏𝐎𝐑𝐓𝐄 𝐄𝐍𝐕𝐈𝐀𝐃𝐎 〕⬣\n` +
                `┃\n` +
                `┃ 📩 Tu reporte fue enviado\n` +
                `┃ correctamente al equipo.\n` +
                `┃\n` +
                `┃ 📝 Problema:\n` +
                `┃ ${reporte}\n` +
                `┃\n` +
                `┃ 🛠️ Gracias por ayudar a mejorar\n` +
                `┃ BOT-API.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

            console.log(
                `[REPORT] Nuevo reporte de ${numero}: ${reporte}`
            );

        } catch (error) {

            console.error(
                '[REPORT] Error:',
                error
            );

            try {

                await responder.texto(
                    '❌ No se pudo enviar el reporte. Inténtalo nuevamente.'
                );

            } catch {}
        }
    }
};