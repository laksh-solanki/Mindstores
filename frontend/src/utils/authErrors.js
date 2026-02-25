const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/email-already-in-use": "An account already exists with this email.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/network-request-failed": "Network issue detected. Check your connection and retry.",
};

export function getAuthErrorMessage(error) {
  const errorCode = String(error?.code || "");
  return AUTH_ERROR_MESSAGES[errorCode] || "Authentication failed. Please try again.";
}
