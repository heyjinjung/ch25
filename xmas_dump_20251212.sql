-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: localhost    Database: xmas_event
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alembic_version`
--

DROP TABLE IF EXISTS `alembic_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alembic_version`
--

LOCK TABLES `alembic_version` WRITE;
/*!40000 ALTER TABLE `alembic_version` DISABLE KEYS */;
INSERT INTO `alembic_version` VALUES ('20251212_0009');
/*!40000 ALTER TABLE `alembic_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dice_config`
--

DROP TABLE IF EXISTS `dice_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dice_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `max_daily_plays` int NOT NULL,
  `win_reward_type` varchar(50) NOT NULL,
  `win_reward_amount` int NOT NULL,
  `draw_reward_type` varchar(50) NOT NULL,
  `draw_reward_amount` int NOT NULL,
  `lose_reward_type` varchar(50) NOT NULL,
  `lose_reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_dice_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dice_config`
--

LOCK TABLES `dice_config` WRITE;
/*!40000 ALTER TABLE `dice_config` DISABLE KEYS */;
INSERT INTO `dice_config` VALUES (1,'XMAS Dice',1,50,'POINT',20,'POINT',5,'POINT',5,'2025-12-10 15:09:02','2025-12-11 09:25:27');
/*!40000 ALTER TABLE `dice_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dice_log`
--

DROP TABLE IF EXISTS `dice_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dice_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `user_dice_1` int NOT NULL,
  `user_dice_2` int NOT NULL,
  `user_sum` int NOT NULL,
  `dealer_dice_1` int NOT NULL,
  `dealer_dice_2` int NOT NULL,
  `dealer_sum` int NOT NULL,
  `result` varchar(10) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `config_id` (`config_id`),
  KEY `ix_dice_log_id` (`id`),
  KEY `ix_dice_log_user_created_at` (`user_id`,`created_at`),
  CONSTRAINT `dice_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dice_log_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `dice_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dice_log`
--

LOCK TABLES `dice_log` WRITE;
/*!40000 ALTER TABLE `dice_log` DISABLE KEYS */;
INSERT INTO `dice_log` VALUES (19,6,1,5,5,10,5,3,8,'WIN','POINT',20,'2025-12-11 05:57:26'),(20,6,1,3,5,8,6,5,11,'LOSE','POINT',10,'2025-12-11 05:57:30'),(21,9,1,4,1,5,4,6,10,'LOSE','POINT',10,'2025-12-11 07:39:33'),(22,9,1,5,5,10,6,4,10,'DRAW','POINT',10,'2025-12-11 07:39:37'),(23,9,1,4,2,6,2,4,6,'DRAW','POINT',10,'2025-12-11 07:39:41'),(25,14,1,1,6,7,6,2,8,'LOSE','POINT',10,'2025-12-11 08:43:46'),(26,14,1,3,2,5,6,1,7,'LOSE','POINT',10,'2025-12-11 08:43:49'),(27,14,1,6,2,8,6,6,12,'LOSE','POINT',10,'2025-12-11 08:43:53'),(28,15,1,1,1,2,5,1,6,'LOSE','POINT',10,'2025-12-11 09:19:16'),(29,15,1,1,6,7,2,3,5,'WIN','POINT',20,'2025-12-11 09:19:19'),(30,15,1,6,6,12,5,4,9,'WIN','POINT',20,'2025-12-11 09:19:28'),(32,21,1,5,4,9,4,1,5,'WIN','POINT',20,'2025-12-11 10:13:50'),(33,22,1,4,3,7,1,6,7,'DRAW','POINT',5,'2025-12-11 10:18:58'),(34,22,1,3,5,8,3,5,8,'DRAW','POINT',5,'2025-12-11 10:19:02'),(35,18,1,5,6,11,1,2,3,'WIN','POINT',20,'2025-12-11 10:35:33'),(36,18,1,4,4,8,2,5,7,'WIN','POINT',20,'2025-12-11 10:35:41'),(37,23,1,3,6,9,4,2,6,'WIN','POINT',20,'2025-12-11 10:52:06'),(38,17,1,2,2,4,3,1,4,'DRAW','POINT',5,'2025-12-11 10:52:37'),(39,17,1,4,1,5,5,2,7,'LOSE','POINT',5,'2025-12-11 10:52:44'),(40,24,1,6,6,12,2,2,4,'WIN','POINT',20,'2025-12-11 12:14:08'),(41,24,1,6,2,8,6,4,10,'LOSE','POINT',5,'2025-12-11 12:14:14'),(44,29,1,3,5,8,4,2,6,'WIN','POINT',20,'2025-12-12 01:58:16'),(45,29,1,5,5,10,2,3,5,'WIN','POINT',20,'2025-12-12 01:58:32'),(46,30,1,1,3,4,2,1,3,'WIN','POINT',20,'2025-12-12 02:21:08'),(47,30,1,3,6,9,1,5,6,'WIN','POINT',20,'2025-12-12 02:21:13'),(48,34,1,4,4,8,6,2,8,'DRAW','POINT',5,'2025-12-12 03:13:02'),(49,34,1,6,5,11,4,2,6,'WIN','POINT',20,'2025-12-12 03:13:06'),(50,35,1,3,3,6,6,2,8,'LOSE','POINT',5,'2025-12-12 05:44:12'),(51,35,1,6,3,9,5,2,7,'WIN','POINT',20,'2025-12-12 05:44:15'),(52,33,1,6,1,7,1,4,5,'WIN','POINT',20,'2025-12-12 06:12:09'),(53,33,1,3,6,9,6,3,9,'DRAW','POINT',5,'2025-12-12 06:12:23'),(56,36,1,5,3,8,4,2,6,'WIN','POINT',20,'2025-12-12 06:35:04'),(57,36,1,6,6,12,2,1,3,'WIN','POINT',20,'2025-12-12 06:35:09'),(58,21,1,1,1,2,1,2,3,'LOSE','POINT',5,'2025-12-12 06:57:31'),(59,21,1,3,3,6,4,1,5,'WIN','POINT',20,'2025-12-12 06:57:34'),(60,14,1,5,2,7,4,4,8,'LOSE','POINT',5,'2025-12-12 07:41:49'),(61,14,1,5,1,6,4,6,10,'LOSE','POINT',5,'2025-12-12 07:41:53'),(62,37,1,2,1,3,1,2,3,'DRAW','POINT',5,'2025-12-12 07:48:21'),(63,37,1,2,2,4,6,4,10,'LOSE','POINT',5,'2025-12-12 07:48:26'),(64,39,1,3,2,5,3,3,6,'LOSE','POINT',5,'2025-12-12 08:09:01'),(65,39,1,5,5,10,3,5,8,'WIN','POINT',20,'2025-12-12 08:09:05'),(66,41,1,1,1,2,3,3,6,'LOSE','POINT',5,'2025-12-12 09:36:43'),(67,41,1,2,4,6,4,5,9,'LOSE','POINT',5,'2025-12-12 09:36:46'),(68,23,1,1,1,2,6,5,11,'LOSE','POINT',5,'2025-12-12 10:16:51'),(69,23,1,4,1,5,5,4,9,'LOSE','POINT',5,'2025-12-12 10:16:55'),(70,42,1,4,2,6,5,4,9,'LOSE','POINT',5,'2025-12-12 10:48:12'),(71,42,1,5,1,6,6,2,8,'LOSE','POINT',5,'2025-12-12 10:48:18'),(72,44,1,3,6,9,4,5,9,'DRAW','POINT',5,'2025-12-12 11:43:45'),(73,44,1,4,3,7,2,2,4,'WIN','POINT',20,'2025-12-12 11:43:50'),(74,45,1,2,5,7,1,1,2,'WIN','POINT',20,'2025-12-12 14:16:16'),(75,45,1,6,2,8,6,4,10,'LOSE','POINT',5,'2025-12-12 14:16:23');
/*!40000 ALTER TABLE `dice_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `external_ranking_data`
--

DROP TABLE IF EXISTS `external_ranking_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `external_ranking_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `deposit_amount` int NOT NULL,
  `play_count` int NOT NULL,
  `daily_base_deposit` int NOT NULL,
  `daily_base_play` int NOT NULL,
  `last_daily_reset` date DEFAULT NULL,
  `memo` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_external_ranking_user` (`user_id`),
  KEY `ix_external_ranking_data_id` (`id`),
  KEY `ix_external_ranking_data_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_ranking_data`
--

LOCK TABLES `external_ranking_data` WRITE;
/*!40000 ALTER TABLE `external_ranking_data` DISABLE KEYS */;
INSERT INTO `external_ranking_data` VALUES (4,10,1800000,5,0,0,'2025-12-12','','2025-12-12 00:21:00','2025-12-12 08:10:06'),(5,11,5100000,6,0,0,'2025-12-12','','2025-12-12 00:21:24','2025-12-12 10:55:42'),(6,12,8200000,9,0,0,'2025-12-12','','2025-12-12 00:21:43','2025-12-12 12:48:31'),(7,18,200000,2,0,0,'2025-12-12','','2025-12-12 00:37:18','2025-12-12 08:24:04'),(8,21,890000,8,0,0,'2025-12-12','','2025-12-12 00:37:37','2025-12-12 08:22:11'),(9,22,200000,1,0,0,'2025-12-12','','2025-12-12 00:37:52','2025-12-12 00:37:52'),(10,28,180000,5,0,0,'2025-12-12','','2025-12-12 01:02:14','2025-12-12 08:19:45'),(11,29,200000,1,0,0,'2025-12-12','','2025-12-12 01:29:04','2025-12-12 01:29:04'),(12,14,5100000,5,0,0,'2025-12-12','','2025-12-12 02:14:25','2025-12-12 12:47:09'),(13,34,100000,1,0,0,'2025-12-12','','2025-12-12 03:09:08','2025-12-12 03:09:08'),(14,36,50000,1,0,0,'2025-12-12','','2025-12-12 06:01:06','2025-12-12 06:01:06'),(15,15,300000,1,0,0,'2025-12-12','','2025-12-12 06:46:41','2025-12-12 06:46:41'),(16,23,200000,1,0,0,'2025-12-12','','2025-12-12 06:58:01','2025-12-12 06:58:01'),(17,38,200000,1,0,0,'2025-12-12','','2025-12-12 08:01:01','2025-12-12 08:01:01'),(18,16,560000,2,0,0,'2025-12-12','','2025-12-12 08:16:08','2025-12-12 08:48:47'),(19,35,50000,1,0,0,'2025-12-12','','2025-12-12 09:30:33','2025-12-12 09:30:33'),(20,45,100000,0,0,0,'2025-12-12','','2025-12-12 14:24:19','2025-12-12 14:24:19');
/*!40000 ALTER TABLE `external_ranking_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `external_ranking_reward_log`
--

DROP TABLE IF EXISTS `external_ranking_reward_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `external_ranking_reward_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `reason` varchar(100) NOT NULL,
  `season_name` varchar(50) NOT NULL,
  `data_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `data_id` (`data_id`),
  KEY `ix_external_ranking_reward_log_id` (`id`),
  KEY `ix_external_ranking_reward_log_user_id` (`user_id`),
  CONSTRAINT `external_ranking_reward_log_ibfk_1` FOREIGN KEY (`data_id`) REFERENCES `external_ranking_data` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_ranking_reward_log`
--

LOCK TABLES `external_ranking_reward_log` WRITE;
/*!40000 ALTER TABLE `external_ranking_reward_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `external_ranking_reward_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_config`
--

DROP TABLE IF EXISTS `feature_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `feature_type` enum('ROULETTE','DICE','LOTTERY','RANKING','SEASON_PASS','NONE') NOT NULL,
  `title` varchar(100) NOT NULL,
  `page_path` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL,
  `config_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_config_feature_type` (`feature_type`),
  KEY `ix_feature_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_config`
--

LOCK TABLES `feature_config` WRITE;
/*!40000 ALTER TABLE `feature_config` DISABLE KEYS */;
INSERT INTO `feature_config` VALUES (1,'ROULETTE','Christmas Roulette','/roulette',1,NULL,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(2,'SEASON_PASS','Season Pass','/season-pass',1,NULL,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(3,'DICE','Christmas Dice','/dice',1,NULL,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(4,'LOTTERY','Christmas Lottery','/lottery',1,NULL,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(5,'RANKING','Christmas Ranking','/ranking',1,NULL,'2025-12-10 14:42:43','2025-12-10 14:42:43');
/*!40000 ALTER TABLE `feature_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_schedule`
--

DROP TABLE IF EXISTS `feature_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `feature_type` enum('ROULETTE','DICE','LOTTERY','RANKING','SEASON_PASS','NONE') NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_schedule_date` (`date`),
  KEY `ix_feature_schedule_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_schedule`
--

LOCK TABLES `feature_schedule` WRITE;
/*!40000 ALTER TABLE `feature_schedule` DISABLE KEYS */;
INSERT INTO `feature_schedule` VALUES (2,'2025-12-09','SEASON_PASS',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(3,'2025-12-10','ROULETTE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(4,'2025-12-11','DICE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(5,'2025-12-12','LOTTERY',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(6,'2025-12-13','RANKING',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(7,'2025-12-14','ROULETTE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(8,'2025-12-15','DICE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(9,'2025-12-16','LOTTERY',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(10,'2025-12-17','RANKING',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(11,'2025-12-18','ROULETTE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(12,'2025-12-19','DICE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(13,'2025-12-20','LOTTERY',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(14,'2025-12-21','RANKING',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(15,'2025-12-22','ROULETTE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(16,'2025-12-23','DICE',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(17,'2025-12-24','LOTTERY',1,'2025-12-10 14:42:43','2025-12-10 14:42:43'),(18,'2025-12-25','SEASON_PASS',1,'2025-12-10 14:42:43','2025-12-10 14:42:43');
/*!40000 ALTER TABLE `feature_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lottery_config`
--

DROP TABLE IF EXISTS `lottery_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lottery_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `max_daily_tickets` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_lottery_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_config`
--

LOCK TABLES `lottery_config` WRITE;
/*!40000 ALTER TABLE `lottery_config` DISABLE KEYS */;
INSERT INTO `lottery_config` VALUES (1,'Test Lottery',1,1,'2025-12-10 15:10:01','2025-12-11 05:45:39');
/*!40000 ALTER TABLE `lottery_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lottery_log`
--

DROP TABLE IF EXISTS `lottery_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lottery_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `prize_id` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `config_id` (`config_id`),
  KEY `prize_id` (`prize_id`),
  KEY `ix_lottery_log_user_created_at` (`user_id`,`created_at`),
  KEY `ix_lottery_log_id` (`id`),
  CONSTRAINT `lottery_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lottery_log_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `lottery_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lottery_log_ibfk_3` FOREIGN KEY (`prize_id`) REFERENCES `lottery_prize` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_log`
--

LOCK TABLES `lottery_log` WRITE;
/*!40000 ALTER TABLE `lottery_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `lottery_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lottery_prize`
--

DROP TABLE IF EXISTS `lottery_prize`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lottery_prize` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL,
  `label` varchar(100) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `weight` int NOT NULL,
  `stock` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lottery_prize_label` (`config_id`,`label`),
  KEY `ix_lottery_prize_id` (`id`),
  CONSTRAINT `lottery_prize_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `lottery_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_lottery_prize_stock_non_negative` CHECK (((`stock` is null) or (`stock` >= 0))),
  CONSTRAINT `ck_lottery_prize_weight_non_negative` CHECK ((`weight` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_prize`
--

LOCK TABLES `lottery_prize` WRITE;
/*!40000 ALTER TABLE `lottery_prize` DISABLE KEYS */;
INSERT INTO `lottery_prize` VALUES (75,1,'다음기회에','POINT',5,300,984,1,'2025-12-12 14:26:30','2025-12-12 14:26:30'),(76,1,'롯데)가나초코','POINT',5,200,10,1,'2025-12-12 14:26:30','2025-12-12 14:26:30'),(77,1,'룰렛티켓2장','POINT',5,650,95,1,'2025-12-12 14:26:30','2025-12-12 14:26:30'),(78,1,'배민1만','POINT',5,10,1,1,'2025-12-12 14:26:30','2025-12-12 14:26:30'),(79,1,'복권티켓1','POINT',5,100,49,1,'2025-12-12 14:26:30','2025-12-12 14:26:30'),(80,1,'포인트3만','POINT',5,5,1,1,'2025-12-12 14:26:30','2025-12-12 14:26:30'),(81,1,'CC코인1개','POINT',5,400,100,1,'2025-12-12 14:26:30','2025-12-12 14:26:30');
/*!40000 ALTER TABLE `lottery_prize` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ranking_daily`
--

DROP TABLE IF EXISTS `ranking_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ranking_daily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `user_id` int DEFAULT NULL,
  `display_name` varchar(50) NOT NULL,
  `score` int NOT NULL,
  `rank` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ranking_daily_date_rank` (`date`,`rank`),
  KEY `user_id` (`user_id`),
  KEY `ix_ranking_daily_id` (`id`),
  CONSTRAINT `ranking_daily_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ranking_daily`
--

LOCK TABLES `ranking_daily` WRITE;
/*!40000 ALTER TABLE `ranking_daily` DISABLE KEYS */;
/*!40000 ALTER TABLE `ranking_daily` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roulette_config`
--

DROP TABLE IF EXISTS `roulette_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roulette_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `max_daily_spins` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_roulette_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_config`
--

LOCK TABLES `roulette_config` WRITE;
/*!40000 ALTER TABLE `roulette_config` DISABLE KEYS */;
INSERT INTO `roulette_config` VALUES (6,'Test Roulette',1,0,'2025-12-12 13:03:35','2025-12-12 13:03:35');
/*!40000 ALTER TABLE `roulette_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roulette_log`
--

DROP TABLE IF EXISTS `roulette_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roulette_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `segment_id` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `config_id` (`config_id`),
  KEY `segment_id` (`segment_id`),
  KEY `ix_roulette_log_id` (`id`),
  KEY `ix_roulette_log_user_created_at` (`user_id`,`created_at`),
  CONSTRAINT `roulette_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `roulette_log_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `roulette_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `roulette_log_ibfk_3` FOREIGN KEY (`segment_id`) REFERENCES `roulette_segment` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_log`
--

LOCK TABLES `roulette_log` WRITE;
/*!40000 ALTER TABLE `roulette_log` DISABLE KEYS */;
INSERT INTO `roulette_log` VALUES (100,45,6,35,'POINT',5,'2025-12-12 14:16:03'),(101,27,6,39,'POINT',5,'2025-12-12 14:20:26'),(102,45,6,36,'POINT',5,'2025-12-12 14:26:09');
/*!40000 ALTER TABLE `roulette_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roulette_segment`
--

DROP TABLE IF EXISTS `roulette_segment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roulette_segment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL,
  `slot_index` int NOT NULL,
  `label` varchar(50) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `weight` int NOT NULL,
  `is_jackpot` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roulette_segment_slot` (`config_id`,`slot_index`),
  KEY `ix_roulette_segment_id` (`id`),
  CONSTRAINT `roulette_segment_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `roulette_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_roulette_segment_slot_range` CHECK (((`slot_index` >= 0) and (`slot_index` <= 5))),
  CONSTRAINT `ck_roulette_segment_weight_non_negative` CHECK ((`weight` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_segment`
--

LOCK TABLES `roulette_segment` WRITE;
/*!40000 ALTER TABLE `roulette_segment` DISABLE KEYS */;
INSERT INTO `roulette_segment` VALUES (34,6,0,'네이버포인트3천','POINT',5,40,0,'2025-12-12 13:03:35','2025-12-12 13:03:35'),(35,6,1,'컴포즈아아','POINT',5,444,0,'2025-12-12 13:03:35','2025-12-12 13:03:35'),(36,6,2,'다음기회에','POINT',5,388,0,'2025-12-12 13:03:35','2025-12-12 13:03:35'),(37,6,3,'CC포인트5천','POINT',5,10,0,'2025-12-12 13:03:35','2025-12-12 13:03:35'),(38,6,4,'맥날슈슈버거','POINT',5,50,0,'2025-12-12 13:03:35','2025-12-12 13:03:35'),(39,6,5,'주사위티켓2장 ','POINT',5,400,0,'2025-12-12 13:03:35','2025-12-12 13:03:35');
/*!40000 ALTER TABLE `roulette_segment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `season_pass_config`
--

DROP TABLE IF EXISTS `season_pass_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season_pass_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `season_name` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `max_level` int NOT NULL,
  `base_xp_per_stamp` int NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_name` (`season_name`),
  KEY `ix_season_pass_config_is_active` (`is_active`),
  KEY `ix_season_pass_config_id` (`id`),
  KEY `ix_season_pass_config_start_date` (`start_date`),
  KEY `ix_season_pass_config_end_date` (`end_date`),
  CONSTRAINT `ck_season_dates_order` CHECK ((`start_date` <= `end_date`))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_config`
--

LOCK TABLES `season_pass_config` WRITE;
/*!40000 ALTER TABLE `season_pass_config` DISABLE KEYS */;
INSERT INTO `season_pass_config` VALUES (1,'x','2025-12-09','2025-12-25',7,20,1,'2025-12-10 14:42:43','2025-12-10 15:07:56');
/*!40000 ALTER TABLE `season_pass_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `season_pass_level`
--

DROP TABLE IF EXISTS `season_pass_level`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season_pass_level` (
  `id` int NOT NULL AUTO_INCREMENT,
  `season_id` int NOT NULL,
  `level` int NOT NULL,
  `required_xp` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `auto_claim` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_level` (`season_id`,`level`),
  KEY `ix_season_pass_level_id` (`id`),
  CONSTRAINT `season_pass_level_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `season_pass_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_level`
--

LOCK TABLES `season_pass_level` WRITE;
/*!40000 ALTER TABLE `season_pass_level` DISABLE KEYS */;
INSERT INTO `season_pass_level` VALUES (6,1,1,40,'TICKET',1,1,'2025-12-11 03:23:45','2025-12-11 03:23:45'),(7,1,2,100,'TICKET',2,1,'2025-12-11 03:23:45','2025-12-11 03:23:45'),(8,1,3,180,'TICKET',3,0,'2025-12-11 03:23:45','2025-12-11 03:23:45'),(9,1,4,300,'TICKET',4,0,'2025-12-11 03:23:45','2025-12-11 03:23:45'),(10,1,5,450,'TICKET',5,0,'2025-12-11 03:23:45','2025-12-11 03:23:45'),(11,1,6,600,'TICKET',6,0,'2025-12-11 03:23:45','2025-12-11 03:23:45'),(12,1,7,1000,'TICKET',10,0,'2025-12-11 03:23:45','2025-12-11 03:23:45');
/*!40000 ALTER TABLE `season_pass_level` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `season_pass_progress`
--

DROP TABLE IF EXISTS `season_pass_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season_pass_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `season_id` int NOT NULL,
  `current_level` int NOT NULL,
  `current_xp` int NOT NULL,
  `total_stamps` int NOT NULL,
  `last_stamp_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_season_progress` (`user_id`,`season_id`),
  KEY `season_id` (`season_id`),
  KEY `ix_season_pass_progress_id` (`id`),
  CONSTRAINT `season_pass_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `season_pass_progress_ibfk_2` FOREIGN KEY (`season_id`) REFERENCES `season_pass_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_progress`
--

LOCK TABLES `season_pass_progress` WRITE;
/*!40000 ALTER TABLE `season_pass_progress` DISABLE KEYS */;
INSERT INTO `season_pass_progress` VALUES (5,7,1,1,40,0,NULL,'2025-12-11 05:25:40','2025-12-11 05:51:03'),(6,6,1,1,75,0,NULL,'2025-12-11 05:38:41','2025-12-12 09:55:40'),(13,8,1,1,5,0,NULL,'2025-12-11 06:48:27','2025-12-12 01:59:15'),(15,11,1,7,4860,1,'2025-12-11','2025-12-11 06:58:36','2025-12-12 10:55:41'),(16,12,1,7,12020,1,'2025-12-11','2025-12-11 06:59:09','2025-12-12 12:48:31'),(17,9,1,1,50,0,NULL,'2025-12-11 07:10:16','2025-12-11 07:39:59'),(18,15,1,3,220,1,'2025-12-12','2025-12-11 08:37:44','2025-12-12 07:01:20'),(19,14,1,7,1875,1,'2025-12-12','2025-12-11 08:42:12','2025-12-12 12:47:09'),(20,21,1,7,1540,1,'2025-12-12','2025-12-11 10:13:30','2025-12-12 08:22:11'),(21,22,1,2,130,1,'2025-12-12','2025-12-11 10:18:28','2025-12-12 01:38:05'),(22,18,1,3,230,1,'2025-12-12','2025-12-11 10:27:51','2025-12-12 12:02:37'),(23,17,1,1,20,0,NULL,'2025-12-11 10:47:43','2025-12-11 10:53:23'),(24,23,1,2,120,1,'2025-12-12','2025-12-11 10:51:22','2025-12-12 10:16:55'),(25,16,1,3,270,1,'2025-12-12','2025-12-11 11:14:15','2025-12-12 08:48:47'),(26,25,1,1,5,0,NULL,'2025-12-11 11:16:55','2025-12-11 11:17:12'),(27,24,1,1,35,0,NULL,'2025-12-11 12:13:46','2025-12-12 08:12:46'),(28,10,1,7,1260,1,'2025-12-12','2025-12-12 00:21:00','2025-12-12 08:10:05'),(31,26,1,1,25,0,NULL,'2025-12-12 00:48:19','2025-12-12 00:55:42'),(37,29,1,2,125,1,'2025-12-12','2025-12-12 01:29:03','2025-12-12 01:58:32'),(38,30,1,1,45,0,NULL,'2025-12-12 02:20:40','2025-12-12 02:21:13'),(39,34,1,1,90,1,'2025-12-12','2025-12-12 03:09:08','2025-12-12 03:13:05'),(40,35,1,1,50,0,NULL,'2025-12-12 05:43:48','2025-12-12 09:30:33'),(41,36,1,1,65,0,NULL,'2025-12-12 05:59:23','2025-12-12 06:35:09'),(42,33,1,1,30,0,NULL,'2025-12-12 06:11:16','2025-12-12 06:12:22'),(43,37,1,1,15,0,NULL,'2025-12-12 07:47:04','2025-12-12 07:48:25'),(44,38,1,1,80,1,'2025-12-12','2025-12-12 08:00:46','2025-12-12 08:01:01'),(45,39,1,1,30,0,NULL,'2025-12-12 08:06:06','2025-12-12 08:09:19'),(46,40,1,1,0,0,NULL,'2025-12-12 08:58:59','2025-12-12 08:58:59'),(47,41,1,1,15,0,NULL,'2025-12-12 09:34:12','2025-12-12 09:36:46'),(48,42,1,1,15,0,NULL,'2025-12-12 10:46:17','2025-12-12 10:48:18'),(49,43,1,1,0,0,NULL,'2025-12-12 10:54:58','2025-12-12 10:54:58'),(50,44,1,1,45,0,NULL,'2025-12-12 11:33:55','2025-12-12 11:47:05'),(51,45,1,1,55,0,NULL,'2025-12-12 14:14:06','2025-12-12 14:26:08'),(52,27,1,1,5,0,NULL,'2025-12-12 14:19:28','2025-12-12 14:20:25');
/*!40000 ALTER TABLE `season_pass_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `season_pass_reward_log`
--

DROP TABLE IF EXISTS `season_pass_reward_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season_pass_reward_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `season_id` int NOT NULL,
  `progress_id` int DEFAULT NULL,
  `level` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `claimed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reward_user_season_level` (`user_id`,`season_id`,`level`),
  KEY `season_id` (`season_id`),
  KEY `progress_id` (`progress_id`),
  KEY `ix_season_pass_reward_log_id` (`id`),
  CONSTRAINT `season_pass_reward_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `season_pass_reward_log_ibfk_2` FOREIGN KEY (`season_id`) REFERENCES `season_pass_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `season_pass_reward_log_ibfk_3` FOREIGN KEY (`progress_id`) REFERENCES `season_pass_progress` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_reward_log`
--

LOCK TABLES `season_pass_reward_log` WRITE;
/*!40000 ALTER TABLE `season_pass_reward_log` DISABLE KEYS */;
INSERT INTO `season_pass_reward_log` VALUES (12,12,1,16,2,'TICKET',2,'2025-12-11 06:59:09','2025-12-11 06:59:09'),(13,15,1,18,2,'TICKET',2,'2025-12-11 09:19:28','2025-12-11 09:19:28'),(14,10,1,28,2,'TICKET',2,'2025-12-12 00:21:00','2025-12-12 00:21:00'),(15,11,1,15,2,'TICKET',2,'2025-12-12 00:21:24','2025-12-12 00:21:23'),(16,18,1,22,2,'TICKET',2,'2025-12-12 00:37:18','2025-12-12 00:37:17'),(17,22,1,21,2,'TICKET',2,'2025-12-12 00:37:52','2025-12-12 00:37:52'),(19,29,1,37,2,'TICKET',2,'2025-12-12 01:58:16','2025-12-12 01:58:16'),(20,14,1,19,2,'TICKET',2,'2025-12-12 02:14:25','2025-12-12 02:14:25'),(21,21,1,20,2,'TICKET',2,'2025-12-12 02:21:59','2025-12-12 02:21:58'),(23,21,1,20,3,'TICKET',3,'2025-12-12 06:56:01','2025-12-12 06:56:01'),(24,21,1,20,4,'TICKET',4,'2025-12-12 06:56:03','2025-12-12 06:56:02'),(25,21,1,20,5,'TICKET',5,'2025-12-12 06:56:04','2025-12-12 06:56:04'),(26,21,1,20,6,'TICKET',6,'2025-12-12 06:56:06','2025-12-12 06:56:05'),(27,23,1,24,2,'TICKET',2,'2025-12-12 06:58:01','2025-12-12 06:58:00'),(28,15,1,18,3,'TICKET',3,'2025-12-12 07:03:54','2025-12-12 07:03:53'),(29,14,1,19,3,'TICKET',3,'2025-12-12 07:41:27','2025-12-12 07:41:26'),(30,14,1,19,4,'TICKET',4,'2025-12-12 07:42:45','2025-12-12 07:42:44'),(31,16,1,25,2,'TICKET',2,'2025-12-12 08:16:08','2025-12-12 08:16:08'),(32,14,1,19,5,'TICKET',5,'2025-12-12 10:00:50','2025-12-12 10:00:50'),(33,14,1,19,6,'TICKET',6,'2025-12-12 10:00:51','2025-12-12 10:00:50'),(34,18,1,22,3,'TICKET',3,'2025-12-12 12:00:21','2025-12-12 12:00:20'),(35,21,1,20,7,'TICKET',10,'2025-12-12 12:17:27','2025-12-12 12:17:26'),(36,14,1,19,7,'TICKET',10,'2025-12-12 13:39:39','2025-12-12 13:39:39');
/*!40000 ALTER TABLE `season_pass_reward_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `season_pass_stamp_log`
--

DROP TABLE IF EXISTS `season_pass_stamp_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `season_pass_stamp_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `season_id` int NOT NULL,
  `progress_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `period_key` varchar(32) NOT NULL,
  `stamp_count` int NOT NULL,
  `source_feature_type` varchar(30) NOT NULL,
  `xp_earned` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stamp_user_season_period` (`user_id`,`season_id`,`source_feature_type`,`period_key`),
  KEY `season_id` (`season_id`),
  KEY `progress_id` (`progress_id`),
  KEY `ix_season_pass_stamp_log_id` (`id`),
  CONSTRAINT `season_pass_stamp_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `season_pass_stamp_log_ibfk_2` FOREIGN KEY (`season_id`) REFERENCES `season_pass_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `season_pass_stamp_log_ibfk_3` FOREIGN KEY (`progress_id`) REFERENCES `season_pass_progress` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_stamp_log`
--

LOCK TABLES `season_pass_stamp_log` WRITE;
/*!40000 ALTER TABLE `season_pass_stamp_log` DISABLE KEYS */;
INSERT INTO `season_pass_stamp_log` VALUES (2,11,1,15,'2025-12-11','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-11 06:58:36'),(3,12,1,16,'2025-12-11','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-11 06:59:09'),(4,10,1,28,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 00:21:00'),(5,18,1,22,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 00:37:17'),(6,21,1,20,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 00:37:36'),(7,22,1,21,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 00:37:52'),(9,29,1,37,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 01:29:03'),(10,14,1,19,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 02:14:25'),(11,34,1,39,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 03:09:08'),(12,15,1,18,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 06:46:41'),(13,23,1,24,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 06:58:00'),(14,38,1,44,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 08:01:01'),(15,16,1,25,'2025-12-12','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-12 08:16:08');
/*!40000 ALTER TABLE `season_pass_stamp_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `external_id` varchar(100) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `password_hash` varchar(128) DEFAULT NULL,
  `level` int NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `xp` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_id` (`external_id`),
  KEY `ix_user_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (6,'test002','test002','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 08:09:31','172.18.0.6','2025-12-11 05:20:48','2025-12-12 08:09:31',0),(7,'cctest01','cctest01','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 05:50:33','185.180.195.22','2025-12-11 05:21:04','2025-12-11 05:50:33',0),(8,'cctest02','cctest02','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 06:48:27','103.176.152.3','2025-12-11 05:21:13','2025-12-11 06:48:27',0),(9,'cctest03','cctest03','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 07:38:44','149.40.54.60','2025-12-11 06:54:19','2025-12-11 07:38:44',0),(10,'yeong12','영진사장님','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',7,'ACTIVE',NULL,NULL,'2025-12-11 06:57:10','2025-12-12 12:50:30',1260),(11,'jkkk','jkkk','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',7,'ACTIVE',NULL,NULL,'2025-12-11 06:57:22','2025-12-12 05:56:16',1840),(12,'yuhh89','은희조','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',7,'ACTIVE',NULL,NULL,'2025-12-11 06:57:41','2025-12-12 05:56:13',4240),(14,'persipic','persipic','c41e636d057062948a0bbdbdbf09bd047beb977b255ed9cd6c780d497d2dd7ca',7,'ACTIVE','2025-12-12 09:59:51','172.18.0.6','2025-12-11 08:36:32','2025-12-12 12:48:46',1875),(15,'정재권','도베르만','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE','2025-12-12 10:47:48','172.18.0.6','2025-12-11 08:37:07','2025-12-12 10:47:48',210),(16,'나참동','나참동','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE','2025-12-12 07:25:24','172.18.0.6','2025-12-11 09:36:39','2025-12-12 12:50:47',270),(17,'지민잼민','지민잼민','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 10:47:43','175.199.172.204','2025-12-11 09:42:22','2025-12-12 05:56:05',20),(18,'아사카','아사카','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE','2025-12-12 11:59:56','172.18.0.6','2025-12-11 10:04:54','2025-12-12 11:59:56',220),(19,'레몬향','레몬향','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 10:07:54','2025-12-11 10:07:54',0),(20,'화랑','화랑','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 10:10:08','2025-12-11 10:10:08',0),(21,'돈따묵쟈','돈따묵쟈','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',7,'ACTIVE','2025-12-12 12:17:02','172.18.0.6','2025-12-11 10:12:02','2025-12-12 12:17:02',1220),(22,'크리스토퍼','크리스토퍼','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-12 10:47:30','172.18.0.6','2025-12-11 10:15:30','2025-12-12 10:47:30',130),(23,'기프트','기프트','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-11 10:51:22','112.149.150.211','2025-12-11 10:48:43','2025-12-12 02:11:04',0),(24,'해조다요','해조다요','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 12:13:46','36.39.244.58','2025-12-11 10:49:55','2025-12-12 05:55:57',30),(25,'제마','제마','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 11:16:55','180.68.182.127','2025-12-11 11:14:28','2025-12-11 11:16:55',0),(26,'김민저이','김민저이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 00:48:19','211.36.152.51','2025-12-12 00:39:54','2025-12-12 00:48:19',0),(27,'케바케','케바케','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 14:19:28','172.18.0.6','2025-12-12 00:43:21','2025-12-12 14:19:28',0),(29,'정우성','정우성','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-12 01:57:11','14.45.28.51','2025-12-12 01:28:03','2025-12-12 05:55:45',125),(30,'초보베터','초보베터','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 02:20:40','39.7.28.90','2025-12-12 01:31:34','2025-12-12 08:59:35',45),(31,'자르반이큐','자르반이큐','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 02:26:16','2025-12-12 02:26:16',0),(32,'미소1031','미소1031','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 02:27:49','2025-12-12 02:28:14',0),(33,'자리','자리','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 06:11:16','112.163.208.48','2025-12-12 02:34:44','2025-12-12 06:11:16',0),(34,'진심펀치','진심펀치','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 03:12:46','106.101.74.103','2025-12-12 03:08:47','2025-12-12 03:12:46',0),(35,'승아지','승아지','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 05:43:48','211.36.143.90','2025-12-12 03:21:58','2025-12-12 05:43:48',0),(36,'으민12','으민12','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 06:34:33','182.221.82.81','2025-12-12 05:59:24','2025-12-12 06:34:33',0),(37,'ppoodd','ppoodd','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 07:48:02','172.18.0.6','2025-12-12 07:47:05','2025-12-12 07:48:02',0),(38,'짱맨','짱맨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 08:00:47','2025-12-12 08:00:47',0),(39,'성민이','성민이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 08:08:41','172.18.0.6','2025-12-12 08:06:06','2025-12-12 08:08:41',0),(40,'왕지형','왕지형','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 08:58:59','2025-12-12 08:58:59',0),(41,'요리','요리','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 09:36:30','172.18.0.6','2025-12-12 09:34:13','2025-12-12 09:36:30',0),(42,'민아가자','민아가자','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 10:47:43','172.18.0.6','2025-12-12 10:46:17','2025-12-12 10:47:43',0),(43,'일등당첨','일등당첨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 11:24:01','172.18.0.6','2025-12-12 10:54:58','2025-12-12 11:24:01',0),(44,'우주를줄게','우주를줄게','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 11:43:21','172.18.0.6','2025-12-12 11:33:56','2025-12-12 11:43:21',0),(45,'콩이랑','콩이랑','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 14:15:53','172.18.0.6','2025-12-12 14:14:07','2025-12-12 14:15:53',0);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_event_log`
--

DROP TABLE IF EXISTS `user_event_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_event_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `feature_type` varchar(30) NOT NULL,
  `event_name` varchar(50) NOT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_event_log_user_created_at` (`user_id`,`created_at`),
  KEY `ix_user_event_log_id` (`id`),
  KEY `ix_user_event_log_event_name` (`event_name`),
  CONSTRAINT `user_event_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=302 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_event_log`
--

LOCK TABLES `user_event_log` WRITE;
/*!40000 ALTER TABLE `user_event_log` DISABLE KEYS */;
INSERT INTO `user_event_log` VALUES (66,7,'AUTH','AUTH_LOGIN','{\"ip\": \"89.147.101.53\", \"external_id\": \"cctest01\"}','2025-12-11 05:25:40'),(76,6,'AUTH','AUTH_LOGIN','{\"ip\": \"89.147.101.53\", \"external_id\": \"test002\"}','2025-12-11 05:38:41'),(77,6,'ROULETTE','PLAY','{\"label\": \"꽝\", \"segment_id\": 4, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:40:04'),(78,6,'ROULETTE','PLAY','{\"label\": \"배민1만\", \"segment_id\": 1, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:40:13'),(79,6,'ROULETTE','PLAY','{\"label\": \"스벅커피\", \"segment_id\": 3, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:40:21'),(90,7,'AUTH','AUTH_LOGIN','{\"ip\": \"185.180.195.22\", \"external_id\": \"cctest01\"}','2025-12-11 05:50:33'),(91,7,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 9, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:50:40'),(92,7,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 9, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:50:54'),(93,7,'ROULETTE','PLAY','{\"label\": \"꽝\", \"segment_id\": 12, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:50:59'),(94,7,'ROULETTE','PLAY','{\"label\": \"편의점깁콘5천\", \"segment_id\": 11, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:51:03'),(96,6,'AUTH','AUTH_LOGIN','{\"ip\": \"89.147.101.53\", \"external_id\": \"test002\"}','2025-12-11 05:56:51'),(97,6,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 10, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:57:15'),(98,6,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 05:57:26'),(99,6,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 05:57:30'),(101,8,'AUTH','AUTH_LOGIN','{\"ip\": \"103.176.152.3\", \"external_id\": \"cctest02\"}','2025-12-11 06:48:27'),(103,9,'AUTH','AUTH_LOGIN','{\"ip\": \"160.238.37.79\", \"external_id\": \"cctest03\"}','2025-12-11 07:10:17'),(104,9,'AUTH','AUTH_LOGIN','{\"ip\": \"149.40.54.60\", \"external_id\": \"cctest03\"}','2025-12-11 07:38:44'),(105,9,'ROULETTE','PLAY','{\"label\": \"배민5천\", \"segment_id\": 7, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 07:39:23'),(106,9,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 07:39:33'),(107,9,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 07:39:37'),(108,9,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 07:39:41'),(109,9,'LOTTERY','PLAY','{\"label\": \"배민1만\", \"prize_id\": 6, \"reward_type\": \"COUPON\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 07:39:50'),(110,9,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 5, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 07:39:59'),(115,15,'AUTH','AUTH_LOGIN','{\"ip\": \"149.40.54.60\", \"external_id\": \"정재권\"}','2025-12-11 08:37:44'),(116,14,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.202.28\", \"external_id\": \"persipic\"}','2025-12-11 08:42:12'),(117,14,'LOTTERY','PLAY','{\"label\": \"배민1만\", \"prize_id\": 6, \"reward_type\": \"COUPON\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:42:49'),(118,14,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 5, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:43:11'),(119,14,'LOTTERY','PLAY','{\"label\": \"배민1만\", \"prize_id\": 6, \"reward_type\": \"COUPON\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:43:21'),(120,14,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:43:46'),(121,14,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:43:49'),(122,14,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:43:53'),(123,14,'ROULETTE','PLAY','{\"label\": \"꽝\", \"segment_id\": 12, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:44:02'),(124,14,'ROULETTE','PLAY','{\"label\": \"꽝\", \"segment_id\": 12, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:44:07'),(125,14,'ROULETTE','PLAY','{\"label\": \"편의점깁콘5천\", \"segment_id\": 11, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 08:44:13'),(126,15,'AUTH','AUTH_LOGIN','{\"ip\": \"121.179.101.43\", \"external_id\": \"정재권\"}','2025-12-11 09:15:10'),(127,15,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 10, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:15:46'),(128,15,'LOTTERY','PLAY','{\"label\": \"포인트3만\", \"prize_id\": 14, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:16:03'),(129,15,'LOTTERY','PLAY','{\"label\": \"포인트3만\", \"prize_id\": 14, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:16:16'),(130,15,'ROULETTE','PLAY','{\"label\": \"꽝\", \"segment_id\": 12, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:18:33'),(131,15,'ROULETTE','PLAY','{\"label\": \"꽝\", \"segment_id\": 12, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:18:39'),(132,15,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 10, \"reward_type\": \"POINT\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:18:44'),(133,15,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 10, \"xp_from_reward\": 10}','2025-12-11 09:19:16'),(134,15,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 09:19:19'),(135,15,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 09:19:28'),(139,21,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.84.36\", \"external_id\": \"돈따묵쟈\"}','2025-12-11 10:13:29'),(140,21,'ROULETTE','PLAY','{\"label\": \"다음기회에!\", \"segment_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:13:38'),(141,21,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:13:50'),(142,21,'LOTTERY','PLAY','{\"label\": \"레벨포인트\", \"prize_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:14:03'),(143,22,'AUTH','AUTH_LOGIN','{\"ip\": \"58.229.246.33\", \"external_id\": \"크리스토퍼\"}','2025-12-11 10:18:28'),(144,22,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 16, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:18:39'),(145,22,'ROULETTE','PLAY','{\"label\": \"배민2만\", \"segment_id\": 18, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:18:48'),(146,22,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:18:58'),(147,22,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:19:02'),(148,22,'LOTTERY','PLAY','{\"label\": \"레벨포인트\", \"prize_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:19:11'),(149,18,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.72.36\", \"external_id\": \"아사카\"}','2025-12-11 10:27:51'),(150,18,'ROULETTE','PLAY','{\"label\": \"다음기회에!\", \"segment_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:28:11'),(151,18,'ROULETTE','PLAY','{\"label\": \"다음기회에!\", \"segment_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:28:18'),(152,18,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:35:33'),(153,18,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:35:41'),(154,18,'LOTTERY','PLAY','{\"label\": \"레벨포인트\", \"prize_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:37:34'),(155,17,'AUTH','AUTH_LOGIN','{\"ip\": \"175.199.172.204\", \"external_id\": \"지민잼민\"}','2025-12-11 10:47:43'),(156,23,'AUTH','AUTH_LOGIN','{\"ip\": \"112.149.150.211\", \"external_id\": \"기프트\"}','2025-12-11 10:51:22'),(157,23,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 16, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:51:44'),(158,23,'ROULETTE','PLAY','{\"label\": \"다음기회에!\", \"segment_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:51:53'),(159,23,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 10:52:06'),(160,17,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:52:37'),(161,17,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:52:44'),(162,17,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 16, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:53:14'),(163,17,'ROULETTE','PLAY','{\"label\": \"5천CC포인트\", \"segment_id\": 19, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 10:53:23'),(164,16,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.24.48\", \"external_id\": \"나참동\"}','2025-12-11 11:14:15'),(165,16,'ROULETTE','PLAY','{\"label\": \"다음기회에!\", \"segment_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 11:14:25'),(166,16,'LOTTERY','PLAY','{\"label\": \"포인트1만\", \"prize_id\": 18, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 11:14:35'),(167,25,'AUTH','AUTH_LOGIN','{\"ip\": \"180.68.182.127\", \"external_id\": \"제마\"}','2025-12-11 11:16:55'),(168,25,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 16, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 11:17:12'),(169,24,'AUTH','AUTH_LOGIN','{\"ip\": \"36.39.244.58\", \"external_id\": \"해조다요\"}','2025-12-11 12:13:46'),(170,24,'ROULETTE','PLAY','{\"label\": \"다음기회에!\", \"segment_id\": 17, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 12:13:54'),(171,24,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-11 12:14:08'),(172,24,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-11 12:14:14'),(173,26,'AUTH','AUTH_LOGIN','{\"ip\": \"211.36.152.51\", \"external_id\": \"김민저이\"}','2025-12-12 00:48:19'),(174,26,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 24, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 00:48:30'),(175,14,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 00:51:46'),(176,26,'LOTTERY','PLAY','{\"label\": \"배민2만\", \"prize_id\": 22, \"reward_type\": \"POINT\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 00:55:43'),(177,22,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 24, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 00:57:03'),(181,6,'AUTH','AUTH_LOGIN','{\"ip\": \"149.40.54.73\", \"external_id\": \"test002\"}','2025-12-12 01:18:19'),(194,22,'LOTTERY','PLAY','{\"label\": \"배민2만\", \"prize_id\": 42, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 01:38:06'),(195,29,'AUTH','AUTH_LOGIN','{\"ip\": \"14.45.28.51\", \"external_id\": \"정우성\"}','2025-12-12 01:57:11'),(196,29,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 01:57:50'),(197,29,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 01:58:16'),(198,29,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 01:58:32'),(199,8,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 01:59:15'),(200,21,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 24, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:19:06'),(201,30,'AUTH','AUTH_LOGIN','{\"ip\": \"39.7.28.90\", \"external_id\": \"초보베터\"}','2025-12-12 02:20:40'),(202,30,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 24, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:20:53'),(203,21,'LOTTERY','PLAY','{\"label\": \"룰렛티켓2장\", \"prize_id\": 46, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:20:56'),(204,30,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 02:21:08'),(205,30,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 02:21:13'),(206,21,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:21:59'),(207,21,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 22, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:22:05'),(208,18,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:39:00'),(209,18,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 02:39:10'),(210,34,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.74.103\", \"external_id\": \"진심펀치\"}','2025-12-12 03:12:46'),(211,34,'ROULETTE','PLAY','{\"label\": \"CC포인트1만\", \"segment_id\": 26, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 03:12:51'),(212,34,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 03:13:02'),(213,34,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 03:13:06'),(214,35,'AUTH','AUTH_LOGIN','{\"ip\": \"211.36.143.90\", \"external_id\": \"승아지\"}','2025-12-12 05:43:48'),(215,35,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 23, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 05:43:56'),(216,35,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 05:44:12'),(217,35,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 05:44:15'),(218,33,'AUTH','AUTH_LOGIN','{\"ip\": \"112.163.208.48\", \"external_id\": \"자리\"}','2025-12-12 06:11:16'),(219,33,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 25, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:11:30'),(220,33,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 06:12:09'),(221,33,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:12:23'),(225,36,'AUTH','AUTH_LOGIN','{\"ip\": \"182.221.82.81\", \"external_id\": \"으민12\"}','2025-12-12 06:34:33'),(226,36,'ROULETTE','PLAY','{\"label\": \"메가커피아아\", \"segment_id\": 25, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:34:52'),(227,36,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 06:35:04'),(228,36,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 06:35:09'),(229,6,'AUTH','AUTH_LOGIN','{\"ip\": \"89.147.101.51\", \"external_id\": \"test002\"}','2025-12-12 06:38:42'),(230,21,'ROULETTE','PLAY','{\"label\": \"배민1만\", \"segment_id\": 21, \"reward_type\": \"POINT\", \"reward_amount\": 0, \"xp_from_reward\": 0}','2025-12-12 06:56:40'),(231,21,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 22, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:56:47'),(232,21,'ROULETTE','PLAY','{\"label\": \"배민1만\", \"segment_id\": 21, \"reward_type\": \"POINT\", \"reward_amount\": 0, \"xp_from_reward\": 0}','2025-12-12 06:56:53'),(233,21,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:57:31'),(234,21,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 06:57:34'),(235,21,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:57:46'),(236,21,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:57:52'),(237,21,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:57:57'),(238,21,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:58:02'),(239,21,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 06:58:06'),(240,15,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:01:09'),(241,15,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:01:21'),(242,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"test002\"}','2025-12-12 07:15:43'),(243,16,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"나참동\"}','2025-12-12 07:25:24'),(244,14,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:41:49'),(245,14,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:41:53'),(246,14,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:42:15'),(247,14,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 57, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:42:28'),(248,37,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"ppoodd\"}','2025-12-12 07:48:02'),(249,37,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:48:08'),(250,37,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:48:21'),(251,37,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 07:48:26'),(253,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"test002\"}','2025-12-12 07:59:04'),(254,39,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"성민이\"}','2025-12-12 08:08:41'),(255,39,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 08:09:01'),(256,39,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 08:09:05'),(257,39,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 08:09:19'),(258,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"test002\"}','2025-12-12 08:09:31'),(259,24,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 08:12:46'),(261,41,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"요리\"}','2025-12-12 09:36:30'),(262,41,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 09:36:34'),(263,41,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 09:36:43'),(264,41,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 09:36:46'),(265,6,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 09:55:40'),(266,14,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"persipic\"}','2025-12-12 09:59:51'),(267,14,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:00:02'),(268,14,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 29, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:00:07'),(269,14,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:00:12'),(270,14,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 63, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:00:21'),(271,14,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 63, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:00:28'),(272,14,'LOTTERY','PLAY','{\"label\": \"룰렛티켓2장\", \"prize_id\": 64, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:00:34'),(273,23,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:16:51'),(274,23,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:16:55'),(275,22,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"크리스토퍼\"}','2025-12-12 10:47:30'),(276,42,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"민아가자\"}','2025-12-12 10:47:43'),(277,15,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"정재권\"}','2025-12-12 10:47:48'),(278,42,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:47:59'),(279,42,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:48:12'),(280,42,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 10:48:18'),(281,43,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"일등당첨\"}','2025-12-12 11:24:01'),(282,44,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"우주를줄게\"}','2025-12-12 11:43:21'),(283,44,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 29, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:43:33'),(284,44,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:43:45'),(285,44,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 11:43:50'),(286,44,'LOTTERY','PLAY','{\"label\": \"룰렛티켓2장\", \"prize_id\": 64, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:45:45'),(287,44,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:46:59'),(288,44,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:47:06'),(289,14,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:48:02'),(290,14,'ROULETTE','PLAY','{\"label\": \"CC포인트5천\", \"segment_id\": 28, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 11:48:07'),(291,18,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"아사카\"}','2025-12-12 11:59:56'),(292,18,'LOTTERY','PLAY','{\"label\": \"꽝\", \"prize_id\": 63, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 12:00:00'),(293,18,'LOTTERY','PLAY','{\"label\": \"룰렛티켓2장\", \"prize_id\": 64, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 12:02:38'),(294,21,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"돈따묵쟈\"}','2025-12-12 12:17:02'),(295,45,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"콩이랑\"}','2025-12-12 14:15:53'),(296,45,'ROULETTE','PLAY','{\"label\": \"컴포즈아아\", \"segment_id\": 35, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 14:16:03'),(297,45,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-12 14:16:16'),(298,45,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 14:16:23'),(299,27,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.6\", \"external_id\": \"케바케\"}','2025-12-12 14:19:28'),(300,27,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장 \", \"segment_id\": 39, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 14:20:26'),(301,45,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 36, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-12 14:26:09');
/*!40000 ALTER TABLE `user_event_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_game_wallet`
--

DROP TABLE IF EXISTS `user_game_wallet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_game_wallet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_type` enum('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET') NOT NULL,
  `balance` int NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_token_type` (`user_id`,`token_type`),
  KEY `ix_user_game_wallet_user_id` (`user_id`),
  KEY `ix_user_game_wallet_id` (`id`),
  CONSTRAINT `user_game_wallet_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet`
--

LOCK TABLES `user_game_wallet` WRITE;
/*!40000 ALTER TABLE `user_game_wallet` DISABLE KEYS */;
INSERT INTO `user_game_wallet` VALUES (13,7,'ROULETTE_COIN',6,'2025-12-11 05:51:03'),(14,7,'DICE_TOKEN',10,'2025-12-11 05:34:36'),(15,7,'LOTTERY_TICKET',10,'2025-12-11 05:34:33'),(16,8,'ROULETTE_COIN',9,'2025-12-12 01:59:15'),(17,8,'DICE_TOKEN',10,'2025-12-11 05:34:28'),(18,8,'LOTTERY_TICKET',10,'2025-12-11 05:34:30'),(19,6,'ROULETTE_COIN',5,'2025-12-12 09:55:40'),(20,6,'DICE_TOKEN',8,'2025-12-11 05:57:30'),(21,6,'LOTTERY_TICKET',10,'2025-12-11 05:39:06'),(34,9,'ROULETTE_COIN',9,'2025-12-11 07:39:23'),(35,9,'DICE_TOKEN',7,'2025-12-11 07:39:41'),(36,9,'LOTTERY_TICKET',8,'2025-12-11 07:39:59'),(37,15,'DICE_TOKEN',0,'2025-12-11 09:19:28'),(38,15,'ROULETTE_COIN',0,'2025-12-12 06:48:00'),(39,15,'LOTTERY_TICKET',0,'2025-12-12 07:01:21'),(40,14,'ROULETTE_COIN',0,'2025-12-12 11:48:07'),(41,14,'DICE_TOKEN',0,'2025-12-12 07:41:53'),(42,14,'LOTTERY_TICKET',0,'2025-12-12 10:00:34'),(43,16,'ROULETTE_COIN',0,'2025-12-11 11:14:25'),(44,16,'LOTTERY_TICKET',0,'2025-12-11 11:14:35'),(45,17,'ROULETTE_COIN',1,'2025-12-12 00:31:14'),(46,17,'DICE_TOKEN',0,'2025-12-11 10:52:44'),(47,18,'ROULETTE_COIN',2,'2025-12-12 12:44:34'),(48,18,'DICE_TOKEN',0,'2025-12-11 10:35:41'),(49,18,'LOTTERY_TICKET',0,'2025-12-12 12:02:38'),(50,19,'ROULETTE_COIN',3,'2025-12-11 10:08:04'),(51,19,'DICE_TOKEN',3,'2025-12-11 10:08:06'),(52,19,'LOTTERY_TICKET',3,'2025-12-11 10:08:09'),(53,20,'ROULETTE_COIN',1,'2025-12-11 10:10:29'),(54,20,'DICE_TOKEN',1,'2025-12-11 10:10:31'),(55,20,'LOTTERY_TICKET',1,'2025-12-11 10:10:33'),(56,21,'ROULETTE_COIN',0,'2025-12-12 06:56:53'),(57,21,'DICE_TOKEN',0,'2025-12-12 06:57:34'),(58,21,'LOTTERY_TICKET',0,'2025-12-12 06:58:06'),(59,22,'ROULETTE_COIN',0,'2025-12-12 00:57:03'),(60,22,'DICE_TOKEN',0,'2025-12-11 10:19:02'),(61,22,'LOTTERY_TICKET',0,'2025-12-12 01:38:06'),(62,17,'LOTTERY_TICKET',0,'2025-12-11 10:47:44'),(63,23,'ROULETTE_COIN',0,'2025-12-11 10:51:53'),(64,23,'DICE_TOKEN',0,'2025-12-12 10:16:55'),(65,24,'ROULETTE_COIN',0,'2025-12-12 08:12:46'),(66,24,'DICE_TOKEN',0,'2025-12-11 12:14:14'),(67,23,'LOTTERY_TICKET',0,'2025-12-11 10:51:23'),(68,16,'DICE_TOKEN',2,'2025-12-12 08:49:03'),(69,25,'ROULETTE_COIN',0,'2025-12-11 11:17:12'),(70,25,'DICE_TOKEN',0,'2025-12-11 11:16:55'),(71,25,'LOTTERY_TICKET',0,'2025-12-11 11:16:55'),(72,24,'LOTTERY_TICKET',0,'2025-12-11 12:13:47'),(73,26,'ROULETTE_COIN',0,'2025-12-12 00:48:30'),(80,27,'ROULETTE_COIN',0,'2025-12-12 14:20:26'),(81,26,'LOTTERY_TICKET',0,'2025-12-12 00:55:43'),(82,26,'DICE_TOKEN',0,'2025-12-12 00:48:20'),(89,29,'DICE_TOKEN',0,'2025-12-12 01:58:32'),(90,29,'ROULETTE_COIN',0,'2025-12-12 01:57:50'),(91,30,'ROULETTE_COIN',0,'2025-12-12 02:20:53'),(92,30,'DICE_TOKEN',2,'2025-12-12 02:30:10'),(93,29,'LOTTERY_TICKET',0,'2025-12-12 01:57:12'),(94,30,'LOTTERY_TICKET',1,'2025-12-12 02:29:30'),(95,31,'ROULETTE_COIN',1,'2025-12-12 02:27:16'),(96,31,'DICE_TOKEN',1,'2025-12-12 02:27:18'),(97,32,'ROULETTE_COIN',1,'2025-12-12 02:28:32'),(98,32,'DICE_TOKEN',1,'2025-12-12 02:28:34'),(99,33,'ROULETTE_COIN',0,'2025-12-12 06:11:30'),(100,33,'DICE_TOKEN',0,'2025-12-12 06:12:23'),(101,34,'ROULETTE_COIN',0,'2025-12-12 03:12:51'),(102,34,'DICE_TOKEN',0,'2025-12-12 03:13:06'),(103,34,'LOTTERY_TICKET',0,'2025-12-12 03:12:47'),(104,35,'ROULETTE_COIN',0,'2025-12-12 05:43:56'),(105,35,'DICE_TOKEN',1,'2025-12-12 09:36:35'),(106,35,'LOTTERY_TICKET',0,'2025-12-12 05:43:49'),(107,33,'LOTTERY_TICKET',0,'2025-12-12 06:11:17'),(108,36,'ROULETTE_COIN',0,'2025-12-12 06:34:52'),(109,36,'DICE_TOKEN',0,'2025-12-12 06:35:09'),(110,36,'LOTTERY_TICKET',0,'2025-12-12 06:34:34'),(111,37,'ROULETTE_COIN',0,'2025-12-12 07:48:08'),(112,37,'DICE_TOKEN',0,'2025-12-12 07:48:26'),(113,37,'LOTTERY_TICKET',0,'2025-12-12 07:48:03'),(114,39,'ROULETTE_COIN',0,'2025-12-12 08:09:19'),(115,39,'DICE_TOKEN',0,'2025-12-12 08:09:05'),(116,39,'LOTTERY_TICKET',0,'2025-12-12 08:08:42'),(117,41,'ROULETTE_COIN',0,'2025-12-12 09:36:34'),(118,41,'DICE_TOKEN',0,'2025-12-12 09:36:46'),(119,41,'LOTTERY_TICKET',0,'2025-12-12 09:36:31'),(120,42,'ROULETTE_COIN',0,'2025-12-12 10:47:59'),(121,42,'DICE_TOKEN',0,'2025-12-12 10:48:18'),(122,42,'LOTTERY_TICKET',0,'2025-12-12 10:47:44'),(123,43,'LOTTERY_TICKET',0,'2025-12-12 11:24:01'),(124,43,'DICE_TOKEN',2,'2025-12-12 14:09:12'),(125,43,'ROULETTE_COIN',1,'2025-12-12 14:09:08'),(126,44,'ROULETTE_COIN',0,'2025-12-12 11:47:06'),(127,44,'DICE_TOKEN',0,'2025-12-12 11:43:50'),(128,44,'LOTTERY_TICKET',0,'2025-12-12 11:45:45'),(129,45,'ROULETTE_COIN',0,'2025-12-12 14:26:09'),(130,45,'DICE_TOKEN',0,'2025-12-12 14:16:23'),(131,45,'LOTTERY_TICKET',0,'2025-12-12 14:15:54'),(132,27,'LOTTERY_TICKET',0,'2025-12-12 14:19:29'),(133,27,'DICE_TOKEN',2,'2025-12-12 14:25:50');
/*!40000 ALTER TABLE `user_game_wallet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_game_wallet_ledger`
--

DROP TABLE IF EXISTS `user_game_wallet_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_game_wallet_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_type` enum('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET') NOT NULL,
  `delta` int NOT NULL,
  `balance_after` int NOT NULL,
  `reason` varchar(100) DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_game_wallet_ledger_user_id` (`user_id`),
  KEY `ix_user_game_wallet_ledger_id` (`id`),
  KEY `ix_user_game_wallet_ledger_token_type` (`token_type`),
  CONSTRAINT `user_game_wallet_ledger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=365 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet_ledger`
--

LOCK TABLES `user_game_wallet_ledger` WRITE;
/*!40000 ALTER TABLE `user_game_wallet_ledger` DISABLE KEYS */;
INSERT INTO `user_game_wallet_ledger` VALUES (67,8,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-11 05:34:26'),(68,8,'DICE_TOKEN',10,10,'GRANT',NULL,'{}','2025-12-11 05:34:28'),(69,8,'LOTTERY_TICKET',10,10,'GRANT',NULL,'{}','2025-12-11 05:34:30'),(70,7,'LOTTERY_TICKET',10,10,'GRANT',NULL,'{}','2025-12-11 05:34:33'),(71,7,'DICE_TOKEN',10,10,'GRANT',NULL,'{}','2025-12-11 05:34:36'),(72,7,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-11 05:34:38'),(74,6,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-11 05:39:02'),(75,6,'DICE_TOKEN',10,10,'GRANT',NULL,'{}','2025-12-11 05:39:04'),(76,6,'LOTTERY_TICKET',10,10,'GRANT',NULL,'{}','2025-12-11 05:39:06'),(77,6,'ROULETTE_COIN',-1,9,'ROULETTE_PLAY','꽝','{\"segment_id\": 4}','2025-12-11 05:40:04'),(78,6,'ROULETTE_COIN',-1,8,'ROULETTE_PLAY','배민1만','{\"segment_id\": 1}','2025-12-11 05:40:13'),(79,6,'ROULETTE_COIN',-1,7,'ROULETTE_PLAY','스벅커피','{\"segment_id\": 3}','2025-12-11 05:40:21'),(89,7,'ROULETTE_COIN',-1,9,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 9}','2025-12-11 05:50:40'),(90,7,'ROULETTE_COIN',-1,8,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 9}','2025-12-11 05:50:54'),(91,7,'ROULETTE_COIN',-1,7,'ROULETTE_PLAY','꽝','{\"segment_id\": 12}','2025-12-11 05:50:58'),(92,7,'ROULETTE_COIN',-1,6,'ROULETTE_PLAY','편의점깁콘5천','{\"segment_id\": 11}','2025-12-11 05:51:03'),(94,6,'ROULETTE_COIN',-1,6,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 10}','2025-12-11 05:57:15'),(95,6,'DICE_TOKEN',-1,9,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 05:57:26'),(96,6,'DICE_TOKEN',-1,8,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 05:57:30'),(97,9,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-11 06:55:04'),(98,9,'DICE_TOKEN',10,10,'GRANT',NULL,'{}','2025-12-11 06:55:06'),(99,9,'LOTTERY_TICKET',10,10,'GRANT',NULL,'{}','2025-12-11 06:55:07'),(101,9,'ROULETTE_COIN',-1,9,'ROULETTE_PLAY','배민5천','{\"segment_id\": 7}','2025-12-11 07:39:23'),(102,9,'DICE_TOKEN',-1,9,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 07:39:33'),(103,9,'DICE_TOKEN',-1,8,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-11 07:39:37'),(104,9,'DICE_TOKEN',-1,7,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-11 07:39:41'),(105,9,'LOTTERY_TICKET',-1,9,'LOTTERY_PLAY','배민1만','{\"prize_id\": 6}','2025-12-11 07:39:50'),(106,9,'LOTTERY_TICKET',-1,8,'LOTTERY_PLAY','꽝','{\"prize_id\": 5}','2025-12-11 07:39:59'),(110,14,'ROULETTE_COIN',3,3,'GRANT',NULL,'{}','2025-12-11 08:39:33'),(111,14,'DICE_TOKEN',3,3,'GRANT',NULL,'{}','2025-12-11 08:39:35'),(112,14,'LOTTERY_TICKET',3,3,'GRANT',NULL,'{}','2025-12-11 08:39:37'),(113,15,'ROULETTE_COIN',3,3,'GRANT',NULL,'{}','2025-12-11 08:42:02'),(114,15,'DICE_TOKEN',3,3,'GRANT',NULL,'{}','2025-12-11 08:42:04'),(115,15,'LOTTERY_TICKET',3,3,'GRANT',NULL,'{}','2025-12-11 08:42:05'),(116,14,'LOTTERY_TICKET',-1,2,'LOTTERY_PLAY','배민1만','{\"prize_id\": 6}','2025-12-11 08:42:49'),(117,14,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','꽝','{\"prize_id\": 5}','2025-12-11 08:43:11'),(118,14,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','배민1만','{\"prize_id\": 6}','2025-12-11 08:43:21'),(119,14,'DICE_TOKEN',-1,2,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 08:43:46'),(120,14,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 08:43:49'),(121,14,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 08:43:53'),(122,14,'ROULETTE_COIN',-1,2,'ROULETTE_PLAY','꽝','{\"segment_id\": 12}','2025-12-11 08:44:02'),(123,14,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','꽝','{\"segment_id\": 12}','2025-12-11 08:44:07'),(124,14,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','편의점깁콘5천','{\"segment_id\": 11}','2025-12-11 08:44:13'),(125,15,'LOTTERY_TICKET',-1,2,'LOTTERY_PLAY','꽝','{\"prize_id\": 10}','2025-12-11 09:15:46'),(126,15,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','포인트3만','{\"prize_id\": 14}','2025-12-11 09:16:03'),(127,15,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','포인트3만','{\"prize_id\": 14}','2025-12-11 09:16:16'),(128,15,'ROULETTE_COIN',-1,2,'ROULETTE_PLAY','꽝','{\"segment_id\": 12}','2025-12-11 09:18:33'),(129,15,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','꽝','{\"segment_id\": 12}','2025-12-11 09:18:39'),(130,15,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 10}','2025-12-11 09:18:44'),(131,15,'DICE_TOKEN',-1,2,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 09:19:16'),(132,15,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 09:19:19'),(133,15,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 09:19:28'),(134,16,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-11 09:37:01'),(135,16,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-11 09:37:04'),(136,17,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-11 09:42:42'),(137,17,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-11 09:42:45'),(140,18,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-11 10:05:03'),(141,18,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-11 10:05:05'),(142,18,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-11 10:05:08'),(143,19,'ROULETTE_COIN',3,3,'GRANT',NULL,'{}','2025-12-11 10:08:04'),(144,19,'DICE_TOKEN',3,3,'GRANT',NULL,'{}','2025-12-11 10:08:06'),(145,19,'LOTTERY_TICKET',3,3,'GRANT',NULL,'{}','2025-12-11 10:08:09'),(146,20,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-11 10:10:29'),(147,20,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-11 10:10:31'),(148,20,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-11 10:10:33'),(149,21,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-11 10:12:10'),(150,21,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-11 10:12:11'),(151,21,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-11 10:12:13'),(152,21,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에!','{\"segment_id\": 17}','2025-12-11 10:13:38'),(153,21,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 10:13:50'),(154,21,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','레벨포인트','{\"prize_id\": 17}','2025-12-11 10:14:03'),(155,22,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-11 10:15:40'),(156,22,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-11 10:15:42'),(157,22,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-11 10:15:45'),(158,22,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 16}','2025-12-11 10:18:39'),(159,22,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','배민2만','{\"segment_id\": 18}','2025-12-11 10:18:48'),(160,22,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-11 10:18:58'),(161,22,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-11 10:19:02'),(162,22,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','레벨포인트','{\"prize_id\": 17}','2025-12-11 10:19:11'),(163,18,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에!','{\"segment_id\": 17}','2025-12-11 10:28:11'),(164,18,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에!','{\"segment_id\": 17}','2025-12-11 10:28:18'),(165,18,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 10:35:33'),(166,18,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 10:35:41'),(167,18,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','레벨포인트','{\"prize_id\": 17}','2025-12-11 10:37:34'),(168,23,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-11 10:49:00'),(169,23,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-11 10:49:05'),(170,24,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-11 10:50:14'),(171,24,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-11 10:50:16'),(172,24,'DICE_TOKEN',1,2,'GRANT',NULL,'{}','2025-12-11 10:50:25'),(173,23,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 16}','2025-12-11 10:51:44'),(174,23,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에!','{\"segment_id\": 17}','2025-12-11 10:51:53'),(175,23,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 10:52:06'),(176,17,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-11 10:52:37'),(177,17,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 10:52:44'),(178,17,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 16}','2025-12-11 10:53:14'),(179,17,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','5천CC포인트','{\"segment_id\": 19}','2025-12-11 10:53:23'),(180,16,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에!','{\"segment_id\": 17}','2025-12-11 11:14:25'),(181,16,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','포인트1만','{\"prize_id\": 18}','2025-12-11 11:14:35'),(182,25,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-11 11:14:38'),(183,25,'ROULETTE_COIN',-1,1,'REVOKE',NULL,'{}','2025-12-11 11:14:48'),(184,25,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 16}','2025-12-11 11:17:12'),(185,24,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에!','{\"segment_id\": 17}','2025-12-11 12:13:54'),(186,24,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-11 12:14:08'),(187,24,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-11 12:14:14'),(188,14,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:17:39'),(189,15,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:19:32'),(190,17,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:31:14'),(191,18,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-12 00:31:53'),(192,21,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:32:35'),(193,22,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:32:50'),(194,24,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:34:38'),(195,26,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:40:02'),(196,27,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 00:43:30'),(197,26,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 24}','2025-12-12 00:48:30'),(198,14,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 00:51:46'),(199,26,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-12 00:52:49'),(201,26,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','배민2만','{\"prize_id\": 22}','2025-12-12 00:55:43'),(202,22,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 24}','2025-12-12 00:57:03'),(206,22,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-12 01:05:39'),(224,29,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 01:28:50'),(225,29,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 01:28:54'),(226,30,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 01:31:43'),(227,30,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 01:31:46'),(230,22,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','배민2만','{\"prize_id\": 42}','2025-12-12 01:38:06'),(231,29,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 01:57:50'),(232,29,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 01:58:16'),(233,29,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 01:58:32'),(234,8,'ROULETTE_COIN',-1,9,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 01:59:15'),(235,14,'LOTTERY_TICKET',2,2,'GRANT',NULL,'{}','2025-12-12 02:15:20'),(236,14,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 02:15:32'),(237,21,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 24}','2025-12-12 02:19:06'),(238,21,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-12 02:20:40'),(239,30,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 24}','2025-12-12 02:20:53'),(240,21,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','룰렛티켓2장','{\"prize_id\": 46}','2025-12-12 02:20:56'),(241,30,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 02:21:08'),(242,30,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 02:21:13'),(243,21,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-12 02:21:28'),(244,21,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 02:21:59'),(245,21,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 22}','2025-12-12 02:22:05'),(246,31,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 02:27:16'),(247,31,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-12 02:27:18'),(248,32,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 02:28:32'),(249,32,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-12 02:28:34'),(250,30,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-12 02:29:30'),(251,30,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 02:30:10'),(252,33,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 02:35:25'),(253,33,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 02:35:27'),(254,18,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 02:39:00'),(255,18,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 02:39:10'),(256,34,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 03:09:20'),(257,34,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 03:09:24'),(258,34,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트1만','{\"segment_id\": 26}','2025-12-12 03:12:51'),(259,34,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-12 03:13:02'),(260,34,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 03:13:06'),(261,35,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 03:22:06'),(262,35,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 03:22:10'),(264,35,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 23}','2025-12-12 05:43:56'),(265,35,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 05:44:12'),(266,35,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 05:44:15'),(267,33,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 25}','2025-12-12 06:11:30'),(268,33,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 06:12:09'),(269,33,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-12 06:12:23'),(272,36,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 06:33:56'),(273,36,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 06:34:00'),(274,36,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','메가커피아아','{\"segment_id\": 25}','2025-12-12 06:34:52'),(275,36,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 06:35:04'),(276,36,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 06:35:09'),(277,15,'ROULETTE_COIN',10,11,'GRANT',NULL,'{}','2025-12-12 06:47:50'),(278,15,'ROULETTE_COIN',-11,0,'REVOKE',NULL,'{}','2025-12-12 06:48:00'),(279,15,'LOTTERY_TICKET',2,2,'GRANT',NULL,'{}','2025-12-12 06:48:23'),(280,21,'ROULETTE_COIN',3,3,'GRANT',NULL,'{}','2025-12-12 06:56:32'),(281,21,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 06:56:34'),(282,21,'ROULETTE_COIN',-1,2,'ROULETTE_PLAY','배민1만','{\"segment_id\": 21}','2025-12-12 06:56:40'),(283,21,'LOTTERY_TICKET',2,2,'GRANT',NULL,'{}','2025-12-12 06:56:43'),(284,21,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 22}','2025-12-12 06:56:47'),(285,21,'LOTTERY_TICKET',3,5,'GRANT',NULL,'{}','2025-12-12 06:56:49'),(286,21,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','배민1만','{\"segment_id\": 21}','2025-12-12 06:56:53'),(287,21,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 06:57:31'),(288,21,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 06:57:34'),(289,21,'LOTTERY_TICKET',-1,4,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 06:57:46'),(290,21,'LOTTERY_TICKET',-1,3,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 06:57:52'),(291,21,'LOTTERY_TICKET',-1,2,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 06:57:57'),(292,21,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 06:58:02'),(293,21,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 06:58:06'),(294,15,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 07:01:09'),(295,15,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 07:01:21'),(296,23,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 07:11:32'),(297,14,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 07:41:49'),(298,14,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 07:41:53'),(299,14,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 07:42:15'),(300,14,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','꽝','{\"prize_id\": 57}','2025-12-12 07:42:28'),(301,37,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 07:47:12'),(302,37,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 07:47:16'),(303,37,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 07:48:08'),(304,37,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-12 07:48:21'),(305,37,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 07:48:26'),(306,39,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 08:06:18'),(307,39,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 08:06:21'),(308,39,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 08:09:01'),(309,39,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 08:09:05'),(310,39,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 08:09:19'),(311,14,'ROULETTE_COIN',3,3,'GRANT',NULL,'{}','2025-12-12 08:11:59'),(312,14,'LOTTERY_TICKET',3,3,'GRANT',NULL,'{}','2025-12-12 08:12:01'),(313,24,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 08:12:46'),(314,18,'LOTTERY_TICKET',2,2,'GRANT',NULL,'{}','2025-12-12 08:24:23'),(315,16,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 08:49:03'),(316,41,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 09:34:52'),(317,41,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 09:34:56'),(318,41,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 09:36:34'),(319,35,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-12 09:36:35'),(320,41,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 09:36:43'),(321,41,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 09:36:46'),(322,6,'ROULETTE_COIN',-1,5,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 09:55:40'),(323,14,'ROULETTE_COIN',-1,2,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 10:00:02'),(324,14,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 29}','2025-12-12 10:00:07'),(325,14,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 10:00:12'),(326,14,'LOTTERY_TICKET',-1,2,'LOTTERY_PLAY','꽝','{\"prize_id\": 63}','2025-12-12 10:00:21'),(327,14,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','꽝','{\"prize_id\": 63}','2025-12-12 10:00:28'),(328,14,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','룰렛티켓2장','{\"prize_id\": 64}','2025-12-12 10:00:34'),(329,14,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-12 10:02:28'),(330,23,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 10:16:51'),(331,23,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 10:16:55'),(332,42,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 10:46:47'),(333,42,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 10:46:51'),(334,42,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 10:47:59'),(335,42,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 10:48:12'),(336,42,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 10:48:18'),(337,44,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 11:34:25'),(338,44,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 11:34:33'),(339,44,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 29}','2025-12-12 11:43:33'),(340,44,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-12 11:43:45'),(341,44,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 11:43:50'),(342,44,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-12 11:45:26'),(343,44,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','룰렛티켓2장','{\"prize_id\": 64}','2025-12-12 11:45:45'),(344,44,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-12 11:46:24'),(345,44,'ROULETTE_COIN',2,4,'GRANT',NULL,'{}','2025-12-12 11:46:25'),(346,44,'ROULETTE_COIN',-2,2,'REVOKE',NULL,'{}','2025-12-12 11:46:42'),(347,44,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 11:46:59'),(348,44,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 11:47:06'),(349,14,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 11:48:02'),(350,14,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC포인트5천','{\"segment_id\": 28}','2025-12-12 11:48:07'),(351,18,'LOTTERY_TICKET',-1,1,'LOTTERY_PLAY','꽝','{\"prize_id\": 63}','2025-12-12 12:00:00'),(352,18,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','룰렛티켓2장','{\"prize_id\": 64}','2025-12-12 12:02:38'),(353,18,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-12 12:44:34'),(354,43,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 14:09:08'),(355,43,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 14:09:12'),(356,45,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 14:14:55'),(357,45,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 14:14:59'),(358,45,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','컴포즈아아','{\"segment_id\": 35}','2025-12-12 14:16:03'),(359,45,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-12 14:16:16'),(360,45,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-12 14:16:23'),(361,27,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','주사위티켓2장 ','{\"segment_id\": 39}','2025-12-12 14:20:26'),(362,45,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-12 14:25:14'),(363,27,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-12 14:25:50'),(364,45,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 36}','2025-12-12 14:26:09');
/*!40000 ALTER TABLE `user_game_wallet_ledger` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-12 14:33:30
