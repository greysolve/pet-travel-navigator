
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

interface DateSelectorProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  isLoading?: boolean;
}

export const DateSelector = ({ date, setDate, isLoading }: DateSelectorProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-12 text-base justify-start text-left font-normal border-gray-300",
            !date && "text-muted-foreground",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a departure date</span>}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          disabled={(date) => date < new Date()}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
