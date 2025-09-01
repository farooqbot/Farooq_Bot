# 📖 Farooq_Bot

Farooq_Bot is a WhatsApp multi-device bot built on **Baileys**.  
It supports automation, media processing, plugins, and deployment on **Termux**, **Ubuntu VPS**, or **Docker**.

---

## ⚙️ Requirements

- **Node.js ≥ 20**
- **Git**
- **PM2** (process manager)
- **Build tools** (needed for `sharp`, `sqlite3`, etc.)

---

## 📱 Termux (Android) Setup

```bash
# Update Termux
pkg update -y && pkg upgrade -y

# Install essentials
pkg install -y nodejs git python clang make cmake automake autoconf libtool pkg-config libsqlite

# Install PM2 globally
npm install -g pm2
```

---

## 💻 Ubuntu / Debian Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm git python3 make g++ build-essential pkg-config sqlite3 libsqlite3-dev
sudo npm install -g pm2
```

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/farooqbot/Farooq_Bot
cd Farooq_Bot

# Clean old dependencies if any
rm -rf node_modules package-lock.json yarn.lock

# Install dependencies (ignore peer conflicts)
npm install --legacy-peer-deps
```

---

## ▶️ Start Bot

```bash
# Start with PM2
npm start

# Or run directly
node index.js
```

---

## 🛠️ Troubleshooting

- **Sharp install fails**  
  Run:
  ```bash
  npm install sharp@0.32.6 --legacy-peer-deps
  ```

- **sqlite3 build error**  
  Ensure SQLite dev libraries are installed:  
  - Termux → `pkg install libsqlite`  
  - Ubuntu → `sudo apt install libsqlite3-dev`

- **Baileys repo fetch error**  
  Make sure your `package.json` has:
  ```json
  "baileys": "github:WhiskeySockets/Baileys"
  ```

---

## 📜 License
This project is licensed under the **MIT License**.
