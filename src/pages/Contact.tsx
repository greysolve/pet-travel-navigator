
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/ContactForm";
import AuthDialog from "@/components/AuthDialog";
import { ExternalLink } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-[#F1F0FB] py-8">
      <div className="container mx-auto px-4 pt-[15vh] md:pt-8">
        <div className="absolute top-4 right-4 z-50">
          <AuthDialog />
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-center">Contact Support</h1>
        
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>How Can We Help?</CardTitle>
              <CardDescription>
                Fill out the form below and our support team will get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>
                Check out these resources that might help answer your questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <a 
                    href="/us-pet-travel" 
                    className="flex items-center text-primary hover:underline"
                  >
                    US Pet Travel Resources <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </div>
                <div>
                  <a 
                    href="/eu-pet-passport" 
                    className="flex items-center text-primary hover:underline"
                  >
                    EU Pet Passport Information <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;
