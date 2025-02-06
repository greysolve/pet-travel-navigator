import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Copy } from "lucide-react";

const SampleResultsManager = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sampleFiles, isLoading } = useQuery({
    queryKey: ["sample-files"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

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

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      setUploading(true);
      console.log("Starting file upload...");

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("sample-results")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded to storage successfully");

      // Create database record
      const { error: dbError } = await supabase.from("sample_files").insert({
        file_path: fileName,
        active: true,
      });

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw dbError;
      }

      console.log("Database record created successfully");

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

  const getPublicUrl = (filePath: string) => {
    // Extract the route name from the file path
    // Remove timestamp and extension
    return filePath
      .replace(/^\d+-/, '') // Remove timestamp prefix
      .replace(/\.[^/.]+$/, ''); // Remove file extension
  };

  const copyToClipboard = (route: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${route}-Sample`);
    toast({
      title: "URL copied to clipboard",
    });
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
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
        {sampleFiles?.map((file) => {
          const routeName = getPublicUrl(file.file_path);

          return (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{routeName}-Sample</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(routeName)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
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
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SampleResultsManager;