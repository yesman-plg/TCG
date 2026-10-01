import { useCallback, useEffect, useReducer, useState } from 'react';
import { getTimeSheet } from '../api/mobilitesM';

const initialState = { sheet: null, error: null, loading: false };

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      // Conserve la dernière grille durant la requête suivante : la fiche ne
      // disparaît pas entre deux plages horaires, ce qui évite un saut visuel.
      return { ...state, error: null, loading: true };
    case 'success':
      return { sheet: action.sheet, error: null, loading: false };
    case 'error':
      return { ...state, error: action.error, loading: false };
    default:
      return state;
  }
}

/** Charge une fiche au moment demandé, sans polling ni cache persistant. */
export function useTimeSheet(routeId, atMs) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!routeId || !Number.isFinite(atMs)) return undefined;
    let cancelled = false;

    dispatch({ type: 'load' });

    getTimeSheet(routeId, atMs)
      .then((data) => {
        if (!cancelled) dispatch({ type: 'success', sheet: data });
      })
      .catch((requestError) => {
        if (!cancelled) dispatch({ type: 'error', error: requestError });
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, atMs, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
