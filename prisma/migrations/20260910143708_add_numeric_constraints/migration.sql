ALTER TABLE "products"
ADD CONSTRAINT "products_price_non_negative"
CHECK ("price" >= 0);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_total_amount_non_negative"
CHECK ("totalAmount" >= 0);

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_unit_price_non_negative"
CHECK ("unitPrice" >= 0);

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_quantity_positive"
CHECK ("quantity" > 0);

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_quantity_positive"
CHECK ("quantity" > 0);

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_unit_price_non_negative"
CHECK ("unitPrice" >= 0);

ALTER TABLE "payments"
ADD CONSTRAINT "payments_amount_non_negative"
CHECK ("amount" >= 0);