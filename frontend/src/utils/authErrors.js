const DEFAULT_AUTH_ERROR_MESSAGE = 'Unable to complete authentication right now. Please try again.'

const AUTH_ERROR_MESSAGE_BY_CODE = {
  'auth/email-already-in-use': 'This email is already in use. Please log in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/invalid-login-credentials': 'Invalid email or password.',
  'auth/missing-password': 'Please enter your password.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled yet.',
  'auth/popup-blocked': 'Popup was blocked by the browser. Please allow popups and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before completion.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/user-disabled': 'This account is disabled. Contact support for help.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/wrong-password': 'Invalid email or password.',
}

function normalizeErrorCode(error) {
  if (!error || typeof error !== 'object') {
    return ''
  }

  return String(
    error.code ||
      error.response?.data?.code ||
      error.response?.data?.errorCode ||
      error.response?.data?.error ||
      '',
  ).trim()
}

function normalizeErrorMessage(error) {
  if (!error || typeof error !== 'object') {
    return ''
  }

  return String(
    error.response?.data?.message ||
      error.message ||
      '',
  ).trim()
}

export function getAuthErrorMessage(error) {
  const errorCode = normalizeErrorCode(error)
  if (errorCode && AUTH_ERROR_MESSAGE_BY_CODE[errorCode]) {
    return AUTH_ERROR_MESSAGE_BY_CODE[errorCode]
  }

  const message = normalizeErrorMessage(error)
  if (message) {
    return message
  }

  return DEFAULT_AUTH_ERROR_MESSAGE
}
