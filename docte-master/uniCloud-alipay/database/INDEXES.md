# Database Index Checklist

Create these indexes in the uniCloud database console before production traffic.

## cicada_users

- `token`
- `openid`
- `username`
- `role`

## cicada_orders

- `order_no` unique
- `create_time desc`
- `user_id, create_time desc`
- `status, create_time desc`
- `engineer_id, create_time desc`
- `payment_status, create_time desc`
- `quote_status, create_time desc`
- `invoice_info.need_invoice, invoice_info.status, create_time desc`
- `ship_out_info.logistics_no`
- `ship_back_info.logistics_no`

## cicada_order_items

- `order_id`

## cicada_user_devices

- `user_id, create_time desc`
- `user_id, sn`
- `customer_id, create_time desc`
- `sn`

## cicada_customers

- `status, create_time desc`
- `customer_type, status`
- `phone`  （手机号重复校验）
- `user_id`
- `openid`
- `dealer_id`
- `tags`  （多键索引，按标签筛选）

## cicada_customer_tags

- `name` unique
- `sort, create_time`

## cicada_customer_logs

- `target_id, create_time desc`
- `create_time desc`

## cicada_addresses

- `user_id`

## cicada_feedbacks

- `user_id, create_time desc`
- `status, create_time desc`

## cicada_fault_kb

- `category_id`

## cicada_product_categories

- `status, sort asc`

## cicada_rate_limits

- `key` unique
- `reset_time`

## cicada_subscription_logs

- `order_id, create_time desc`
- `user_id, create_time desc`
- `scene, create_time desc`
- `status, create_time desc`

## cicada_order_events

- `order_id, create_time desc`
- `order_no, create_time desc`
- `action, create_time desc`
- `actor_id, create_time desc`

## Notes

- Keep `order_no` unique. The code now uses a time prefix plus 32 bits of random suffix, but the unique index is still the final guard.
- Clean old `cicada_rate_limits` records periodically by deleting rows whose `reset_time` is older than the current timestamp.
- Run `cicada-maintenance.run({ token, dryRun: true })` before changing production data.
