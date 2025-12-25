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
INSERT INTO `alembic_version` VALUES ('20251217_0023');
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
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dice_log`
--

LOCK TABLES `dice_log` WRITE;
/*!40000 ALTER TABLE `dice_log` DISABLE KEYS */;
INSERT INTO `dice_log` VALUES (1,6,1,2,2,4,2,4,6,'LOSE','POINT',5,'2025-12-14 13:53:37'),(2,7,1,3,3,6,5,4,9,'LOSE','POINT',5,'2025-12-15 13:56:04'),(3,7,1,3,2,5,5,1,6,'LOSE','POINT',5,'2025-12-15 13:56:07'),(4,8,1,1,5,6,5,6,11,'LOSE','POINT',5,'2025-12-15 14:07:48'),(5,9,1,4,1,5,3,1,4,'WIN','POINT',20,'2025-12-15 14:53:21'),(6,9,1,2,2,4,1,1,2,'WIN','POINT',20,'2025-12-15 14:53:23'),(7,9,1,4,4,8,6,2,8,'DRAW','POINT',5,'2025-12-15 15:00:13'),(8,9,1,2,4,6,5,5,10,'LOSE','POINT',5,'2025-12-15 15:00:16'),(9,9,1,4,5,9,4,5,9,'DRAW','POINT',5,'2025-12-15 15:02:20'),(10,9,1,6,2,8,1,1,2,'WIN','POINT',20,'2025-12-15 15:02:23'),(11,43,1,2,5,7,5,4,9,'LOSE','POINT',5,'2025-12-15 15:24:48'),(12,6,1,1,3,4,3,2,5,'LOSE','POINT',5,'2025-12-15 15:25:08'),(13,50,1,3,6,9,3,2,5,'WIN','POINT',20,'2025-12-15 15:45:38'),(14,58,1,1,1,2,1,5,6,'LOSE','POINT',5,'2025-12-15 15:56:27'),(15,44,1,3,6,9,1,3,4,'WIN','POINT',20,'2025-12-15 16:33:40'),(16,44,1,3,5,8,4,1,5,'WIN','POINT',20,'2025-12-15 16:33:44'),(17,10,1,1,3,4,4,1,5,'LOSE','POINT',5,'2025-12-16 02:28:17'),(18,22,1,6,3,9,1,5,6,'WIN','POINT',20,'2025-12-16 02:52:52'),(21,11,1,2,5,7,6,4,10,'LOSE','POINT',5,'2025-12-16 02:54:19'),(22,11,1,6,3,9,6,1,7,'WIN','POINT',20,'2025-12-16 02:57:54'),(23,33,1,3,6,9,2,2,4,'WIN','POINT',20,'2025-12-16 03:02:44'),(24,48,1,6,1,7,2,1,3,'WIN','POINT',20,'2025-12-16 03:36:57'),(25,29,1,4,6,10,4,6,10,'DRAW','POINT',5,'2025-12-16 03:40:04'),(26,26,1,2,5,7,1,6,7,'DRAW','POINT',5,'2025-12-16 04:39:56'),(27,26,1,6,3,9,3,6,9,'DRAW','POINT',5,'2025-12-16 04:40:05'),(28,26,1,4,3,7,5,2,7,'DRAW','POINT',5,'2025-12-16 04:40:12'),(29,26,1,4,3,7,4,4,8,'LOSE','POINT',5,'2025-12-16 04:40:17'),(30,25,1,2,2,4,2,4,6,'LOSE','POINT',5,'2025-12-16 04:41:11'),(31,25,1,1,6,7,4,1,5,'WIN','POINT',20,'2025-12-16 04:41:14'),(32,25,1,2,6,8,1,1,2,'WIN','POINT',20,'2025-12-16 04:45:58'),(33,25,1,4,5,9,4,2,6,'WIN','POINT',20,'2025-12-16 04:46:15'),(34,67,1,6,3,9,1,4,5,'WIN','POINT',20,'2025-12-16 04:50:30'),(35,67,1,1,6,7,2,5,7,'DRAW','POINT',5,'2025-12-16 04:50:35'),(36,67,1,4,6,10,3,6,9,'WIN','POINT',20,'2025-12-16 04:55:49'),(37,67,1,4,3,7,6,3,9,'LOSE','POINT',5,'2025-12-16 04:55:55'),(38,67,1,6,1,7,1,6,7,'DRAW','POINT',5,'2025-12-16 04:55:58'),(39,69,1,2,6,8,4,2,6,'WIN','POINT',20,'2025-12-16 05:02:23'),(40,69,1,1,1,2,6,1,7,'LOSE','POINT',5,'2025-12-16 05:02:27'),(41,69,1,1,2,3,4,1,5,'LOSE','POINT',5,'2025-12-16 05:02:31'),(42,14,1,3,5,8,1,2,3,'WIN','POINT',20,'2025-12-16 05:03:56'),(43,14,1,3,6,9,2,2,4,'WIN','POINT',20,'2025-12-16 05:05:34'),(44,14,1,3,1,4,3,3,6,'LOSE','POINT',5,'2025-12-16 05:05:37'),(45,15,1,1,6,7,4,5,9,'LOSE','POINT',5,'2025-12-16 05:07:00'),(46,70,1,5,2,7,5,3,8,'LOSE','POINT',5,'2025-12-16 05:17:28'),(47,70,1,2,4,6,5,1,6,'DRAW','POINT',5,'2025-12-16 05:17:33'),(48,11,1,2,3,5,5,5,10,'LOSE','POINT',5,'2025-12-16 05:32:13'),(49,11,1,3,5,8,6,2,8,'DRAW','POINT',5,'2025-12-16 05:32:15'),(50,68,1,1,5,6,4,6,10,'LOSE','POINT',5,'2025-12-16 05:34:27'),(51,68,1,2,6,8,6,1,7,'WIN','POINT',20,'2025-12-16 05:34:31'),(52,76,1,3,5,8,1,2,3,'WIN','POINT',20,'2025-12-17 07:44:18'),(53,75,1,3,3,6,5,2,7,'LOSE','POINT',5,'2025-12-17 07:49:01'),(54,75,1,1,2,3,2,3,5,'LOSE','POINT',5,'2025-12-17 07:49:04'),(55,75,1,1,1,2,2,4,6,'LOSE','POINT',5,'2025-12-17 07:49:44'),(56,75,1,6,1,7,4,3,7,'DRAW','POINT',5,'2025-12-17 07:49:46'),(57,75,1,3,5,8,1,1,2,'WIN','POINT',20,'2025-12-17 07:50:09'),(58,75,1,4,6,10,2,6,8,'WIN','POINT',20,'2025-12-17 07:50:12');
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
  `deposit_remainder` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_external_ranking_user` (`user_id`),
  KEY `ix_external_ranking_data_id` (`id`),
  KEY `ix_external_ranking_data_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_ranking_data`
--

LOCK TABLES `external_ranking_data` WRITE;
/*!40000 ALTER TABLE `external_ranking_data` DISABLE KEYS */;
INSERT INTO `external_ranking_data` VALUES (2,18,100000,1,0,0,'2025-12-16','','2025-12-15 15:41:55','2025-12-15 15:41:55',0),(3,45,70000,1,0,0,'2025-12-16','','2025-12-15 15:42:09','2025-12-15 15:42:09',70000),(4,39,200000,1,0,0,'2025-12-16','','2025-12-15 15:42:22','2025-12-15 15:42:22',0),(5,23,100000,1,0,0,'2025-12-16','','2025-12-15 15:42:31','2025-12-15 15:42:31',0),(6,44,200000,1,0,0,'2025-12-16','','2025-12-15 15:43:33','2025-12-15 15:43:33',0),(8,10,1500000,5,0,0,'2025-12-16','','2025-12-15 15:44:46','2025-12-16 05:30:14',0),(9,58,1100000,5,0,0,'2025-12-16','','2025-12-15 15:47:50','2025-12-16 05:30:19',50000),(10,29,400000,2,0,0,'2025-12-16','','2025-12-16 01:36:41','2025-12-16 02:18:38',0),(12,22,300000,2,0,0,'2025-12-16','','2025-12-16 01:37:44','2025-12-16 02:59:44',0),(13,64,300000,2,0,0,'2025-12-16','','2025-12-16 02:17:30','2025-12-16 03:05:49',0),(14,63,500000,2,0,0,'2025-12-16','','2025-12-16 02:17:52','2025-12-16 03:05:59',50000),(15,11,800000,5,0,0,'2025-12-16','','2025-12-16 02:21:48','2025-12-16 05:05:28',0),(16,9,400000,1,0,0,'2025-12-16','','2025-12-16 02:22:12','2025-12-16 05:05:40',0),(17,48,400000,2,0,0,'2025-12-16','','2025-12-16 02:59:33','2025-12-16 02:59:33',0),(18,69,200000,1,0,0,'2025-12-16','','2025-12-16 04:58:39','2025-12-16 04:58:39',0),(19,12,1000000,2,0,0,'2025-12-16','','2025-12-16 05:06:09','2025-12-16 05:30:24',0),(20,52,300000,1,0,0,'2025-12-16','','2025-12-16 05:12:21','2025-12-16 05:12:21',0),(21,6,1,0,0,0,'2025-12-17','E2E duplicate prevention','2025-12-17 06:39:15','2025-12-17 06:55:51',0);
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_log`
--

LOCK TABLES `lottery_log` WRITE;
/*!40000 ALTER TABLE `lottery_log` DISABLE KEYS */;
INSERT INTO `lottery_log` VALUES (4,7,1,101,'POINT',5,'2025-12-15 13:55:48'),(5,9,1,105,'TICKET_DICE',2,'2025-12-15 14:53:04'),(6,9,1,101,'POINT',5,'2025-12-15 15:00:05'),(7,9,1,105,'TICKET_DICE',2,'2025-12-15 15:02:37'),(8,58,1,101,'POINT',5,'2025-12-16 02:23:41'),(9,25,1,106,'POINT',5,'2025-12-16 04:42:34'),(10,67,1,105,'TICKET_DICE',2,'2025-12-16 04:51:19'),(11,69,1,105,'TICKET_DICE',2,'2025-12-16 05:02:40'),(12,11,1,105,'TICKET_DICE',2,'2025-12-16 05:31:52');
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
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_prize`
--

LOCK TABLES `lottery_prize` WRITE;
/*!40000 ALTER TABLE `lottery_prize` DISABLE KEYS */;
INSERT INTO `lottery_prize` VALUES (101,1,'CC코인1개','POINT',5,450,96,1,'2025-12-15 13:43:25','2025-12-16 02:23:41'),(102,1,'CC포인트1만','POINT',5,2,1,1,'2025-12-15 13:43:25','2025-12-15 13:43:25'),(103,1,'룰렛티켓1장','TICKET_ROULETTE',1,200,100,1,'2025-12-15 13:43:25','2025-12-15 13:43:25'),(104,1,'배민1만','POINT',5,5,10,1,'2025-12-15 13:43:25','2025-12-15 13:43:25'),(105,1,'주사위티켓2장','TICKET_DICE',2,650,95,1,'2025-12-15 13:43:25','2025-12-16 05:31:52'),(106,1,'다음기회에','POINT',5,280,98,1,'2025-12-15 13:43:25','2025-12-16 04:42:34');
/*!40000 ALTER TABLE `lottery_prize` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `new_member_dice_eligibility`
--

DROP TABLE IF EXISTS `new_member_dice_eligibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_member_dice_eligibility` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `is_eligible` tinyint(1) NOT NULL DEFAULT '1',
  `campaign_key` varchar(50) DEFAULT NULL,
  `granted_by` varchar(100) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_new_member_dice_eligibility_user_id` (`user_id`),
  KEY `ix_new_member_dice_eligibility_user_id` (`user_id`),
  CONSTRAINT `new_member_dice_eligibility_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `new_member_dice_eligibility`
--

LOCK TABLES `new_member_dice_eligibility` WRITE;
/*!40000 ALTER TABLE `new_member_dice_eligibility` DISABLE KEYS */;
INSERT INTO `new_member_dice_eligibility` VALUES (7,76,1,NULL,NULL,NULL,NULL,'2025-12-17 07:42:47','2025-12-17 07:43:16'),(8,75,1,NULL,NULL,NULL,NULL,'2025-12-17 07:51:25','2025-12-17 07:51:27');
/*!40000 ALTER TABLE `new_member_dice_eligibility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `new_member_dice_log`
--

DROP TABLE IF EXISTS `new_member_dice_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_member_dice_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `campaign_key` varchar(50) DEFAULT NULL,
  `outcome` varchar(10) NOT NULL,
  `user_dice` int NOT NULL,
  `dealer_dice` int NOT NULL,
  `win_link` varchar(200) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_new_member_dice_log_user_id` (`user_id`),
  KEY `ix_new_member_dice_log_user_created_at` (`user_id`,`created_at`),
  CONSTRAINT `new_member_dice_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `new_member_dice_log`
--

LOCK TABLES `new_member_dice_log` WRITE;
/*!40000 ALTER TABLE `new_member_dice_log` DISABLE KEYS */;
INSERT INTO `new_member_dice_log` VALUES (1,77,NULL,'LOSE',1,5,'https://ccc-010.com','2025-12-17 07:16:13'),(2,6,NULL,'LOSE',1,3,'https://ccc-010.com','2025-12-17 07:25:07'),(3,76,NULL,'LOSE',2,5,'https://ccc-010.com','2025-12-17 07:43:23'),(4,75,NULL,'LOSE',1,2,'https://ccc-010.com','2025-12-17 07:51:31');
/*!40000 ALTER TABLE `new_member_dice_log` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_config`
--

LOCK TABLES `roulette_config` WRITE;
/*!40000 ALTER TABLE `roulette_config` DISABLE KEYS */;
INSERT INTO `roulette_config` VALUES (7,'Test Roulette',1,0,'2025-12-14 13:59:35','2025-12-14 13:59:35');
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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_log`
--

LOCK TABLES `roulette_log` WRITE;
/*!40000 ALTER TABLE `roulette_log` DISABLE KEYS */;
INSERT INTO `roulette_log` VALUES (7,7,7,47,'POINT',5,'2025-12-15 13:56:12'),(8,9,7,47,'POINT',5,'2025-12-15 14:53:28'),(9,9,7,47,'POINT',5,'2025-12-15 15:02:29'),(10,50,7,47,'POINT',5,'2025-12-15 15:46:01'),(11,58,7,50,'TICKET_LOTTERY',1,'2025-12-15 15:56:12'),(12,58,7,47,'POINT',5,'2025-12-15 15:56:20'),(13,44,7,47,'POINT',5,'2025-12-15 16:34:01'),(14,10,7,47,'POINT',5,'2025-12-16 02:28:05'),(15,10,7,47,'POINT',5,'2025-12-16 02:28:10'),(17,22,7,51,'POINT',5,'2025-12-16 02:52:38'),(18,11,7,47,'POINT',5,'2025-12-16 02:54:23'),(19,11,7,51,'POINT',5,'2025-12-16 02:54:28'),(20,48,7,47,'POINT',5,'2025-12-16 03:34:44'),(21,48,7,47,'POINT',5,'2025-12-16 03:34:52'),(22,29,7,47,'POINT',5,'2025-12-16 03:40:27'),(23,29,7,51,'POINT',5,'2025-12-16 03:40:36'),(24,26,7,49,'TICKET_DICE',2,'2025-12-16 04:39:03'),(25,25,7,47,'POINT',5,'2025-12-16 04:40:52'),(26,26,7,47,'POINT',5,'2025-12-16 04:41:01'),(27,25,7,50,'TICKET_LOTTERY',1,'2025-12-16 04:41:45'),(28,67,7,50,'TICKET_LOTTERY',1,'2025-12-16 04:50:15'),(29,67,7,48,'TICKET_ROULETTE',1,'2025-12-16 04:50:47'),(30,67,7,47,'POINT',5,'2025-12-16 04:50:52'),(31,69,7,50,'TICKET_LOTTERY',1,'2025-12-16 05:01:26'),(32,69,7,47,'POINT',5,'2025-12-16 05:01:32'),(33,14,7,49,'TICKET_DICE',2,'2025-12-16 05:05:22'),(34,68,7,47,'POINT',5,'2025-12-16 05:34:17');
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
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_segment`
--

