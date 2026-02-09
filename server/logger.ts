import winston from "winston";

const logLevel = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "teamflow-api" },
  transports: [
    // Always log to console (Docker best practice: stdout/stderr)
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production"
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
    }),
    // File transports for non-Docker environments
    new winston.transports.File({ 
      filename: "logs/error.log", 
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      silent: process.env.NODE_ENV === "test",
    }),
    new winston.transports.File({ 
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
      silent: process.env.NODE_ENV === "test",
    }),
  ],
});

export default logger;
