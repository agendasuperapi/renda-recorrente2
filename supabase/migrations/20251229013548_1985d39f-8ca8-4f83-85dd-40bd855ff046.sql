-- Add explicit SELECT policy for admins to view all comments
CREATE POLICY "Admins can view all comments" 
ON public.training_comments 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));