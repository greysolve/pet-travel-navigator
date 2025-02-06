import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2 } from "lucide-react";

const SampleResultsManager = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sampleFiles, isLoading } = useQuery({
    queryKey: ["sample-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sample_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { data: file } = await supabase
        .from("sample_files")
        .select("file_path")
        .eq("id", fileId)
        .single();

      if (file) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from("sample-results")
          .remove([file.file_path]);
        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
          .from("sample_files")
          .delete()
          .eq("id", fileId);
        if (dbError) throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-files"] });
      toast({
        title: "File deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting file:", error);
      toast({
        title: "Error deleting file",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("sample-results")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase.from("sample_files").insert({
        file_path: fileName,
        active: true,
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["sample-files"] });
      toast({
        title: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error uploading file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild disabled={uploading}>
          <label className="cursor-pointer">
            {uploading ? (
              <>
                <Loader2 className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload />
                Upload PDF
              </>
            )}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </Button>
      </div>

      <div className="space-y-4">
        {sampleFiles?.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div>
              <p className="font-medium">{file.file_path}</p>
              <p className="text-sm text-gray-500">
                Views: {file.view_count || 0}
              </p>
            </div>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => deleteMutation.mutate(file.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SampleResultsManager;