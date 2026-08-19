// commands/update.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default {
    nombre: 'update',
    categoria: 'Owner',
    alias: ['actualizar'],
    descripcion: 'Actualiza el bot desde Git y muestra los cambios',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // 1. Enviar mensaje de "Actualizando..."
            const mensajeInicial = `🔄 *ACTUALIZANDO...*\n\n⏳ Buscando cambios en el repositorio...`;
            const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: mensajeInicial }, { quoted: msg });

            // Guardar el ID del mensaje para editarlo después
            const messageId = sentMsg.key.id;

            // 2. Ejecutar git pull
            let cambios = '';
            let errorMsg = '';
            
            try {
                const { stdout, stderr } = await execAsync('git pull');
                cambios = stdout || stderr;
                if (!cambios) cambios = '✅ No hubo cambios nuevos.';
            } catch (error) {
                errorMsg = '❌ Error al ejecutar git pull. Verifica que tengas Git instalado y el repositorio configurado.';
                console.error('[UPDATE] Error:', error);
            }

            // 3. Editar el mismo mensaje con el resultado
            let textoFinal = `✅ *ACTUALIZACIÓN COMPLETADA*\n\n`;

            if (errorMsg) {
                textoFinal += errorMsg;
            } else {
                // Limpiar la salida de git pull
                const cambiosLimpios = cambios
                    .replace(/From https:\/\/github\.com\/[\w\-]+\/[\w\-]+\.git/g, '')
                    .replace(/remote: Enumerating objects:.*/g, '')
                    .replace(/remote: Counting objects:.*/g, '')
                    .replace(/remote: Compressing objects:.*/g, '')
                    .replace(/remote: Total.*/g, '')
                    .replace(/Unpacking objects:.*/g, '')
                    .replace(/Checking out files:.*/g, '')
                    .trim();

                if (cambiosLimpios.includes('Already up to date')) {
                    textoFinal += `📂 El bot ya está en la última versión.\n\n✅ No se aplicaron cambios.`;
                } else {
                    textoFinal += `📂 Cambios aplicados:\n\`\`\`\n${cambiosLimpios || 'No se detectaron cambios específicos.'}\n\`\`\`\n\n🔄 El bot está listo.`;
                }
            }

            // 4. Editar el mensaje original
            await sock.sendMessage(msg.key.remoteJid, {
                text: textoFinal,
                edit: {
                    key: {
                        remoteJid: msg.key.remoteJid,
                        fromMe: true,
                        id: messageId
                    }
                }
            });

            console.log('[UPDATE] Mensaje actualizado correctamente.');

        } catch (error) {
            console.error('[UPDATE] Error:', error);
            await responder.texto('❌ Error al ejecutar la actualización.');
        }
    }
};