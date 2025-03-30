
import { SMTPSettings, SMTPConfig } from "./types.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function configureSmtpClient(settings: SMTPSettings): SMTPConfig {
  const port = settings.smtp_port || 587;
  
  // Prioritize the new smtp_security field but fall back to the old secure flag
  const securityType = settings.smtp_security || (settings.smtp_secure ? "tls" : "none");
  
  console.log(`Setting up SMTP client for ${settings.smtp_host}:${port} (security: ${securityType})`);
  
  let smtpConfig: SMTPConfig = {
    user: settings.smtp_username,
    password: settings.smtp_password,
    host: settings.smtp_host,
    port: port,
    timeout: 10000, // 10 second timeout
  };
  
  // Configure SMTP security options based on the selected type
  switch (securityType) {
    case "ssl":
      smtpConfig.ssl = true;
      smtpConfig.tls = false;
      break;
    case "tls":
      smtpConfig.ssl = false;
      smtpConfig.tls = true;
      break;
    case "none":
    default:
      smtpConfig.ssl = false;
      smtpConfig.tls = false;
      break;
  }

  console.log("SMTP client configuration:", {
    host: settings.smtp_host,
    port: port,
    user: settings.smtp_username ? "✓" : "✗",
    password: settings.smtp_password ? "✓" : "✗",
    ssl: smtpConfig.ssl, 
    tls: smtpConfig.tls
  });
  
  return smtpConfig;
}
