<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=28&pause=1000&color=25D366&center=true&vCenter=true&width=500&lines=ALEX+BOT+%F0%9F%A4%96;Bot+de+WhatsApp+Multifuncional;Hecho+con+Baileys+%2B+Node.js" alt="Typing SVG" />

![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?style=for-the-badge&logo=node.js&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![Status](https://img.shields.io/badge/Estado-Activo-brightgreen?style=for-the-badge)

</div>

---

## ✨ ¿Qué es ALEX BOT?

Bot de WhatsApp modular conectado a la **ALEX SCRAPER API**. Descarga videos, genera imágenes, juega contigo, te avisa el clima y mucho más — todo desde un chat de WhatsApp.

Arquitectura **100% modular**: cada comando vive en su propio archivo dentro de `commands/`, así que agregar uno nuevo es tan fácil como crear un archivo más.

---

## 🚀 Comandos disponibles

| Comando | Alias | Qué hace |
|---|---|---|
| `.menu` | `.ayuda` `.help` | Muestra todos los comandos disponibles |
| `.tiktok <link>` | — | Descarga video de TikTok sin marca de agua |
| `.ytmp4 <link/texto>` | `.yt` `.video` | Descarga video de YouTube |
| `.ytmp3 <link/texto>` | `.musica` | Descarga audio de YouTube |
| `.qr <texto>` | — | Genera un código QR |
| `.clima <ciudad>` | `.tiempo` | Clima actual de cualquier ciudad |
| `.traducir <texto>\|<idioma>` | `.tr` | Traduce texto a otro idioma |
| `.password <longitud>` | `.clave` | Genera una contraseña segura |
| `.identificar <link>` | `.id` | Detecta de qué plataforma es un link |
| `.animefrase` | `.frase` | Frase random de anime |
| `.animememe` | `.meme` | Meme random de anime |
| `.reaccion <tipo>` | — | GIF de reacción anime (hug, pat, wave...) |
| `.gacha` | `.tirada` `.roll` | Tirada gacha con rareza random 🟡🟣🔵⚪ |
| `.encuesta <pregunta\|op1\|op2>` | `.poll` | Crea una encuesta real de WhatsApp |
| `.recordatorio <min\|mensaje>` | `.recordar` | Te manda un recordatorio en X minutos |
| `.ppt <piedra/papel/tijera>` | `.piedrapapeltijera` | Piedra, papel o tijera contra el bot |
| `.avatar <número>` | `.foto` `.pfp` | Foto de perfil de un contacto |
| `.stats` | `.estadisticas` | Estadísticas de uso del bot |
| `.ping` | — | Velocidad de respuesta del bot |

---

## ⚙️ Instalación

1. Clona o descarga este repositorio
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno (ver tabla abajo)
4. Inicia el bot:
   ```bash
   npm start
   ```
5. En consola aparecerá un **código de emparejamiento** de 8 dígitos
6. En WhatsApp: **Ajustes → Dispositivos vinculados → Vincular con número de teléfono** → ingresa el código

---

## 🔑 Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `BOT_PHONE_NUMBER` | Número del bot, con código de país, sin `+` | `50499999999` |
| `ALEX_API_URL` | URL de la ALEX SCRAPER API | `https://alex-api-scraper2-1.onrender.com` |
| `ALEX_API_KEY` | API key de tu cuenta en la API | `alx_xxxxxxxx` |

---

## ☁️ Deploy en Render

1. Sube este repo a GitHub
2. Crea un **Web Service** nuevo en Render conectado al repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Agrega las variables de entorno de la tabla anterior
6. Deploy → revisa **Logs** para ver el código de emparejamiento
7. (Opcional) Agrega un monitor en [UptimeRobot](https://uptimerobot.com) apuntando a la URL del servicio para que no se duerma

---

## 📁 Estructura del proyecto

```
bot/
├── index.js              # Conexión a WhatsApp (Baileys)
├── handler.js             # Router de comandos
├── lib/
│   ├── api.js               # Conexión con ALEX SCRAPER API
│   ├── responder.js          # Helpers para responder (texto/imagen/video/audio)
│   └── estadisticas.js       # Contador de uso de comandos
└── commands/               # Un archivo por comando
```

---

<div align="center">

Hecho con 💚 y mucho café

</div>
