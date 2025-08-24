const fs = require("fs");
const path = require("path");

// 🔹 Load all plugins dynamically
const pluginsPath = path.join(__dirname, "plugins");
const plugins = {};

fs.readdirSync(pluginsPath).forEach(file => {
  if (file.endsWith(".js")) {
    const plugin = require(path.join(pluginsPath, file));
    plugins[plugin.name] = plugin;
    console.log(`✅ Plugin loaded: ${plugin.name}`);
  }
});

// 🔹 Fake WhatsApp message handler (replace with real bot handler)
async function handleMessage(message) {
  if (!message.startsWith(".")) return; // all commands start with .
  
  const args = message.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (plugins[command]) {
    await plugins[command].run({ reply: console.log }, args);
  } else {
    console.log("❌ Unknown command:", command);
  }
}

// 🔹 Test messages
console.log("✅ Farooq_Bot is ready for commands!");
handleMessage(".hello");   // should reply from hello plugin
handleMessage(".ping");    // if you create a ping.js plugin
