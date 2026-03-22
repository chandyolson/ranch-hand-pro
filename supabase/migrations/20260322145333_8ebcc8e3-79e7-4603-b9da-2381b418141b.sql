ALTER TABLE public.sale_barn_animals 
ADD COLUMN IF NOT EXISTS buyer_work_order_id uuid REFERENCES public.work_orders(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source_animal_id uuid DEFAULT NULL;