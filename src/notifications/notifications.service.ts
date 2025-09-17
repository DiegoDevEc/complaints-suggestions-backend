import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiUrl?: string;
  private readonly apiKey?: string;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('EMAIL_API_URL');
    this.apiKey = this.configService.get<string>('EMAIL_API_KEY');
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('EMAIL_SENDER') ||
      'no-reply@complaints-suggestions.com';
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.logger.warn(this.apiUrl);
    if (!this.apiUrl) {
      this.logger.warn(
        'EMAIL_API_URL no está configurado. El correo no se enviará.',
      );
      return;
    }

    const url = new URL(this.apiUrl);
    const payload = JSON.stringify({
      from: options.from ?? this.defaultFrom,
      to: [options.to], // Resend espera un array
      subject: options.subject,
      html: options.html,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString(),
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const requestFn = url.protocol === 'https:' ? httpsRequest : httpRequest;

    try {
      await new Promise<void>((resolve, reject) => {
        const req = requestFn(
          {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: `${url.pathname}${url.search}`,
            method: 'POST',
            headers,
          },
          (res) => {
            const statusCode = res.statusCode ?? 0;
            if (statusCode >= 200 && statusCode < 300) {
              res.on('data', () => undefined);
              res.on('end', resolve);
            } else {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', (chunk) => {
                body += chunk;
              });
              res.on('end', () => {
                reject(
                  new Error(
                    `Email API responded with status ${statusCode}${body ? `: ${body}` : ''
                    }`,
                  ),
                );
              });
            }
            res.on('error', reject);
          },
        );

        req.on('error', (error) => reject(error));
        req.write(payload);
        req.end();
      });
    } catch (error) {
      this.logger.error(
        `Fallo al enviar correo a ${options.to}: ${error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  }
}
