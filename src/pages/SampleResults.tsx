import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";

const SampleResults = () => {
  const { route } = useParams();
  console.log("Sample results route param:", route);

  const { data: file } = useQuery({
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

  return (
    <div className="min-h-screen bg-gray-50">
      {pdfUrl ? (
        <div className="w-full h-screen">
          <embed
            src={pdfUrl}
            type="application/pdf"
            className="w-full h-full"
          />
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