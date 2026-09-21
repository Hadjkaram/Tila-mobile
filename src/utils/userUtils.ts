/**
 * Utilitaires pour la gestion et l'affichage des informations utilisateur
 * (Noms, prénoms, salutations et initiales)
 */

export function getUserDisplayName(user: any, fallback: string = 'Utilisateur'): string {
  if (!user) return fallback;

  const firstName = (user.firstName || user.prenom || '').trim();
  const lastName = (user.lastName || user.nom || '').trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) return firstName;
  if (lastName) return lastName;

  if (user.name && typeof user.name === 'string' && user.name.trim()) {
    return user.name.trim();
  }
  if (user.fullName && typeof user.fullName === 'string' && user.fullName.trim()) {
    return user.fullName.trim();
  }
  if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim()) {
    return user.displayName.trim();
  }

  // Si aucun nom explicite, déduire intelligemment depuis l'email (ex: ibrahim.kone@tila.ci -> Ibrahim Kone)
  if (user.email && typeof user.email === 'string') {
    const localPart = user.email.split('@')[0];
    const cleaned = localPart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (cleaned) return cleaned;
  }

  return fallback;
}

export function getUserFirstName(user: any, fallback: string = 'Bienvenue'): string {
  if (!user) return fallback;

  const firstName = (user.firstName || user.prenom || '').trim();
  if (firstName) return firstName;

  const displayName = getUserDisplayName(user, fallback);
  if (displayName && displayName !== fallback) {
    return displayName.split(' ')[0] || fallback;
  }

  return fallback;
}

export function getUserInitials(user: any, fallback: string = 'TU'): string {
  if (!user) return fallback;

  const firstName = (user.firstName || user.prenom || '').trim();
  const lastName = (user.lastName || user.nom || '').trim();

  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }

  const displayName = getUserDisplayName(user, '');
  if (displayName) {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  return fallback;
}
