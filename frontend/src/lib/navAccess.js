export const navItems = [
  { to: '/', label: 'Home', access: 'always' },
  { to: '/signup', label: 'Sign up', access: 'guest' },
  { to: '/signin', label: 'Sign in', access: 'guest' },
  { to: '/mfa', label: 'MFA', access: 'authenticated-or-mfa' },
  { to: '/passkeys', label: 'Passkeys', access: 'always' },
  { to: '/magic-link', label: 'Magic link', access: 'guest' },
  { to: '/oauth', label: 'OAuth', access: 'always' }, // signed-in users link providers here
  { to: '/account', label: 'Account', access: 'authenticated' },
  { to: '/sessions', label: 'Sessions', access: 'authenticated' },
  { to: '/utilities', label: 'Utilities', access: 'always' },
];

export function isNavItemEnabled(item, { authenticated, mfaPending }) {
  switch (item.access) {
    case 'always':
      return true;
    case 'guest':
      return !authenticated && !mfaPending;
    case 'authenticated':
      return authenticated;
    case 'authenticated-or-mfa':
      return authenticated || mfaPending;
    default:
      return true;
  }
}

export function getRouteAccess(pathname) {
  const item = navItems.find((entry) =>
    entry.to === '/'
      ? pathname === '/'
      : pathname === entry.to || pathname.startsWith(`${entry.to}/`),
  );

  return item?.access ?? 'always';
}

export function canAccessRoute(pathname, authState) {
  const access = getRouteAccess(pathname);
  return isNavItemEnabled({ access }, authState);
}
