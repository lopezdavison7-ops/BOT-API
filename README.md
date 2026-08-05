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

## 📱 Instalación en Termux (Android)

1. Instala [Termux](https://f-droid.org/en/packages/com.termux/) desde F-Droid (la versión de Play Store está desactualizada)
2. Actualiza paquetes e instala Node.js y git:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs-lts git -y
   ```
3. Clona el repositorio:
   ```bash
   git clone <URL-de-tu-repo>
   cd <nombre-del-repo>
   ```
4. Instala dependencias:
   ```bash
   npm install
   ```
5. Crea las variables de entorno (reemplaza con tus datos):
   ```bash
   export BOT_PHONE_NUMBER=50499999999
   export ALEX_API_URL=https://alex-api-scraper2-1.onrender.com
   export ALEX_API_KEY=tu_api_key
   ```
6. Inicia el bot:
   ```bash
   npm start
   ```
7. Ingresa el código de emparejamiento en WhatsApp

💡 **Tip:** para que el bot no se detenga al bloquear el celular, instala `termux-wake-lock`:
```bash
termux-wake-lock
```
Y para mantener Termux corriendo en segundo plano sin que Android lo mate, desactiva la optimización de batería para Termux desde Ajustes del sistema.

💡 **Para que siga corriendo aunque cierres Termux**, usa `tmux` o `screen`:
```bash
pkg install tmux -y
tmux new -s bot
npm start
# Ctrl+B luego D para salir sin cerrar el proceso
# tmux attach -t bot   ← para volver a entrar
```

---

## 🖥️ Instalación en VPS (Ubuntu/Debian)

1. Conéctate por SSH a tu VPS:
   ```bash
   ssh usuario@tu-ip-del-vps
   ```
2. Instala Node.js (v18 o superior) y git:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```
3. Clona el repositorio:
   ```bash
   git clone <URL-de-tu-repo>
   cd <nombre-del-repo>
   ```
4. Instala dependencias:
   ```bash
   npm install
   ```
5. Crea un archivo `.env` o exporta las variables:
   ```bash
   export BOT_PHONE_NUMBER=50499999999
   export ALEX_API_URL=https://alex-api-scraper2-1.onrender.com
   export ALEX_API_KEY=tu_api_key
   ```
6. Instala **PM2** para que el bot corra 24/7 y se reinicie solo si se cae:
   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name alex-bot
   pm2 save
   pm2 startup
   ```
7. Revisa el código de emparejamiento:
   ```bash
   pm2 logs alex-bot
   ```
8. Comandos útiles de PM2:
   ```bash
   pm2 restart alex-bot   # reiniciar
   pm2 stop alex-bot      # detener
   pm2 logs alex-bot      # ver logs en vivo
   ```

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

## ⚠️ Solución de problemas

**"No se pudo vincular el dispositivo" / "Vuelve a intentarlo más tarde"**

Esto **no es un error del bot** — es un límite de seguridad que pone WhatsApp cuando detecta varios intentos de vinculación seguidos en poco tiempo (con código o con QR, da igual el método).

Qué hacer:
1. Deja de intentar vincular por unas horas (ideal: de un día para otro)
2. No sigas haciendo Manual Deploy repetidamente mientras tanto — cada intento cuenta
3. Cuando reintentes, hazlo **una sola vez**, con buena señal, y entra al código/QR apenas aparezca
4. El bot ya trae protección automática: si detecta que lleva varios intentos fallidos seguidos, deja de reintentar solo para no empeorar el bloqueo (revisa los Logs, ahí te avisa)

**El código de emparejamiento nunca funciona / dice número incorrecto aunque esté bien**

Confirma que `BOT_PHONE_NUMBER` tenga el número completo con código de país, sin `+`, sin espacios, sin ceros extra (ej: `50499999999`).

**Prefiero usar QR en vez de código**

Pon la variable de entorno `BOT_USAR_QR` = `true`, despliega, y entra a `https://tu-servicio.onrender.com/qr` desde el navegador para escanear el código con la cámara de WhatsApp.

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
