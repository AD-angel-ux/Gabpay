-- Script SQL pour GabPayApp
-- Base de données MySQL

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS gabpay_db;
USE gabpay_db;

-- Table des utilisateurs
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des transactions
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    type ENUM('transfer', 'qr_transfer', 'bill_payment', 'savings_deposit', 'savings_withdraw') NOT NULL,
    qr_code VARCHAR(36) UNIQUE NULL, -- UUID pour les QR codes
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_status (status),
    INDEX idx_qr_code (qr_code)
);

-- Table des factures
CREATE TABLE bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    amount DECIMAL(15,2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_paid (is_paid)
);

-- Table d'épargne
CREATE TABLE savings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read)
);

-- Insérer un utilisateur administrateur par défaut
-- Mot de passe: admin123 (hashé avec bcrypt)
INSERT INTO users (full_name, email, phone, password_hash, balance, is_admin) VALUES 
('Administrateur', 'admin@gabpay.com', '+224123456789', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1000000.00, TRUE);

-- Insérer quelques utilisateurs de test
INSERT INTO users (full_name, email, phone, password_hash, balance) VALUES 
('Jean Dupont', 'jean@example.com', '+224123456790', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 50000.00),
('Marie Martin', 'marie@example.com', '+224123456791', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 75000.00),
('Paul Durand', 'paul@example.com', '+224123456792', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 30000.00);

-- Insérer quelques factures de test
INSERT INTO bills (user_id, title, description, amount) VALUES 
(2, 'Facture d\'électricité', 'Consommation mensuelle', 25000.00),
(2, 'Facture d\'eau', 'Consommation mensuelle', 15000.00),
(3, 'Facture internet', 'Abonnement mensuel', 35000.00),
(4, 'Facture téléphone', 'Forfait mensuel', 20000.00);

-- Insérer quelques notifications de test
INSERT INTO notifications (user_id, message) VALUES 
(2, 'Bienvenue sur GabPay ! Votre compte a été créé avec succès.'),
(3, 'Vous avez reçu un paiement de 10000 GNF de Jean Dupont.'),
(4, 'Votre facture d\'électricité est maintenant disponible.');

-- Créer des comptes d'épargne pour les utilisateurs
INSERT INTO savings (user_id, balance) VALUES 
(2, 10000.00),
(3, 25000.00),
(4, 5000.00);

-- Afficher les tables créées
SHOW TABLES;

-- Afficher la structure des tables principales
DESCRIBE users;
DESCRIBE transactions;
DESCRIBE bills;
DESCRIBE savings;
DESCRIBE notifications;
