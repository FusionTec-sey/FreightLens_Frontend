import { createContext, useContext, useEffect, useRef } from 'react';

export const DraftNavigationContext = createContext(null);

// Keeps React Router concerns in the app shell, not in the reusable draft editor.
export function useDraftNavigationGuard({ active, prepareToLeave }) {
  const register = useContext(DraftNavigationContext);
  const current = useRef(null);
  current.current = { active, prepareToLeave };
  useEffect(() => {
    if (!register) return undefined; // Standalone inspection/tests have no navigation shell.
    return register({
      shouldBlock: () => current.current.active,
      prepareToLeave: () => current.current.prepareToLeave(),
    });
  }, [register]);
}
