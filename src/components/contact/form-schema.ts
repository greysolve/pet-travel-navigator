
import * as z from "zod";

// Define form schema
export const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(1, { message: "Please select a subject." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." })
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// Subject options
export const subjectOptions = [
  { value: "search", label: "Search Feature Question" },
  { value: "account", label: "Issue with my account" },
  { value: "billing", label: "Billing Question" },
  { value: "feedback", label: "Feedback & Suggestions" },
  { value: "other", label: "Other" }
];
