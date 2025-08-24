const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  // Show QR for login
  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("📱 Scan this QR with WhatsApp:");
      console.log(qr);
    }
    if (connection === "open") {
      console.log("✅ Farooq_Bot connected to WhatsApp!");
    }
  });

  // Load plugins
  const pluginsPath = path.join(__dirname, "plugins");
  const plugins = {};
  fs.readdirSync(pluginsPath).forEach(file => {
    if (file.endsWith(".js")) {
      const plugin = require(path.join(pluginsPath, file));
      plugins[plugin.name] = plugin;
      console.log(`✅ Plugin loaded: ${plugin.name}`);
    }
  });

  // Listen for messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (!body.startsWith(".")) return;

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (plugins[command]) {
      await plugins[command].run(
        { reply: (text) => sock.sendMessage(msg.key.remoteJid, { text }) },
        args
      );
    }
  });
}

startBot();
