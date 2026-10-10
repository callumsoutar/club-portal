export function signInErrorMessage(error: 'member_disabled' | 'no_access' | 'oauth' | 'exists') {
  if (error === 'member_disabled') {
    return 'Member login is turned off. You can still submit a guest authorisation.'
  }
  if (error === 'no_access') return 'This account does not have access yet.'
  if (error === 'exists') {
    return 'An account with this email already uses a password. Sign in with email and password.'
  }
  return 'Google sign-in did not complete. Try again.'
}

export function signInErrorFromQuery(error: string | undefined) {
  if (error === 'member_disabled' || error === 'no_access' || error === 'oauth' || error === 'exists') {
    return signInErrorMessage(error)
  }
  return null
}
