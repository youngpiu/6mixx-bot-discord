local status = redis.call('HGET', KEYS[1], 'status')
if not status then
  return {'NO_STATE'}
end

if status == 'paused' then
  return {'PAUSED'}
end

local lastPlayerId = redis.call('HGET', KEYS[1], 'lastPlayerId')
if lastPlayerId and lastPlayerId == ARGV[1] then
  return {'SAME_PLAYER'}
end

local currentLastWord = redis.call('HGET', KEYS[1], 'currentLastWord')
if currentLastWord ~= ARGV[2] then
  return {'INVALID_CHAIN', tostring(currentLastWord)}
end

if redis.call('SISMEMBER', KEYS[2], ARGV[3]) == 0 then
  return {'NOT_IN_DICTIONARY'}
end

if redis.call('SISMEMBER', KEYS[4], ARGV[3]) == 1 then
  return {'ALREADY_USED'}
end

redis.call('SADD', KEYS[4], ARGV[3])
redis.call('SADD', KEYS[7], ARGV[2])
redis.call('HINCRBY', KEYS[5], ARGV[2], 1)
redis.call('HINCRBY', KEYS[6], ARGV[1], 1)
local totalWords = redis.call('HINCRBY', KEYS[1], 'totalWords', 1)
redis.call('HSET', KEYS[1], 'lastPlayerId', ARGV[1], 'currentLastWord', ARGV[4])

local totalCandidates = redis.call('SCARD', KEYS[3])
local usedWithLast = tonumber(redis.call('HGET', KEYS[5], ARGV[4]) or '0')
local remaining = totalCandidates - usedWithLast

return {'OK', tostring(totalWords), tostring(remaining)}
