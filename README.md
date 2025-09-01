🌟 Farooq Bot 🌟

Farooq Bot is your ultimate WhatsApp automation assistant 🤖. Manage groups, automate tasks, and have fun with simple commands.

🛡️ Moderation Commands

🔇 !gmute (reply to a user) – Globally mutes a user in all groups.

🔊 !ungmute (reply to a user) – Globally unmutes a user.

⚡ Automation & Utility Commands

✨ !filter add <incoming message> <outgoing message> – Add a new automated response.

🗑️ !filter delete <incoming message> – Delete a filter.

📜 !filter – List all filters in the chat.

⚙️ !filter <on|off> – Enable or disable filters.

✅ !alive – Check if Farooq Bot is online.

🛠️ !worktype <public|private> – Set bot to public or private mode (sudo only).

👑 !sudo add <number> – Add a sudo user.

❌ !sudo delete <number> – Remove a sudo user.

🚫 !blacklist – Add/remove group from blacklist (sudo only).

📋 !menu – Display all commands.

✍️ !edit <alive|welcome|goodbye> – Edit messages (sudo only).

🔄 !update – Check for bot updates.

⬆️ !update now – Update Farooq Bot to the latest version.

🔌 !plugin <query> – Search for plugins.

⭐ !plugin top – Show top plugins.

➕ !pinstall <plugin_id> – Install a plugin.

🗑️ !pldelete <plugin_id> – Delete a plugin.

⏱️ !ping – Check bot’s response time.

⚙️ Configuration

Farooq Bot’s settings are in database.json and can be customized:

🏷️ Command Handlers: Prefixes for commands.

💬 Alive Message: Message shown with !alive.

👋 Welcome/Goodbye Messages: Sent when users join/leave groups.

👑 Sudo Users: Phone numbers with country code for sudo access.

🔒 Work Type: Public or private access mode.

💻 Installation on Termux
1️⃣ Update Termux & Install Dependencies
pkg update && pkg upgrade -y
pkg install git nodejs ffmpeg imagemagick yarn -y

2️⃣ Clone Farooq Bot Repository
git clone https://github.com/YourUsername/Farooq-Bot.git
cd Farooq-Bot

3️⃣ Install Node.js Packages
yarn
# or
npm install

4️⃣ Configure Bot

Open database.json and set:

Sudo numbers

Welcome/Goodbye messages

Command prefixes

Work type (public/private)

5️⃣ Start the Bot
node index.js


🎉 Farooq Bot is now running!

📜 Logs

Real-time logs: Run node index.js to see commands and errors in Termux.

Save logs to a file:

node index.js >> farooqbot.log 2>&1


Tips:

tail -f farooqbot.log to watch logs live.

Check logs if the bot crashes or commands fail.

🔧 Tips & Tricks (24/7 Running)

Keep Farooq Bot running 24/7 in Termux:

🔋 Prevent Sleep
termux-wake-lock

🔄 Auto-Restart with pm2
npm install pm2 -g
pm2 start index.js --name FarooqBot
pm2 save


Check status: pm2 status

View logs: pm2 logs FarooqBot

📲 Auto Start on Termux Boot

Add to ~/.termux/boot.sh:

pm2 resurrect


(Requires Termux:Boot app from Play Store)

🤝 Contributing

Contributions are welcome!

Fork the repository.

Make changes.

Submit a pull request.

💪 Let’s make Farooq Bot even better together!

📄 License

MIT License. See the LICENSE
 file for details.
