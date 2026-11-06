export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required'
  if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`
  }
  if (!PASSWORD_REQUIREMENTS.uppercase.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!PASSWORD_REQUIREMENTS.lowercase.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!PASSWORD_REQUIREMENTS.number.test(password)) {
    return 'Password must contain at least one number'
  }
  if (!PASSWORD_REQUIREMENTS.special.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'
  }
  return null
}
