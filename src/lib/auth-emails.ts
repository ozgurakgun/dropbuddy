import { sendEmail } from './email'

function getBaseUrl() {
  const url = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL
  if (!url) {
    throw new Error('APP_BASE_URL or NEXTAUTH_URL must be configured for auth emails.')
  }
  return url.replace(/\/$/, '')
}

function buildEmailHtml({
  title,
  description,
  ctaLabel,
  ctaUrl,
  footer,
}: {
  title: string
  description: string
  ctaLabel: string
  ctaUrl: string
  footer?: string
}) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2933;">
    <h2 style="color: #1f2933;">${title}</h2>
    <p>${description}</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px;">
        ${ctaLabel}
      </a>
    </p>
    <p style="color: #52606d; font-size: 14px;">
      If the button above does not work, copy and paste this link into your browser:<br />
      <a href="${ctaUrl}">${ctaUrl}</a>
    </p>
    ${footer ? `<p style="color: #52606d; font-size: 14px;">${footer}</p>` : ''}
  </div>
  `
}

export async function sendVerificationEmail({
  email,
  name,
  token,
  expiresInLabel,
}: {
  email: string
  name?: string | null
  token: string
  expiresInLabel: string
}) {
  const verifyUrl = new URL('/auth/verify', getBaseUrl())
  verifyUrl.searchParams.set('token', token)

  return sendEmail({
    to: email,
    subject: 'Verify your DropBuddy account',
    html: buildEmailHtml({
      title: `Confirm your email${name ? `, ${name}` : ''}`,
      description: `Thanks for signing up for DropBuddy. Please confirm your email address to activate your account. This link expires ${expiresInLabel}.`,
      ctaLabel: 'Verify email',
      ctaUrl: verifyUrl.toString(),
      footer: 'If you did not create this account, you can safely ignore this message.',
    }),
  })
}

export async function sendInviteEmail({
  email,
  name,
  tenantName,
  role,
  token,
  expiresInLabel,
}: {
  email: string
  name?: string | null
  tenantName: string
  role?: 'restaurant_admin' | 'driver'
  token: string
  expiresInLabel: string
}) {
  const inviteUrl = new URL('/auth/set-password', getBaseUrl())
  inviteUrl.searchParams.set('token', token)
  inviteUrl.searchParams.set('purpose', 'invite')

  const roleLabel =
    role === 'driver' ? 'as a driver' : role === 'restaurant_admin' ? 'as a restaurant admin' : ''

  return sendEmail({
    to: email,
    subject: `You're invited to DropBuddy (${tenantName})`,
    html: buildEmailHtml({
      title: `Welcome${name ? `, ${name}` : ''}`,
      description: `You've been invited ${roleLabel} for <strong>${tenantName}</strong> on DropBuddy. Set a password to activate your account. This link expires ${expiresInLabel}.`,
      ctaLabel: 'Set password',
      ctaUrl: inviteUrl.toString(),
      footer: 'If you were not expecting this invite, you can ignore this message.',
    }),
  })
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
  expiresInLabel,
}: {
  email: string
  name?: string | null
  token: string
  expiresInLabel: string
}) {
  const resetUrl = new URL('/auth/set-password', getBaseUrl())
  resetUrl.searchParams.set('token', token)
  resetUrl.searchParams.set('purpose', 'reset')

  return sendEmail({
    to: email,
    subject: 'Reset your DropBuddy password',
    html: buildEmailHtml({
      title: `Reset your password${name ? `, ${name}` : ''}`,
      description: `We received a request to reset your DropBuddy password. This link expires ${expiresInLabel}.`,
      ctaLabel: 'Choose a new password',
      ctaUrl: resetUrl.toString(),
      footer: 'If you did not request a password reset, you can safely ignore this message.',
    }),
  })
}
