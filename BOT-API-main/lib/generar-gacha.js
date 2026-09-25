import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = path.join(__dirname, '..');

const IMAGENES = path.join(
    BASE,
    'media',
    'gacha',
    'jpg'
);

const DATABASE = path.join(
    BASE,
    'database',
    'gacha.json'
);

const NOMBRES_MASCULINOS = [
    'AKIRA KUROSAKI',
    'REN KAZEHARA',
    'AKIO RYUZAKI',
    'HARU TAKAMORI',
    'KAI HOSHINO',
    'REI KAZUKI',
    'SORA KAMISHIRO',
    'YUTO SHINOMIYA',
    'TAIGA KURODA',
    'RINTO AMAGI'
];

const NOMBRES_FEMENINOS = [
    'YUNA HOSHIKAWA',
    'MIKA TSUKISHIRO',
    'SAKURA AMAMIYA',
    'HANA KUROSAKI',
    'REINA KAZEHARA',
    'AI SHINOMIYA',
    'MIO TAKAMORI',
    'RINA HOSHINO',
    'YUKI AMAGI',
    'MEI KAMISHIRO'
];

const SERIES = [
    'Crimson Eclipse',
    'Sakura Memories',
    'Shadow Blade',
    'Frozen Hearts',
    'Moonlight Academy',
    'Neon Destiny',
    'Celestial Warriors',
    'Dark Horizon',
    'Phantom Requiem',
    'Starfall Chronicles'
];

function elegir(lista) {
    return lista[
        Math.floor(
            Math.random() * lista.length
        )
    ];
}

function generarValor() {
    const valores = [
        1200,
        2500,
        3800,
        4660,
        5200,
        6800,
        8500,
        10000,
        12400,
        15000,
        18000,
        25000
    ];

    return elegir(valores);
}

if (!fs.existsSync(IMAGENES)) {
    console.error(
        '❌ No existe media/gacha/jpg/'
    );
    process.exit(1);
}

fs.mkdirSync(
    path.dirname(DATABASE),
    {
        recursive: true
    }
);

let datos = {};

if (fs.existsSync(DATABASE)) {
    try {
        datos = JSON.parse(
            fs.readFileSync(
                DATABASE,
                'utf8'
            )
        );
    } catch {
        datos = {};
    }
}

const archivos = fs
    .readdirSync(IMAGENES)
    .filter(
        archivo =>
            /\.(jpg|jpeg)$/i.test(
                archivo
            )
    );

let nuevos = 0;

for (const archivo of archivos) {

    if (datos[archivo]) {
        continue;
    }

    const femenino =
        Math.random() < 0.5;

    datos[archivo] = {
        nombre: femenino
            ? elegir(NOMBRES_FEMENINOS)
            : elegir(NOMBRES_MASCULINOS),

        genero: femenino
            ? 'Femenino'
            : 'Masculino',

        serie: elegir(SERIES),

        valor: generarValor()
    };

    nuevos++;
}

fs.writeFileSync(
    DATABASE,
    JSON.stringify(
        datos,
        null,
        2
    ),
    'utf8'
);

console.log(
    `✅ Gacha actualizado.`
);

console.log(
    `🎴 Imágenes encontradas: ${archivos.length}`
);

console.log(
    `✨ Cartas nuevas creadas: ${nuevos}`
);

console.log(
    `📁 Datos: database/gacha.json`
);
