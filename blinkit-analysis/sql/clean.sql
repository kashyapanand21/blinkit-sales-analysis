-- ============================================================
-- Data cleaning: the raw dataset spells the same fat category
-- several ways ('LF', 'low fat', 'reg'). Standardise them.
-- ============================================================

-- MySQL Workbench blocks UPDATEs without a key in WHERE (Error 1175).
SET SQL_SAFE_UPDATES = 0;

-- See what labels exist before cleaning
SELECT item_fat_content, COUNT(*) AS cnt
FROM blinkit_sales
GROUP BY item_fat_content;

UPDATE blinkit_sales SET item_fat_content = 'Low Fat'
WHERE item_fat_content IN ('LF', 'low fat');

UPDATE blinkit_sales SET item_fat_content = 'Regular'
WHERE item_fat_content = 'reg';

SET SQL_SAFE_UPDATES = 1;
