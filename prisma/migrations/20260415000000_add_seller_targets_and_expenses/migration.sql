ALTER TABLE `employees`
  ADD COLUMN `sales_target_amount` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `monthly_expenses_amount` DOUBLE NOT NULL DEFAULT 0;
