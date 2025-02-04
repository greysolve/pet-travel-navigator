import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Save, BookmarkPlus, RefreshCw, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SavedSearch {
  id: string;
  name: string;
  search_criteria: {
    origin?: string;
    destination?: string;
    date?: string;
    policySearch?: string;
  };
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface SavedSearchesManagerProps {
  currentSearch: {
    origin?: string;
    destination?: string;
    date?: Date;
    policySearch?: string;
  };
  onLoadSearch: (search: SavedSearch['search_criteria']) => void;
}

export const SavedSearchesManager = ({ currentSearch, onLoadSearch }: SavedSearchesManagerProps) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [user]);

  const fetchSavedSearches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error fetching saved searches",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Transform the data to match our SavedSearch type
    const transformedData: SavedSearch[] = (data || []).map(item => ({
      id: item.id,
      name: item.name || '',
      search_criteria: typeof item.search_criteria === 'string' 
        ? JSON.parse(item.search_criteria)
        : item.search_criteria,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_id: item.user_id
    }));

    setSavedSearches(transformedData);
  };

  const handleSaveSearch = async () => {
    if (!user || !searchName.trim()) return;

    const searchData = {
      ...currentSearch,
      date: currentSearch.date?.toISOString(),
    };

    try {
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name: searchName,
          search_criteria: searchData,
        });

      if (error) throw error;

      toast({
        title: "Search saved successfully",
        description: "You can now access this search from the dropdown menu.",
      });

      setShowSaveDialog(false);
      setSearchName("");
      fetchSavedSearches();
    } catch (error: any) {
      toast({
        title: "Error saving search",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportAsPDF = async () => {
    const element = document.getElementById('search-results');
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('search-results.pdf');

      toast({
        title: "PDF exported successfully",
        description: "Your search results have been saved as a PDF.",
      });
    } catch (error) {
      toast({
        title: "Error exporting PDF",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportAsPNG = async () => {
    const element = document.getElementById('search-results');
    if (!element) return;

    try {
      // Save original styles
      const originalMaxWidth = element.style.maxWidth;
      const originalWidth = element.style.width;

      // Remove width constraints temporarily
      element.style.maxWidth = 'none';
      element.style.width = 'auto';

      const canvas = await html2canvas(element, {
        logging: false,
        useCORS: true,
        scale: 2, // Increase quality
      });

      // Restore original styles
      element.style.maxWidth = originalMaxWidth;
      element.style.width = originalWidth;

      const link = document.createElement('a');
      link.download = 'search-results.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "PNG exported successfully",
        description: "Your search results have been saved as a PNG.",
      });
    } catch (error) {
      console.error('PNG Export error:', error);
      toast({
        title: "Error exporting PNG",
        description: "Failed to generate PNG. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        variant="outline"
        onClick={() => setShowSaveDialog(true)}
        className="flex items-center gap-2"
      >
        <BookmarkPlus className="h-4 w-4" />
        Save Search
      </Button>

      <Select
        onValueChange={(value) => {
          const search = savedSearches.find(s => s.id === value);
          if (search) {
            onLoadSearch(search.search_criteria);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Saved Searches" />
        </SelectTrigger>
        <SelectContent>
          {savedSearches.map((search) => (
            <SelectItem key={search.id} value={search.id}>
              {search.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={exportAsPDF}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export PDF
      </Button>

      <Button
        variant="outline"
        onClick={exportAsPNG}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export PNG
      </Button>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Enter a name for this search"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <Button onClick={handleSaveSearch} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};