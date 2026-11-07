CREATE DATABASE IF NOT EXISTS product_management;
USE product_management;

CREATE TABLE IF NOT EXISTS Product (
    p_id INT PRIMARY KEY AUTO_INCREMENT,
    p_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 5
);

-- Optional sample data
INSERT INTO Product (p_name, category, price, quantity, reorder_level) VALUES
('Wireless Mouse', 'Electronics', 599.00, 25, 5),
('USB-C Cable', 'Electronics', 249.00, 4, 10),
('Notebook A4', 'Stationery', 60.00, 0, 20),
('Desk Lamp', 'Home', 899.00, 12, 5);
