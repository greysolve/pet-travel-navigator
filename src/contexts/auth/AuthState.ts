
import { Session, User, AuthError } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: AuthError | Error | null;
  isRestoring: boolean;
}

export type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_AUTH_STATE'; payload: { session: Session | null; user: User | null } }
  | { type: 'RESTORE_AUTH_STATE'; payload: { session: Session | null; user: User | null } }
  | { type: 'SET_ERROR'; payload: AuthError | Error }
  | { type: 'INITIALIZE_SUCCESS' }
  | { type: 'COMPLETE_RESTORATION' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SIGN_OUT' };

export const initialAuthState: AuthState = {
  session: null,
  user: null,
  loading: true,
  initialized: false,
  error: null,
  isRestoring: true,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_AUTH_STATE':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    case 'RESTORE_AUTH_STATE':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'INITIALIZE_SUCCESS':
      return {
        ...state,
        initialized: true,
        loading: false,
      };
    case 'COMPLETE_RESTORATION':
      return {
        ...state,
        isRestoring: false,
        initialized: true,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return {
        ...initialAuthState,
        loading: false,
        initialized: true,
        isRestoring: false,
      };
    default:
      return state;
  }
}
