import fs from 'fs';
import path from 'path';

const ARCHIVO = path.join(process.cwd(), 'database', 'despedida.json');

const OWNERS_PRINCIPALES = ['50578391933', '50577455383'];

function asegurarArchivo() {
    const carpeta = path.dirname(ARCHIVO);
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
    if (!fs.existsSync(ARCHIVO)) fs.writeFileSync(ARCHIVO, JSON.stringify({}, null, 2));
}

function leerConfig() {
    asegurarArchivo();
    try {
        return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8') || '{}');
    } catch (e) {
        console.error('[DESPEDIDA] Error leyendo:', e);
        return {};
    }
}

function guardarConfig(cfg) {
    asegurarArchivo();
    fs.writeFileSync(ARCHIVO, JSON.stringify(cfg, null, 2));
}

function normalizar(valor) {
    if (typeof valor === 'boolean') return { activa: valor, mensaje: null };
    if (valor && typeof valor === 'object') {
        return {
            activa: Boolean(valor.activa),
            mensaje: typeof valor.mensaje === 'string' ? valor.mensaje : null
        };
    }
    return { activa: false, mensaje: null };
}

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function despedidaActivada(grupoId) {
    if (!grupoId) return false;
    return normalizar(leerConfig()[grupoId]).activa;
}

export function establecerDespedida(grupoId, estado) {
    if (!grupoId) return false;
    const cfg = leerConfig();
    const actual = normalizar(cfg[grupoId]);
    actual.activa = Boolean(estado);
    cfg[grupoId] = actual;
    guardarConfig(cfg);
    return actual.activa;
}

export function obtenerMensajeDespedida(grupoId) {
    if (!grupoId) return null;
    return normalizar(leerConfig()[grupoId]).mensaje;
}

export function establecerMensajeDespedida(grupoId, mensaje) {
    if (!grupoId) return false;
    const cfg = leerConfig();
    const actual = normalizar(cfg[grupoId]);
    actual.mensaje = mensaje;
    cfg[grupoId] = actual;
    guardarConfig(cfg);
    return true;
}

export function construirDespedida({ jid, userJid, userName, groupName, membersCount }) {
    const mensaje = obtenerMensajeDespedida(jid);
    const userNum = numeroVisible(userJid);

    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    if (mensaje) {
        const texto = mensaje
            .replace(/@user/g, '@' + userNum)
            .replace(/@name/g, userName || userNum)
            .replace(/@group/g, groupName || 'este grupo')
            .replace(/@members/g, String(membersCount || 0))
            .replace(/@date/g, fecha);

        return { texto, mentions: [userJid], personalizado: true };
    }

    const texto =
        '╭━━━〔 👋 *DESPEDIDA* 〕━━━╮\n' +
        '┃\n' +
        `┃ 👤 *${userName || '+' + userNum}*\n` +
        '┃\n' +
        '┃ Ha salido del grupo.\n' +
        '┃\n' +
        '┃ 👋 ¡Hasta pronto!\n' +
        '┃ Te deseamos lo mejor.\n' +
        '┃\n' +
        `┃ 📍 ${groupName || 'este grupo'}\n` +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
        '              🤖 *BOT-API*';

    return { texto, mentions: [userJid], personalizado: false };
}

async function esOwner(sock, msg) {
    const candidatos = [
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.sender, msg.key.remoteJid
    ].filter(Boolean);

    for (const c of candidatos) {
        if (OWNERS_PRINCIPALES.includes(numeroVisible(c))) return true;
    }

    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn && OWNERS_PRINCIPALES.includes(numeroVisible(pn))) return true;
            }
        }
    } catch (e) {}

    return false;
}

async function esAdmin(sock, jid, sender) {
    try {
        const meta = await sock.groupMetadata(jid);
        const num = numeroVisible(sender);
        for (const p of meta.participants || []) {
            if (numeroVisible(p.id) === num) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }
    } catch (e) {}
    return false;
}

function obtenerNombre(sock, metadata, participanteJid) {
    try {
        const limpioParticipante = String(participanteJid).split('@')[0].split(':')[0];

        const participanteMetadata = metadata?.participants?.find(item => {
            const itemJid = typeof item === 'string'
                ? item
                : (item?.phoneNumber || item?.jid || item?.id || item?.participant || '');
            return String(itemJid).split('@')[0].split(':')[0] === limpioParticipante;
        });

        const contactos = [
            sock?.store?.contacts?.[participanteJid],
            sock?.store?.contacts?.[participanteJid.split(':')[0]]
        ];

        const nombres = [
            participanteMetadata?.name,
            participanteMetadata?.notify,
            participanteMetadata?.verifiedName
        ];

        for (const contacto of contactos) {
            if (!contacto) continue;
            nombres.push(contacto.name, contacto.notify, contacto.verifiedName);
        }

        for (const nombre of nombres) {
            if (
                typeof nombre === 'string' &&
                nombre.trim() &&
                nombre.trim() !== '[object Object]' &&
                !/^\+?\d+$/.test(nombre.trim())
            ) {
                let n = nombre.trim();
                if (n.length > 35) n = n.slice(0, 35) + '…';
                return n;
            }
        }
    } catch (e) {}

    const num = numeroVisible(participanteJid);
    return num ? `+${num}` : 'Usuario';
}

