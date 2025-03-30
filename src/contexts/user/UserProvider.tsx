
import React, { createContext, useReducer } from 'react';
import { UserState, UserAction, initialUserState, userReducer, getAuthLifecycleState, AuthLifecycleState } from './UserState';
import { useAuthInitializer } from './useAuthInitializer';
import { useAuthStateListener } from './useAuthStateListener';
import { profileOperations } from './useUserProfile';

// Create context with state and dispatch
interface UserContextType extends UserState {
  dispatch: React.Dispatch<UserAction>;
  lifecycleState: AuthLifecycleState;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Ensure React is imported and useReducer is called properly
  const [state, dispatch] = useReducer(userReducer, initialUserState);
  const lifecycleState = getAuthLifecycleState(state);
  
  // Initialize auth state
  useAuthInitializer(dispatch);
  
  // Listen for auth state changes
  useAuthStateListener(dispatch);
  
  // Create profile management functions
  const refreshProfile = profileOperations.createRefreshProfile(state.user, dispatch);
  const updateProfile = profileOperations.createUpdateProfile(state.user, state.profile, dispatch);
  
  return (
    <UserContext.Provider
      value={{
        ...state,
        dispatch,
        lifecycleState,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
