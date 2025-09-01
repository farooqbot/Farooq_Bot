const fs = require("fs");
const axios = require("axios");

// Try to load database.json safely
let database = {};
try {
  database = require("./database.json");
} catch {
  database = {
    handlers: ["!", ".", "/"], // default prefixes
    sudo: [],
    worktype: "public",
    plugins: []
  };
  fs.writeFileSync("./database.json", JSON.stringify(database, null, 2));
}

// Ensure handlers (prefix) is always an array
let PREFIX = Array.isArray(database.handlers) ? database.handlers : [String(database.handlers || "!")];

// Command list
let commands = [];

// Fallback loadModules function
if (typeof global.loadModules !== "function") {
  global.loadModules = function (path, reload, silent) {
    if (!fs.existsSync(path)) return;
    if (!silent) console.log("📦 Modules loaded from:", path);
  };
}

// Watch for changes in database.json
function watchDatabase() {
  try {
    fs.watch("./database.json", () => {
      try { delete require.cache[require.resolve("./database.json")]; } catch {}
      try { database = require("./database.json"); } catch {}
      try { PREFIX = Array.isArray(database.handlers) ? database.handlers : [String(database.handlers || "!")]; } catch {}
      global.handlers = PREFIX;
      global.commands = commands;
      global.database = database;
      commands = [];
      try { global.loadModules(__dirname + "/modules", false, true); } catch {}
    });
  } catch {
    setTimeout(watchDatabase, 2000);
  }
}
watchDatabase();

// Add command function
function addCommand(commandInfo, callback) {
  commands.push({ commandInfo, callback });
}

// Start command function
async function start_command(msg, sock, rawMessage) {
  if (!msg || !sock) return;

  const text = msg?.message?.conversation || msg?.message?.extendedTextMessage?.text;
  if (!text) return;

  let matchedPrefix = false;
  let validText = text;

  for (const prefix of PREFIX) {
    if (text.trimStart().startsWith(prefix)) {
      matchedPrefix = true;
      validText = text.slice(prefix.length).trim();
      break;
    }
  }

  let isCommand = false;
  const sortedCommands = commands.sort((a, b) => b.commandInfo.pattern.length - a.commandInfo.pattern.length);

  for (const { commandInfo } of sortedCommands) {
    if (validText?.match(new RegExp(commandInfo.pattern, "im"))) {
      isCommand = true;
      break;
    }
  }

  if (!isCommand) {
    for (const { commandInfo, callback } of commands) {
      if (commandInfo.pattern === "onMessage" && commandInfo.fromMe !== msg.key?.fromMe) {
        msg.text = text;
        await callback(msg, null, sock, rawMessage);
      }
    }
    return;
  }

  for (const { commandInfo, callback } of sortedCommands) {
    const match = validText?.match(new RegExp(commandInfo.pattern, "im"));
    if (match && matchedPrefix) {
      const groupCheck = msg.key?.remoteJid?.endsWith('@g.us');
      const userId = groupCheck ? msg.key?.participant : msg.key?.remoteJid;
      let permission = false;

      if (msg.key?.fromMe) permission = true;
      else {
        for (const i of database.sudo) {
          if (i + "@s.whatsapp.net" === userId) {
            permission = true;
            break;
          }
        }
      }

      if (!commandInfo.access && commandInfo.fromMe !== msg.key?.fromMe) return;
      if (!permission && database.worktype === "private") return;
      if (commandInfo.access === "sudo" && !permission) return;
      if (commandInfo.notAvaliablePersonelChat && msg.key?.remoteJid === sock.user?.id?.split(':')[0] + "@s.whatsapp.net") return;
      if (commandInfo.onlyInGroups && !groupCheck) return;

      // Plugin handling
      if (commandInfo.pluginId && (global.database.plugins.findIndex(plugin => plugin.id === commandInfo.pluginId) === -1)) {
        global.loadModules(__dirname + "/modules", false, true);
        try {
          let getExitingPluginData = await axios.get("https://create.thena.workers.dev/pluginMarket?id=" + commandInfo.pluginId);
          getExitingPluginData = getExitingPluginData.data;
          global.database.plugins.push({
            name: getExitingPluginData.pluginName,
            version: commandInfo.pluginVersion,
            description: getExitingPluginData.description,
            author: getExitingPluginData.author,
            id: getExitingPluginData.pluginId,
            path: "./modules/" + getExitingPluginData.pluginFileName
          });
        } catch (err) {
          console.log("⚠️ Failed to fetch plugin:", err.message);
        }
      }

      // Plugin update check
      if (commandInfo.pluginVersion && commandInfo.pluginId) {
        try {
          let getPluginUpdate = await axios.get("https://create.thena.workers.dev/pluginMarket");
          getPluginUpdate = getPluginUpdate.data.find(plugin => plugin.pluginId === commandInfo.pluginId);

          if (getPluginUpdate && getPluginUpdate.pluginVersion !== commandInfo.pluginVersion) {
            const editedPl = {
              name: getPluginUpdate.pluginName,
              version: getPluginUpdate.pluginVersion,
              description: getPluginUpdate.description,
              author: getPluginUpdate.author,
              id: getPluginUpdate.pluginId,
              path: "./modules/" + getPluginUpdate.pluginFileName
            };
            global.database.plugins[global.database.plugins.findIndex(plugin => plugin.id === commandInfo.pluginId)] = editedPl;
            fs.writeFileSync("./modules/" + getPluginUpdate.pluginFileName, getPluginUpdate.context);
            global.loadModules(__dirname + "/modules", false, true);

            const updateMsg = `_🆕 ${getPluginUpdate.pluginName} Plugin Updated To ${getPluginUpdate.pluginVersion}._\n\n_Please try again._`;
            if (msg.key?.fromMe) {
              await sock.sendMessage(msg.key.remoteJid, { text: updateMsg, edit: msg.key });
            } else {
              await sock.sendMessage(msg.key.remoteJid, { text: updateMsg }, { quoted: rawMessage?.messages?.[0] });
            }
            return;
          }
        } catch (err) {
          console.log("⚠️ Plugin update check failed:", err.message);
        }
      }

      await callback(msg, match, sock, rawMessage);
      return;
    }
  }
}

// Export globals
global.addCommand = addCommand;
global.start_command = start_command;
global.commands = commands;
global.handlers = PREFIX;
global.database = database;
