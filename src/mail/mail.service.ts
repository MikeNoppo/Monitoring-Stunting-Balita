import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not fully configured. Emails will be logged to console.');
    }
  }

  async sendMail(options: { to: string; subject: string; text?: string; html?: string }) {
    const from = process.env.MAIL_FROM || 'no-reply@example.com';
    if (!this.transporter) {
      this.logger.log(`[MAIL:FAKE] to=${options.to} subject=${options.subject}`);
      if (options.text) this.logger.log(options.text);
      if (options.html) this.logger.log(options.html);
      return;
    }
    await this.transporter.sendMail({ from, ...options });
  }
}
