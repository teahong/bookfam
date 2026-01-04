import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbenmzfkheuvwrgyanfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZW5temZraGV1dndyZ3lhbmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MDk2NDUsImV4cCI6MjA4MzA4NTY0NX0._o4FV9ZJ8c8pTVakTXRr4CXrkreXhnwMabqhqdvk0RU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
