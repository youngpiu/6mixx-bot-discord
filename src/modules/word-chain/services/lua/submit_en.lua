local status = redis.call('HGET', KEYS[1], 'status')
if not status then
  return {'NO_STATE'}
end

if status == 'paused' then
  return {'PAUSED'}
end

local currentLastWord = redis.call('HGET', KEYS[1], 'currentLastWord')
if currentLastWord ~= ARGV[2] then
  return {'INVALID_CHAIN', tostring(currentLastWord)}
end

if redis.call('SISMEMBER', KEYS[2], ARGV[3]) == 0 then
  return {'NOT_IN_DICTIONARY'}
end

local currentWord = redis.call('HGET', KEYS[1], 'currentWord')
if currentWord and currentWord == ARGV[3] then
  return {'SAME_WORD'}
end

local isRepeat = redis.call('SISMEMBER', KEYS[4], ARGV[3]) == 1 and 1 or 0
if isRepeat == 0 then
  redis.call('SADD', KEYS[4], ARGV[3])
  redis.call('SADD', KEYS[7], ARGV[2])
  redis.call('HINCRBY', KEYS[5], ARGV[2], 1)
end

redis.call('HINCRBY', KEYS[6], ARGV[1], 1)
local totalWords = redis.call('HINCRBY', KEYS[1], 'totalWords', 1)
redis.call('HSET', KEYS[1], 'currentLastWord', ARGV[4])
redis.call('HSET', KEYS[1], 'currentWord', ARGV[3])

local remaining = redis.call('SCARD', KEYS[3])
return {'OK', tostring(totalWords), tostring(remaining), tostring(isRepeat)}
