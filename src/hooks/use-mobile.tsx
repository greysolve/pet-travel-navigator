
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initial check on mount
    const checkMobile = () => {
      return window.innerWidth < MOBILE_BREAKPOINT || 
             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(checkMobile());
    }
    
    // Add event listener
    mql.addEventListener("change", onChange)
    
    // Set initial value
    setIsMobile(checkMobile())
    
    // Clean up
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Ensure we always return a boolean (defaulting to false if undefined)
  return isMobile === undefined ? false : isMobile;
}

// Add alias for backward compatibility
export const useMobile = useIsMobile;
