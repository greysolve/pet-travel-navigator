
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ProfileError } from '@/utils/profile/ProfileError';
import { UserProfile } from '@/utils/profile/types';
import { fetchProfile } from '@/utils/profile/ProfileFetcher';

// Unified state for auth and profile data
export type UserState = {
  // Authentication state
  session: Session | null;
  user: User | null;
  initialized: boolean;
  authLoading: boolean;
  authError: Error | null;
  
  // Profile state
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: ProfileError | null;
  profileInitialized: boolean;
};

// Possible authentication lifecycle states
export type AuthLifecycleState = 
  | 'UNAUTHENTICATED' 
  | 'AUTHENTICATING' 
  | 'AUTHENTICATED' 
  | 'PROFILE_LOADING' 
  | 'COMPLETE' 
  | 'ERROR';

export type UserAction =
  | { type: 'AUTH_INIT_START' }
  | { type: 'AUTH_INIT_SUCCESS'; payload: { session: Session | null; user: User | null } }
  | { type: 'AUTH_INIT_ERROR'; payload: Error }
  | { type: 'AUTH_STATE_CHANGE'; payload: { session: Session | null; user: User | null } }
  | { type: 'AUTH_SIGN_OUT' }
  | { type: 'PROFILE_LOADING_START'; payload: { userId: string } }
  | { type: 'PROFILE_LOADING_SUCCESS'; payload: { profile: UserProfile } }
  | { type: 'PROFILE_LOADING_ERROR'; payload: ProfileError }
  | { type: 'PROFILE_UPDATE'; payload: { profile: UserProfile } };

// Initial state
const initialUserState: UserState = {
  session: null,
  user: null,
  initialized: false,
  authLoading: true,
  authError: null,
  
  profile: null,
  profileLoading: false,
  profileError: null,
  profileInitialized: false,
};

// Reducer for handling state transitions
function userReducer(state: UserState, action: UserAction): UserState {
  console.log('UserContext - Action:', action.type, action);
  
  switch (action.type) {
    case 'AUTH_INIT_START':
      return { ...state, authLoading: true, authError: null };
      
    case 'AUTH_INIT_SUCCESS':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        initialized: true,
        authLoading: false,
        authError: null,
      };
      
    case 'AUTH_INIT_ERROR':
      return {
        ...state,
        initialized: true,
        authLoading: false,
        authError: action.payload,
      };
      
    case 'AUTH_STATE_CHANGE':
      // If user signed out, reset profile state too
      if (!action.payload.user) {
        return {
          ...state,
          session: null,
          user: null,
          profile: null,
          profileInitialized: false,
          profileError: null,
        };
      }
      
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        authLoading: false,
        authError: null,
      };
      
    case 'AUTH_SIGN_OUT':
      return {
        ...state,
        session: null,
        user: null,
        profile: null,
        profileInitialized: false,
        profileLoading: false,
        profileError: null,
      };
      
    case 'PROFILE_LOADING_START':
      return {
        ...state,
        profileLoading: true,
        profileError: null,
      };
      
    case 'PROFILE_LOADING_SUCCESS':
      return {
        ...state,
        profile: action.payload.profile,
        profileLoading: false,
        profileError: null,
        profileInitialized: true,
      };
      
    case 'PROFILE_LOADING_ERROR':
      return {
        ...state,
        profileLoading: false,
        profileError: action.payload,
        profileInitialized: true,
      };
      
    case 'PROFILE_UPDATE':
      return {
        ...state,
        profile: action.payload.profile,
      };
      
    default:
      return state;
  }
}

// Get the current lifecycle state based on the user state
export function getAuthLifecycleState(state: UserState): AuthLifecycleState {
  if (state.authError || state.profileError) {
    return 'ERROR';
  }
  
  if (!state.initialized) {
    return 'AUTHENTICATING';
  }
  
  if (!state.user) {
    return 'UNAUTHENTICATED';
  }
  
  if (state.profileLoading) {
    return 'PROFILE_LOADING';
  }
  
  if (state.profileInitialized) {
    return 'COMPLETE';
  }
  
  return 'AUTHENTICATED';
}

// Create context with state and dispatch
interface UserContextType extends UserState {
  dispatch: React.Dispatch<UserAction>;
  lifecycleState: AuthLifecycleState;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialUserState);
  const lifecycleState = getAuthLifecycleState(state);
  
  // Initialize auth state
  useEffect(() => {
    dispatch({ type: 'AUTH_INIT_START' });
    
    // First set up listener for auth changes to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('UserContext - Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          dispatch({ type: 'AUTH_SIGN_OUT' });
          return;
        }
        
        if (session) {
          dispatch({
            type: 'AUTH_STATE_CHANGE',
            payload: { session, user: session.user },
          });
          
          // Load profile after auth state change, but not during initialization
          // Use setTimeout to avoid potential Supabase SDK deadlocks
          if (state.initialized) {
            setTimeout(() => {
              loadUserProfile(session.user.id);
            }, 0);
          }
        }
      }
    );
    
    // Then check for existing session
    supabase.auth.getSession().then(
      ({ data: { session } }) => {
        console.log('UserContext - Initial session check:', session?.user?.id);
        
        dispatch({
          type: 'AUTH_INIT_SUCCESS',
          payload: {
            session,
            user: session?.user || null,
          },
        });
        
        // If we have a user, load their profile
        if (session?.user) {
          loadUserProfile(session.user.id);
        }
      },
      (error) => {
        console.error('UserContext - Error retrieving session:', error);
        dispatch({ type: 'AUTH_INIT_ERROR', payload: error instanceof Error ? error : new Error(String(error)) });
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Function to load user profile
  const loadUserProfile = async (userId: string) => {
    if (!userId) return;
    
    console.log('UserContext - Loading profile for user:', userId);
    dispatch({ type: 'PROFILE_LOADING_START', payload: { userId } });
    
    try {
      const profile = await fetchProfile(userId);
      console.log('UserContext - Profile loaded successfully:', profile);
      
      dispatch({
        type: 'PROFILE_LOADING_SUCCESS',
        payload: { profile },
      });
    } catch (error) {
      console.error('UserContext - Error loading profile:', error);
      
      const profileError = error instanceof ProfileError
        ? error
        : new ProfileError('Failed to load user profile', 'unknown');
      
      dispatch({
        type: 'PROFILE_LOADING_ERROR',
        payload: profileError,
      });
    }
  };
  
  // Function to refresh profile data
  const refreshProfile = async () => {
    if (!state.user) {
      console.log('UserContext - Cannot refresh profile: No authenticated user');
      return;
    }
    
    await loadUserProfile(state.user.id);
  };
  
  // Function to update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user || !state.profile) {
      console.error('UserContext - Cannot update profile: No authenticated user or profile');
      throw new ProfileError('Cannot update profile without authentication', 'unknown');
    }
    
    dispatch({ type: 'PROFILE_LOADING_START', payload: { userId: state.user.id } });
    
    try {
      const { updateProfile } = await import('@/utils/profile/ProfileUpdater');
      const updatedProfile = await updateProfile(state.user.id, updates);
      
      dispatch({
        type: 'PROFILE_UPDATE',
        payload: { profile: updatedProfile },
      });
    } catch (error) {
      console.error('UserContext - Error updating profile:', error);
      
      const profileError = error instanceof ProfileError
        ? error
        : new ProfileError('Failed to update user profile', 'unknown');
      
      dispatch({
        type: 'PROFILE_LOADING_ERROR',
        payload: profileError,
      });
      
      throw profileError;
    }
  };
  
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

export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}
