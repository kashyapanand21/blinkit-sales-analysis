-- ============================================================
-- Blinkit Sales Analysis: table definition
-- (npm run setup creates the database and runs this for you.
--  To run it by hand in MySQL Workbench, first run:
--  CREATE DATABASE IF NOT EXISTS blinkit_db; USE blinkit_db;)
-- ============================================================

CREATE TABLE IF NOT EXISTS blinkit_sales (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  item_identifier           VARCHAR(20)   NOT NULL,
  item_type                 VARCHAR(50)   NOT NULL,
  item_fat_content          VARCHAR(20)   NOT NULL,
  item_weight               DECIMAL(6,2)  NULL,          -- some rows are blank in the dataset
  item_visibility           DECIMAL(10,6) NOT NULL DEFAULT 0,
  outlet_identifier         VARCHAR(20)   NOT NULL,
  outlet_establishment_year INT           NOT NULL,
  outlet_size               VARCHAR(20)   NOT NULL,
  outlet_location_type      VARCHAR(20)   NOT NULL,
  outlet_type               VARCHAR(40)   NOT NULL,
  sales                     DECIMAL(12,4) NOT NULL,
  rating                    DECIMAL(3,1)  NOT NULL,
  created_at                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  -- Indexes on the columns we filter and group by the most
  INDEX idx_location (outlet_location_type),
  INDEX idx_outlet_type (outlet_type),
  INDEX idx_item_type (item_type)
);
