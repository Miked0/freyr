-- SQLite schema for expense tracker
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  raw_description TEXT,
  source_file TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT 0,
  parent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corrections (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  original_category TEXT NOT NULL,
  corrected_category TEXT NOT NULL,
  corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses (id)
);

-- Insert some default categories
INSERT OR IGNORE INTO categories (id, name, is_custom) VALUES
('cat_food', 'Alimentação', 0),
('cat_transport', 'Transporte', 0),
('cat_housing', 'Moradia', 0),
('cat_health', 'Saúde', 0),
('cat_entertainment', 'Lazer', 0),
('cat_shopping', 'Compras', 0),
('cat_utilities', 'Contas', 0),
('cat_other', 'Outros', 0);
