-- Create storage bucket for generated files
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-files', 'generated-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for generated-files bucket
-- Users can upload their own files (service role will handle this)
CREATE POLICY "Service role can manage generated files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'generated-files')
WITH CHECK (bucket_id = 'generated-files');

-- Users can download their own files (path starts with their user_id)
CREATE POLICY "Users can download their own generated files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add download_url column to tasks.files for storing signed URLs
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS generated_files jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tasks.generated_files IS 'Generated file metadata with storage paths and download info';