-- Claudeのモデル名を最新バージョンに更新
UPDATE llm_settings 
SET model = 'claude-3-5-sonnet-20241022',
    updated_at = CURRENT_TIMESTAMP
WHERE model LIKE 'claude%';
