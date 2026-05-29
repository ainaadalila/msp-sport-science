export interface PasswordStrengthResult {
  score: number // 0-4
  strength: 'weak' | 'fair' | 'good' | 'strong'
  errors: string[]
  suggestions: string[]
}

export function validatePassword(password: string): PasswordStrengthResult {
  const errors: string[] = []
  const suggestions: string[] = []
  let score = 0

  // Check minimum length (12 characters)
  if (password.length < 12) {
    errors.push('Sekurang-kurangnya 12 aksara')
  } else {
    score++
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Mesti mengandungi sekurang-kurangnya satu huruf besar (A-Z)')
  } else {
    score++
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Mesti mengandungi sekurang-kurangnya satu huruf kecil (a-z)')
  } else {
    score++
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Mesti mengandungi sekurang-kurangnya satu nombor (0-9)')
  } else {
    score++
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    suggestions.push('Tambahkan aksara khas (!@#$%^&*) untuk keamanan lebih kuat')
  } else {
    score++
  }

  // Bonus: longer passwords
  if (password.length >= 12) {
    score = Math.min(score + 1, 4)
  }

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong'
  if (score <= 1) strength = 'weak'
  else if (score === 2) strength = 'fair'
  else if (score === 3) strength = 'good'
  else strength = 'strong'

  return {
    score: Math.min(score, 4),
    strength,
    errors,
    suggestions,
  }
}

export function isPasswordValid(password: string): boolean {
  const result = validatePassword(password)
  return result.errors.length === 0
}

export function getPasswordStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return '#D44040' // red
    case 'fair':
      return '#F56A00' // orange
    case 'good':
      return '#FFD600' // yellow
    case 'strong':
      return '#3A9E6A' // green
  }
}

export function getPasswordStrengthLabel(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Lemah'
    case 'fair':
      return 'Sederhana'
    case 'good':
      return 'Baik'
    case 'strong':
      return 'Sangat Kuat'
  }
}
