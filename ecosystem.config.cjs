// PM2 process definition for running this app on a Linux server.
// Usage: pm2 start ecosystem.config.cjs
// (.cjs extension because package.json has "type": "module" — PM2's own
// config loader needs CommonJS regardless of that.)
module.exports = {
  apps: [
    {
      name: "aadhirai-pharma",
      script: "dist/index.cjs",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      // .env (DATABASE_URL, PORT, SESSION_SECRET, etc.) is loaded by the
      // app itself via dotenv — nothing further needed here.
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