LOCK TABLES `roulette_segment` WRITE;
/*!40000 ALTER TABLE `roulette_segment` DISABLE KEYS */;
INSERT INTO `roulette_segment` VALUES (47,7,0,'다음기회에','POINT',5,600,0,'2025-12-15 13:42:09','2025-12-15 13:42:09'),(48,7,1,'룰렛티켓1장','TICKET_ROULETTE',1,400,0,'2025-12-15 13:42:09','2025-12-15 13:42:09'),(49,7,2,'주사위티켓2장','TICKET_DICE',2,300,0,'2025-12-15 13:42:09','2025-12-15 13:42:09'),(50,7,3,'복권티켓1장','TICKET_LOTTERY',1,200,0,'2025-12-15 13:42:09','2025-12-15 13:42:09'),(51,7,4,'CC코인1개','POINT',5,100,0,'2025-12-15 13:42:09','2025-12-15 13:42:09'),(52,7,5,'CC포인트1만','POINT',5,8,0,'2025-12-15 13:42:09','2025-12-15 13:42:09');
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_config`
--

LOCK TABLES `season_pass_config` WRITE;
/*!40000 ALTER TABLE `season_pass_config` DISABLE KEYS */;
INSERT INTO `season_pass_config` VALUES (1,'SEASON_2','2025-12-14','2025-12-14',10,20,0,'2025-12-10 14:42:43','2025-12-10 15:07:56'),(2,'ì‹œì¦ŒíŒ¨ìŠ¤ 2ì°¨','2025-12-15','2025-12-28',10,20,1,'2025-12-15 00:00:03','2025-12-15 00:00:03');
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
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_level`
--

