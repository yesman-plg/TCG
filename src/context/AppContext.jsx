import { createContext, useContext } from 'react';

/**
 * Données et actions partagées par tous les écrans : réseau (arrêts, lignes,
 * perturbations), favoris, position, et navigation entre écrans.
 */
export const AppContext = createContext(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp doit être utilisé dans <AppContext.Provider>');
  return value;
}
