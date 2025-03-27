
import { useMemo } from "react";
import type { PetPolicy } from "../types";
import { generatePolicyContentSignature } from "@/utils/policyContentSignature";

// Safely encode a string to base64, handling Unicode characters
const safeEncode = (str: string): string => {
  try {
    // First convert string to UTF-8, then encode to base64
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error("Error encoding content signature:", e);
    return "";
  }
};

export const useContentSignature = (policy?: PetPolicy) => {
  // Calculate content signature for display in admin console or debugging
  const contentSignature = useMemo(() => {
    if (!policy) return null;
    return generatePolicyContentSignature(policy);
  }, [policy]);

  // Store content signature as a data attribute for admin tools
  const dataAttributes = policy ? {
    'data-content-signature': safeEncode(contentSignature || '')
  } : {};

  return dataAttributes;
};
