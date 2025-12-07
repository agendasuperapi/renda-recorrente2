
-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_user', 'resolved', 'closed');

-- Create enum for ticket type
CREATE TYPE public.ticket_type AS ENUM ('problema', 'sugestao', 'reclamacao', 'duvida', 'financeiro', 'tecnico', 'outro');

-- Create enum for ticket priority
CREATE TYPE public.ticket_priority AS ENUM ('baixa', 'normal', 'alta', 'urgente');

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START 1;

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ticket_number INTEGER NOT NULL DEFAULT nextval('support_ticket_number_seq'),
  ticket_type public.ticket_type NOT NULL DEFAULT 'duvida',
  subject TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  is_resolved BOOLEAN DEFAULT NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  image_urls TEXT[] DEFAULT '{}',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (for rating, closing)
CREATE POLICY "Users can update own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for support_messages

-- Users can view messages in their tickets
CREATE POLICY "Users can view messages in own tickets"
ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Users can create messages in their tickets
CREATE POLICY "Users can create messages in own tickets"
ON public.support_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.support_messages
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Admins can create messages in any ticket
CREATE POLICY "Admins can create messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  has_role(auth.uid(), 'super_admin')
);

-- Admins can update messages (for read_at)
CREATE POLICY "Admins can update messages"
ON public.support_messages
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Users can update messages in their tickets (for read_at)
CREATE POLICY "Users can update messages in own tickets"
ON public.support_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_admin ON public.support_tickets(assigned_admin_id);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_sender_id ON public.support_messages(sender_id);

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for support attachments
CREATE POLICY "Anyone can view support attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'support-attachments');

CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own support attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'support-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
