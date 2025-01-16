-- Claudeのモデル名を最新バージョンに更新
UPDATE llm_settings 
SET model = 'claude-3-haiku-20240307',
    updated_at = CURRENT_TIMESTAMP
WHERE model LIKE 'claude%';
