
import { useState, useEffect } from "react";

interface CountryInputSectionProps {
  initialValue?: string;
  onChange: (value: string) => void;
}

export const CountryInputSection = ({ initialValue = "", onChange }: CountryInputSectionProps) => {
  const [countryInput, setCountryInput] = useState<string>(initialValue);
  
  useEffect(() => {
    if (initialValue) {
      setCountryInput(initialValue);
    }
  }, [initialValue]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCountryInput(value);
    onChange(value);
  };
  
  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Enter country name for single country sync"
        value={countryInput}
        onChange={handleChange}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
};
