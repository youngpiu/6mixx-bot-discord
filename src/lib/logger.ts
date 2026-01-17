import { ILogger, LogLevel } from '@sapphire/framework'
import { gray, cyan, green, yellow, red, bgRed, white } from 'colorette'

export class CustomLogger implements ILogger {
  public level: LogLevel

  constructor(level: LogLevel = LogLevel.Info) {
    this.level = level
  }

  public has(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatTimestamp(): string {
    return gray(new Date().toLocaleTimeString('vi-VN'))
  }

  public trace(...args: unknown[]): void {
    if (this.has(LogLevel.Trace)) {
      console.log(this.formatTimestamp(), gray('[TRACE]'), ...args)
    }
  }

  public debug(...args: unknown[]): void {
    if (this.has(LogLevel.Debug)) {
      console.log(this.formatTimestamp(), cyan('[DEBUG]'), ...args)
    }
  }

  public info(...args: unknown[]): void {
    if (this.has(LogLevel.Info)) {
      console.log(this.formatTimestamp(), green('[INFO]'), ...args)
    }
  }

  public warn(...args: unknown[]): void {
    if (this.has(LogLevel.Warn)) {
      console.log(this.formatTimestamp(), yellow('[WARN]'), ...args)
    }
  }

  public error(...args: unknown[]): void {
    if (this.has(LogLevel.Error)) {
      console.log(this.formatTimestamp(), red('[ERROR]'), ...args)
    }
  }

  public fatal(...args: unknown[]): void {
    console.log(this.formatTimestamp(), bgRed(white('[FATAL]')), ...args)
  }

  public write(): void {
    // Required by interface but not used
  }
}
