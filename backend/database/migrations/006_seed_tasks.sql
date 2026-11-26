-- Seed starter tasks (safe to run once on an empty tasks table).
INSERT INTO tasks (title, category, reward_paise, status, assigned_user_id)
SELECT v.title, v.category, v.reward_paise, 'active', NULL
FROM (
  SELECT 'Daily Login' AS title, 'Daily' AS category, 200 AS reward_paise
  UNION ALL SELECT 'Watch Video', 'Daily', 500
  UNION ALL SELECT 'Share App', 'Social', 1000
  UNION ALL SELECT 'Read News', 'Daily', 300
  UNION ALL SELECT 'Complete Survey', 'Special', 1500
) AS v
WHERE NOT EXISTS (SELECT 1 FROM tasks LIMIT 1);

