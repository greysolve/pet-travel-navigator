
import { SMTPSettings } from "./types.ts";
import { corsHeaders } from "./config.ts";

export async function fetchSmtpSettings(): Promise<SMTPSettings> {
  console.log("Fetching SMTP settings from database...");
  const settingsResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/support_settings?limit=1`,
    {
      headers: {
        "Content-Type": "application/json",
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      }
    }
  );
  
  if (!settingsResponse.ok) {
    const responseText = await settingsResponse.text();
    console.error("Error fetching SMTP settings - HTTP error:", settingsResponse.status, responseText);
    throw new Error(`Failed to fetch SMTP settings: ${settingsResponse.status} ${responseText}`);
  }

  const settingsData = await settingsResponse.json();
  
  if (!settingsData || settingsData.length === 0) {
    console.error("No support settings found in database");
    throw new Error("Support settings not found");
  }

  const settings = settingsData[0];
  console.log("Settings retrieved:", {
    use_smtp: settings.use_smtp,
    host: !!settings.smtp_host,
    port: settings.smtp_port,
    username: !!settings.smtp_username,
    has_password: !!settings.smtp_password,
    security_type: settings.smtp_security || (settings.smtp_secure ? "tls" : "none"),
    from_email: !!settings.smtp_from_email,
    from_name: !!settings.smtp_from_name
  });
  
  // Validate SMTP settings
  if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
    console.error("SMTP settings are incomplete:", {
      host: !!settings.smtp_host,
      username: !!settings.smtp_username,
      password: !!settings.smtp_password
    });
    throw new Error("SMTP settings are not configured properly");
  }
  
  return settings;
}