export default {
    nombre: 'despedida',
    categoria: 'Grupos',
    alias: ['setdespedida', 'bye', 'adios'],
    descripcion: 'Activa, desactiva y personaliza las despedidas del grupo',
    uso: '.despedida on | off | <mensaje> | reset',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        if (!jid?.endsWith('@g.us')) {
            return await responder.texto('❌ Este comando solo funciona en grupos.');
        }

        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;
        const owner = await esOwner(sock, msg);
        const admin = owner ? true : await esAdmin(sock, jid, sender);

        if (!admin) {
            return await responder.texto(
                '╭━━〔  𝐀𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Solo *admins* o el *Owner*\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const opcion = String(argumento || '').trim();

        if (!opcion) {
            const activa = despedidaActivada(jid);
            const mensaje = obtenerMensajeDespedida(jid);

            return await responder.texto(
                '╭━━〔 👋 𝐄𝐒𝐏𝐄𝐃𝐈𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ Estado: ' + (activa ? '🟢 ACTIVADA' : '🔴 DESACTIVADA') + '\n' +
                '┃ Mensaje: ' + (mensaje ? '📝 Personalizado' : '🤖 Por defecto') + '\n' +
                (mensaje ? '┃\n┃  ' + mensaje + '\n' : '') +
                '┃\n' +
                '┃ Comandos:\n' +
                '┃ • .despedida on\n' +
                '┃ • .despedida off\n' +
                '┃ • .despedida <mensaje>\n' +
                '┃ • .despedida reset\n' +
                '┃\n' +
                '┃ Variables:\n' +
                '┃ @user @name @group\n' +
                '┃ @members @date\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
        }

        const baja = opcion.toLowerCase();

        if (['on', 'activar', 'encender'].includes(baja)) {
            establecerDespedida(jid, true);
            return await responder.texto(
                '╭━━〔 👋 𝐃𝐄𝐒𝐏𝐄𝐃𝐈𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🟢 Sistema activado.\n' +
                '┃ Las salidas serán anunciadas\n' +
                '┃ automáticamente.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        if (['off', 'desactivar', 'apagar'].includes(baja)) {
            establecerDespedida(jid, false);
            return await responder.texto(
                '╭━━〔 👋 𝐃𝐄𝐒𝐏𝐄𝐃𝐈𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔴 Sistema desactivado.\n' +
                '┃ Ya no se enviarán despedidas.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        if (['reset', 'default', 'eliminar'].includes(baja)) {
            establecerMensajeDespedida(jid, null);
            return await responder.texto(
                '╭━━〔  𝐃𝐄𝐏𝐄𝐃𝐈𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔄 Mensaje restaurado al\n' +
                '┃    *por defecto*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        if (opcion.length > 1000) {
            return await responder.texto('❌ Máximo 1000 caracteres.');
        }

        establecerMensajeDespedida(jid, opcion);
        establecerDespedida(jid, true);

        return await responder.texto(
            '╭━━〔 👋 𝐃𝐄𝐒𝐏𝐄𝐃𝐈𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ 💾 Mensaje guardado:\n' +
            '┃\n' +
            '┃ ' + opcion + '\n' +
            '┃\n' +
            '┃ 🟢 Despedida activada\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};

export async function manejarDespedida(sock, update) {
    const { id, participants, action } = update;

    if (action !== 'remove') return;
    if (!id?.endsWith('@g.us')) return;
    if (!Array.isArray(participants) || !participants.length) return;

    if (!despedidaActivada(id)) return;

    let metadata;
    try {
        metadata = await sock.groupMetadata(id);
    } catch (error) {
        console.error('[DESPEDIDA] Error obteniendo grupo:', error?.message || error);
        return;
    }

    const nombreGrupo = metadata?.subject || 'este grupo';
    const membersCount = metadata?.participants?.length || 0;

    for (const participante of participants) {
        try {
            const participanteJid = typeof participante === 'string'
                ? participante
                : (participante?.phoneNumber || participante?.jid || participante?.id || participante?.participant || '');

            if (!participanteJid) continue;

            const nombreUsuario = obtenerNombre(sock, metadata, participanteJid);

            const w = construirDespedida({
                jid: id,
                userJid: participanteJid,
                userName: nombreUsuario,
                groupName: nombreGrupo,
                membersCount
            });

            let fotoPerfil = null;
            try {
                fotoPerfil = await sock.profilePictureUrl(participanteJid, 'image');
            } catch {
                fotoPerfil = null;
            }

            if (fotoPerfil) {
                try {
                    const respuesta = await fetch(fotoPerfil);
                    if (respuesta.ok) {
                        const datos = await respuesta.arrayBuffer();
                        const buffer = Buffer.from(datos);

                        if (buffer.length > 0) {
                            await sock.sendMessage(id, {
                                image: buffer,
                                caption: w.texto,
                                mentions: w.mentions
                            });
                            continue;
                        }
                    }
                } catch (error) {
                    console.error('[DESPEDIDA] Error descargando foto:', error?.message || error);
                }
            }

            await sock.sendMessage(id, {
                text: w.texto,
                mentions: w.mentions
            });

        } catch (error) {
            console.error('[DESPEDIDA] Error procesando salida:', error?.message || error);
        }
    }
}