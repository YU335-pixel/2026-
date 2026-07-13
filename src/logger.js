const fs = require("fs");
const path = require("path");

const SENSITIVE_KEY_PATTERN = /pass|password|token|secret|(^|_)id$/i;

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "***" : redact(val);
    }
    return out;
  }
  return value;
}

class Logger {
  constructor(logsDir) {
    this.logsDir = logsDir;
    fs.mkdirSync(logsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.filePath = path.join(logsDir, `${timestamp}.jsonl`);
  }

  _write(level, message, data) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...(data ? { data: redact(data) } : {}),
    };
    const line = JSON.stringify(entry);
    console[level === "error" ? "error" : "log"](message, data ? redact(data) : "");
    fs.appendFileSync(this.filePath, line + "\n");
  }

  info(message, data) {
    this._write("info", message, data);
  }

  warn(message, data) {
    this._write("warn", message, data);
  }

  error(message, data) {
    this._write("error", message, data);
  }
}

module.exports = { Logger, redact };
