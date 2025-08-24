const { exec } = require("child_process");
console.log("✅ Farooq_Bot is starting...");
exec("echo 'Hello from Farooq_Bot!'", (err, stdout) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});
