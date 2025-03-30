
import { useCallback } from "react";

// We need to use a simple event system since the dialog state is managed in AuthDialog
const AUTH_DIALOG_EVENT = "show-auth-dialog";

export const useAuthDialog = () => {
  const showAuthDialog = useCallback(() => {
    // Dispatch a custom event that AuthDialog will listen for
    window.dispatchEvent(new CustomEvent(AUTH_DIALOG_EVENT));
  }, []);

  return { showAuthDialog };
};

