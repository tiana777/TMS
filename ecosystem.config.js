const path = require("path");
const isWin = process.platform === "win32";

const pythonExec = isWin
  ? path.join(__dirname, "backend", ".venv", "Scripts", "python.exe")
  : path.join(__dirname, "backend", ".venv", "bin", "python");

module.exports = {
  apps: [
    {
      name: "tms-backend",
      script: pythonExec,
      args: "-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      env: {
        PYTHONPATH: ".",
      },
      error_file: "./logs/backend_err.log",
      out_file: "./logs/backend.log",
    },
    {
      name: "tms-frontend",
      script: "npm",
      args: "start -- -p 3000",
      cwd: path.join(__dirname, "frontend"),
      autorestart: true,
      max_restarts: 10,
      error_file: "./logs/frontend_err.log",
      out_file: "./logs/frontend.log",
    },
  ],
};
