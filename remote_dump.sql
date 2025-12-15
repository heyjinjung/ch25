-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: xmas_event
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
INSERT INTO `alembic_version` VALUES ('20251212_0012');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dice_log`
--

LOCK TABLES `dice_log` WRITE;
/*!40000 ALTER TABLE `dice_log` DISABLE KEYS */;
INSERT INTO `dice_log` VALUES (1,6,1,2,2,4,2,4,6,'LOSE','POINT',5,'2025-12-14 13:53:37');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_ranking_data`
--

LOCK TABLES `external_ranking_data` WRITE;
/*!40000 ALTER TABLE `external_ranking_data` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_prize`
--

LOCK TABLES `lottery_prize` WRITE;
/*!40000 ALTER TABLE `lottery_prize` DISABLE KEYS */;
INSERT INTO `lottery_prize` VALUES (95,1,'CC코인1개','POINT',5,350,100,1,'2025-12-14 14:03:00','2025-12-14 14:03:00'),(96,1,'CC포인트1만','POINT',5,2,1,1,'2025-12-14 14:03:00','2025-12-14 14:03:00'),(97,1,'룰렛티켓1장','TICKET_ROULETTE',1,440,100,1,'2025-12-14 14:03:00','2025-12-14 14:03:00'),(98,1,'배민1만','POINT',5,5,10,1,'2025-12-14 14:03:00','2025-12-14 14:03:00'),(99,1,'주사위티켓2장','TICKET_DICE',2,600,100,1,'2025-12-14 14:03:00','2025-12-14 14:03:00'),(100,1,'지민19영상','POINT',5,100,100,1,'2025-12-14 14:03:00','2025-12-14 14:03:00');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_log`
--

LOCK TABLES `roulette_log` WRITE;
/*!40000 ALTER TABLE `roulette_log` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_segment`
--

LOCK TABLES `roulette_segment` WRITE;
/*!40000 ALTER TABLE `roulette_segment` DISABLE KEYS */;
INSERT INTO `roulette_segment` VALUES (40,7,0,'다음기회에','POINT',5,500,0,'2025-12-14 13:59:35','2025-12-14 13:59:35'),(41,7,1,'룰렛티켓1장','TICKET_ROULETTE',1,400,0,'2025-12-14 13:59:35','2025-12-14 13:59:35'),(42,7,2,'주사위티켓2장','TICKET_DICE',2,300,0,'2025-12-14 13:59:35','2025-12-14 13:59:35'),(43,7,3,'복권티켓1장','TICKET_LOTTERY',1,200,0,'2025-12-14 13:59:35','2025-12-14 13:59:35'),(44,7,4,'CC코인1개','POINT',5,100,0,'2025-12-14 13:59:35','2025-12-14 13:59:35'),(45,7,5,'CC포인트1만','POINT',5,8,0,'2025-12-14 13:59:35','2025-12-14 13:59:35');
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_progress`
--

LOCK TABLES `season_pass_progress` WRITE;
/*!40000 ALTER TABLE `season_pass_progress` DISABLE KEYS */;
INSERT INTO `season_pass_progress` VALUES (1,6,1,6,450,1,'2025-12-14','2025-12-14 22:40:45','2025-12-14 22:56:09'),(2,35,2,1,0,0,NULL,'2025-12-15 09:47:44','2025-12-15 09:47:44'),(3,14,2,1,0,0,NULL,'2025-12-15 10:26:22','2025-12-15 10:26:22'),(4,45,2,1,0,0,NULL,'2025-12-15 13:05:42','2025-12-15 13:05:42'),(5,6,2,1,0,0,NULL,'2025-12-15 13:36:42','2025-12-15 13:36:42'),(6,15,2,1,0,0,NULL,'2025-12-15 15:20:49','2025-12-15 15:20:49'),(7,16,2,1,0,0,NULL,'2025-12-15 15:59:03','2025-12-15 15:59:03'),(8,49,2,1,0,0,NULL,'2025-12-15 16:16:56','2025-12-15 16:16:56'),(9,50,2,1,0,0,NULL,'2025-12-15 16:17:36','2025-12-15 16:17:36'),(10,51,2,1,0,0,NULL,'2025-12-15 16:18:17','2025-12-15 16:18:17'),(11,52,2,1,0,0,NULL,'2025-12-15 16:18:50','2025-12-15 16:18:50'),(12,53,2,1,0,0,NULL,'2025-12-15 16:19:11','2025-12-15 16:19:11'),(13,54,2,1,0,0,NULL,'2025-12-15 16:19:31','2025-12-15 16:19:31'),(14,55,2,1,0,0,NULL,'2025-12-15 16:19:50','2025-12-15 16:19:50'),(15,18,2,1,0,0,NULL,'2025-12-15 18:08:05','2025-12-15 18:08:05');
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_reward_log`
--

