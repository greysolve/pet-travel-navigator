
import { Session, User } from '@supabase/supabase-js';
import { ProfileError } from '@/utils/profile/ProfileError';
import { UserProfile } from '@/utils/profile/types';

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
export const initialUserState: UserState = {
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
export function userReducer(state: UserState, action: UserAction): UserState {
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
