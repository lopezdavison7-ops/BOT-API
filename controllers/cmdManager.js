// controllers/cmdManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta absoluta usando process.cwd() (funciona siempre en HidenCloud)
const COMMANDS_DIR = path.join(process.cwd(), 'commands');

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
                    }
                } catch (error) {
                    console.error(`[CMD] ❌ Error en ${fullPath}:`, error.message);
                }
            }
        }
    }

    await readCommands(COMMANDS_DIR);
    console.log(`[CMD] ✅ Total comandos cargados: ${commands.size}`);
    return commands;
}