LOCK TABLES `season_pass_reward_log` WRITE;
/*!40000 ALTER TABLE `season_pass_reward_log` DISABLE KEYS */;
INSERT INTO `season_pass_reward_log` VALUES (1,6,1,1,2,'TICKET_DICE',1,'2025-12-14 13:51:55','2025-12-14 22:51:55'),(2,6,1,1,3,'TICKET_ROULETTE',1,'2025-12-14 13:51:55','2025-12-14 22:51:55'),(3,6,1,1,4,'TICKET_LOTTERY',1,'2025-12-14 13:51:55','2025-12-14 22:51:55'),(4,6,1,1,5,'CC_COIN',1,'2025-12-14 13:55:21','2025-12-14 22:55:20'),(5,6,1,1,6,'TICKET_DICE',2,'2025-12-14 13:56:10','2025-12-14 22:56:09');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_stamp_log`
--

LOCK TABLES `season_pass_stamp_log` WRITE;
/*!40000 ALTER TABLE `season_pass_stamp_log` DISABLE KEYS */;
INSERT INTO `season_pass_stamp_log` VALUES (1,6,1,1,'2025-12-14','TOP10_W2025-50',1,'EXTERNAL_RANKING_TOP10',20,'XP',20,'2025-12-14 22:51:55');
/*!40000 ALTER TABLE `season_pass_stamp_log` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
INSERT INTO `team` VALUES (1,'루돌프팀',NULL,1,'2025-12-13 05:45:18','2025-12-13 05:45:18'),(2,'눈사람팀',NULL,1,'2025-12-13 05:45:18','2025-12-13 05:45:18');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_event_log`
--

