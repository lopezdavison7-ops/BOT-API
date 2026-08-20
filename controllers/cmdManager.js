// controllers/cmdManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMANDS_DIR = path.join(__dirname, '../commands');

export async function loadCommands() {
    const commands = new Map();

    async function readCommands(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                await readCommands(fullPath);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                try {
                    // 🔥 IMPORTACIÓN DINÁMICA CORRECTA PARA ES MODULES
                    const module = await import(`file://${fullPath}`);
                    const command = module.default;

                    if (command && command.nombre) {
                        commands.set(command.nombre, command);
                        
                        if (command.alias && Array.isArray(command.alias)) {
                            for (const alias of command.alias) {
                                commands.set(alias, command);
                            }
                        }
                        console.log(`[CMD] ✓ Cargado: ${command.nombre}`);
                    } else {
                        console.warn(`[CMD] ⚠️ Ignorado: ${fullPath} (sin nombre)`);
                    }
                } catch (error) {
                    console.error(`[CMD] ❌ Error en ${fullPath}:`, error.message);
                }
            }
        }
    }

    // Comenzar la carga
    await readCommands(COMMANDS_DIR);
    console.log(`[CMD] ✅ Total comandos cargados: ${commands.size}`);
    return commands;
}