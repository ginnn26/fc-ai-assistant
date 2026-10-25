-- New orders are priced at1500sen by the backend. Retain historical1000sen orders.
-- No checkout is enabled by this migration; no usage, wallet or payment is changed.
begin;
alter table care_private.orders drop constraint orders_price_sen_check;
alter table care_private.orders add constraint orders_price_sen_check check (price_sen in (1000,1500));
commit;
