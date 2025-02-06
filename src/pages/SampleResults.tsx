import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SampleResults = () => {
  const { data: file } = useQuery({
    queryKey: ["active-sample-file"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sample_files")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const incrementViewCount = async () => {
      if (file?.id) {
        await supabase.rpc("increment_view_count", {
          file_id: file.id,
        });
      }
    };

    incrementViewCount();
  }, [file?.id]);

  useEffect(() => {
    if (file?.file_path) {
      const { data } = supabase.storage
        .from("sample-results")
        .getPublicUrl(file.file_path);

      // Open PDF in current window
      window.location.href = data.publicUrl;
    }
  }, [file?.file_path]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {!file && <p>No sample results available.</p>}
      </div>
    </div>
  );
};

export default SampleResults;