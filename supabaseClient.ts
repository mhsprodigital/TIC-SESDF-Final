
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txxxrweqozkaqkitnugz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4eHhyd2Vxb3prYXFraXRudWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTI3NDEsImV4cCI6MjA4MjM4ODc0MX0.nk0uheLvwGCwQgH9BkCHXBBHxwByGHw8Cs3Z3OFoCKU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
