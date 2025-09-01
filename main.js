const Module = require('module');
const originalRequire = Module.prototype.require;
const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

// Ensure required folders exist
["modules", "session", "src"].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Auto-install missing packages (safe fallback for Termux)
const installedPackages = new Set();
Module.prototype.require = function (packageName) {
  try {
    return originalRequire.apply(this, arguments);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && !packageName.startsWith('.')) {
      if (!installedPackages.has(packageName)) {
        console.log(`📦 Package ${packageName} not found. Installing...`);
        const isTermux = process?.env?.PREFIX === '/data/data/com.termux/files/usr';

        try {
          execSync(`npm install ${packageName}`, { stdio: 'ignore' });
          installedPackages.add(packageName);
          return originalRequire.apply(this, arguments);
        } catch (installError) {
          if (isTermux) {
            console.log('⚠️ Termux detected. Skipping unsupported package: ' + packageName);
          } else {
            console.error(`❌ Package install error: ${installError.message}`);
          }
        }
      }
    }
    throw err;
  }
};

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const pino = require('pino');
require('./events');
let currentVersion = "", versionCheckInterval = 180;
let sock;

// Periodic database save + version check
setInterval(async () => {
  try {
    fs.writeFileSync("./database.json", JSON.stringify(global.database, null, 2));
  } catch (err) {
    console.log("⚠️ Failed to save database:", err.message);
  }

  versionCheckInterval--;
  if (versionCheckInterval <= 0) {
    try {
      const getLatestCommit = await axios.get("https://api.github.com/repos/phaticusthiccy/PrimonProto/commits");
      if (!currentVersion) {
        currentVersion = getLatestCommit.data[0].sha;
      } else if (getLatestCommit.data[0].sha !== currentVersion) {
        currentVersion = getLatestCommit.data[0].sha;
        await sock.sendMessage(sock.user.id, {
          image: { url: "./src/new_version.png" },
          caption: "*🆕 New Version Available!*\n\n_Update using_ ```.update```"
        });
      }
    } catch (err) {
      console.log("⚠️ Version check failed:", err.message);
    }
    versionCheckInterval = 180;
  }
}, 5000);

// Logger
const logger = pino({ level: "silent" });