LOCK TABLES `team_event_log` WRITE;
/*!40000 ALTER TABLE `team_event_log` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_member`
--

LOCK TABLES `team_member` WRITE;
/*!40000 ALTER TABLE `team_member` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_season`
--

LOCK TABLES `team_season` WRITE;
/*!40000 ALTER TABLE `team_season` DISABLE KEYS */;
INSERT INTO `team_season` VALUES (1,'12월 팀배틀','2025-12-13 05:00:00','2025-12-15 05:00:00',1,'null','2025-12-13 05:45:18','2025-12-13 06:15:50');
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_id` (`external_id`),
  KEY `ix_user_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (6,'지지미니','지지미니니','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 09:41:18','42.115.217.226','2025-12-11 05:20:48','2025-12-15 09:41:18',0),(7,'cctest01','cctest01','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 05:50:33','185.180.195.22','2025-12-11 05:21:04','2025-12-11 05:50:33',0),(8,'cctest02','cctest02','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 06:48:27','103.176.152.3','2025-12-11 05:21:13','2025-12-11 06:48:27',0),(9,'cctest03','cctest03','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 07:38:44','149.40.54.60','2025-12-11 06:54:19','2025-12-11 07:38:44',0),(10,'yeong12','영진사장님','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 06:57:10','2025-12-14 02:57:48',3600),(11,'jkkk','jkkk','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 06:57:22','2025-12-12 05:56:16',1840),(12,'yuhh89','은희조','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 06:57:41','2025-12-12 05:56:13',4240),(14,'persipic','persipic','c41e636d057062948a0bbdbdbf09bd047beb977b255ed9cd6c780d497d2dd7ca',1,'ACTIVE','2025-12-15 06:50:25','106.101.200.10','2025-12-11 08:36:32','2025-12-15 06:50:25',1875),(15,'정재권','도베르만','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 06:20:49','121.179.101.43','2025-12-11 08:37:07','2025-12-15 06:20:49',440),(16,'나참동','나참동','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 06:59:03','118.235.6.68','2025-12-11 09:36:39','2025-12-15 06:59:03',940),(17,'지민잼민','지민잼민','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 10:47:43','175.199.172.204','2025-12-11 09:42:22','2025-12-12 05:56:05',20),(18,'아사카','아사카','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 09:08:05','106.101.73.234','2025-12-11 10:04:54','2025-12-15 09:08:05',900),(19,'레몬향','레몬향','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 10:07:54','2025-12-11 10:07:54',0),(20,'화랑','화랑','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-11 10:10:08','2025-12-11 10:10:08',0),(21,'돈따묵쟈','돈따묵쟈','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 05:59:33','118.235.85.98','2025-12-11 10:12:02','2025-12-14 03:24:51',580),(22,'크리스토퍼','크리스토퍼','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 06:21:40','211.235.82.166','2025-12-11 10:15:30','2025-12-14 03:24:53',420),(23,'기프트','기프트','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-11 10:51:22','112.149.150.211','2025-12-11 10:48:43','2025-12-13 08:24:58',0),(24,'해조다요','해조다요','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:46:06','121.54.214.144','2025-12-11 10:49:55','2025-12-13 07:46:06',30),(25,'제마','제마','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-14 13:14:50','180.68.182.127','2025-12-11 11:14:28','2025-12-14 13:14:50',0),(26,'김민저이','김민저이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 00:48:19','211.36.152.51','2025-12-12 00:39:54','2025-12-12 00:48:19',0),(27,'케바케','케바케','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 14:19:28','172.18.0.6','2025-12-12 00:43:21','2025-12-12 14:19:28',0),(29,'정우성','정우성','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 01:57:11','14.45.28.51','2025-12-12 01:28:03','2025-12-14 03:25:00',440),(30,'초보베터','초보베터','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 02:20:40','39.7.28.90','2025-12-12 01:31:34','2025-12-12 08:59:35',45),(31,'자르반이큐','자르반이큐','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 02:26:16','2025-12-12 02:26:16',0),(32,'미소1031','미소1031','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 02:27:49','2025-12-12 02:28:14',0),(33,'자리','자리','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 06:11:16','112.163.208.48','2025-12-12 02:34:44','2025-12-12 06:11:16',0),(34,'진심펀치','진심펀치','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 03:12:46','106.101.74.103','2025-12-12 03:08:47','2025-12-12 03:12:46',0),(35,'승아지','승아지','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 00:47:43','117.111.17.240','2025-12-12 03:21:58','2025-12-15 00:47:43',0),(36,'으민12','으민12','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:30:15','182.221.82.81','2025-12-12 05:59:24','2025-12-13 07:30:15',0),(37,'ppoodd','ppoodd','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 07:48:02','172.18.0.6','2025-12-12 07:47:05','2025-12-12 07:48:02',0),(38,'짱맨','짱맨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 08:00:47','2025-12-14 03:25:05',420),(39,'성민이','성민이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:41:49','106.102.142.63','2025-12-12 08:06:06','2025-12-14 03:25:07',360),(40,'왕지형','왕지형','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-12 08:58:59','2025-12-12 08:58:59',0),(41,'요리','요리','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 11:37:52','223.39.194.37','2025-12-12 09:34:13','2025-12-13 11:37:52',0),(42,'민아가자','민아가자','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 10:47:43','172.18.0.6','2025-12-12 10:46:17','2025-12-12 10:47:43',0),(43,'일등당첨','일등당첨','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 06:39:22','211.235.73.38','2025-12-12 10:54:58','2025-12-14 03:25:14',380),(44,'우주를줄게','우주를줄게','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-12 11:43:21','172.18.0.6','2025-12-12 11:33:56','2025-12-12 11:43:21',0),(45,'콩이랑','콩이랑','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-15 04:05:42','211.105.100.249','2025-12-12 14:14:07','2025-12-15 04:05:42',420),(46,'민보이','민보이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 07:41:48','118.235.84.59','2025-12-13 02:59:41','2025-12-14 03:25:19',200),(47,'걸리면다이','걸리면다이','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 06:28:22','172.18.0.6','2025-12-13 06:06:28','2025-12-13 06:28:22',0),(48,'봄꽃잎','봄꽃잎','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE','2025-12-13 06:40:20','220.81.184.195','2025-12-13 06:08:17','2025-12-14 03:25:20',340),(49,'moling95','moling95','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:16:56','2025-12-15 07:16:56',0),(50,'햄찌','햄찌','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:17:37','2025-12-15 07:17:37',0),(51,'순살마니밥','순살마니밥','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:18:18','2025-12-15 07:18:18',0),(52,'dulex','dulex','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:18:51','2025-12-15 07:18:51',0),(53,'산타할배8','산타할배8','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:19:12','2025-12-15 07:19:12',0),(54,'코인떡락','코인떡락','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:19:31','2025-12-15 07:19:31',0),(55,'나무늬82','나무늬82','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,'ACTIVE',NULL,NULL,'2025-12-15 07:19:50','2025-12-15 07:19:50',0);
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_event_log`
--

LOCK TABLES `user_event_log` WRITE;
/*!40000 ALTER TABLE `user_event_log` DISABLE KEYS */;
INSERT INTO `user_event_log` VALUES (1,6,'AUTH','AUTH_LOGIN','{\"ip\": \"172.18.0.1\", \"external_id\": \"test002\"}','2025-12-14 13:50:46'),(2,6,'ROULETTE','PLAY','{\"label\": \"컴포즈아아\", \"segment_id\": 35, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:53:31'),(3,6,'DICE','PLAY','{\"result\": \"LOSE\", \"reward_type\": \"POINT\", \"reward_label\": \"XMAS Dice - LOSE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:53:37'),(4,6,'LOTTERY','PLAY','{\"label\": \"룰렛티켓1장\", \"prize_id\": 85, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:53:42'),(5,6,'ROULETTE','PLAY','{\"label\": \"다음기회에\", \"segment_id\": 36, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:09'),(6,6,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장 \", \"segment_id\": 39, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:09'),(7,6,'ROULETTE','PLAY','{\"label\": \"ì£¼ì‚¬ìœ„í‹°ì¼“\", \"segment_id\": 34, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:10'),(8,6,'ROULETTE','PLAY','{\"label\": \"ì£¼ì‚¬ìœ„í‹°ì¼“\", \"segment_id\": 34, \"reward_type\": \"TICKET_DICE\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:10'),(9,6,'ROULETTE','PLAY','{\"label\": \"주사위티켓2장 \", \"segment_id\": 39, \"reward_type\": \"POINT\", \"reward_amount\": 5, \"xp_from_reward\": 5}','2025-12-14 13:56:10'),(10,35,'AUTH','AUTH_LOGIN','{\"ip\": \"117.111.17.240\", \"external_id\": \"승아지\"}','2025-12-15 00:47:43'),(11,45,'AUTH','AUTH_LOGIN','{\"ip\": \"211.105.100.249\", \"external_id\": \"콩이랑\"}','2025-12-15 04:05:42'),(12,6,'AUTH','AUTH_LOGIN','{\"ip\": \"156.146.45.212\", \"external_id\": \"test002\"}','2025-12-15 04:36:42'),(13,15,'AUTH','AUTH_LOGIN','{\"ip\": \"121.179.101.43\", \"external_id\": \"정재권\"}','2025-12-15 06:20:49'),(14,6,'AUTH','AUTH_LOGIN','{\"ip\": \"149.40.54.75\", \"external_id\": \"test002\"}','2025-12-15 06:40:14'),(15,14,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.200.10\", \"external_id\": \"persipic\"}','2025-12-15 06:50:25'),(16,16,'AUTH','AUTH_LOGIN','{\"ip\": \"118.235.6.68\", \"external_id\": \"나참동\"}','2025-12-15 06:59:03'),(17,18,'AUTH','AUTH_LOGIN','{\"ip\": \"106.101.73.234\", \"external_id\": \"아사카\"}','2025-12-15 09:08:05'),(18,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 09:12:25'),(19,6,'AUTH','AUTH_LOGIN','{\"ip\": \"42.115.217.226\", \"external_id\": \"지지미니\"}','2025-12-15 09:41:18');
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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet`
--

LOCK TABLES `user_game_wallet` WRITE;
/*!40000 ALTER TABLE `user_game_wallet` DISABLE KEYS */;
INSERT INTO `user_game_wallet` VALUES (1,6,'DICE_TOKEN',0,'2025-12-14 13:56:10'),(2,6,'LOTTERY_TICKET',0,'2025-12-14 13:53:42'),(3,6,'ROULETTE_COIN',0,'2025-12-14 13:56:10'),(4,6,'CC_COIN',0,'2025-12-14 13:55:21'),(5,35,'LOTTERY_TICKET',0,'2025-12-15 00:47:44'),(6,35,'ROULETTE_COIN',0,'2025-12-15 00:47:44'),(7,35,'DICE_TOKEN',0,'2025-12-15 00:47:45'),(8,14,'ROULETTE_COIN',0,'2025-12-15 01:26:22'),(9,14,'DICE_TOKEN',0,'2025-12-15 01:26:22'),(10,14,'LOTTERY_TICKET',0,'2025-12-15 01:26:22'),(11,45,'DICE_TOKEN',0,'2025-12-15 04:05:42'),(12,45,'LOTTERY_TICKET',0,'2025-12-15 04:05:42'),(13,45,'ROULETTE_COIN',0,'2025-12-15 04:05:42'),(14,15,'ROULETTE_COIN',0,'2025-12-15 06:20:49'),(15,15,'DICE_TOKEN',0,'2025-12-15 06:20:49'),(16,15,'LOTTERY_TICKET',0,'2025-12-15 06:20:49'),(17,16,'DICE_TOKEN',0,'2025-12-15 06:59:03'),(18,16,'LOTTERY_TICKET',0,'2025-12-15 06:59:04'),(19,16,'ROULETTE_COIN',0,'2025-12-15 06:59:04'),(20,18,'ROULETTE_COIN',0,'2025-12-15 09:08:05'),(21,18,'DICE_TOKEN',0,'2025-12-15 09:08:06'),(22,18,'LOTTERY_TICKET',0,'2025-12-15 09:08:06');
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet_ledger`
--

LOCK TABLES `user_game_wallet_ledger` WRITE;
/*!40000 ALTER TABLE `user_game_wallet_ledger` DISABLE KEYS */;
INSERT INTO `user_game_wallet_ledger` VALUES (1,6,'DICE_TOKEN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 2, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:51:55'),(2,6,'ROULETTE_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 3, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:51:55'),(3,6,'LOTTERY_TICKET',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 4, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:51:55'),(4,6,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','컴포즈아아','{\"segment_id\": 35}','2025-12-14 13:53:30'),(5,6,'DICE_TOKEN',-1,0,'DICE_PLAY','XMAS Dice - LOSE','{\"result\": \"LOSE\"}','2025-12-14 13:53:37'),(6,6,'LOTTERY_TICKET',-1,0,'LOTTERY_PLAY','룰렛티켓1장','{\"prize_id\": 85}','2025-12-14 13:53:42'),(7,6,'CC_COIN',1,1,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 5, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 200, \"season_id\": 1}','2025-12-14 13:55:21'),(8,6,'ROULETTE_COIN',-1,4,'ROULETTE_PLAY','다음기회에','{\"segment_id\": 36}','2025-12-14 13:56:09'),(9,6,'ROULETTE_COIN',-1,3,'ROULETTE_PLAY','주사위티켓2장 ','{\"segment_id\": 39}','2025-12-14 13:56:09'),(10,6,'ROULETTE_COIN',-1,2,'ROULETTE_PLAY','ì£¼ì‚¬ìœ„í‹°ì¼“','{\"segment_id\": 34}','2025-12-14 13:56:10'),(11,6,'DICE_TOKEN',5,5,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 34}','2025-12-14 13:56:10'),(12,6,'ROULETTE_COIN',-1,1,'ROULETTE_PLAY','ì£¼ì‚¬ìœ„í‹°ì¼“','{\"segment_id\": 34}','2025-12-14 13:56:10'),(13,6,'DICE_TOKEN',5,10,'roulette_spin','AUTO_GRANT','{\"reason\": \"roulette_spin\", \"game_xp\": 5, \"segment_id\": 34}','2025-12-14 13:56:10'),(14,6,'ROULETTE_COIN',-1,0,'ROULETTE_PLAY','주사위티켓2장 ','{\"segment_id\": 39}','2025-12-14 13:56:10'),(15,6,'DICE_TOKEN',2,12,'LEVEL_REWARD','AUTO_GRANT','{\"level\": 6, \"source\": \"SEASON_PASS_AUTO_CLAIM\", \"trigger\": \"BONUS_XP\", \"xp_added\": 5, \"season_id\": 1}','2025-12-14 13:56:10');
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

-- Dump completed on 2025-12-15 10:16:01
