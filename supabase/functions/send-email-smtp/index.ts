import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to?: string;
  subject?: string;
  html?: string;
  name?: string;
  email?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmailRequest = await req.json();
    console.log("SMTP email request data:", requestData);

    // Get support settings from database for SMTP configuration
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

    const port = settings.smtp_port || 587;
    
    // Prioritize the new smtp_security field but fall back to the old secure flag
    const securityType = settings.smtp_security || (settings.smtp_secure ? "tls" : "none");
    
    console.log(`Setting up SMTP client for ${settings.smtp_host}:${port} (security: ${securityType})`);
    
    let smtpConfig: Record<string, any> = {
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
    
    try {
      console.log("SMTP client configuration:", {
        host: settings.smtp_host,
        port: port,
        user: settings.smtp_username ? "✓" : "✗",
        password: settings.smtp_password ? "✓" : "✗",
        ssl: smtpConfig.ssl, 
        tls: smtpConfig.tls
      });
      
      const client = new SMTPClient(smtpConfig);
      
      const fromName = settings.smtp_from_name || "PetJumper Support";
      const fromEmail = settings.smtp_from_email || settings.smtp_username;
      
      // For direct email sending (admin features)
      if (requestData.to && requestData.subject && requestData.html) {
        console.log(`Sending SMTP email from ${fromName} <${fromEmail}> to ${requestData.to}`);
        
        const message = {
          from: `${fromName} <${fromEmail}>`,
          to: requestData.to,
          subject: requestData.subject,
          text: requestData.html.replace(/<[^>]*>?/gm, ''), // Simple HTML to text conversion
          attachment: [
            { data: requestData.html, alternative: true }
          ]
        };
        
        try {
          const info = await client.sendAsync(message);
          console.log("SMTP email sent:", info);
          
          return new Response(
            JSON.stringify({ id: 'smtp-' + Date.now(), message: 'Email sent via SMTP' }), 
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } catch (smtpError) {
          console.error("SMTP sending error:", smtpError);
          throw new Error(`SMTP sending failed: ${smtpError.message}`);
        }
      } 
      // For contact form submissions
      else if (requestData.name && requestData.email && requestData.subject && requestData.message) {
        console.log("Processing contact form submission via SMTP");
        
        // Ensure auto_reply_template exists
        if (!settings.auto_reply_template) {
          settings.auto_reply_template = "Thank you for contacting us about {{subject}}. We will get back to you soon.";
        }
        
        const autoReplyTemplate = settings.auto_reply_template.replace(
          "{{subject}}", 
          requestData.subject
        );
        
        // Simplified email content
        const supportEmailHTML = `
          <p><strong>From:</strong> ${requestData.name} (${requestData.email})</p>
          <p><strong>Subject:</strong> ${requestData.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${requestData.message.replace(/\n/g, '<br>')}</p>
        `;
        
        const userEmailHTML = `
          <p>Dear ${requestData.name},</p>
          <p>${autoReplyTemplate}</p>
          <p>Best regards,<br>The PetJumper Support Team</p>
        `;
        
        try {
          // Send to support with comprehensive Reply-To implementation
          const supportEmailMessage = {
            from: `${requestData.name} via PetJumper <${fromEmail}>`,
            to: settings.support_email,
            reply_to: requestData.email,
            replyTo: requestData.email,
            subject: requestData.subject,
            text: supportEmailHTML.replace(/<[^>]*>?/gm, ''),
            attachment: [
              { data: supportEmailHTML, alternative: true }
            ],
            headers: {
              'Reply-To': requestData.email,
              'X-Original-From': requestData.email,
              'X-Original-Name': requestData.name
            }
          };
          
          console.log("About to send email with reply-to:", requestData.email);
          const supportInfo = await client.sendAsync(supportEmailMessage);
          console.log("SMTP support email sent:", supportInfo);
          
          // Send auto-reply to user
          const userEmailMessage = {
            from: `${fromName} <${fromEmail}>`,
            to: requestData.email,
            subject: settings.auto_reply_subject || "Thank you for your message",
            text: userEmailHTML.replace(/<[^>]*>?/gm, ''),
            attachment: [
              { data: userEmailHTML, alternative: true }
            ]
          };
          
          const userInfo = await client.sendAsync(userEmailMessage);
          console.log("SMTP auto-reply email sent:", userInfo);
          
          return new Response(
            JSON.stringify({ 
              message: "Contact form processed successfully via SMTP", 
              supportEmail: { id: 'smtp-support-' + Date.now() },
              userEmail: { id: 'smtp-user-' + Date.now() }
            }), 
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } catch (smtpError) {
          console.error("SMTP sending error:", smtpError);
          throw new Error(`SMTP sending failed: ${smtpError.message}`);
        }
      } else {
        throw new Error("Invalid request data for SMTP email");
      }
    } catch (smtpSetupError) {
      console.error("SMTP client setup or sending error:", smtpSetupError);
      throw new Error(`SMTP configuration error: ${smtpSetupError.message}`);
    }
  } catch (error: any) {
    console.error("Error in send-email-smtp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
