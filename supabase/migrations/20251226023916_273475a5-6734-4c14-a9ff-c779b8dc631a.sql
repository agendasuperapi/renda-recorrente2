-- Create storage bucket for training images
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-images', 'training-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view training images (public bucket)
CREATE POLICY "Anyone can view training images"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-images');

-- Allow authenticated users to upload training images
CREATE POLICY "Authenticated users can upload training images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-images' AND auth.role() = 'authenticated');

-- Allow users to update their own training images
CREATE POLICY "Users can update training images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'training-images' AND auth.role() = 'authenticated');

-- Allow users to delete training images
CREATE POLICY "Users can delete training images"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-images' AND auth.role() = 'authenticated');