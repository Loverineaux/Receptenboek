const AUTH_ERROR_MAP: Record<string, string> = {
  // Password
  'New password should be different from the old password.':
    'Je nieuwe wachtwoord moet anders zijn dan je huidige wachtwoord.',
  'Password should be at least 6 characters.':
    'Wachtwoord moet minimaal 6 tekens zijn.',
  'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.':
    'Wachtwoord moet minimaal één kleine letter, één hoofdletter en één cijfer bevatten.',

  // Login
  'Invalid login credentials':
    'Ongeldig e-mailadres of wachtwoord.',
  'Email not confirmed':
    'Je e-mailadres is nog niet bevestigd. Check je inbox.',
  'Invalid Refresh Token: Refresh Token Not Found':
    'Je sessie is verlopen. Log opnieuw in.',
  'User not found':
    'Geen account gevonden met dit e-mailadres.',

  // Signup
  'User already registered':
    'Er bestaat al een account met dit e-mailadres.',
  'Signup requires a valid password':
    'Vul een geldig wachtwoord in.',
  'Unable to validate email address: invalid format':
    'Ongeldig e-mailadres.',

  // Rate limit
  'For security purposes, you can only request this after 60 seconds.':
    'Uit veiligheidsoverwegingen kun je dit pas na 60 seconden opnieuw proberen.',
  'Email rate limit exceeded':
    'Te veel verzoeken. Probeer het later opnieuw.',

  // General
  'Request timeout':
    'Het verzoek duurde te lang. Probeer het opnieuw.',
};

export function translateAuthError(message: string): string {
  // Direct match
  if (AUTH_ERROR_MAP[message]) return AUTH_ERROR_MAP[message];

  // Partial match for rate limit variations
  const lower = message.toLowerCase();
  if (lower.includes('rate limit')) return 'Te veel verzoeken. Probeer het later opnieuw.';
  if (lower.includes('email not confirmed')) return 'Je e-mailadres is nog niet bevestigd. Check je inbox.';
  if (lower.includes('invalid login')) return 'Ongeldig e-mailadres of wachtwoord.';

  return message;
}
