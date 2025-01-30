import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jhokkuszubzngrcamfdb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impob2trdXN6dWJ6bmdyY2FtZmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MTU0MzQsImV4cCI6MjA1MzA5MTQzNH0.raNfn4e-a6EISXQpuyez3mUDzKpao3Zs4AYJiJZrZbU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);