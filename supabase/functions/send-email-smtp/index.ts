
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
    const { data: settingsData, error: settingsError } = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/support_settings?limit=1`,
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        }
      }
    ).then(res => res.json());

    if (settingsError) {
      console.error("Error fetching SMTP settings:", settingsError);
      throw new Error("Failed to fetch SMTP settings");
    }

    const settings = settingsData && settingsData.length > 0 ? settingsData[0] : null;
    
    if (!settings || !settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
      throw new Error("SMTP settings are not configured properly");
    }

    console.log(`Setting up SMTP client for ${settings.smtp_host}:${settings.smtp_port}`);
    
    const client = new SMTPClient({
      user: settings.smtp_username,
      password: settings.smtp_password,
      host: settings.smtp_host,
      port: settings.smtp_port,
      ssl: settings.smtp_secure,
      tls: !settings.smtp_secure,
    });
    
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
      
      const info = await client.sendAsync(message);
      console.log("SMTP email sent:", info);
      
      return new Response(
        JSON.stringify({ id: 'smtp-' + Date.now(), message: 'Email sent via SMTP' }), 
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } 
    // For contact form submissions
    else if (requestData.name && requestData.email && requestData.subject && requestData.message) {
      console.log("Processing contact form submission via SMTP");
      
      const autoReplyTemplate = settings.auto_reply_template.replace(
        "{{subject}}", 
        requestData.subject
      );
      
      // Prepare email content
      const supportEmailHTML = `
        <h2>New Contact Form Submission</h2>
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
      
      // Send to support with customer name in the From field and Reply-To set to customer email
      const supportEmailMessage = {
        from: `${requestData.name} via PetJumper <${fromEmail}>`,
        to: settings.support_email,
        replyTo: requestData.email,
        subject: `Contact Form: ${requestData.subject}`,
        text: supportEmailHTML.replace(/<[^>]*>?/gm, ''),
        attachment: [
          { data: supportEmailHTML, alternative: true }
        ]
      };
      
      const supportInfo = await client.sendAsync(supportEmailMessage);
      console.log("SMTP support email sent:", supportInfo);
      
      // Send auto-reply to user with support email as the sender
      const userEmailMessage = {
        from: `${fromName} <${fromEmail}>`,
        to: requestData.email,
        replyTo: settings.support_email,
        subject: settings.auto_reply_subject,
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
    } else {
      throw new Error("Invalid request data for SMTP email");
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
