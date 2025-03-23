
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

const SampleResults = () => {
  const { route } = useParams();
  const isMobile = useIsMobile();
  console.log("Sample results route param:", route, "isMobile:", isMobile);

  const { data: file, isLoading } = useQuery({
    queryKey: ["active-sample-file", route],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sample_files")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      console.log("Found sample file:", data);
      return data;
    },
  });

  useEffect(() => {
    const incrementViewCount = async () => {
      if (file?.id) {
        console.log("Incrementing view count for file:", file.id);
        await supabase.rpc("increment_view_count", {
          file_id: file.id,
        });
      }
    };

    incrementViewCount();
  }, [file?.id]);

  const pdfUrl = file?.file_path
    ? supabase.storage.from("sample-results").getPublicUrl(file.file_path).data
        .publicUrl
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading sample results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {pdfUrl ? (
        <div className="w-full h-screen">
          {isMobile ? (
            // Mobile view - options to view or download PDF
            <div className="flex flex-col items-center justify-center h-full p-4">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4 text-center">Sample Results</h2>
                <p className="text-center mb-6">
                  For the best viewing experience on mobile, please choose one of the options below:
                </p>
                <div className="space-y-4">
                  <Button
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => window.open(pdfUrl, '_blank')}
                  >
                    View in Browser
                  </Button>
                  <a
                    href={pdfUrl}
                    download="sample-results.pdf"
                    className="block w-full"
                  >
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            // Desktop view - embedded PDF
            <embed
              src={pdfUrl}
              type="application/pdf"
              className="w-full h-full"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p>No sample results available for route: {route}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleResults;