async function Primon() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "session"));

  sock = makeWASocket({
    logger,
    printQRInTerminal: true,
    markOnlineOnConnect: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: state,
    version
  });

  // Connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      if (shouldReconnect) {
        console.log('⚡ Disconnected, reconnecting...');
        Primon();
      } else {
        console.log('❌ QR code was not scanned. Please restart.');
      }
    } else if (connection === 'open') {
      console.log('✅ Connection established.');
      const usrId = sock.user.id;
      const mappedId = usrId.split(':')[0] + "@s.whatsapp.net";
      if (!global.similarity) global.similarity = await import('string-similarity-js');
      await sock.sendMessage(mappedId, {
        text: "_Primon Online!_\n\nUse ```" + global.handlers[0] + "menu``` to see commands."
      });
    }
  });

  // Handle messages
  sock.ev.on("messages.upsert", async (msg) => {
    try {
      if (!msg.messages?.length) return;

      for (let { pushName, key } of msg.messages) {
        if (pushName) {
          const sender = key.participant || (key.fromMe ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : key.remoteJid);
          global.database.users[sender] = pushName;
        }
      }

      const rawMessage = structuredClone(msg);
      msg = msg.messages[0];
      msg.quotedMessage = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (msg.key?.remoteJid === "status@broadcast") return;
      if (global.database.blacklist.includes(msg.key.remoteJid) && !msg.key.fromMe) return;

      // Fix participant field
      if (!msg.key.participant) {
        msg.key.participant = msg.key.fromMe
          ? sock.user.id.split(':')[0] + "@s.whatsapp.net"
          : msg.key.remoteJid;
      }

      // AFK message
      if (global.database.afkMessage.active && (!msg.key.fromMe && !global.database.sudo.includes(msg.key.participant.split('@')[0]))) {
        if (global.database.afkMessage.type === "text") {
          await sock.sendMessage(msg.key.remoteJid, { text: global.database.afkMessage.content });
        } else if (global.database.afkMessage.media) {
          const mediaPath = `./src/afk.${global.database.afkMessage.type}`;
          fs.writeFileSync(mediaPath, global.database.afkMessage.media, "base64");
          const sendOpts = { caption: global.database.afkMessage.content || undefined };
          if (global.database.afkMessage.type === "video") {
            await sock.sendMessage(msg.key.remoteJid, { video: { url: mediaPath }, ...sendOpts }, { quoted: rawMessage.messages[0] });
          } else {
            await sock.sendMessage(msg.key.remoteJid, { image: { url: mediaPath }, ...sendOpts }, { quoted: rawMessage.messages[0] });
          }
          try { fs.unlinkSync(mediaPath); } catch {}
        }
        return;
      }

      await start_command(msg, sock, rawMessage);
    } catch (error) {
      console.log("⚠️ Message handler error:", error);
      try {
        await sock.sendMessage(sock.user.id, { text: `*⚠️ Primon Error:*\n${error}` });
      } catch {}
    }
  });

  // Group welcome / goodbye
  sock.ev.on("group-participants.update", async (participant) => {
    if (global.database.blacklist.includes(participant.id)) return;

    const processMessage = async (msgData, type) => {
      if (!msgData) return;
      if (['image', 'video'].includes(msgData.type) && msgData.media) {
        const mediaPath = `./${type}.${msgData.type}`;
        fs.writeFileSync(mediaPath, msgData.media, "base64");
        const opts = { [msgData.type]: { url: mediaPath }, caption: msgData.content || undefined, mentions: participant.participants };
        await sock.sendMessage(participant.id, opts);
      } else {
        await sock.sendMessage(participant.id, { text: msgData.content, mentions: participant.participants });
      }
    };

    if (participant.action === 'add') {
      await processMessage(global.database.welcomeMessage.find(w => w.chat === participant.id), "welcome");
    } else if (participant.action === 'remove') {
      await processMessage(global.database.goodbyeMessage.find(g => g.chat === participant.id), "goodbye");
    }
  });

  sock.ev.on('creds.update', saveCreds);
  loadModules(path.join(__dirname, "modules"));
}

// Plugin loader
function loadModules(modulePath, logger = true, refresh = false) {
  if (!fs.existsSync(modulePath)) return;
  fs.readdirSync(modulePath).forEach((file) => {
    if (file.endsWith(".js")) {
      if (refresh) {
        delete require.cache[require.resolve(`${modulePath}/${file}`)];
        if (logger) console.log(`🔄 Reloading plugin: ${file}`);
      } else {
        if (logger) console.log(`⚡ Loading plugin: ${file}`);
      }
      try {
        require(`${modulePath}/${file}`);
      } catch (err) {
        console.log(`❌ Failed to load plugin ${file}:`, err.message);
      }
    }
  });
}
global.loadModules = loadModules;
Primon();

// Helpers
global.downloadMedia = async (message, type, filepath) => {
  const stream = await downloadContentFromMessage(
    { url: message.url, directPath: message.directPath, mediaKey: message.mediaKey }, type
  );
  const writeStream = fs.createWriteStream(filepath);
  const { pipeline } = require("stream/promises");
  await pipeline(stream, writeStream);
};

global.checkAdmin = async function (msg, sock, groupId, number = false) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const target = number ? number : sock.user.id.split(":")[0] + "@s.whatsapp.net";
    return groupMetadata.participants.some(p => p.id === target && p.admin);
  } catch (error) {
    console.error("⚠️ Error checking admin status:", error.message);
    return false;
  }
};

global.getAdmins = async function (groupId) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    return groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
  } catch (error) {
    console.error("⚠️ Error getting admins:", error.message);
    return [];
  }
};

global.downloadarraybuffer = async function (url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return response.data;
  } catch {
    return "";
  }
};

Object.defineProperty(global, "sock", {
  get: () => sock,
  set: (newSock) => { sock = newSock; },
  configurable: true
});
