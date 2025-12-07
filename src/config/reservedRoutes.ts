// Lista de rotas reservadas do sistema que não podem ser usadas como cupons/usernames
export const RESERVED_ROUTES = [
  'auth',
  'terms',
  'privacy',
  'cookies',
  'landing',
  'signup',
  'user',
  'admin'
] as const;

export type ReservedRoute = typeof RESERVED_ROUTES[number];

/**
 * Verifica se um valor é uma rota reservada do sistema
 * @param value - O valor a ser verificado (username, cupom, etc)
 * @returns true se for uma rota reservada
 */
export const isReservedRoute = (value: string): boolean => {
  const normalized = value.toLowerCase().trim();
  
  // Verifica se é exatamente uma das rotas reservadas
  if (RESERVED_ROUTES.includes(normalized as ReservedRoute)) {
    return true;
  }
  
  // Verifica se começa com prefixos reservados
  if (normalized.startsWith('user') || 
      normalized.startsWith('admin') || 
      normalized.startsWith('signup')) {
    return true;
  }
  
  return false;
};
