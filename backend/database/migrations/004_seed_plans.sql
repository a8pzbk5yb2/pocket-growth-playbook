-- Illustrative sample plans (display only, never sold). Safe to run once or on an empty plans table.
INSERT INTO plans (name, icon, display_price, display_daily, duration_days, description, status, sort_order)
SELECT v.name, v.icon, v.display_price, v.display_daily, v.duration_days, v.description, 'active', v.sort_order
FROM (
  SELECT 'Basic Plan' AS name, 'zap' AS icon, 100 AS display_price, 10 AS display_daily, 30 AS duration_days, 'Entry-level sample plan for exploring the platform.' AS description, 1 AS sort_order
  UNION ALL SELECT 'Silver Plan', 'star', 500, 60, 30, 'Popular sample tier shown for illustration.', 2
  UNION ALL SELECT 'Gold Plan', 'crown', 1000, 130, 45, 'Premium sample tier with crown badge.', 3
  UNION ALL SELECT 'Diamond Plan', 'gem', 2000, 280, 60, 'Top sample tier shown for illustration.', 4
) AS v
WHERE NOT EXISTS (SELECT 1 FROM plans LIMIT 1);

