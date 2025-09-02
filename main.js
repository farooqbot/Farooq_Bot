// main.js
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");

async function startBot() {
    // Load or create session
    const { state, saveCreds } = await useMultiFileAuthState("session");

    // Create WhatsApp connection
    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: false // deprecated, so we disable it
    });

    // Handle QR code + connection updates
    conn.ev.on("connection.update", ({ qr, connection, lastDisconnect }) => {
        if (qr) {
            console.log("📲 Scan this QR to connect:");
            qrcode.generate(qr, { small: true }); // ✅ Show QR in Termux
        }

        if (connection === "open") {
            console.log("✅ WhatsApp connected!");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log("❌ Disconnected. Reason:", reason);

            // Auto-reconnect if not logged out
            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnecting...");
                startBot();
            } else {
                console.log("⚠️ Logged out. Delete session and scan again.");
            }
        }
    });

    // Save creds when updated
    conn.ev.on("creds.update", saveCreds);
}

startBot();
