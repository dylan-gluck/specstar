import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

export class Logger {
  private static logDir: string = join(process.cwd(), '.specstar', 'logs');
  private static maxFileSize = 10 * 1024 * 1024; // 10MB
  private static maxFiles = 5;
  private static logLevel: LogLevel = Logger.getInitialLogLevel();
  private static loggers = new Map<string, Logger>();
  private static fileHandle: any = null;
  private static currentLogFile: string = '';
  private static isInitialized = false;

  private module: string;

  constructor(module: string) {
    this.module = module;
    Logger.loggers.set(module, this);
    this.ensureInitialized();
  }
  
  private static getInitialLogLevel(): LogLevel {
    try {
      const settingsPath = join(process.cwd(), '.specstar', 'settings.json');
      if (existsSync(settingsPath)) {
        const fs = require('fs');
        const content = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        if (settings.logLevel) {
          return settings.logLevel as LogLevel;
        }
      }
    } catch (error) {
      // Fallback to env variable or default
    }
    return (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private async ensureInitialized() {
    if (Logger.isInitialized) return;
    
    try {
      // Create logs directory if it doesn't exist
      if (!existsSync(Logger.logDir)) {
        await mkdir(Logger.logDir, { recursive: true });
      }
      
      // Initialize log file
      await this.rotateLogFileIfNeeded();
      Logger.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  private async rotateLogFileIfNeeded() {
    const logFileName = `specstar-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = join(Logger.logDir, logFileName);
    
    try {
      // Check if we need to rotate based on size
      if (existsSync(logFilePath)) {
        const file = Bun.file(logFilePath);
        const stats = file.size; // size is a property, not a method
        
        if (stats > Logger.maxFileSize) {
          // Rotate log files
          await this.rotateLogs();
        }
      }
      
      Logger.currentLogFile = logFilePath;
      
      // Clean up old log files
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('Error rotating log files:', error);
    }
  }

  private async rotateLogs() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFileName = `specstar-${timestamp}.log`;
    const rotatedPath = join(Logger.logDir, rotatedFileName);
    
    try {
      // Move the current file to the rotated name instead of copying
      const { rename } = await import('fs/promises');
      await rename(Logger.currentLogFile, rotatedPath);
      // The next write will create a new file with append: true
    } catch (error) {
      console.error('Error rotating logs:', error);
    }
  }

  private async cleanupOldLogs() {
    try {
      const glob = new Bun.Glob("specstar-*.log");
      const files: string[] = [];
      
      for await (const file of glob.scan({ cwd: Logger.logDir })) {
        files.push(file);
      }
      
      if (files.length > Logger.maxFiles) {
        // Sort by modification time and remove oldest
        const fileStats = await Promise.all(
          files.map(async (file) => {
            const fullPath = join(Logger.logDir, file);
            const stats = await Bun.file(fullPath).lastModified;
            return { path: fullPath, mtime: stats };
          })
        );
        
        fileStats.sort((a, b) => a.mtime - b.mtime);
        
        // Remove oldest files
        const toRemove = fileStats.slice(0, files.length - Logger.maxFiles);
        for (const file of toRemove) {
          // Just delete the file directly without clearing it first
          const { unlink } = await import("node:fs/promises");
          await unlink(file.path);
        }
      }
    } catch (error) {
      // Silently ignore errors in cleanup to avoid disrupting the app
      if (process.env.NODE_ENV === 'development') {
        console.error('Error cleaning up old logs:', error);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(Logger.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private async writeLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;
    
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      // Write to file using fs.appendFile for proper appending
      if (Logger.currentLogFile) {
        const { appendFile } = await import('fs/promises');
        await appendFile(Logger.currentLogFile, logLine);
      }
      
      // Also write to console in development
      if (process.env.NODE_ENV === 'development') {
        const prefix = `[${entry.level.toUpperCase()}] ${entry.module}:`;
        const color = {
          debug: '\x1b[90m',  // gray
          info: '\x1b[36m',   // cyan
          warn: '\x1b[33m',   // yellow
          error: '\x1b[31m'   // red
        }[entry.level];
        const reset = '\x1b[0m';
        
        console.log(`${color}${prefix}${reset} ${entry.message}`, entry.data || '');
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  debug(message: string, data?: any) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      module: this.module,
      message,
      data
    });
  }

  info(message: string, data?: any) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      module: this.module,
      message,
      data
    });
  }

  warn(message: string, data?: any) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      module: this.module,
      message,
      data
    });
  }

  error(message: string, error?: Error | any, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      module: this.module,
      message,
      data
    };

    if (error instanceof Error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack
      };
    } else if (error) {
      logEntry.error = {
        message: String(error)
      };
    }

    this.writeLog(logEntry);
  }

  // Static methods for global logging
  static getLogger(module: string): Logger {
    if (!Logger.loggers.has(module)) {
      return new Logger(module);
    }
    return Logger.loggers.get(module)!;
  }

  static setLogLevel(level: LogLevel) {
    Logger.logLevel = level;
  }
  
  static getLogLevel(): LogLevel {
    return Logger.logLevel;
  }

  static async getLogs(filter?: {
    level?: LogLevel;
    module?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LogEntry[]> {
    try {
      if (!Logger.currentLogFile || !existsSync(Logger.currentLogFile)) {
        return [];
      }

      const content = await Bun.file(Logger.currentLogFile).text();
      const lines = content.split('\n').filter(line => line.trim());
      
      let entries: LogEntry[] = [];
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }

      // Apply filters
      if (filter) {
        if (filter.level) {
          entries = entries.filter(e => e.level === filter.level);
        }
        if (filter.module) {
          entries = entries.filter(e => e.module === filter.module);
        }
        if (filter.startTime) {
          entries = entries.filter(e => new Date(e.timestamp) >= filter.startTime!);
        }
        if (filter.endTime) {
          entries = entries.filter(e => new Date(e.timestamp) <= filter.endTime!);
        }
      }

      return entries;
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  // Performance monitoring
  startTimer(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`${operation} completed`, { duration: `${duration.toFixed(2)}ms` });
    };
  }
}