// handler.js
import { loadCommands } from './controllers/cmdManager.js';
import { revisarAntilink } from './lib/antilink.js';
import { verificarPermisosAdmin } from './lib/grupos.js';

const PREFIJO = '.';

let comandos = null;
let botJid = null;

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
}

export async function handleMessage(sock, msg, prefijo = '.', listaComandos = []) {
    try {
        if (!comandos) {
            comandos = await loadCommands();
        }

        if (!botJid) botJid = sock.user.id;

        if (!msg.message) return;
        if (msg.key.remoteJid === 'status@broadcast') return;

        const jid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = jid?.endsWith('@g.us');

        // ============================================
        // ANTILINK — SOLO ENLACES DE WHATSAPP
        // ============================================
        if (isGroup && !fromMe) {
            let esAdmin = false;

            try {
                const permiso = await verificarPermisosAdmin(sock, msg, jid);
                esAdmin = Boolean(permiso?.ok);
            } catch (error) {
                console.error('[ANTILINK] Error comprobando admin:', error?.message || error);
            }

            const bloqueado = await revisarAntilink(sock, msg, esAdmin);

            if (bloqueado) return;
        }

        // ============================================
        // SACAR TEXTO - AHORA LEE BOTONES INTERACTIVOS
        // ============================================
        let texto = '';

        if (msg.message?.conversation) {
            texto = msg.message.conversation;
        }
        else if (msg.message?.extendedTextMessage?.text) {
            texto = msg.message.extendedTextMessage.text;
        }
        else if (msg.message?.imageMessage?.caption) {
            texto = msg.message.imageMessage.caption;
        }
        else if (msg.message?.videoMessage?.caption) {
            texto = msg.message.videoMessage.caption;
        }
        // BOTONES INTERACTIVOS NUEVOS - TU MENU SENKU
        else if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const json = JSON.parse(
                    msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
                );
                texto = json.id || '';
            } catch {}
        }
        // LISTAS VIEJAS
        else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            texto = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        }

        if (!texto) return;

        // ============================================
        // FIX: ACEPTAR SOLO NUMERO "1" "2" "3"
        // ============================================
        if (/^\d+$/.test(texto.trim())) {
            const num = parseInt(texto.trim());
            const mapa = global.menuMap?.[jid];
            if (mapa && mapa[num]) {
                const catSeleccionada = mapa[num];
                texto = `${prefijo}menu ${catSeleccionada}`;
            }
        }

        if (!texto.startsWith(prefijo)) return;

        // ============================================
        // SEPARAR COMANDO Y ARGUMENTO
        // ============================================
        const sinPrefijo = texto.slice(prefijo.length).trim();
        const indiceEspacio = sinPrefijo.search(/\s/);

        const nombreComando = (
            indiceEspacio === -1
                ? sinPrefijo
                : sinPrefijo.slice(0, indiceEspacio)
        ).toLowerCase();

        const argumento =
            indiceEspacio === -1
                ? ''
                : sinPrefijo.slice(indiceEspacio + 1);

        const args = argumento ? argumento.split(' ') : [];

        // ============================================
        // FIX: ACEPTAR .menu 1
        // ============================================
        if (nombreComando === 'menu' && args[0] && !isNaN(args[0])) {
            const num = parseInt(args[0]);
            const mapa = global.menuMap?.[jid];
            if (mapa && mapa[num]) {
                args[0] = mapa[num];
            }
        }

        // ============================================
        // BUSCAR COMANDO O ALIAS
        // ============================================
        let cmd = comandos.get(nombreComando);
        if (!cmd) {
            cmd = [...comandos.values()].find(
                c => c.alias?.includes(nombreComando)
            );
        }
        if (!cmd) return;

        await cmd.ejecutar({
            sock,
            msg,
            args,
            argumento,
            listaComandos,
            prefijo,
            fromMe,
            isGroup,
            jid,
            botJid,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(
                        jid,
                        { text },
                        { quoted: msg }
                    );
                },
                imagen: async (img, caption = '') => {
                    await sock.sendMessage(
                        jid,
                        { image: img, caption },
                        { quoted: msg }
                    );
                },
                video: async (vid, caption = '') => {
                    await sock.sendMessage(
                        jid,
                        { video: vid, caption },
                        { quoted: msg }
                    );
                },
                audio: async (aud, ptt = true) => {
                    await sock.sendMessage(
                        jid,
                        {
                            audio: aud,
                            mimetype: 'audio/mpeg',
                            ptt
                        },
                        { quoted: msg }
                    );
                }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);

        if (!msg.key.fromMe) {
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `❌ Error: ${error.message}`
                },
                { quoted: msg }
            );
        }
    }
}
