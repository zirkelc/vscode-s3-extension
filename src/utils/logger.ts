import * as vscode from 'vscode';

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug',
}

export class Logger implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel;

  constructor(name: string) {
    this.outputChannel = vscode.window.createOutputChannel(name, { log: true });
  }

  info(message: string): void {
    // For structured output, use the trace method with Info level
    this.outputChannel.info(message);
  }

  warn(message: string): void {
    this.outputChannel.warn(message);
  }

  error(input: Error | string | unknown): string {
    if (input instanceof Error) {
      const error = input;
      this.outputChannel.error(error);
      return error.message;
    }

    const message = typeof input === 'string' ? input : String(input);
    this.outputChannel.error(message);
    return message;
  }

  debug(message: string): void {
    this.outputChannel.debug(message);
  }

  trace(message: string): void {
    this.outputChannel.trace(message);
  }

  show(preserveFocus: boolean = true): void {
    this.outputChannel.show(preserveFocus);
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
