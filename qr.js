const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const readline = require('readline');

let openedSocket = false;
let chat_count = 0;
let countdown = 150;

// Don’t auto-delete session every time (manual reset if needed)
// try { fs.rmSync('./session', { recursive: true, force: true }); } catch {}

const logger = pino({ level: "silent" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
rl.question("Login with QR code (1) or Phone Number (2)\n\n⚠️ QR is recommended :: ", async (answer) => {
  console.clear();
  rl.question("Are you logged in on another device? (y/n)\n\n >> ", async (answer2) => {
    console.clear();
    if (answer2 === "y") {
      console.log("❌ Please logout from all devices before logging in.");
      process.exit(1);
    } else if (answer2 === "n") {
      if (answer === "2") {
        rl.question("Enter your phone number (e.g. 919876543210)\n\n >> ", async (number) => {
          await loginWithPhone(number);
        });
      } else {
        genQR(true);
      }
    }
  });
});

async function genQR(qr, retries = 0) {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./session/');

  const sock = makeWASocket({
    logger,
    auth: state,
    version,
    getMessage: async () => {}
  });

  if (!qr && !sock.authState.creds.registered) {
    console.log("⚠️ You must use QR code to login at least once.");
    process.exit(1);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr: qrCode } = update;
    if (qrCode) {
      console.log("📸 Scan this QR code with WhatsApp:");
      qrcode.generate(qrCode, { small: true });
    }
    if (connection === "connecting") {
      console.log("🔄 Connecting to WhatsApp...");
    } else if (connection === 'open') {
      console.log("✅ Connected successfully!");
      openedSocket = true;
      try {
        const chats = await sock.groupFetchAllParticipating();
        chat_count = Object.keys(chats).length || 1;
      } catch {
        chat_count = 1;
      }
      countdown = Math.max(150, chat_count * 3);
      fs.writeFileSync('.started', '1');
    } else if (connection === 'close') {
      if (retries < 5) {
        console.log("⚠️ Connection closed. Retrying...");
        await delay(5000);
        await genQR(qr, retries + 1);
      } else {
        console.log("❌ Too many reconnect attempts. Please restart.");
        process.exit(1);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

async function loginWithPhone(phoneNumber) {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./session/');

  const sock = makeWASocket({
    logger,
    auth: state,
    version,
    getMessage: async () => {}
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;
    if (connection === 'open') {
      console.log('✅ Logged in successfully!');
      openedSocket = true;
      try {
        const chats = await sock.groupFetchAllParticipating();
        chat_count = Object.keys(chats).length || 1;
      } catch {
        chat_count = 1;
      }
      countdown = Math.max(150, chat_count * 3);
      fs.writeFileSync('.started', '1');
    } else if (connection === 'close') {
      console.log("⚠️ Connection lost. Retrying...");
      await delay(5000);
      await loginWithPhone(phoneNumber);
    } else if (!connection && !sock.authState.creds.registered) {
      let pairingCode = await sock.requestPairingCode(phoneNumber);
      pairingCode = pairingCode.slice(0, 4) + "-" + pairingCode.slice(4);
      console.log(`📲 Your WhatsApp pairing code: ${pairingCode}`);
      console.log("➡️ Enter this in WhatsApp under 'Linked Devices'.");
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

setInterval(() => {
  if (!openedSocket || chat_count <= 0) return;
  if (!fs.existsSync('.started')) return;

  console.log(`⏳ Bot syncing messages... ${ (countdown/10).toFixed(2) }s left | Chats: ${chat_count}`);
  countdown--;

  if (countdown < 0) {
    console.log("⚠️ Countdown finished. Run `pm2 start main.js` to start the bot.");
    process.exit(1);
  }
}, 1000);
