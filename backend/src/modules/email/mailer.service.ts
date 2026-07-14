import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor (private readonly config: ConfigService) {}

  private getTransporter () {
    if (this.transporter) return this.transporter
    const host = this.config.get<string>('smtp.host')
    if (!host) {
      this.logger.warn('SMTP_HOST not configured — emails will not be sent')
      return null
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('smtp.port'),
      secure: this.config.get<boolean>('smtp.secure'),
      auth: {
        user: this.config.get<string>('smtp.user'),
        pass: this.config.get<string>('smtp.pass'),
      },
    })
    return this.transporter
  }

  isConfigured () {
    return Boolean(this.config.get<string>('smtp.host'))
  }

  async sendMail (options: {
    to: string
    subject: string
    html: string
    attachments?: { filename: string; path: string }[]
  }) {
    const transporter = this.getTransporter()
    if (!transporter) {
      throw new Error('SMTP is not configured')
    }
    const from = this.config.get<string>('smtp.from')
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
  }
}
