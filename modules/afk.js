const fs = require('fs');
const path = require('path');

// Path to AFK database
const afkDB = path.join(__dirname, 'afk.json');

// List of authorized users (JIDs) who can set AFK
const ADMINS = ["919xxxxxxxxx@s.whatsapp.net"]; // Replace with your WhatsApp number(s)

// Load AFK data
function loadAFK() {
    if (!fs.existsSync(afkDB)) return {};
    return JSON.parse(fs.readFileSync(afkDB));
}

// Save AFK data
function saveAFK(data) {
    fs.writeFileSync(afkDB, JSON.stringify(data, null, 2));
}

// Register AFK command
module.exports = (addCommand, msg, sock) => {

    // AFK Command
    addCommand({ pattern: "^afk ?(.*)$", desc: "Set AFK (private)", access: "sudo" }, async (msg, match) => {
        if (!ADMINS.includes(msg.sender)) return; // Only admins can set AFK

        let reason = match[1] || "AFK";
        let afkData = loadAFK();

        afkData[msg.sender] = { reason: reason, time: Date.now() };
        saveAFK(afkData);

        await msg.reply(`✅ You are now AFK (private): ${reason}`);
    });

    // Mention checker (for private AFK notifications)
    addCommand({ pattern: ".*", desc: "Check mentions", access: "all" }, async (msg) => {
        let afkData = loadAFK();

        // Notify if any admin is mentioned
        if (msg.mentionedJid && msg.mentionedJid.length > 0) {
            msg.mentionedJid.forEach(async (jid) => {
                if (ADMINS.includes(jid) && afkData[jid]) {
                    await msg.reply(`⚠️ Admin is AFK: ${afkData[jid].reason}`);
                }
            });
        }

        // Remove AFK if admin sends a message
        if (afkData[msg.sender] && ADMINS.includes(msg.sender)) {
            delete afkData[msg.sender];
            saveAFK(afkData);
            await msg.reply("✅ You are no longer AFK.");
        }
    });
};
