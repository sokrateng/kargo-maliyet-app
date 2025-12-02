import { createClient } from '@supabase/supabase-js';

// Supabase panelinden: Project Settings -> API kısmından bu bilgileri alabilirsiniz.
const supabaseUrl = 'https://dlyjjmjbzifbvgsiuldo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWpqbWpiemlmYnZnc2l1bGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTQ0MTksImV4cCI6MjA4MDI3MDQxOX0.OhCpzQtMPf6i1azak1FxxncRYYjIdh-wroT1kuAxJ3c';

export const supabase = createClient(supabaseUrl, supabaseKey);