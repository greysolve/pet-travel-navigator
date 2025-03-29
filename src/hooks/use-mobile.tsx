
import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Initial check on mount
    const checkMobile = () => {
      return window.innerWidth < MOBILE_BREAKPOINT || 
             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    const handleResize = () => {
      setIsMobile(checkMobile());
    };
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Set initial value
    setIsMobile(checkMobile());
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

// Add alias for backward compatibility
export const useMobile = useIsMobile;
