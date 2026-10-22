import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const recipient = process.env.BUSINESS_EMAIL || 'nateriyadravit@gmail.com'
let transporter: Transporter | undefined

function getTransport(): Transporter | undefined {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) return undefined

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  })
  return transporter
}

export async function sendBusinessNotification(subject: string, text: string): Promise<boolean> {
  const mailer = getTransport()
  if (!mailer) return false

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipient,
    subject,
    text,
  })
  return true
}
