
import { useContext } from 'react';
import { UserProvider, UserContext } from './UserProvider';

// Export everything needed from the context
export { UserProvider };
export type { AuthLifecycleState } from './UserState';

export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}