LOCK TABLES `season_pass_level` WRITE;
/*!40000 ALTER TABLE `season_pass_level` DISABLE KEYS */;
INSERT INTO `season_pass_level` VALUES (13,1,1,20,'TICKET_ROULETTE',1,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(14,1,2,50,'TICKET_DICE',1,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(15,1,3,100,'TICKET_ROULETTE',1,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(16,1,4,180,'TICKET_LOTTERY',1,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(17,1,5,300,'CC_COIN',1,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(18,1,6,450,'TICKET_DICE',2,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(19,1,7,650,'CC_COIN',2,1,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(20,1,8,900,'COUPON',10000,0,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(21,1,9,1200,'POINT',20000,0,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(22,1,10,1600,'POINT',50000,0,'2025-12-14 21:53:03','2025-12-14 21:53:03'),(23,2,1,20,'TICKET_ROULETTE',1,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(24,2,2,50,'TICKET_DICE',1,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(25,2,3,100,'TICKET_ROULETTE',1,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(26,2,4,180,'TICKET_LOTTERY',1,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(27,2,5,300,'POINT',1000,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(28,2,6,450,'TICKET_DICE',2,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(29,2,7,650,'POINT',2000,1,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(30,2,8,900,'COUPON',10000,0,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(31,2,9,1200,'POINT',20000,0,'2025-12-15 00:00:03','2025-12-15 00:00:03'),(32,2,10,1600,'POINT',50000,0,'2025-12-15 00:00:03','2025-12-15 00:00:03');
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
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_progress`
--

LOCK TABLES `season_pass_progress` WRITE;
/*!40000 ALTER TABLE `season_pass_progress` DISABLE KEYS */;
INSERT INTO `season_pass_progress` VALUES (1,6,1,6,450,1,'2025-12-14','2025-12-14 22:40:45','2025-12-14 22:56:09'),(2,35,2,1,0,0,NULL,'2025-12-15 09:47:44','2025-12-15 09:47:44'),(3,14,2,1,45,0,NULL,'2025-12-15 10:26:22','2025-12-16 14:05:36'),(4,45,2,1,20,1,'2025-12-16','2025-12-15 13:05:42','2025-12-16 00:42:08'),(5,6,2,1,5,0,NULL,'2025-12-15 13:36:42','2025-12-16 00:25:07'),(6,15,2,1,5,0,NULL,'2025-12-15 15:20:49','2025-12-16 14:07:00'),(7,16,2,1,0,0,NULL,'2025-12-15 15:59:03','2025-12-15 15:59:03'),(9,50,2,1,25,0,NULL,'2025-12-15 16:17:36','2025-12-16 00:46:01'),(10,51,2,1,0,0,NULL,'2025-12-15 16:18:17','2025-12-15 16:18:17'),(11,52,2,2,60,0,NULL,'2025-12-15 16:18:50','2025-12-16 14:12:20'),(12,53,2,1,0,0,NULL,'2025-12-15 16:19:11','2025-12-15 16:19:11'),(13,54,2,1,0,0,NULL,'2025-12-15 16:19:31','2025-12-15 16:19:31'),(14,55,2,1,0,0,NULL,'2025-12-15 16:19:50','2025-12-15 16:19:50'),(15,18,2,1,40,1,'2025-12-16','2025-12-15 18:08:05','2025-12-16 00:41:55'),(16,48,2,3,170,1,'2025-12-16','2025-12-15 19:49:59','2025-12-16 12:36:57'),(17,56,2,1,0,0,NULL,'2025-12-15 22:37:08','2025-12-15 22:37:08'),(18,7,2,1,30,0,NULL,'2025-12-15 22:41:11','2025-12-15 22:56:12'),(19,8,2,1,5,0,NULL,'2025-12-15 23:03:51','2025-12-15 23:07:48'),(20,9,2,4,190,1,'2025-12-16','2025-12-15 23:48:29','2025-12-16 14:05:40'),(21,57,2,1,0,0,NULL,'2025-12-16 00:06:15','2025-12-16 00:06:15'),(22,58,2,4,255,1,'2025-12-16','2025-12-16 00:08:48','2025-12-16 14:30:19'),(23,59,2,1,0,0,NULL,'2025-12-16 00:09:01','2025-12-16 00:09:01'),(24,60,2,1,0,0,NULL,'2025-12-16 00:09:09','2025-12-16 00:09:09'),(25,61,2,1,0,0,NULL,'2025-12-16 00:09:16','2025-12-16 00:09:16'),(26,62,2,1,0,0,NULL,'2025-12-16 00:09:37','2025-12-16 00:09:37'),(27,63,2,3,120,1,'2025-12-16','2025-12-16 00:09:46','2025-12-16 12:05:58'),(28,64,2,2,80,1,'2025-12-16','2025-12-16 00:09:53','2025-12-16 12:05:48'),(29,43,2,1,5,0,NULL,'2025-12-16 00:23:49','2025-12-16 00:24:47'),(30,39,2,2,60,1,'2025-12-16','2025-12-16 00:42:21','2025-12-16 00:42:21'),(31,23,2,1,40,1,'2025-12-16','2025-12-16 00:42:31','2025-12-16 00:42:31'),(32,44,2,3,105,1,'2025-12-16','2025-12-16 00:43:32','2025-12-16 01:34:01'),(33,10,2,5,335,1,'2025-12-16','2025-12-16 00:44:45','2025-12-16 14:30:13'),(34,22,2,2,85,1,'2025-12-16','2025-12-16 07:13:08','2025-12-16 11:59:43'),(35,29,2,3,115,1,'2025-12-16','2025-12-16 10:36:41','2025-12-16 12:40:36'),(36,11,2,4,225,1,'2025-12-16','2025-12-16 11:21:47','2025-12-16 14:32:15'),(37,33,2,1,20,0,NULL,'2025-12-16 12:02:41','2025-12-16 12:02:43'),(38,65,2,1,0,0,NULL,'2025-12-16 13:31:06','2025-12-16 13:31:06'),(39,26,2,1,25,0,NULL,'2025-12-16 13:39:00','2025-12-16 13:41:01'),(40,25,2,2,75,0,NULL,'2025-12-16 13:40:50','2025-12-16 13:46:14'),(41,66,2,1,0,0,NULL,'2025-12-16 13:43:13','2025-12-16 13:43:13'),(42,67,2,2,60,0,NULL,'2025-12-16 13:49:31','2025-12-16 13:55:57'),(43,68,2,1,30,0,NULL,'2025-12-16 13:54:14','2025-12-16 14:34:30'),(44,69,2,2,75,0,NULL,'2025-12-16 13:58:01','2025-12-16 14:02:31'),(47,12,2,4,220,1,'2025-12-16','2025-12-16 14:06:09','2025-12-16 14:30:24'),(48,70,2,1,10,0,NULL,'2025-12-16 14:11:14','2025-12-16 14:17:32'),(49,71,2,1,0,0,NULL,'2025-12-16 14:14:16','2025-12-16 14:14:16'),(50,72,2,1,0,0,NULL,'2025-12-16 14:26:37','2025-12-16 14:26:37'),(51,73,2,1,0,0,NULL,'2025-12-16 14:29:47','2025-12-16 14:29:47'),(52,74,2,1,0,0,NULL,'2025-12-16 14:34:23','2025-12-16 14:34:23'),(53,75,2,1,0,0,NULL,'2025-12-16 14:36:46','2025-12-16 14:36:46'),(54,76,2,1,0,0,NULL,'2025-12-16 14:39:16','2025-12-16 14:39:16'),(55,77,2,1,0,0,NULL,'2025-12-16 14:47:07','2025-12-16 14:47:07');
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
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_reward_log`
--

LOCK TABLES `season_pass_reward_log` WRITE;
/*!40000 ALTER TABLE `season_pass_reward_log` DISABLE KEYS */;
INSERT INTO `season_pass_reward_log` VALUES (1,6,1,1,2,'TICKET_DICE',1,'2025-12-14 13:51:55','2025-12-14 22:51:55'),(2,6,1,1,3,'TICKET_ROULETTE',1,'2025-12-14 13:51:55','2025-12-14 22:51:55'),(3,6,1,1,4,'TICKET_LOTTERY',1,'2025-12-14 13:51:55','2025-12-14 22:51:55'),(4,6,1,1,5,'CC_COIN',1,'2025-12-14 13:55:21','2025-12-14 22:55:20'),(5,6,1,1,6,'TICKET_DICE',2,'2025-12-14 13:56:10','2025-12-14 22:56:09'),(6,7,2,18,1,'TICKET_ROULETTE',1,'2025-12-15 13:56:04','2025-12-15 22:56:04'),(7,9,2,20,1,'TICKET_ROULETTE',1,'2025-12-15 14:53:21','2025-12-15 23:53:20'),(8,9,2,20,2,'TICKET_DICE',1,'2025-12-15 15:00:05','2025-12-16 00:00:05'),(9,18,2,15,1,'TICKET_ROULETTE',1,'2025-12-15 15:41:55','2025-12-16 00:41:55'),(10,45,2,4,1,'TICKET_ROULETTE',1,'2025-12-15 15:42:09','2025-12-16 00:42:08'),(11,39,2,30,1,'TICKET_ROULETTE',1,'2025-12-15 15:42:22','2025-12-16 00:42:21'),(12,39,2,30,2,'TICKET_DICE',1,'2025-12-15 15:42:22','2025-12-16 00:42:21'),(13,23,2,31,1,'TICKET_ROULETTE',1,'2025-12-15 15:42:31','2025-12-16 00:42:31'),(14,44,2,32,1,'TICKET_ROULETTE',1,'2025-12-15 15:43:33','2025-12-16 00:43:32'),(15,44,2,32,2,'TICKET_DICE',1,'2025-12-15 15:43:33','2025-12-16 00:43:32'),(17,10,2,33,1,'TICKET_ROULETTE',1,'2025-12-15 15:44:46','2025-12-16 00:44:45'),(18,10,2,33,2,'TICKET_DICE',1,'2025-12-15 15:44:46','2025-12-16 00:44:45'),(19,10,2,33,3,'TICKET_ROULETTE',1,'2025-12-15 15:44:46','2025-12-16 00:44:45'),(20,50,2,9,1,'TICKET_ROULETTE',1,'2025-12-15 15:45:38','2025-12-16 00:45:37'),(21,58,2,22,1,'TICKET_ROULETTE',1,'2025-12-15 15:47:50','2025-12-16 00:47:50'),(22,58,2,22,2,'TICKET_DICE',1,'2025-12-15 15:47:50','2025-12-16 00:47:50'),(23,58,2,22,3,'TICKET_ROULETTE',1,'2025-12-15 15:47:50','2025-12-16 00:47:50'),(24,44,2,32,3,'TICKET_ROULETTE',1,'2025-12-15 16:33:44','2025-12-16 01:33:44'),(25,29,2,35,1,'TICKET_ROULETTE',1,'2025-12-16 01:36:41','2025-12-16 10:36:41'),(26,29,2,35,2,'TICKET_DICE',1,'2025-12-16 01:36:41','2025-12-16 10:36:41'),(27,48,2,16,1,'TICKET_ROULETTE',1,'2025-12-16 01:37:44','2025-12-16 10:37:44'),(28,22,2,34,1,'TICKET_ROULETTE',1,'2025-12-16 01:37:45','2025-12-16 10:37:44'),(29,48,2,16,2,'TICKET_DICE',1,'2025-12-16 01:37:45','2025-12-16 10:37:44'),(30,22,2,34,2,'TICKET_DICE',1,'2025-12-16 01:37:45','2025-12-16 10:37:44'),(32,64,2,28,1,'TICKET_ROULETTE',1,'2025-12-16 02:17:30','2025-12-16 11:17:29'),(33,63,2,27,1,'TICKET_ROULETTE',1,'2025-12-16 02:17:52','2025-12-16 11:17:52'),(34,63,2,27,2,'TICKET_DICE',1,'2025-12-16 02:17:52','2025-12-16 11:17:52'),(35,29,2,35,3,'TICKET_ROULETTE',1,'2025-12-16 02:18:38','2025-12-16 11:18:38'),(36,11,2,36,1,'TICKET_ROULETTE',1,'2025-12-16 02:21:48','2025-12-16 11:21:47'),(37,11,2,36,2,'TICKET_DICE',1,'2025-12-16 02:21:48','2025-12-16 11:21:47'),(38,9,2,20,3,'TICKET_ROULETTE',1,'2025-12-16 02:22:12','2025-12-16 11:22:11'),(39,11,2,36,3,'TICKET_ROULETTE',1,'2025-12-16 02:22:19','2025-12-16 11:22:19'),(41,48,2,16,3,'TICKET_ROULETTE',1,'2025-12-16 02:59:33','2025-12-16 11:59:32'),(42,33,2,37,1,'TICKET_ROULETTE',1,'2025-12-16 03:02:44','2025-12-16 12:02:43'),(43,64,2,28,2,'TICKET_DICE',1,'2025-12-16 03:05:49','2025-12-16 12:05:48'),(44,63,2,27,3,'TICKET_ROULETTE',1,'2025-12-16 03:05:59','2025-12-16 12:05:58'),(45,10,2,33,4,'TICKET_LOTTERY',1,'2025-12-16 03:06:17','2025-12-16 12:06:17'),(46,26,2,39,1,'TICKET_ROULETTE',1,'2025-12-16 04:40:17','2025-12-16 13:40:17'),(47,25,2,40,1,'TICKET_ROULETTE',1,'2025-12-16 04:41:14','2025-12-16 13:41:14'),(48,25,2,40,2,'TICKET_DICE',1,'2025-12-16 04:45:58','2025-12-16 13:45:58'),(49,67,2,42,1,'TICKET_ROULETTE',1,'2025-12-16 04:50:30','2025-12-16 13:50:30'),(50,67,2,42,2,'TICKET_DICE',1,'2025-12-16 04:55:49','2025-12-16 13:55:48'),(51,69,2,44,1,'TICKET_ROULETTE',1,'2025-12-16 04:58:39','2025-12-16 13:58:38'),(52,69,2,44,2,'TICKET_DICE',1,'2025-12-16 05:02:23','2025-12-16 14:02:22'),(53,14,2,3,1,'TICKET_ROULETTE',1,'2025-12-16 05:03:56','2025-12-16 14:03:55'),(54,11,2,36,4,'TICKET_LOTTERY',1,'2025-12-16 05:05:28','2025-12-16 14:05:28'),(55,9,2,20,4,'TICKET_LOTTERY',1,'2025-12-16 05:05:40','2025-12-16 14:05:40'),(56,12,2,47,1,'TICKET_ROULETTE',1,'2025-12-16 05:06:10','2025-12-16 14:06:09'),(57,12,2,47,2,'TICKET_DICE',1,'2025-12-16 05:06:10','2025-12-16 14:06:09'),(58,12,2,47,3,'TICKET_ROULETTE',1,'2025-12-16 05:06:10','2025-12-16 14:06:09'),(59,58,2,22,4,'TICKET_LOTTERY',1,'2025-12-16 05:11:36','2025-12-16 14:11:36'),(60,52,2,11,1,'TICKET_ROULETTE',1,'2025-12-16 05:12:21','2025-12-16 14:12:20'),(61,52,2,11,2,'TICKET_DICE',1,'2025-12-16 05:12:21','2025-12-16 14:12:20'),(62,10,2,33,5,'POINT',1000,'2025-12-16 05:30:14','2025-12-16 14:30:13'),(63,12,2,47,4,'TICKET_LOTTERY',1,'2025-12-16 05:30:24','2025-12-16 14:30:24'),(64,68,2,43,1,'TICKET_ROULETTE',1,'2025-12-16 05:34:31','2025-12-16 14:34:30');
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_stamp_log`
--

LOCK TABLES `season_pass_stamp_log` WRITE;
/*!40000 ALTER TABLE `season_pass_stamp_log` DISABLE KEYS */;
INSERT INTO `season_pass_stamp_log` VALUES (1,6,1,1,'2025-12-14','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-14 22:51:55'),(2,18,2,15,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:41:55'),(3,45,2,4,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:42:08'),(4,39,2,30,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:42:21'),(5,23,2,31,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:42:31'),(6,44,2,32,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:43:32'),(8,10,2,33,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:44:45'),(9,58,2,22,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 00:47:50'),(10,29,2,35,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 10:36:41'),(11,48,2,16,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 10:37:44'),(12,22,2,34,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 10:37:44'),(13,64,2,28,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 11:17:29'),(14,63,2,27,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 11:17:52'),(15,11,2,36,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 11:21:47'),(16,9,2,20,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 11:22:11'),(17,12,2,47,'2025-12-16','TOP10_W2025-51',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-16 14:06:09');
/*!40000 ALTER TABLE `season_pass_stamp_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `segment_rule`
--

DROP TABLE IF EXISTS `segment_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `segment_rule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `segment` varchar(50) NOT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `condition_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_segment_rule_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `segment_rule`
--

LOCK TABLES `segment_rule` WRITE;
/*!40000 ALTER TABLE `segment_rule` DISABLE KEYS */;
/*!40000 ALTER TABLE `segment_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey`
--

DROP TABLE IF EXISTS `survey`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('DRAFT','ACTIVE','PAUSED','ARCHIVED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `channel` enum('GLOBAL','SEASON_PASS','ROULETTE','DICE','LOTTERY','TEAM_BATTLE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GLOBAL',
  `target_segment_json` json DEFAULT NULL,
  `reward_json` json DEFAULT NULL,
  `auto_launch` tinyint(1) NOT NULL DEFAULT '0',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `survey_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey`
--

LOCK TABLES `survey` WRITE;
/*!40000 ALTER TABLE `survey` DISABLE KEYS */;
INSERT INTO `survey` VALUES (1,'2차 시즌 이벤트 간단 설문','답변해주시면 참여 가이드/맞춤 혜택 안내에 반영됩니다.','ACTIVE','GLOBAL','{}','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',0,NULL,NULL,NULL,'2025-12-15 13:35:38','2025-12-15 14:01:43');
/*!40000 ALTER TABLE `survey` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey_option`
--

DROP TABLE IF EXISTS `survey_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_option` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `value` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_index` int NOT NULL,
  `weight` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `survey_option_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `survey_question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_option`
--

LOCK TABLES `survey_option` WRITE;
/*!40000 ALTER TABLE `survey_option` DISABLE KEYS */;
INSERT INTO `survey_option` VALUES (19,7,'1','팀배틀(팀 점수 누적)',0,1,'2025-12-15 14:05:17','2025-12-15 14:05:17'),(20,7,'2','시즌패스(레벨 보상)',1,1,'2025-12-15 14:05:17','2025-12-15 14:05:17'),(21,7,'3','룰렛/주사위/복권(티켓형)',2,1,'2025-12-15 14:05:17','2025-12-15 14:05:17'),(22,7,'4','자동업데이트',3,1,'2025-12-15 14:05:17','2025-12-15 14:05:17');
/*!40000 ALTER TABLE `survey_option` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey_question`
--

DROP TABLE IF EXISTS `survey_question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `order_index` int NOT NULL,
  `randomize_group` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_type` enum('SINGLE_CHOICE','MULTI_CHOICE','LIKERT','TEXT','NUMBER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `helper_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `config_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_survey_question_order` (`survey_id`,`order_index`),
  CONSTRAINT `survey_question_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `survey` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_question`
--

LOCK TABLES `survey_question` WRITE;
/*!40000 ALTER TABLE `survey_question` DISABLE KEYS */;
INSERT INTO `survey_question` VALUES (7,1,2,NULL,'MULTI_CHOICE','이번에 관심 가는 건 뭐예요? (복수선택)','',1,'null','2025-12-15 14:05:17','2025-12-15 14:05:17');
/*!40000 ALTER TABLE `survey_question` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey_response`
--

DROP TABLE IF EXISTS `survey_response`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_response` (
  `id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `user_id` int NOT NULL,
  `trigger_rule_id` int DEFAULT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','DROPPED','EXPIRED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `dropped_at` datetime DEFAULT NULL,
  `reward_status` enum('NONE','SCHEDULED','GRANTED','FAILED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE',
  `reward_payload` json DEFAULT NULL,
  `last_question_id` int DEFAULT NULL,
  `last_activity_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trigger_rule_id` (`trigger_rule_id`),
  KEY `last_question_id` (`last_question_id`),
  KEY `idx_survey_response_user` (`user_id`,`status`),
  KEY `idx_survey_response_survey` (`survey_id`,`status`),
  CONSTRAINT `survey_response_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `survey` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_ibfk_3` FOREIGN KEY (`trigger_rule_id`) REFERENCES `survey_trigger_rule` (`id`) ON DELETE SET NULL,
  CONSTRAINT `survey_response_ibfk_4` FOREIGN KEY (`last_question_id`) REFERENCES `survey_question` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_response`
--

LOCK TABLES `survey_response` WRITE;
/*!40000 ALTER TABLE `survey_response` DISABLE KEYS */;
INSERT INTO `survey_response` VALUES (1,1,6,NULL,'COMPLETED','2025-12-15 15:23:59','2025-12-15 15:23:59',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',NULL,'2025-12-15 15:23:59','2025-12-15 13:36:34','2025-12-15 15:23:59'),(2,1,8,NULL,'COMPLETED','2025-12-15 14:04:39','2025-12-15 14:04:40',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',NULL,'2025-12-15 14:04:40','2025-12-15 14:04:31','2025-12-15 14:04:40'),(3,1,9,NULL,'COMPLETED','2025-12-15 14:53:34','2025-12-15 14:53:34',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-15 14:53:34','2025-12-15 14:48:55','2025-12-15 14:53:34'),(4,1,43,NULL,'COMPLETED','2025-12-15 15:24:26','2025-12-15 15:24:27',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-15 15:24:27','2025-12-15 15:24:10','2025-12-15 15:24:27'),(5,1,50,NULL,'COMPLETED','2025-12-15 15:45:30','2025-12-15 15:45:30',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-15 15:45:30','2025-12-15 15:45:28','2025-12-15 15:45:30'),(6,1,14,NULL,'COMPLETED','2025-12-15 16:03:58','2025-12-15 16:03:59',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-15 16:03:59','2025-12-15 16:03:47','2025-12-15 16:03:59'),(7,1,44,NULL,'COMPLETED','2025-12-15 16:33:18','2025-12-15 16:33:18',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-15 16:33:18','2025-12-15 16:33:09','2025-12-15 16:33:18'),(8,1,10,NULL,'COMPLETED','2025-12-16 02:28:48','2025-12-16 02:28:48',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-16 02:28:48','2025-12-16 02:28:46','2025-12-16 02:28:48'),(10,1,11,NULL,'COMPLETED','2025-12-16 02:55:10','2025-12-16 02:55:10',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-16 02:55:10','2025-12-16 02:55:08','2025-12-16 02:55:10'),(11,1,48,NULL,'PENDING',NULL,NULL,NULL,'NONE',NULL,NULL,'2025-12-16 03:36:24','2025-12-16 03:36:24','2025-12-16 03:36:24'),(12,1,29,NULL,'PENDING',NULL,NULL,NULL,'NONE',NULL,NULL,'2025-12-16 03:41:28','2025-12-16 03:41:28','2025-12-16 03:41:28'),(13,1,25,NULL,'COMPLETED','2025-12-16 04:45:40','2025-12-16 04:45:40',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-16 04:45:40','2025-12-16 04:45:33','2025-12-16 04:45:40'),(14,1,67,NULL,'PENDING',NULL,NULL,NULL,'NONE',NULL,NULL,'2025-12-16 04:55:41','2025-12-16 04:55:41','2025-12-16 04:55:41'),(15,1,15,NULL,'COMPLETED','2025-12-16 05:06:04','2025-12-16 05:06:04',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-16 05:06:04','2025-12-16 05:05:56','2025-12-16 05:06:04'),(16,1,16,NULL,'COMPLETED','2025-12-16 05:28:59','2025-12-16 05:28:59',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-16 05:28:59','2025-12-16 05:28:51','2025-12-16 05:28:59'),(17,1,76,NULL,'COMPLETED','2025-12-17 07:44:09','2025-12-17 07:44:09',NULL,'GRANTED','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}',7,'2025-12-17 07:44:09','2025-12-17 07:44:07','2025-12-17 07:44:09');
/*!40000 ALTER TABLE `survey_response` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey_response_answer`
--

DROP TABLE IF EXISTS `survey_response_answer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_response_answer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `response_id` int NOT NULL,
  `question_id` int NOT NULL,
  `option_id` int DEFAULT NULL,
  `answer_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `answer_number` int DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `answered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_response_question` (`response_id`,`question_id`),
  KEY `question_id` (`question_id`),
  KEY `option_id` (`option_id`),
  CONSTRAINT `survey_response_answer_ibfk_1` FOREIGN KEY (`response_id`) REFERENCES `survey_response` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_answer_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `survey_question` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_answer_ibfk_3` FOREIGN KEY (`option_id`) REFERENCES `survey_option` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_response_answer`
--

LOCK TABLES `survey_response_answer` WRITE;
/*!40000 ALTER TABLE `survey_response_answer` DISABLE KEYS */;
INSERT INTO `survey_response_answer` VALUES (2,3,7,20,NULL,NULL,'null','2025-12-15 14:53:34'),(3,4,7,22,NULL,NULL,'null','2025-12-15 15:24:26'),(4,5,7,19,NULL,NULL,'null','2025-12-15 15:45:30'),(5,6,7,20,NULL,NULL,'null','2025-12-15 16:03:58'),(6,7,7,19,NULL,NULL,'null','2025-12-15 16:33:18'),(7,8,7,19,NULL,NULL,'null','2025-12-16 02:28:48'),(8,10,7,20,NULL,NULL,'null','2025-12-16 02:55:10'),(9,13,7,21,NULL,NULL,'null','2025-12-16 04:45:40'),(10,15,7,21,NULL,NULL,'null','2025-12-16 05:06:04'),(11,16,7,19,NULL,NULL,'null','2025-12-16 05:28:59'),(12,17,7,21,NULL,NULL,'null','2025-12-17 07:44:09');
/*!40000 ALTER TABLE `survey_response_answer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey_trigger_rule`
--

DROP TABLE IF EXISTS `survey_trigger_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_trigger_rule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `trigger_type` enum('LEVEL_UP','INACTIVE_DAYS','GAME_RESULT','MANUAL_PUSH') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_config_json` json DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `cooldown_hours` int NOT NULL DEFAULT '24',
  `max_per_user` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `survey_id` (`survey_id`),
  KEY `idx_survey_trigger_active` (`is_active`,`priority`),
  CONSTRAINT `survey_trigger_rule_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `survey` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_trigger_rule`
--

LOCK TABLES `survey_trigger_rule` WRITE;
/*!40000 ALTER TABLE `survey_trigger_rule` DISABLE KEYS */;
/*!40000 ALTER TABLE `survey_trigger_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
INSERT INTO `team` VALUES (1,'군고구마',NULL,1,'2025-12-13 05:45:18','2025-12-16 02:50:37'),(2,'메리',NULL,1,'2025-12-13 05:45:18','2025-12-15 15:11:18'),(3,'산타',NULL,1,'2025-12-16 00:09:59','2025-12-15 15:10:35'),(4,'루돌',NULL,1,'2025-12-16 00:09:59','2025-12-15 15:10:53'),(5,'스초생',NULL,1,'2025-12-16 00:09:59','2025-12-15 15:11:06'),(6,'민초',NULL,0,'2025-12-16 05:23:01','2025-12-16 05:24:28');
/*!40000 ALTER TABLE `team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_event_log`
--

DROP TABLE IF EXISTS `team_event_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_event_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `season_id` int NOT NULL,
  `action` varchar(50) NOT NULL,
  `delta` int NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `team_id` (`team_id`),
  KEY `idx_tel_season_team` (`season_id`,`team_id`,`created_at`),
  KEY `idx_tel_user` (`user_id`),
  CONSTRAINT `team_event_log_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_event_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `team_event_log_ibfk_3` FOREIGN KEY (`season_id`) REFERENCES `team_season` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_event_log`
--

LOCK TABLES `team_event_log` WRITE;
/*!40000 ALTER TABLE `team_event_log` DISABLE KEYS */;
INSERT INTO `team_event_log` VALUES (1,1,9,6,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"TICKET_DICE\", \"feature_type\": \"LOTTERY\", \"reward_amount\": 2}','2025-12-15 14:53:04'),(2,1,9,6,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-15 14:53:21'),(3,1,9,6,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-15 14:53:23'),(4,1,9,6,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-15 14:53:28'),(5,1,9,6,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"LOTTERY\", \"reward_amount\": 5}','2025-12-15 15:00:05'),(6,1,9,6,'GAME_PLAY',10,'{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-15 15:00:13'),(7,1,9,6,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-15 15:00:16'),(8,1,9,6,'GAME_PLAY',10,'{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-15 15:02:20'),(9,1,9,6,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-15 15:02:23'),(10,1,9,6,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-15 15:02:29'),(11,1,9,6,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"TICKET_DICE\", \"feature_type\": \"LOTTERY\", \"reward_amount\": 2}','2025-12-15 15:02:37'),(12,5,43,6,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-15 15:24:48'),(13,4,6,6,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-15 15:25:08'),(14,6,50,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-15 15:45:38'),(15,6,50,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-15 15:46:01'),(16,2,58,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"TICKET_LOTTERY\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 1}','2025-12-15 15:56:12'),(17,2,58,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-15 15:56:20'),(18,2,58,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-15 15:56:27'),(19,4,44,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-15 16:33:40'),(20,4,44,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-15 16:33:44'),(21,4,44,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-15 16:34:01'),(22,2,58,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"LOTTERY\", \"reward_amount\": 5}','2025-12-16 02:23:41'),(23,2,10,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 02:28:05'),(24,2,10,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 02:28:10'),(25,2,10,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 02:28:17'),(26,5,NULL,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 02:29:59'),(27,5,22,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 02:52:38'),(28,5,22,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-16 02:52:52'),(29,5,NULL,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-16 02:53:03'),(30,5,NULL,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 02:53:48'),(31,1,11,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 02:54:19'),(32,1,11,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 02:54:23'),(33,1,11,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 02:54:28'),(34,1,11,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-16 02:57:54'),(35,4,48,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-16 03:36:57'),(36,3,29,7,'GAME_PLAY',10,'{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 03:40:04'),(37,3,29,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 03:40:27'),(38,3,29,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 03:40:36'),(39,4,26,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 5}','2025-12-16 04:41:01'),(40,3,14,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-16 05:03:56'),(41,3,14,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"TICKET_DICE\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 2}','2025-12-16 05:05:22'),(42,3,14,7,'GAME_PLAY',10,'{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 20}','2025-12-16 05:05:34'),(43,3,14,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 05:05:37'),(44,3,15,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 05:07:00'),(45,1,11,7,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"TICKET_DICE\", \"feature_type\": \"LOTTERY\", \"reward_amount\": 2}','2025-12-16 05:31:52'),(46,1,11,7,'GAME_PLAY',10,'{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 05:32:13'),(47,1,11,7,'GAME_PLAY',10,'{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"feature_type\": \"DICE\", \"reward_amount\": 5}','2025-12-16 05:32:15');
/*!40000 ALTER TABLE `team_event_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_member`
--

DROP TABLE IF EXISTS `team_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_member` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `role` varchar(10) NOT NULL DEFAULT 'member',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_team_member_team` (`team_id`),
  CONSTRAINT `team_member_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_member`
--

LOCK TABLES `team_member` WRITE;
/*!40000 ALTER TABLE `team_member` DISABLE KEYS */;
INSERT INTO `team_member` VALUES (6,6,'member','2025-12-16 05:23:39'),(7,6,'member','2025-12-16 05:23:09'),(9,2,'member','2025-12-16 02:50:08'),(10,2,'member','2025-12-15 15:20:45'),(11,1,'member','2025-12-16 02:31:01'),(12,1,'member','2025-12-16 02:50:44'),(14,3,'member','2025-12-15 16:03:26'),(15,3,'member','2025-12-16 05:06:33'),(16,3,'member','2025-12-16 05:29:26'),(22,5,'member','2025-12-15 22:13:11'),(25,5,'member','2025-12-16 04:47:38'),(26,4,'member','2025-12-16 04:40:32'),(29,3,'member','2025-12-16 03:39:39'),(43,5,'member','2025-12-15 15:23:57'),(44,4,'member','2025-12-15 16:33:00'),(48,4,'member','2025-12-16 03:35:34'),(49,5,'member','2025-12-16 02:49:23'),(50,6,'member','2025-12-16 05:24:13'),(51,1,'member','2025-12-15 15:28:38'),(53,2,'member','2025-12-16 02:58:36'),(55,2,'member','2025-12-15 15:19:53'),(58,2,'member','2025-12-15 15:18:42'),(63,1,'member','2025-12-16 02:32:23'),(64,1,'member','2025-12-15 15:18:20');
/*!40000 ALTER TABLE `team_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_score`
--

DROP TABLE IF EXISTS `team_score`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_score` (
  `team_id` int NOT NULL,
  `season_id` int NOT NULL,
  `points` bigint NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`team_id`,`season_id`),
  UNIQUE KEY `uq_team_score` (`team_id`,`season_id`),
  KEY `idx_team_score_points` (`season_id`,`points`),
  CONSTRAINT `team_score_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_score_ibfk_2` FOREIGN KEY (`season_id`) REFERENCES `team_season` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_score`
--

LOCK TABLES `team_score` WRITE;
/*!40000 ALTER TABLE `team_score` DISABLE KEYS */;
INSERT INTO `team_score` VALUES (1,6,110,'2025-12-15 15:02:37'),(1,7,70,'2025-12-16 05:32:15'),(2,7,70,'2025-12-16 02:50:44'),(3,7,80,'2025-12-16 05:24:13'),(4,6,10,'2025-12-15 15:25:08'),(4,7,50,'2025-12-16 05:23:39'),(5,6,10,'2025-12-15 15:24:48'),(5,7,50,'2025-12-16 02:53:48'),(6,7,20,'2025-12-16 05:24:13');
/*!40000 ALTER TABLE `team_score` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_season`
--

DROP TABLE IF EXISTS `team_season`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_season` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `rewards_schema` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_season_name` (`name`),
  KEY `idx_team_season_active` (`is_active`),
  KEY `idx_team_season_time` (`starts_at`,`ends_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_season`
--

LOCK TABLES `team_season` WRITE;
/*!40000 ALTER TABLE `team_season` DISABLE KEYS */;
INSERT INTO `team_season` VALUES (1,'12월 팀배틀','2025-12-13 05:00:00','2025-12-15 05:00:00',0,'null','2025-12-13 05:45:18','2025-12-13 06:15:50'),(2,'2차배틀','2025-12-15 03:00:00','2025-12-20 03:00:00',0,'null','2025-12-15 13:44:27','2025-12-15 13:44:27'),(5,'2차시즌','2025-12-15 05:00:00','2025-12-21 05:00:00',0,'null','2025-12-15 14:02:28','2025-12-15 14:02:28'),(6,'Team Battle Event 2025-12-15','2025-12-15 13:00:00','2025-12-15 18:00:00',0,'{\"top3_coupon\": 10000, \"rank1_coupon\": 30000, \"rank2_points\": 100}','2025-12-15 23:20:28','2025-12-15 15:23:57'),(7,'2차 팀배틀','2025-12-15 15:00:00','2025-12-20 03:00:00',1,NULL,'2025-12-16 00:37:07','2025-12-16 02:35:54');
/*!40000 ALTER TABLE `team_season` ENABLE KEYS */;
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
  `vault_balance` int NOT NULL DEFAULT '0',
  `cash_balance` int NOT NULL DEFAULT '0',
  `vault_fill_used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_id` (`external_id`),
  KEY `ix_user_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (6,'지지미니','지지미니','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-17 07:41:52','172.18.0.1','2025-12-11 05:20:48','2025-12-17 07:41:52',0,10000,10000,NULL),(7,'아모모모','아모모모모','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 13:57:08','42.115.217.226','2025-12-11 05:21:04','2025-12-16 02:33:01',30,0,0,NULL),(8,'cctest02','cctest02','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 14:03:51','42.115.217.226','2025-12-11 05:21:13','2025-12-15 14:03:51',0,0,0,NULL),(9,'발로해도','발로해도','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',4,'ACTIVE','2025-12-15 14:47:55','42.115.217.226','2025-12-11 06:54:19','2025-12-16 05:11:03',190,0,0,NULL),(10,'yeong12','영진사장님','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',5,'ACTIVE','2025-12-16 02:28:00','156.146.45.152','2025-12-11 06:57:10','2025-12-16 05:36:35',335,0,0,NULL),(11,'jkkk','jkkk','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',4,'ACTIVE','2025-12-16 02:54:15','156.146.45.152','2025-12-11 06:57:22','2025-12-16 05:22:23',215,0,0,NULL),(12,'yuhh89','은희조','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',4,'ACTIVE',NULL,NULL,'2025-12-11 06:57:41','2025-12-16 05:36:35',220,0,0,NULL),(14,'persipic','persipic','c41e636d057062948a0bbdbdbf09bd047beb977b255ed9cd6c780d497d2dd7ca',1,'ACTIVE','2025-12-15 06:50:25','106.101.200.10','2025-12-11 08:36:32','2025-12-15 06:50:25',1875,0,0,NULL),(15,'정재권','도베르만','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 05:05:44','118.235.88.120','2025-12-11 08:37:07','2025-12-16 05:05:44',440,0,0,NULL),(16,'나참동','나참동','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 06:59:03','118.235.6.68','2025-12-11 09:36:39','2025-12-15 06:59:03',940,0,0,NULL),(17,'지민잼민','지민잼민','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 10:47:43','175.199.172.204','2025-12-11 09:42:22','2025-12-12 05:56:05',20,0,0,NULL),(18,'아사카','아사카','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 09:08:05','106.101.73.234','2025-12-11 10:04:54','2025-12-15 09:08:05',900,0,0,NULL),(19,'레몬향','레몬향','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 10:07:54','2025-12-11 10:07:54',0,0,0,NULL),(20,'화랑','화랑','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 05:01:25','61.106.191.13','2025-12-11 10:10:08','2025-12-16 05:01:25',0,0,0,NULL),(21,'돈따묵쟈','돈따묵쟈','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 20:49:19','211.220.26.196','2025-12-11 10:12:02','2025-12-15 20:49:19',580,0,0,NULL),(22,'크리스토퍼','크리스토퍼','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-15 22:10:57','58.229.246.33','2025-12-11 10:15:30','2025-12-16 03:00:52',85,0,0,NULL),(23,'기프트','기프트','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 10:51:22','112.149.150.211','2025-12-11 10:48:43','2025-12-16 03:00:47',40,0,0,NULL),(24,'해조다요','해조다요','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:46:06','121.54.214.144','2025-12-11 10:49:55','2025-12-13 07:46:06',30,0,0,NULL),(25,'제마','제마','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-16 04:40:45','180.68.182.127','2025-12-11 11:14:28','2025-12-16 05:22:15',75,0,0,NULL),(26,'김민저이','김민저이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 04:38:51','211.36.152.16','2025-12-12 00:39:54','2025-12-16 04:38:51',0,0,0,NULL),(27,'케바케','케바케','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 14:19:28','172.18.0.6','2025-12-12 00:43:21','2025-12-12 14:19:28',0,0,0,NULL),(29,'정우성','정우성','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE','2025-12-16 03:39:18','14.45.28.51','2025-12-12 01:28:03','2025-12-16 03:39:18',100,0,0,NULL),(30,'초보베터','초보베터','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 02:20:40','39.7.28.90','2025-12-12 01:31:34','2025-12-12 08:59:35',45,0,0,NULL),(31,'자르반이큐','자르반이큐','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 02:26:16','2025-12-12 02:26:16',0,0,0,NULL),(32,'미소1031','미소1031','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 02:27:49','2025-12-12 02:28:14',0,0,0,NULL),(33,'자리','자리','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 03:02:28','112.163.208.48','2025-12-12 02:34:44','2025-12-16 03:02:28',0,0,0,NULL),(34,'진심펀치','진심펀치','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 03:12:46','106.101.74.103','2025-12-12 03:08:47','2025-12-12 03:12:46',0,0,0,NULL),(35,'승아지','승아지','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 02:18:43','117.111.17.77','2025-12-12 03:21:58','2025-12-16 02:18:43',0,0,0,NULL),(36,'으민12','으민12','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:30:15','182.221.82.81','2025-12-12 05:59:24','2025-12-13 07:30:15',0,0,0,NULL),(37,'ppoodd','ppoodd','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 07:48:02','172.18.0.6','2025-12-12 07:47:05','2025-12-12 07:48:02',0,0,0,NULL),(38,'짱맨','짱맨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 08:00:47','2025-12-14 03:25:05',420,0,0,NULL),(39,'성민이','성민이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-13 07:41:49','106.102.142.63','2025-12-12 08:06:06','2025-12-16 03:00:37',60,0,0,NULL),(40,'왕지형','왕지형','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 08:58:59','2025-12-12 08:58:59',0,0,0,NULL),(41,'요리','요리','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 11:37:52','223.39.194.37','2025-12-12 09:34:13','2025-12-13 11:37:52',0,0,0,NULL),(42,'민아가자','민아가자','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 10:47:43','172.18.0.6','2025-12-12 10:46:17','2025-12-12 10:47:43',0,0,0,NULL),(43,'일등당첨','일등당첨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 15:23:32','223.39.84.198','2025-12-12 10:54:58','2025-12-15 15:23:32',380,0,0,NULL),(44,'우주를줄게','우주를줄게','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE','2025-12-15 16:32:42','106.101.2.13','2025-12-12 11:33:56','2025-12-16 03:00:26',105,0,0,NULL),(45,'콩이랑','콩이랑','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 04:05:42','211.105.100.249','2025-12-12 14:14:07','2025-12-15 04:05:42',420,0,0,NULL),(46,'민보이','민보이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:41:48','118.235.84.59','2025-12-13 02:59:41','2025-12-14 03:25:19',200,0,0,NULL),(47,'걸리면다이','걸리면다이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 06:28:22','172.18.0.6','2025-12-13 06:06:28','2025-12-13 06:28:22',0,0,0,NULL),(48,'봄꽃잎','봄꽃잎','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE','2025-12-15 10:50:00','220.81.184.195','2025-12-13 06:08:17','2025-12-16 03:00:14',140,0,0,NULL),(50,'햄찌','햄찌','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 15:16:46','42.115.217.226','2025-12-15 07:17:37','2025-12-15 15:16:46',0,0,0,NULL),(51,'순살마니밥','순살마니밥','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:18:18','2025-12-15 07:18:18',0,0,0,NULL),(52,'dulex','dulex','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE',NULL,NULL,'2025-12-15 07:18:51','2025-12-16 05:34:31',60,0,0,NULL),(53,'산타할배8','산타할배8','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:19:12','2025-12-15 07:19:12',0,0,0,NULL),(54,'코인떡락','코인떡락','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:19:31','2025-12-15 07:19:31',0,0,0,NULL),(55,'나무늬82','나무늬82','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:19:50','2025-12-15 07:19:50',0,0,0,NULL),(56,'admin','admin','03e59d56734f443d81e9f244ef89dbc1e3f9a6951c96733be15d2a144f04d5d2',1,'ACTIVE','2025-12-17 07:48:38','172.18.0.1','2025-12-15 13:35:29','2025-12-17 07:48:38',0,0,0,NULL),(57,'tnqusfh123','tnqusfh123','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 15:01:49','118.235.95.42','2025-12-15 15:01:49','2025-12-15 15:06:19',0,0,0,NULL),(58,'배민천재','배민천재','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',4,'ACTIVE','2025-12-15 15:56:07','149.40.54.73','2025-12-15 15:08:49','2025-12-16 05:26:15',235,0,0,NULL),(59,'rrdong','rrdong','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 15:09:01','2025-12-15 15:09:01',0,0,0,NULL),(60,'eogogo7','eogogo7','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 15:09:10','2025-12-15 15:09:10',0,0,0,NULL),(61,'미래찡','미래찡','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 15:09:17','2025-12-15 15:09:17',0,0,0,NULL),(62,'펭수','펭수','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 15:09:37','2025-12-15 15:09:37',0,0,0,NULL),(63,'풍경화','풍경화','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',3,'ACTIVE',NULL,NULL,'2025-12-15 15:09:47','2025-12-16 03:11:42',120,0,0,NULL),(64,'이하늬바람','이하늬바람','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE',NULL,NULL,'2025-12-15 15:09:54','2025-12-16 03:14:37',80,0,0,NULL),(65,'센트럴씨','센트럴씨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-16 04:31:06','2025-12-16 04:31:06',0,0,0,NULL),(66,'만기짜응','만기짜응','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-16 04:43:14','2025-12-16 04:43:14',0,0,0,NULL),(67,'캐슬김신','캐슬김신','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-16 04:55:34','1.224.74.69','2025-12-16 04:49:31','2025-12-16 05:04:36',60,0,0,NULL),(68,'대박군','대박군','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 05:34:09','118.235.26.118','2025-12-16 04:54:14','2025-12-16 05:34:09',0,0,0,NULL),(69,'한쿡남자','한쿡남자','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',2,'ACTIVE','2025-12-16 04:58:37','211.36.139.143','2025-12-16 04:58:01','2025-12-16 05:04:33',75,0,0,NULL),(70,'다따보쟈','다따보쟈','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-16 05:17:14','58.228.176.143','2025-12-16 05:11:15','2025-12-16 05:17:14',0,0,0,NULL),(71,'룰렛왕','룰렛왕','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-16 05:14:16','2025-12-16 05:14:16',0,0,0,NULL),(72,'나도사람이다','나도사람이다','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-16 05:26:38','2025-12-16 05:26:38',0,0,0,NULL),(73,'오존스야','오존스야','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-16 05:29:48','2025-12-16 05:29:48',0,0,0,NULL),(74,'에버리치','에버리치','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-16 05:34:24','2025-12-16 05:34:52',0,0,0,NULL),(75,'유유유','유유유','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-17 07:48:53','172.18.0.1','2025-12-16 05:36:46','2025-12-17 07:51:31',0,10000,60,NULL),(76,'행쥬','행쥬','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-17 07:43:10','172.18.0.1','2025-12-16 05:39:16','2025-12-17 07:44:18',0,10000,20,NULL),(77,'접시','접시','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-17 07:14:40','172.18.0.1','2025-12-16 05:47:08','2025-12-17 07:15:16',0,10000,0,NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_activity`
--

DROP TABLE IF EXISTS `user_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_charge_at` datetime DEFAULT NULL,
  `roulette_plays` int NOT NULL DEFAULT '0',
  `dice_plays` int NOT NULL DEFAULT '0',
  `lottery_plays` int NOT NULL DEFAULT '0',
  `total_play_duration` int NOT NULL DEFAULT '0',
  `last_bonus_used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_play_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_activity_user` (`user_id`),
  KEY `ix_user_activity_user_id` (`user_id`),
  KEY `ix_user_activity_id` (`id`),
  KEY `ix_user_activity_user_updated_at` (`user_id`,`updated_at`),
  CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activity`
--

LOCK TABLES `user_activity` WRITE;
/*!40000 ALTER TABLE `user_activity` DISABLE KEYS */;
INSERT INTO `user_activity` VALUES (1,6,NULL,'2025-12-17 06:55:50',0,0,0,0,NULL,'2025-12-17 06:39:15','2025-12-17 06:55:50',NULL),(2,76,NULL,NULL,0,1,0,0,NULL,'2025-12-17 07:44:18','2025-12-17 07:44:18','2025-12-17 07:44:18'),(3,75,NULL,NULL,0,6,0,0,NULL,'2025-12-17 07:49:01','2025-12-17 07:50:13','2025-12-17 07:50:13');
/*!40000 ALTER TABLE `user_activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_activity_event`
--

DROP TABLE IF EXISTS `user_activity_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_activity_event` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` varchar(36) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_activity_event_event_id` (`event_id`),
  KEY `ix_user_activity_event_id` (`id`),
  KEY `ix_user_activity_event_user_id` (`user_id`),
  KEY `ix_user_activity_event_user_created` (`user_id`,`created_at`),
  CONSTRAINT `user_activity_event_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activity_event`
--

LOCK TABLES `user_activity_event` WRITE;
/*!40000 ALTER TABLE `user_activity_event` DISABLE KEYS */;
INSERT INTO `user_activity_event` VALUES (1,76,'3c315331-6f8e-4cc2-a57e-e7e69e7eb6ad','DICE_PLAY','2025-12-17 07:44:18'),(2,75,'87451051-9077-4c2d-a0d7-db4d0d5791c4','DICE_PLAY','2025-12-17 07:49:01'),(3,75,'12d0a7a3-fb8f-4676-8baf-6587a3d57377','DICE_PLAY','2025-12-17 07:49:04'),(4,75,'4e0167ad-41c4-43cf-868d-2d204291892a','DICE_PLAY','2025-12-17 07:49:44'),(5,75,'61e52410-c154-44da-b483-b94721652509','DICE_PLAY','2025-12-17 07:49:46'),(6,75,'197553c9-e4e2-44e4-a8ea-50e80a6259b6','DICE_PLAY','2025-12-17 07:50:09'),(7,75,'459d87e4-9f18-4245-9e03-34a77af6acfc','DICE_PLAY','2025-12-17 07:50:13');
/*!40000 ALTER TABLE `user_activity_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_cash_ledger`
--

DROP TABLE IF EXISTS `user_cash_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_cash_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `delta` int NOT NULL,
  `balance_after` int NOT NULL,
  `reason` varchar(100) DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_user_cash_ledger_id` (`id`),
  KEY `ix_user_cash_ledger_user_id` (`user_id`),
  KEY `ix_user_cash_ledger_user_created_at` (`user_id`,`created_at`),
  CONSTRAINT `user_cash_ledger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_cash_ledger`
--

LOCK TABLES `user_cash_ledger` WRITE;
/*!40000 ALTER TABLE `user_cash_ledger` DISABLE KEYS */;
INSERT INTO `user_cash_ledger` VALUES (2,6,10000,10000,'VAULT_UNLOCK','VAULT_UNLOCK','{\"trigger\": \"EXTERNAL_RANKING_DEPOSIT_INCREASE\", \"external_ranking_deposit_new\": 1, \"external_ranking_deposit_prev\": 0}','2025-12-17 06:55:50'),(3,76,20,20,'dice_play',NULL,'{}','2025-12-17 07:44:18'),(4,75,5,5,'dice_play',NULL,'{}','2025-12-17 07:49:01'),(5,75,5,10,'dice_play',NULL,'{}','2025-12-17 07:49:04'),(6,75,5,15,'dice_play',NULL,'{}','2025-12-17 07:49:44'),(7,75,5,20,'dice_play',NULL,'{}','2025-12-17 07:49:46'),(8,75,20,40,'dice_play',NULL,'{}','2025-12-17 07:50:09'),(9,75,20,60,'dice_play',NULL,'{}','2025-12-17 07:50:12');
/*!40000 ALTER TABLE `user_cash_ledger` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_event_log`
--

LOCK TABLES `user_event_log` WRITE;
/*!40000 ALTER TABLE `user_event_log` DISABLE KEYS */;
INSERT INTO `user_event_log` VALUES (1,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"test002\"}','2025-12-14 13:50:46'),(2,6,'ROULETTE','PLAY','{\"label\": \"컴포즈아아\", \"segment_id\": 35, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:53:31'),(3,6,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:53:37'),(4,6,'LOTTERY','PLAY','{\"label\": \"룰렛티켓1장\", \"prize_id\": 85, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:53:42'),(5,6,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 36, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:09'),(6,6,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장 \", \"segment_id\": 39, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:09'),(7,6,'ROULETTE','PLAY','{\"label\": \"ì£¼ì‚¬ìœ„í‹°ì¼“\", \"segment_id\": 34, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:10'),(8,6,'ROULETTE','PLAY','{\"label\": \"ì£¼ì‚¬ìœ„í‹°ì¼“\", \"segment_id\": 34, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:10'),(9,6,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장 \", \"segment_id\": 39, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:10'),(10,35,'AUTH','AUTH_LOGIN','{\"ip\": \"117.111.17.240\", \"external_id\": \"승아지\"}','2025-12-15 00:47:43'),(11,45,'AUTH','AUTH_LOGIN','{\"ip\": \"211.105.100.249\", \"external_id\": \"콩이랑\"}','2025-12-15 04:05:42'),(12,6,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.212\", \"external_id\": \"test002\"}','2025-12-15 04:36:42'),(13,15,'AUTH','AUTH_LOGIN','{\"ip\": \"121.179.101.43\", \"external_id\": \"정재권\"}','2025-12-15 06:20:49'),(14,6,'AUTH','AUTH_LOGIN','{\"ip\": \"149.40.54.75\", \"external_id\": \"test002\"}','2025-12-15 06:40:14'),(15,14,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.200.10\", \"external_id\": \"persipic\"}','2025-12-15 06:50:25'),(16,16,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.6.68\", \"external_id\": \"나참동\"}','2025-12-15 06:59:03'),(17,18,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.73.234\", \"external_id\": \"아사카\"}','2025-12-15 09:08:05'),(18,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 09:12:25'),(19,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 09:41:18'),(20,48,'AUTH','AUTH_LOGIN','{\"ip\": \"220.81.184.195\", \"external_id\": \"봄꽃잎\"}','2025-12-15 10:50:00'),(21,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 13:21:32'),(22,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 13:35:29'),(23,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 13:35:45'),(24,7,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"cctest01\"}','2025-12-15 13:41:11'),(25,7,'LOTTERY','PLAY','{\"label\": \"CC코인1개\", \"prize_id\": 95, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 13:41:18'),(26,7,'LOTTERY','PLAY','{\"label\": \"지민19영상\", \"prize_id\": 100, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 13:41:33'),(27,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 13:41:51'),(28,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 13:46:50'),(29,7,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"cctest01\"}','2025-12-15 13:55:28'),(30,7,'LOTTERY','PLAY','{\"label\": \"CC코인1개\", \"prize_id\": 101, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 13:55:48'),(31,7,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 13:56:04'),(32,7,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 13:56:07'),(33,7,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 13:56:12'),(34,7,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"cctest01\"}','2025-12-15 13:57:08'),(35,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 14:00:20'),(36,8,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"cctest02\"}','2025-12-15 14:03:51'),(37,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 14:04:51'),(38,8,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 14:07:48'),(39,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 14:22:28'),(40,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 14:33:23'),(41,6,'AUTH','AUTH_LOGIN','{\"ip\": \"138.199.62.13\", \"external_id\": \"지지미니\"}','2025-12-15 14:34:50'),(42,9,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"cctest03\"}','2025-12-15 14:47:55'),(43,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 14:52:23'),(44,9,'LOTTERY','PLAY','{\"label\": \"주사위티켓2장\", \"prize_id\": 105, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-15 14:53:04'),(45,9,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-15 14:53:21'),(46,9,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-15 14:53:23'),(47,9,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 14:53:28'),(48,9,'LOTTERY','PLAY','{\"label\": \"CC코인1개\", \"prize_id\": 101, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:00:05'),(49,9,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:00:13'),(50,9,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:00:16'),(51,57,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.95.42\", \"external_id\": \"tnqusfh123\"}','2025-12-15 15:01:49'),(52,9,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:02:20'),(53,9,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-15 15:02:23'),(54,9,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:02:29'),(55,9,'LOTTERY','PLAY','{\"label\": \"주사위티켓2장\", \"prize_id\": 105, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-15 15:02:37'),(57,50,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"햄찌\"}','2025-12-15 15:16:46'),(58,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 15:17:23'),(59,43,'AUTH','AUTH_LOGIN','{\"ip\": \"223.39.84.198\", \"external_id\": \"일등당첨\"}','2025-12-15 15:23:32'),(60,43,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:24:48'),(61,6,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:25:08'),(62,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 15:28:15'),(63,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 15:31:58'),(64,56,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"admin\"}','2025-12-15 15:34:36'),(65,50,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-15 15:45:38'),(66,50,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:46:01'),(67,58,'AUTH','AUTH_LOGIN','{\"ip\": \"149.40.54.73\", \"external_id\": \"배민천재\"}','2025-12-15 15:56:07'),(68,58,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 50, \"reward_type\": \"TICKET_LOTTERY\", \"reward_amount\": 1, \"xp_from_reward\": 5}','2025-12-15 15:56:12'),(69,58,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:56:20'),(70,58,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 15:56:27'),(71,44,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.2.13\", \"external_id\": \"우주를줄게\"}','2025-12-15 16:32:42'),(72,44,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-15 16:33:40'),(73,44,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-15 16:33:44'),(74,44,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-15 16:34:01'),(75,21,'AUTH','AUTH_LOGIN','{\"ip\": \"211.220.26.196\", \"external_id\": \"돈따묵쟈\"}','2025-12-15 20:49:19'),(76,22,'AUTH','AUTH_LOGIN','{\"ip\": \"58.229.246.33\", \"external_id\": \"크리스토퍼\"}','2025-12-15 22:10:57'),(77,35,'AUTH','AUTH_LOGIN','{\"ip\": \"117.111.17.77\", \"external_id\": \"승아지\"}','2025-12-16 02:18:43'),(78,58,'LOTTERY','PLAY','{\"label\": \"CC코인1개\", \"prize_id\": 101, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:23:41'),(79,10,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"yeong12\"}','2025-12-16 02:28:00'),(80,10,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:28:05'),(81,10,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:28:10'),(82,10,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:28:17'),(85,56,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"admin\"}','2025-12-16 02:30:40'),(86,22,'ROULETTE','PLAY','{\"label\": \"CC코인1개\", \"segment_id\": 51, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:52:38'),(87,22,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 02:52:52'),(90,11,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"jkkk\"}','2025-12-16 02:54:15'),(91,11,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:54:19'),(92,11,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:54:23'),(93,11,'ROULETTE','PLAY','{\"label\": \"CC코인1개\", \"segment_id\": 51, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 02:54:28'),(94,11,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 02:57:54'),(95,56,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"admin\"}','2025-12-16 02:58:20'),(96,33,'AUTH','AUTH_LOGIN','{\"ip\": \"112.163.208.48\", \"external_id\": \"자리\"}','2025-12-16 03:02:28'),(97,33,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 03:02:44'),(98,48,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 03:34:44'),(99,48,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 03:34:52'),(100,48,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 03:36:57'),(101,29,'AUTH','AUTH_LOGIN','{\"ip\": \"14.45.28.51\", \"external_id\": \"정우성\"}','2025-12-16 03:39:18'),(102,29,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 03:40:04'),(103,29,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 03:40:27'),(104,29,'ROULETTE','PLAY','{\"label\": \"CC코인1개\", \"segment_id\": 51, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 03:40:36'),(105,26,'AUTH','AUTH_LOGIN','{\"ip\": \"211.36.152.16\", \"external_id\": \"김민저이\"}','2025-12-16 04:38:51'),(106,26,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장\", \"segment_id\": 49, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-16 04:39:03'),(107,26,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:39:56'),(108,26,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:40:05'),(109,26,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:40:12'),(110,26,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:40:17'),(111,25,'AUTH','AUTH_LOGIN','{\"ip\": \"180.68.182.127\", \"external_id\": \"제마\"}','2025-12-16 04:40:45'),(112,25,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:40:52'),(113,26,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:41:01'),(114,25,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:41:11'),(115,25,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 04:41:14'),(116,25,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 50, \"reward_type\": \"TICKET_LOTTERY\", \"reward_amount\": 1, \"xp_from_reward\": 5}','2025-12-16 04:41:45'),(117,25,'LOTTERY','PLAY','{\"label\": \"다음기회에\", \"prize_id\": 106, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:42:34'),(118,25,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 04:45:58'),(119,25,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 04:46:15'),(120,67,'AUTH','AUTH_LOGIN','{\"ip\": \"1.224.74.69\", \"external_id\": \"캐슬김신\"}','2025-12-16 04:49:59'),(121,67,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 50, \"reward_type\": \"TICKET_LOTTERY\", \"reward_amount\": 1, \"xp_from_reward\": 5}','2025-12-16 04:50:15'),(122,67,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 04:50:30'),(123,67,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:50:35'),(124,67,'ROULETTE','PLAY','{\"label\": \"룰렛티켓1장\", \"segment_id\": 48, \"reward_type\": \"TICKET_ROULETTE\", \"reward_amount\": 1, \"xp_from_reward\": 5}','2025-12-16 04:50:47'),(125,67,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:50:52'),(126,67,'LOTTERY','PLAY','{\"label\": \"주사위티켓2장\", \"prize_id\": 105, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-16 04:51:19'),(127,67,'AUTH','AUTH_LOGIN','{\"ip\": \"1.224.74.69\", \"external_id\": \"캐슬김신\"}','2025-12-16 04:55:34'),(128,67,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 04:55:49'),(129,67,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:55:55'),(130,67,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 04:55:58'),(131,69,'AUTH','AUTH_LOGIN','{\"ip\": \"211.36.139.143\", \"external_id\": \"한쿡남자\"}','2025-12-16 04:58:37'),(132,20,'AUTH','AUTH_LOGIN','{\"ip\": \"61.106.191.13\", \"external_id\": \"화랑\"}','2025-12-16 05:01:25'),(133,69,'ROULETTE','PLAY','{\"label\": \"복권티켓1장\", \"segment_id\": 50, \"reward_type\": \"TICKET_LOTTERY\", \"reward_amount\": 1, \"xp_from_reward\": 5}','2025-12-16 05:01:26'),(134,69,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:01:32'),(135,69,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 05:02:23'),(136,69,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:02:27'),(137,69,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:02:31'),(138,69,'LOTTERY','PLAY','{\"label\": \"주사위티켓2장\", \"prize_id\": 105, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-16 05:02:40'),(139,14,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 05:03:56'),(140,14,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장\", \"segment_id\": 49, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-16 05:05:22'),(141,14,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 05:05:34'),(142,14,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:05:37'),(143,15,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.88.120\", \"external_id\": \"정재권\"}','2025-12-16 05:05:44'),(144,15,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:07:00'),(145,70,'AUTH','AUTH_LOGIN','{\"ip\": \"58.228.176.143\", \"external_id\": \"다따보쟈\"}','2025-12-16 05:17:14'),(146,70,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:17:28'),(147,70,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:17:33'),(148,11,'LOTTERY','PLAY','{\"label\": \"주사위티켓2장\", \"prize_id\": 105, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 2, \"xp_from_reward\": 5}','2025-12-16 05:31:52'),(149,11,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:32:13'),(150,11,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:32:15'),(151,68,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.26.118\", \"external_id\": \"대박군\"}','2025-12-16 05:34:09'),(152,68,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 47, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:34:17'),(153,68,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-16 05:34:27'),(154,68,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-16 05:34:31'),(155,56,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"admin\"}','2025-12-16 05:48:57'),(156,56,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"admin\"}','2025-12-16 05:48:57'),(157,6,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.152\", \"external_id\": \"지지미니\"}','2025-12-16 05:58:19'),(158,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"지지미니\"}','2025-12-17 07:12:29'),(159,56,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"admin\"}','2025-12-17 07:13:00'),(160,77,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"접시\"}','2025-12-17 07:14:40'),(161,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"지지미니\"}','2025-12-17 07:25:02'),(162,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"지지미니\"}','2025-12-17 07:41:52'),(163,56,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"admin\"}','2025-12-17 07:42:40'),(164,76,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"행쥬\"}','2025-12-17 07:43:10'),(165,76,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-17 07:44:18'),(167,56,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"admin\"}','2025-12-17 07:48:38'),(168,75,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"유유유\"}','2025-12-17 07:48:53'),(169,75,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-17 07:49:01'),(170,75,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-17 07:49:04'),(171,75,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-17 07:49:44'),(172,75,'DICE','PLAY','{\"result\": \"DRAW\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - DRAW\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-17 07:49:46'),(173,75,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-17 07:50:09'),(174,75,'DICE','PLAY','{\"result\": \"WIN\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - WIN\", \"reward_amount\": 20, \"xp_from_reward\": 20}','2025-12-17 07:50:12');
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
  `token_type` enum('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN') NOT NULL,
  `balance` int NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_token_type` (`user_id`,`token_type`),
  KEY `ix_user_game_wallet_user_id` (`user_id`),
  KEY `ix_user_game_wallet_id` (`id`),
  CONSTRAINT `user_game_wallet_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet`
--

LOCK TABLES `user_game_wallet` WRITE;
/*!40000 ALTER TABLE `user_game_wallet` DISABLE KEYS */;
INSERT INTO `user_game_wallet` VALUES (1,6,'DICE_TOKEN',0,'2025-12-15 15:25:08'),(2,6,'LOTTERY_TICKET',0,'2025-12-14 13:53:42'),(3,6,'ROULETTE_COIN',0,'2025-12-14 13:56:10'),(4,6,'CC_COIN',0,'2025-12-14 13:55:21'),(5,35,'LOTTERY_TICKET',0,'2025-12-15 00:47:44'),(6,35,'ROULETTE_COIN',0,'2025-12-15 00:47:44'),(7,35,'DICE_TOKEN',0,'2025-12-15 00:47:45'),(8,14,'ROULETTE_COIN',0,'2025-12-16 05:05:22'),(9,14,'DICE_TOKEN',0,'2025-12-16 05:05:37'),(10,14,'LOTTERY_TICKET',0,'2025-12-15 01:26:22'),(11,45,'DICE_TOKEN',0,'2025-12-15 04:05:42'),(12,45,'LOTTERY_TICKET',0,'2025-12-15 04:05:42'),(13,45,'ROULETTE_COIN',1,'2025-12-15 15:42:09'),(14,15,'ROULETTE_COIN',0,'2025-12-15 06:20:49'),(15,15,'DICE_TOKEN',0,'2025-12-16 05:07:00'),(16,15,'LOTTERY_TICKET',0,'2025-12-15 06:20:49'),(17,16,'DICE_TOKEN',1,'2025-12-16 05:28:59'),(18,16,'LOTTERY_TICKET',0,'2025-12-15 06:59:04'),(19,16,'ROULETTE_COIN',0,'2025-12-15 06:59:04'),(20,18,'ROULETTE_COIN',1,'2025-12-15 15:41:55'),(21,18,'DICE_TOKEN',0,'2025-12-15 09:08:06'),(22,18,'LOTTERY_TICKET',0,'2025-12-15 09:08:06'),(23,48,'ROULETTE_COIN',0,'2025-12-16 03:34:52'),(24,48,'DICE_TOKEN',0,'2025-12-16 03:36:57'),(25,48,'LOTTERY_TICKET',0,'2025-12-15 10:50:00'),(26,7,'ROULETTE_COIN',10,'2025-12-15 13:56:12'),(27,7,'DICE_TOKEN',8,'2025-12-15 13:56:07'),(28,7,'LOTTERY_TICKET',7,'2025-12-15 13:55:48'),(29,8,'ROULETTE_COIN',0,'2025-12-15 14:03:51'),(30,8,'DICE_TOKEN',0,'2025-12-15 14:07:48'),(31,8,'LOTTERY_TICKET',0,'2025-12-15 14:03:51'),(32,9,'ROULETTE_COIN',10,'2025-12-16 02:22:12'),(33,9,'DICE_TOKEN',10,'2025-12-15 15:02:37'),(34,9,'LOTTERY_TICKET',8,'2025-12-16 05:05:40'),(35,57,'ROULETTE_COIN',0,'2025-12-15 15:01:49'),(36,57,'LOTTERY_TICKET',0,'2025-12-15 15:01:50'),(37,57,'DICE_TOKEN',0,'2025-12-15 15:01:50'),(41,50,'LOTTERY_TICKET',0,'2025-12-15 15:16:46'),(42,50,'DICE_TOKEN',0,'2025-12-15 15:45:38'),(43,50,'ROULETTE_COIN',0,'2025-12-15 15:46:01'),(44,43,'ROULETTE_COIN',0,'2025-12-15 15:23:33'),(45,43,'DICE_TOKEN',0,'2025-12-15 15:24:48'),(46,43,'LOTTERY_TICKET',0,'2025-12-15 15:23:33'),(47,39,'ROULETTE_COIN',1,'2025-12-15 15:42:22'),(48,39,'DICE_TOKEN',1,'2025-12-15 15:42:22'),(49,23,'ROULETTE_COIN',1,'2025-12-15 15:42:31'),(50,44,'ROULETTE_COIN',1,'2025-12-15 16:34:01'),(51,44,'DICE_TOKEN',0,'2025-12-15 16:33:44'),(52,10,'ROULETTE_COIN',0,'2025-12-16 02:28:10'),(53,10,'DICE_TOKEN',1,'2025-12-16 02:28:48'),(54,58,'ROULETTE_COIN',0,'2025-12-15 15:56:20'),(55,58,'DICE_TOKEN',0,'2025-12-15 15:56:27'),(56,58,'LOTTERY_TICKET',1,'2025-12-16 05:11:36'),(57,44,'LOTTERY_TICKET',0,'2025-12-15 16:32:42'),(58,21,'ROULETTE_COIN',0,'2025-12-15 20:49:19'),(59,21,'LOTTERY_TICKET',0,'2025-12-15 20:49:19'),(60,21,'DICE_TOKEN',0,'2025-12-15 20:49:19'),(61,22,'ROULETTE_COIN',0,'2025-12-16 02:52:38'),(62,22,'LOTTERY_TICKET',0,'2025-12-15 22:10:57'),(63,22,'DICE_TOKEN',0,'2025-12-16 02:52:52'),(64,29,'ROULETTE_COIN',0,'2025-12-16 03:40:36'),(65,29,'DICE_TOKEN',0,'2025-12-16 03:40:04'),(66,64,'ROULETTE_COIN',1,'2025-12-16 02:17:30'),(67,63,'ROULETTE_COIN',2,'2025-12-16 03:05:59'),(68,63,'DICE_TOKEN',1,'2025-12-16 02:17:52'),(69,11,'ROULETTE_COIN',0,'2025-12-16 02:54:28'),(70,11,'DICE_TOKEN',0,'2025-12-16 05:32:15'),(71,10,'LOTTERY_TICKET',1,'2025-12-16 03:06:17'),(72,11,'LOTTERY_TICKET',0,'2025-12-16 05:31:52'),(73,33,'DICE_TOKEN',0,'2025-12-16 03:02:44'),(74,33,'ROULETTE_COIN',1,'2025-12-16 03:02:44'),(75,33,'LOTTERY_TICKET',0,'2025-12-16 03:02:28'),(76,64,'DICE_TOKEN',1,'2025-12-16 03:05:49'),(77,29,'LOTTERY_TICKET',0,'2025-12-16 03:39:19'),(78,65,'ROULETTE_COIN',1,'2025-12-16 04:31:17'),(79,65,'DICE_TOKEN',2,'2025-12-16 04:31:20'),(80,30,'ROULETTE_COIN',1,'2025-12-16 04:36:03'),(81,30,'DICE_TOKEN',2,'2025-12-16 04:36:39'),(82,26,'DICE_TOKEN',0,'2025-12-16 04:40:17'),(83,26,'ROULETTE_COIN',0,'2025-12-16 04:41:01'),(84,26,'LOTTERY_TICKET',0,'2025-12-16 04:38:52'),(85,25,'ROULETTE_COIN',0,'2025-12-16 04:41:45'),(86,25,'DICE_TOKEN',0,'2025-12-16 04:46:15'),(87,25,'LOTTERY_TICKET',0,'2025-12-16 04:42:34'),(88,41,'ROULETTE_COIN',1,'2025-12-16 04:46:28'),(89,41,'DICE_TOKEN',2,'2025-12-16 04:46:30'),(90,67,'ROULETTE_COIN',0,'2025-12-16 04:50:52'),(91,67,'DICE_TOKEN',0,'2025-12-16 04:55:58'),(92,67,'LOTTERY_TICKET',0,'2025-12-16 04:51:19'),(93,68,'ROULETTE_COIN',1,'2025-12-16 05:34:31'),(94,68,'DICE_TOKEN',0,'2025-12-16 05:34:31'),(95,69,'ROULETTE_COIN',0,'2025-12-16 05:01:32'),(96,69,'DICE_TOKEN',2,'2025-12-16 05:02:40'),(97,69,'LOTTERY_TICKET',0,'2025-12-16 05:02:40'),(98,20,'DICE_TOKEN',0,'2025-12-16 05:01:26'),(99,20,'ROULETTE_COIN',0,'2025-12-16 05:01:26'),(100,20,'LOTTERY_TICKET',0,'2025-12-16 05:01:26'),(101,12,'ROULETTE_COIN',2,'2025-12-16 05:06:10'),(102,12,'DICE_TOKEN',1,'2025-12-16 05:06:10'),(103,70,'DICE_TOKEN',0,'2025-12-16 05:17:33'),(104,52,'ROULETTE_COIN',1,'2025-12-16 05:12:21'),(105,52,'DICE_TOKEN',1,'2025-12-16 05:12:21'),(106,71,'DICE_TOKEN',2,'2025-12-16 05:14:32'),(107,70,'ROULETTE_COIN',0,'2025-12-16 05:17:14'),(108,70,'LOTTERY_TICKET',0,'2025-12-16 05:17:14'),(109,19,'ROULETTE_COIN',1,'2025-12-16 05:22:03'),(110,19,'DICE_TOKEN',2,'2025-12-16 05:22:06'),(111,72,'ROULETTE_COIN',1,'2025-12-16 05:26:57'),(112,72,'DICE_TOKEN',2,'2025-12-16 05:26:59'),(113,36,'DICE_TOKEN',2,'2025-12-16 05:27:45'),(114,73,'DICE_TOKEN',2,'2025-12-16 05:30:00'),(115,12,'LOTTERY_TICKET',1,'2025-12-16 05:30:24'),(116,68,'LOTTERY_TICKET',0,'2025-12-16 05:34:09'),(117,74,'ROULETTE_COIN',1,'2025-12-16 05:34:57'),(118,74,'DICE_TOKEN',2,'2025-12-16 05:35:00'),(119,74,'LOTTERY_TICKET',1,'2025-12-16 05:35:03'),(120,75,'DICE_TOKEN',3,'2025-12-17 07:50:12'),(121,77,'ROULETTE_COIN',1,'2025-12-16 05:47:19'),(122,77,'DICE_TOKEN',2,'2025-12-16 05:47:22'),(123,77,'LOTTERY_TICKET',0,'2025-12-17 07:14:45'),(124,76,'ROULETTE_COIN',0,'2025-12-17 07:43:33'),(125,76,'LOTTERY_TICKET',0,'2025-12-17 07:43:33'),(126,76,'DICE_TOKEN',0,'2025-12-17 07:44:18'),(130,75,'ROULETTE_COIN',0,'2025-12-17 07:48:53'),(131,75,'LOTTERY_TICKET',0,'2025-12-17 07:48:53');
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
  `token_type` enum('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN') NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=237 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet_ledger`
--

LOCK TABLES `user_game_wallet_ledger` WRITE;
/*!40000 ALTER TABLE `user_game_wallet_ledger` DISABLE KEYS */;
INSERT INTO `user_game_wallet_ledger` VALUES (1,6,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:51:55'),(2,6,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:51:55'),(3,6,'LOTTERY_TICKET',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:51:55'),(4,6,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','컴포즈아아','{\"segment_id\": 35}','2025-12-14 13:53:30'),(5,6,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-14 13:53:37'),(6,6,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','룰렛티켓1장','{\"prize_id\": 85}','2025-12-14 13:53:42'),(7,6,'CC_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 5, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:55:21'),(8,6,'ROULETTE_COIN',-1,4,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 36}','2025-12-14 13:56:09'),(9,6,'ROULETTE_COIN',-1,3,'ROULETTE_PLAY','주사위티켓2장 ','{\"segment_id\": 39}','2025-12-14 13:56:09'),(10,6,'ROULETTE_COIN',-1,2,'ROULETTE_PLAY','ì£¼ì‚¬ìœ„í‹°ì¼“','{\"segment_id\": 34}','2025-12-14 13:56:10'),(11,6,'DICE_TOKEN',5,5,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 34}','2025-12-14 13:56:10'),(12,6,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','ì£¼ì‚¬ìœ„í‹°ì¼“','{\"segment_id\": 34}','2025-12-14 13:56:10'),(13,6,'DICE_TOKEN',5,10,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 34}','2025-12-14 13:56:10'),(14,6,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','주사위티켓2장 ','{\"segment_id\": 39}','2025-12-14 13:56:10'),(15,6,'DICE_TOKEN',2,12,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 6, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 5, \"season_id\": 1}','2025-12-14 13:56:10'),(16,7,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-15 13:40:38'),(17,7,'DICE_TOKEN',10,10,'GRANT',NULL,'{}','2025-12-15 13:40:39'),(18,7,'LOTTERY_TICKET',10,10,'GRANT',NULL,'{}','2025-12-15 13:40:41'),(19,7,'LOTTERY_TICKET',-1,9,'LOTTERY_PLAY','CC코인1개','{\"prize_id\": 95}','2025-12-15 13:41:18'),(20,7,'LOTTERY_TICKET',-1,8,'LOTTERY_PLAY','지민19영상','{\"prize_id\": 100}','2025-12-15 13:41:33'),(21,7,'LOTTERY_TICKET',-1,7,'LOTTERY_PLAY','CC코인1개','{\"prize_id\": 101}','2025-12-15 13:55:48'),(22,7,'DICE_TOKEN',-1,9,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 13:56:04'),(23,7,'ROULETTE_COIN',1,11,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 5, \"season_id\": 2}','2025-12-15 13:56:04'),(24,7,'DICE_TOKEN',-1,8,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 13:56:07'),(25,7,'ROULETTE_COIN',-1,10,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-15 13:56:12'),(26,8,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 14:04:40'),(27,8,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 14:07:48'),(28,9,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-15 14:52:55'),(29,9,'DICE_TOKEN',10,10,'GRANT',NULL,'{}','2025-12-15 14:52:56'),(30,9,'LOTTERY_TICKET',10,10,'GRANT',NULL,'{}','2025-12-15 14:52:58'),(31,9,'LOTTERY_TICKET',-1,9,'LOTTERY_PLAY','주사위티켓2장','{\"prize_id\": 105}','2025-12-15 14:53:04'),(32,9,'DICE_TOKEN',2,12,'lottery_play','AUTO_GRANT','{\"reason\": \"lottery_play\", \"game_xp\": 5, \"prize_id\": 105}','2025-12-15 14:53:04'),(33,9,'DICE_TOKEN',-1,11,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-15 14:53:21'),(34,9,'ROULETTE_COIN',1,11,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-15 14:53:21'),(35,9,'DICE_TOKEN',-1,10,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-15 14:53:23'),(36,9,'ROULETTE_COIN',-1,10,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-15 14:53:28'),(37,9,'DICE_TOKEN',1,11,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 14:53:34'),(38,9,'LOTTERY_TICKET',-1,8,'LOTTERY_PLAY','CC코인1개','{\"prize_id\": 101}','2025-12-15 15:00:05'),(39,9,'DICE_TOKEN',1,12,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 5, \"season_id\": 2}','2025-12-15 15:00:05'),(40,9,'DICE_TOKEN',-1,11,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-15 15:00:13'),(41,9,'DICE_TOKEN',-1,10,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 15:00:16'),(42,9,'DICE_TOKEN',-1,9,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-15 15:02:20'),(43,9,'DICE_TOKEN',-1,8,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-15 15:02:23'),(44,9,'ROULETTE_COIN',-1,9,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-15 15:02:29'),(45,9,'LOTTERY_TICKET',-1,7,'LOTTERY_PLAY','주사위티켓2장','{\"prize_id\": 105}','2025-12-15 15:02:37'),(46,9,'DICE_TOKEN',2,10,'lottery_play','AUTO_GRANT','{\"reason\": \"lottery_play\", \"game_xp\": 5, \"prize_id\": 105}','2025-12-15 15:02:37'),(47,6,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 15:23:59'),(48,43,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 15:24:27'),(49,43,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 15:24:48'),(50,6,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 15:25:08'),(51,18,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-15 15:41:55'),(52,45,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-15 15:42:09'),(53,39,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-15 15:42:22'),(54,39,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-15 15:42:22'),(55,23,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-15 15:42:31'),(56,44,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-15 15:43:33'),(57,44,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-15 15:43:33'),(59,10,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-15 15:44:46'),(60,10,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-15 15:44:46'),(61,10,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-15 15:44:46'),(62,50,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 15:45:30'),(63,50,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-15 15:45:38'),(64,50,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-15 15:45:38'),(65,50,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-15 15:46:01'),(66,58,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-15 15:47:50'),(67,58,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-15 15:47:50'),(68,58,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-15 15:47:50'),(69,58,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 50}','2025-12-15 15:56:12'),(70,58,'LOTTERY_TICKET',1,1,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 50}','2025-12-15 15:56:12'),(71,58,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-15 15:56:20'),(72,58,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-15 15:56:27'),(73,14,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 16:03:59'),(74,44,'DICE_TOKEN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-15 16:33:18'),(75,44,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-15 16:33:40'),(76,44,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-15 16:33:44'),(77,44,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-15 16:33:44'),(78,44,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-15 16:34:01'),(79,29,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 01:36:41'),(80,29,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-16 01:36:41'),(81,48,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 01:37:44'),(82,22,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 01:37:45'),(83,48,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-16 01:37:45'),(84,22,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-16 01:37:45'),(86,64,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 02:17:30'),(87,63,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 02:17:52'),(88,63,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-16 02:17:52'),(89,29,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 02:18:38'),(90,11,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 02:21:48'),(91,11,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"feature\": \"EXTERNAL_RANKING_TOP10\", \"trigger\": \"STAMP\", \"xp_added\": 20, \"season_id\": 2, \"stamp_count\": 1}','2025-12-16 02:21:48'),(92,9,'ROULETTE_COIN',1,10,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 60, \"season_id\": 2}','2025-12-16 02:22:12'),(93,11,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 02:22:19'),(94,58,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','CC코인1개','{\"prize_id\": 101}','2025-12-16 02:23:41'),(95,10,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 02:28:05'),(96,10,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 02:28:10'),(97,10,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 02:28:17'),(98,10,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-16 02:28:48'),(100,22,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC코인1개','{\"segment_id\": 51}','2025-12-16 02:52:38'),(101,22,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 02:52:52'),(106,11,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 02:54:19'),(107,11,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 02:54:23'),(108,11,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC코인1개','{\"segment_id\": 51}','2025-12-16 02:54:28'),(109,11,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-16 02:55:10'),(110,11,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 02:57:54'),(111,48,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 80, \"season_id\": 2}','2025-12-16 02:59:33'),(112,33,'DICE_TOKEN',1,1,'GRANT',NULL,'{}','2025-12-16 03:02:15'),(113,33,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 03:02:44'),(114,33,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 03:02:44'),(115,64,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 03:05:49'),(116,63,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 60, \"season_id\": 2}','2025-12-16 03:05:59'),(117,10,'LOTTERY_TICKET',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 03:06:17'),(118,48,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 03:34:44'),(119,48,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 03:34:52'),(120,48,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 03:36:57'),(121,29,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 03:40:04'),(122,29,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 03:40:27'),(123,29,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','CC코인1개','{\"segment_id\": 51}','2025-12-16 03:40:36'),(124,65,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 04:31:17'),(125,65,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:31:20'),(126,30,'ROULETTE_COIN',10,10,'GRANT',NULL,'{}','2025-12-16 04:35:53'),(127,30,'ROULETTE_COIN',-9,1,'REVOKE',NULL,'{}','2025-12-16 04:36:03'),(128,30,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:36:39'),(129,26,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:38:08'),(130,26,'ROULETTE_COIN',2,2,'GRANT',NULL,'{}','2025-12-16 04:38:10'),(131,26,'ROULETTE_COIN',-1,1,'REVOKE',NULL,'{}','2025-12-16 04:38:18'),(132,26,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','주사위티켓2장','{\"segment_id\": 49}','2025-12-16 04:39:03'),(133,26,'DICE_TOKEN',2,4,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 49}','2025-12-16 04:39:03'),(134,26,'DICE_TOKEN',-1,3,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 04:39:56'),(135,26,'DICE_TOKEN',-1,2,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 04:40:05'),(136,26,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 04:40:12'),(137,26,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 04:40:17'),(138,26,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 5, \"season_id\": 2}','2025-12-16 04:40:17'),(139,25,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 04:40:29'),(140,25,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:40:31'),(141,25,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 04:40:52'),(142,26,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 04:41:01'),(143,25,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 04:41:11'),(144,25,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 04:41:14'),(145,25,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 04:41:14'),(146,25,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 50}','2025-12-16 04:41:45'),(147,25,'LOTTERY_TICKET',1,1,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 50}','2025-12-16 04:41:45'),(148,25,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','다음기회에','{\"prize_id\": 106}','2025-12-16 04:42:34'),(149,25,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-16 04:45:40'),(150,25,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 04:45:58'),(151,25,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 04:45:58'),(152,25,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 04:46:15'),(153,41,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 04:46:28'),(154,41,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:46:30'),(155,67,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 04:49:38'),(156,67,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:49:40'),(157,67,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 50}','2025-12-16 04:50:15'),(158,67,'LOTTERY_TICKET',1,1,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 50}','2025-12-16 04:50:15'),(159,67,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 04:50:30'),(160,67,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 04:50:30'),(161,67,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 04:50:35'),(162,67,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','룰렛티켓1장','{\"segment_id\": 48}','2025-12-16 04:50:47'),(163,67,'ROULETTE_COIN',1,1,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 48}','2025-12-16 04:50:47'),(164,67,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 04:50:52'),(165,67,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','주사위티켓2장','{\"prize_id\": 105}','2025-12-16 04:51:19'),(166,67,'DICE_TOKEN',2,2,'lottery_play','AUTO_GRANT','{\"reason\": \"lottery_play\", \"game_xp\": 5, \"prize_id\": 105}','2025-12-16 04:51:19'),(167,68,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 04:54:25'),(168,68,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 04:54:27'),(169,67,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 04:55:49'),(170,67,'DICE_TOKEN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 04:55:49'),(171,67,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 04:55:55'),(172,67,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 04:55:58'),(173,69,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 04:58:39'),(174,69,'ROULETTE_COIN',1,2,'GRANT',NULL,'{}','2025-12-16 05:00:26'),(175,69,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:00:29'),(176,69,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','복권티켓1장','{\"segment_id\": 50}','2025-12-16 05:01:26'),(177,69,'LOTTERY_TICKET',1,1,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 50}','2025-12-16 05:01:26'),(178,69,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 05:01:32'),(179,69,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 05:02:23'),(180,69,'DICE_TOKEN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 05:02:23'),(181,69,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:02:27'),(182,69,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:02:31'),(183,69,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','주사위티켓2장','{\"prize_id\": 105}','2025-12-16 05:02:40'),(184,69,'DICE_TOKEN',2,2,'lottery_play','AUTO_GRANT','{\"reason\": \"lottery_play\", \"game_xp\": 5, \"prize_id\": 105}','2025-12-16 05:02:40'),(185,14,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 05:03:56'),(186,14,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 05:03:56'),(187,14,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','주사위티켓2장','{\"segment_id\": 49}','2025-12-16 05:05:22'),(188,14,'DICE_TOKEN',2,2,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 49}','2025-12-16 05:05:22'),(189,11,'LOTTERY_TICKET',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 40, \"season_id\": 2}','2025-12-16 05:05:28'),(190,14,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 05:05:34'),(191,14,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:05:37'),(192,9,'LOTTERY_TICKET',1,8,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 05:05:40'),(193,15,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-16 05:06:04'),(194,12,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-16 05:06:10'),(195,12,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-16 05:06:10'),(196,12,'ROULETTE_COIN',1,2,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-16 05:06:10'),(197,15,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:07:00'),(198,70,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:11:27'),(199,58,'LOTTERY_TICKET',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 60, \"season_id\": 2}','2025-12-16 05:11:36'),(200,52,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 60, \"season_id\": 2}','2025-12-16 05:12:21'),(201,52,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 60, \"season_id\": 2}','2025-12-16 05:12:21'),(202,71,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:14:32'),(203,70,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:17:28'),(204,70,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 05:17:33'),(205,19,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 05:22:03'),(206,19,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:22:06'),(207,72,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 05:26:57'),(208,72,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:26:59'),(209,36,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:27:45'),(210,16,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-16 05:28:59'),(211,73,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:30:00'),(212,12,'LOTTERY_TICKET',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 100, \"season_id\": 2}','2025-12-16 05:30:24'),(213,11,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','주사위티켓2장','{\"prize_id\": 105}','2025-12-16 05:31:52'),(214,11,'DICE_TOKEN',2,2,'lottery_play','AUTO_GRANT','{\"reason\": \"lottery_play\", \"game_xp\": 5, \"prize_id\": 105}','2025-12-16 05:31:52'),(215,11,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:32:13'),(216,11,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-16 05:32:15'),(217,68,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 47}','2025-12-16 05:34:17'),(218,68,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-16 05:34:27'),(219,68,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-16 05:34:31'),(220,68,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 1, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 20, \"season_id\": 2}','2025-12-16 05:34:31'),(221,74,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 05:34:57'),(222,74,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:35:00'),(223,74,'LOTTERY_TICKET',1,1,'GRANT',NULL,'{}','2025-12-16 05:35:03'),(224,75,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:36:59'),(225,77,'ROULETTE_COIN',1,1,'GRANT',NULL,'{}','2025-12-16 05:47:19'),(226,77,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-16 05:47:22'),(227,76,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"amount\": 1, \"reward_type\": \"TICKET_DICE\", \"toast_message\": \"주사위 티켓 지급\"}','2025-12-17 07:44:09'),(228,76,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-17 07:44:18'),(229,75,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-17 07:49:01'),(230,75,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-17 07:49:04'),(231,75,'DICE_TOKEN',2,2,'GRANT',NULL,'{}','2025-12-17 07:49:38'),(232,75,'DICE_TOKEN',-1,1,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-17 07:49:44'),(233,75,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - DRAW','{\"result\": \"DRAW\"}','2025-12-17 07:49:46'),(234,75,'DICE_TOKEN',5,5,'GRANT',NULL,'{}','2025-12-17 07:49:58'),(235,75,'DICE_TOKEN',-1,4,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-17 07:50:09'),(236,75,'DICE_TOKEN',-1,3,'DICE_PLAY','XMAS Dice - WIN','{\"result\": \"WIN\"}','2025-12-17 07:50:12');
/*!40000 ALTER TABLE `user_game_wallet_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_level_progress`
--

DROP TABLE IF EXISTS `user_level_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_level_progress` (
  `user_id` int NOT NULL,
  `level` int NOT NULL DEFAULT '1',
  `xp` int NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_level_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_level_progress`
--

LOCK TABLES `user_level_progress` WRITE;
/*!40000 ALTER TABLE `user_level_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_level_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_level_reward_log`
--

DROP TABLE IF EXISTS `user_level_reward_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_level_reward_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `level` int NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_payload` json DEFAULT NULL,
  `auto_granted` tinyint(1) NOT NULL DEFAULT '0',
  `granted_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_level_reward` (`user_id`,`level`),
  KEY `idx_ulrl_user_created` (`user_id`,`created_at`),
  CONSTRAINT `user_level_reward_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_level_reward_log`
--

LOCK TABLES `user_level_reward_log` WRITE;
/*!40000 ALTER TABLE `user_level_reward_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_level_reward_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_segment`
--

DROP TABLE IF EXISTS `user_segment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_segment` (
  `user_id` int NOT NULL,
  `segment` varchar(50) NOT NULL DEFAULT 'NEW',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_segment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_segment`
--

LOCK TABLES `user_segment` WRITE;
/*!40000 ALTER TABLE `user_segment` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_segment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_xp_event_log`
--

DROP TABLE IF EXISTS `user_xp_event_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_xp_event_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `source` varchar(100) NOT NULL,
  `delta` int NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_uxel_user_created` (`user_id`,`created_at`),
  CONSTRAINT `user_xp_event_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_xp_event_log`
--

LOCK TABLES `user_xp_event_log` WRITE;
/*!40000 ALTER TABLE `user_xp_event_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_xp_event_log` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-25 13:33:28
