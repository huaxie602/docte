# Database Index Checklist

Create these indexes in the uniCloud database console before production traffic.

## cicada_users

- `token`
- `openid`
- `username`
- `role`
- `phone`（手机号查询）

## cicada_orders

- `order_no` unique
- `user_id, create_time desc`
- `status, create_time desc`
- `engineer_id, create_time desc`
- `wechat_pay_out_trade_no`（支付回调查询）
- `ship_out_info.logistics_no`（物流单号查询）
- `ship_back_info.logistics_no`（物流单号查询）
- `quote_status, create_time desc`（报价状态筛选）
- `payment_status, create_time desc`（付款状态筛选）
- `update_time desc`（更新时间排序）
- `order_source, create_time desc`（来源统计）

## cicada_order_items

- `order_id`

## cicada_user_devices

- `user_id, create_time desc`
- `user_id, sn`

## cicada_addresses

- `user_id`
- `user_id, is_default`（默认地址查询）

## cicada_feedbacks

- `user_id, create_time desc`
- `status, create_time desc`
- `handle_user_id, create_time desc`（按处理人查）

## cicada_fault_kb

- `category_id`

## cicada_product_categories

- `status, sort asc`

## cicada_rate_limits

- `key` unique（当前已有）
- `reset_time`
- 建议添加 `key, scope, identity` 复合唯一索引，防止同 key 同 scope 同 identity 的重复记录

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
- `source, create_time desc`（按来源筛选）

## Notes

- Keep `order_no` unique. The code now uses a time prefix plus 32 bits of random suffix, but the unique index is still the final guard.
- Clean old `cicada_rate_limits` records periodically by deleting rows whose `reset_time` is older than the current timestamp.
- Run `cicada-maintenance.run({ token, dryRun: true })` before changing production data.

## 定期清理建议

### cicada_rate_limits 过期记录清理

`cicada_rate_limits` 集合中 `reset_time` 已过期的记录不再具有限流意义，建议定期清理以控制集合大小。

**清理逻辑**：
```javascript
// 删除 reset_time 早于当前时间的记录
const now = Date.now()
await db.collection('cicada_rate_limits')
  .where({ reset_time: dbCmd.lt(now) })
  .remove()
```

**实现方式**（二选一）：

1. **cron 定时任务**：在 uniCloud 控制台配置定时触发器（如每天凌晨执行），调用 `cicada-maintenance` 云函数中的清理逻辑。
2. **maintenance 云函数**：在 `cicada-maintenance` 云函数中实现 `cleanRateLimits` 方法，支持通过 `dryRun` 参数预览待删除记录数后再执行实际清理。

**建议频率**：每天执行一次，或在 `cicada_rate_limits` 集合文档数超过阈值时触发。
