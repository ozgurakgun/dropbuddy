import nodemailer from 'nodemailer'

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

let transporterPromise: ReturnType<typeof nodemailer.createTransport> | null = null

function getEmailTransport() {
  if (transporterPromise) {
    return transporterPromise
  }

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    throw new Error(
      'Email transport is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.',
    )
  }

  transporterPromise = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporterPromise
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const from = process.env.EMAIL_FROM

  if (!from) {
    throw new Error('EMAIL_FROM environment variable is not set.')
  }

  const transporter = getEmailTransport()

  console.log('[EMAIL_SEND_ATTEMPT]', {
    to,
    from,
    subject,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
  })

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  })

  console.log('[EMAIL_SEND_RESULT]', {
    to,
    subject,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    pending: info.pending,
    response: info.response,
  })

  return info
}
