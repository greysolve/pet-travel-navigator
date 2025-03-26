
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    console.log("Email request data:", requestData);

    // Get support settings from database to determine support email address
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
      console.error("Error fetching support settings:", settingsError);
      throw new Error("Failed to fetch support settings");
    }

    const settings = settingsData && settingsData.length > 0 ? settingsData[0] : {
      support_email: "hello@support.petjumper.com",
      auto_reply_subject: "Your message has been received",
      auto_reply_template: "Thank you for contacting PetJumper support. We have received your message and will respond as soon as possible. Your request has been logged with the subject: {{subject}}."
    };

    // For direct email sending (admin features)
    if (requestData.to && requestData.subject && requestData.html) {
      console.log("Sending email to:", requestData.to);
      
      const emailResponse = await resend.emails.send({
        from: "PetTravel <onboarding@resend.dev>",
        to: [requestData.to],
        subject: requestData.subject,
        html: requestData.html,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } 
    // For contact form submissions
    else if (requestData.name && requestData.email && requestData.subject && requestData.message) {
      console.log("Processing contact form submission");
      
      const autoReplyTemplate = settings.auto_reply_template.replace(
        "{{subject}}", 
        requestData.subject
      );
      
      // Enhanced email content with prominent customer email
      const supportEmailHTML = `
        <p><strong>REPLY DIRECTLY TO THE CUSTOMER AT: ${requestData.email}</strong></p>
        <p>(The customer has been CC'd on this email)</p>
        <hr>
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
      
      // Send to support with CC to user and replyTo set
      const supportEmailResponse = await resend.emails.send({
        from: "PetJumper Contact <onboarding@resend.dev>",
        to: [settings.support_email],
        cc: [requestData.email], // Add user as CC recipient
        replyTo: requestData.email, // Keep Reply-To as well just in case
        subject: requestData.subject,
        html: supportEmailHTML,
      });
      
      // Send auto-reply to user
      const userEmailResponse = await resend.emails.send({
        from: "PetJumper Support <onboarding@resend.dev>",
        to: [requestData.email],
        subject: settings.auto_reply_subject,
        html: userEmailHTML,
      });

      console.log("Support email sent:", supportEmailResponse);
      console.log("Auto-reply email sent:", userEmailResponse);

      return new Response(
        JSON.stringify({ 
          message: "Contact form processed successfully", 
          supportEmail: supportEmailResponse,
          userEmail: userEmailResponse 
        }), 
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      throw new Error("Invalid request data");
    }
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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
