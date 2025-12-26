-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: localhost    Database: xmas_event_dev
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
  `version_num` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `max_daily_plays` int NOT NULL,
  `win_reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `win_reward_amount` int NOT NULL,
  `draw_reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `draw_reward_amount` int NOT NULL,
  `lose_reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lose_reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_dice_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dice_config`
--

LOCK TABLES `dice_config` WRITE;
/*!40000 ALTER TABLE `dice_config` DISABLE KEYS */;
INSERT INTO `dice_config` VALUES (1,'Christmas Dice',1,0,'POINT',200,'POINT',50,'NONE',0,'2025-12-18 18:48:38','2025-12-18 18:48:38');
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
  `result` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `config_id` (`config_id`),
  KEY `ix_dice_log_id` (`id`),
  KEY `ix_dice_log_user_created_at` (`user_id`,`created_at`),
  CONSTRAINT `dice_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dice_log_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `dice_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dice_log`
--

LOCK TABLES `dice_log` WRITE;
/*!40000 ALTER TABLE `dice_log` DISABLE KEYS */;
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
  `deposit_remainder` int NOT NULL,
  `daily_base_deposit` int NOT NULL,
  `daily_base_play` int NOT NULL,
  `last_daily_reset` date DEFAULT NULL,
  `memo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_external_ranking_user` (`user_id`),
  KEY `ix_external_ranking_data_id` (`id`),
  KEY `ix_external_ranking_data_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `season_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `data_id` (`data_id`),
  KEY `ix_external_ranking_reward_log_user_id` (`user_id`),
  KEY `ix_external_ranking_reward_log_id` (`id`),
  CONSTRAINT `external_ranking_reward_log_ibfk_1` FOREIGN KEY (`data_id`) REFERENCES `external_ranking_data` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `feature_type` enum('ROULETTE','DICE','LOTTERY','RANKING','SEASON_PASS','NONE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_path` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL,
  `config_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_config_feature_type` (`feature_type`),
  KEY `ix_feature_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_config`
--

LOCK TABLES `feature_config` WRITE;
/*!40000 ALTER TABLE `feature_config` DISABLE KEYS */;
INSERT INTO `feature_config` VALUES (1,'ROULETTE','Christmas Roulette','/roulette',1,NULL,'2025-12-18 17:06:41','2025-12-18 18:48:38'),(2,'SEASON_PASS','Season Pass','/season-pass',1,NULL,'2025-12-18 17:06:41','2025-12-18 18:48:38'),(3,'DICE','Dice Game','/dice',1,NULL,'2025-12-18 17:06:41','2025-12-18 18:48:38'),(4,'LOTTERY','Lottery','/lottery',1,NULL,'2025-12-18 17:06:41','2025-12-18 18:48:38'),(5,'RANKING','Ranking','/ranking',1,NULL,'2025-12-18 17:06:41','2025-12-18 18:48:38');
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
  `feature_type` enum('ROULETTE','DICE','LOTTERY','RANKING','SEASON_PASS','NONE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_schedule_date` (`date`),
  KEY `ix_feature_schedule_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_schedule`
--

LOCK TABLES `feature_schedule` WRITE;
/*!40000 ALTER TABLE `feature_schedule` DISABLE KEYS */;
INSERT INTO `feature_schedule` VALUES (2,'2025-12-09','SEASON_PASS',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(3,'2025-12-10','ROULETTE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(4,'2025-12-11','DICE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(5,'2025-12-12','LOTTERY',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(6,'2025-12-13','RANKING',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(7,'2025-12-14','ROULETTE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(8,'2025-12-15','DICE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(9,'2025-12-16','LOTTERY',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(10,'2025-12-17','RANKING',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(11,'2025-12-18','ROULETTE',1,'2025-12-18 17:06:41','2025-12-18 18:48:38'),(12,'2025-12-19','DICE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(13,'2025-12-20','LOTTERY',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(14,'2025-12-21','RANKING',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(15,'2025-12-22','ROULETTE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(16,'2025-12-23','DICE',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(17,'2025-12-24','LOTTERY',1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(18,'2025-12-25','SEASON_PASS',1,'2025-12-18 17:06:41','2025-12-18 17:06:41');
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `max_daily_tickets` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_lottery_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_config`
--

LOCK TABLES `lottery_config` WRITE;
/*!40000 ALTER TABLE `lottery_config` DISABLE KEYS */;
INSERT INTO `lottery_config` VALUES (1,'Christmas Lottery',1,0,'2025-12-18 18:48:38','2025-12-18 18:48:38');
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
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_prize`
--

LOCK TABLES `lottery_prize` WRITE;
/*!40000 ALTER TABLE `lottery_prize` DISABLE KEYS */;
INSERT INTO `lottery_prize` VALUES (1,1,'소형 선물','POINT',50,30,100,1,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(2,1,'중형 선물','POINT',200,25,50,1,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(3,1,'대형 선물','POINT',500,15,20,1,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(4,1,'특별 선물','POINT',1000,10,10,1,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(5,1,'잭팟','POINT',5000,5,NULL,1,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(6,1,'꽝','NONE',0,15,NULL,1,'2025-12-18 18:48:38','2025-12-18 18:48:38');
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
  `is_eligible` tinyint(1) NOT NULL,
  `campaign_key` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `granted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_new_member_dice_eligibility_user_id` (`user_id`),
  KEY `ix_new_member_dice_eligibility_user_id` (`user_id`),
  KEY `ix_new_member_dice_eligibility_id` (`id`),
  CONSTRAINT `new_member_dice_eligibility_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `new_member_dice_eligibility`
--

LOCK TABLES `new_member_dice_eligibility` WRITE;
/*!40000 ALTER TABLE `new_member_dice_eligibility` DISABLE KEYS */;
INSERT INTO `new_member_dice_eligibility` VALUES (1,2,1,'SMOKE','agent',NULL,NULL,'2025-12-18 17:07:27','2025-12-18 09:08:00');
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
  `campaign_key` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `outcome` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_dice` int NOT NULL,
  `dealer_dice` int NOT NULL,
  `win_link` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_new_member_dice_log_user_id` (`user_id`),
  KEY `ix_new_member_dice_log_id` (`id`),
  KEY `ix_new_member_dice_log_user_created_at` (`user_id`,`created_at`),
  CONSTRAINT `new_member_dice_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `new_member_dice_log`
--

LOCK TABLES `new_member_dice_log` WRITE;
/*!40000 ALTER TABLE `new_member_dice_log` DISABLE KEYS */;
INSERT INTO `new_member_dice_log` VALUES (1,2,NULL,'LOSE',2,3,'https://ccc-010.com','2025-12-18 08:07:34');
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
  `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` int NOT NULL,
  `rank` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ranking_daily_date_rank` (`date`,`rank`),
  KEY `user_id` (`user_id`),
  KEY `ix_ranking_daily_id` (`id`),
  CONSTRAINT `ranking_daily_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `max_daily_spins` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_roulette_config_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_config`
--

LOCK TABLES `roulette_config` WRITE;
/*!40000 ALTER TABLE `roulette_config` DISABLE KEYS */;
INSERT INTO `roulette_config` VALUES (1,'Test Roulette',1,0,'2025-12-18 09:08:27','2025-12-18 09:08:27');
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
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roulette_segment`
--

LOCK TABLES `roulette_segment` WRITE;
/*!40000 ALTER TABLE `roulette_segment` DISABLE KEYS */;
INSERT INTO `roulette_segment` VALUES (7,1,0,'100 코인','POINT',100,30,0,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(8,1,1,'200 코인','POINT',200,25,0,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(9,1,2,'500 코인','POINT',500,15,0,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(10,1,3,'꽝','NONE',0,17,0,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(11,1,4,'1,000 코인','POINT',1000,8,1,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(12,1,5,'10,000 잭팟','POINT',10000,5,1,'2025-12-18 18:48:38','2025-12-18 18:48:38');
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
  `season_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `max_level` int NOT NULL,
  `base_xp_per_stamp` int NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_name` (`season_name`),
  KEY `ix_season_pass_config_end_date` (`end_date`),
  KEY `ix_season_pass_config_id` (`id`),
  KEY `ix_season_pass_config_start_date` (`start_date`),
  KEY `ix_season_pass_config_is_active` (`is_active`),
  CONSTRAINT `ck_season_dates_order` CHECK ((`start_date` <= `end_date`))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_config`
--

LOCK TABLES `season_pass_config` WRITE;
/*!40000 ALTER TABLE `season_pass_config` DISABLE KEYS */;
INSERT INTO `season_pass_config` VALUES (1,'XMAS_2025','2025-12-09','2025-12-25',5,10,1,'2025-12-18 17:06:41','2025-12-18 17:06:41');
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
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `auto_claim` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_level` (`season_id`,`level`),
  KEY `ix_season_pass_level_id` (`id`),
  CONSTRAINT `season_pass_level_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `season_pass_config` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_level`
--

LOCK TABLES `season_pass_level` WRITE;
/*!40000 ALTER TABLE `season_pass_level` DISABLE KEYS */;
INSERT INTO `season_pass_level` VALUES (1,1,1,0,'COIN',100,1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(2,1,2,20,'COIN',200,1,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(3,1,3,50,'COIN',300,0,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(4,1,4,80,'COIN',500,0,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(5,1,5,120,'COIN',800,0,'2025-12-18 17:06:41','2025-12-18 17:06:41');
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_progress`
--

LOCK TABLES `season_pass_progress` WRITE;
/*!40000 ALTER TABLE `season_pass_progress` DISABLE KEYS */;
INSERT INTO `season_pass_progress` VALUES (1,2,1,1,10,1,'2025-12-18','2025-12-18 17:28:15','2025-12-18 17:28:48'),(6,4,1,1,0,0,NULL,'2025-12-19 13:16:02','2025-12-19 13:16:02'),(7,5,1,1,0,0,NULL,'2025-12-19 18:42:06','2025-12-19 18:42:06');
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
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_reward_log`
--

LOCK TABLES `season_pass_reward_log` WRITE;
/*!40000 ALTER TABLE `season_pass_reward_log` DISABLE KEYS */;
INSERT INTO `season_pass_reward_log` VALUES (1,2,1,1,1,'COIN',100,'2025-12-18 08:28:48','2025-12-18 17:28:48');
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
  `period_key` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stamp_count` int NOT NULL,
  `source_feature_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `xp_earned` int NOT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `season_pass_stamp_log`
--

LOCK TABLES `season_pass_stamp_log` WRITE;
/*!40000 ALTER TABLE `season_pass_stamp_log` DISABLE KEYS */;
INSERT INTO `season_pass_stamp_log` VALUES (1,2,1,1,'2025-12-18','2025-12-18',1,'ROULETTE',10,'XP',10,'2025-12-18 17:28:48');
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
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `segment` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` int NOT NULL,
  `enabled` tinyint(1) NOT NULL,
  `condition_json` json NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_segment_rule_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('DRAFT','ACTIVE','PAUSED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('GLOBAL','SEASON_PASS','ROULETTE','DICE','LOTTERY','TEAM_BATTLE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_segment_json` json DEFAULT NULL,
  `reward_json` json DEFAULT NULL,
  `auto_launch` tinyint(1) NOT NULL,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
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
INSERT INTO `survey` VALUES (1,'Smoke Survey','Test survey','ACTIVE','GLOBAL',NULL,NULL,0,NULL,NULL,NULL,'2025-12-18 17:09:11','2025-12-18 17:09:11');
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
  `value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_index` int NOT NULL,
  `weight` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `survey_option_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `survey_question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_option`
--

LOCK TABLES `survey_option` WRITE;
/*!40000 ALTER TABLE `survey_option` DISABLE KEYS */;
INSERT INTO `survey_option` VALUES (1,1,'yes','Yes',1,1,'2025-12-18 17:09:11','2025-12-18 17:09:11'),(2,1,'no','No',2,1,'2025-12-18 17:09:11','2025-12-18 17:09:11');
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
  `randomize_group` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_type` enum('SINGLE_CHOICE','MULTI_CHOICE','LIKERT','TEXT','NUMBER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `helper_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL,
  `config_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_survey_question_order` (`survey_id`,`order_index`),
  CONSTRAINT `survey_question_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `survey` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_question`
--

LOCK TABLES `survey_question` WRITE;
/*!40000 ALTER TABLE `survey_question` DISABLE KEYS */;
INSERT INTO `survey_question` VALUES (1,1,1,NULL,'SINGLE_CHOICE','Do you like the event?',NULL,1,NULL,'2025-12-18 17:09:11','2025-12-18 17:09:11');
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
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','DROPPED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `dropped_at` datetime DEFAULT NULL,
  `reward_status` enum('NONE','SCHEDULED','GRANTED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_payload` json DEFAULT NULL,
  `last_question_id` int DEFAULT NULL,
  `last_activity_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_id` (`survey_id`),
  KEY `user_id` (`user_id`),
  KEY `trigger_rule_id` (`trigger_rule_id`),
  KEY `last_question_id` (`last_question_id`),
  CONSTRAINT `survey_response_ibfk_1` FOREIGN KEY (`survey_id`) REFERENCES `survey` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_ibfk_3` FOREIGN KEY (`trigger_rule_id`) REFERENCES `survey_trigger_rule` (`id`) ON DELETE SET NULL,
  CONSTRAINT `survey_response_ibfk_4` FOREIGN KEY (`last_question_id`) REFERENCES `survey_question` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_survey_reward_status` CHECK ((`reward_status` in (_utf8mb4'NONE',_utf8mb4'SCHEDULED',_utf8mb4'GRANTED',_utf8mb4'FAILED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_response`
--

LOCK TABLES `survey_response` WRITE;
/*!40000 ALTER TABLE `survey_response` DISABLE KEYS */;
INSERT INTO `survey_response` VALUES (1,1,2,NULL,'IN_PROGRESS','2025-12-18 08:11:40',NULL,NULL,'NONE',NULL,1,'2025-12-18 08:11:40','2025-12-18 08:11:32','2025-12-18 08:11:40');
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
  `answer_text` text COLLATE utf8mb4_unicode_ci,
  `answer_number` int DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `answered_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_response_question` (`response_id`,`question_id`),
  KEY `question_id` (`question_id`),
  KEY `option_id` (`option_id`),
  CONSTRAINT `survey_response_answer_ibfk_1` FOREIGN KEY (`response_id`) REFERENCES `survey_response` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_answer_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `survey_question` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_response_answer_ibfk_3` FOREIGN KEY (`option_id`) REFERENCES `survey_option` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_response_answer`
--

LOCK TABLES `survey_response_answer` WRITE;
/*!40000 ALTER TABLE `survey_response_answer` DISABLE KEYS */;
INSERT INTO `survey_response_answer` VALUES (1,1,1,1,NULL,NULL,'null','2025-12-18 08:11:40');
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
  `trigger_type` enum('LEVEL_UP','INACTIVE_DAYS','GAME_RESULT','MANUAL_PUSH') COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_config_json` json DEFAULT NULL,
  `priority` int NOT NULL,
  `cooldown_hours` int NOT NULL,
  `max_per_user` int NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `survey_id` (`survey_id`),
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_name` (`name`),
  KEY `ix_team_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
INSERT INTO `team` VALUES (1,'노엘',NULL,1,'2025-12-18 17:06:42','2025-12-18 17:06:42'),(2,'루미에르',NULL,1,'2025-12-18 17:06:42','2025-12-18 17:06:42'),(3,'에버그린',NULL,1,'2025-12-18 17:06:42','2025-12-18 17:06:42'),(4,'오로라',NULL,1,'2025-12-18 17:06:42','2025-12-18 17:06:42'),(5,'코발트',NULL,1,'2025-12-18 17:06:42','2025-12-18 17:06:42');
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
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delta` int NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `team_id` (`team_id`),
  KEY `idx_tel_user` (`user_id`),
  KEY `idx_tel_season_team` (`season_id`,`team_id`,`created_at`),
  CONSTRAINT `team_event_log_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_event_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `team_event_log_ibfk_3` FOREIGN KEY (`season_id`) REFERENCES `team_season` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_event_log`
--

LOCK TABLES `team_event_log` WRITE;
/*!40000 ALTER TABLE `team_event_log` DISABLE KEYS */;
INSERT INTO `team_event_log` VALUES (1,1,2,2,'MANUAL',50,'null','2025-12-18 09:05:09'),(2,1,2,2,'GAME_PLAY',10,'{\"result\": null, \"reward_type\": \"POINT\", \"feature_type\": \"ROULETTE\", \"reward_amount\": 500}','2025-12-18 09:08:37');
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
  `role` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `joined_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_team_member_team` (`team_id`),
  CONSTRAINT `team_member_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_member`
--

LOCK TABLES `team_member` WRITE;
/*!40000 ALTER TABLE `team_member` DISABLE KEYS */;
INSERT INTO `team_member` VALUES (2,1,'member','2025-12-18 08:49:55');
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
  `points` bigint NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`team_id`,`season_id`),
  UNIQUE KEY `uq_team_score` (`team_id`,`season_id`),
  KEY `idx_team_score_points` (`season_id`,`points`),
  CONSTRAINT `team_score_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_score_ibfk_2` FOREIGN KEY (`season_id`) REFERENCES `team_season` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_score`
--

LOCK TABLES `team_score` WRITE;
/*!40000 ALTER TABLE `team_score` DISABLE KEYS */;
INSERT INTO `team_score` VALUES (1,2,60,'2025-12-18 09:08:37');
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `rewards_schema` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_season_name` (`name`),
  KEY `idx_team_season_time` (`starts_at`,`ends_at`),
  KEY `idx_team_season_active` (`is_active`),
  KEY `ix_team_season_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_season`
--

LOCK TABLES `team_season` WRITE;
/*!40000 ALTER TABLE `team_season` DISABLE KEYS */;
INSERT INTO `team_season` VALUES (1,'Team Battle Event 2025-12-15','2025-12-15 13:00:00','2025-12-21 13:00:00',0,'{\"top3_coupon\": 10000, \"rank1_coupon\": 30000, \"rank2_points\": 100}','2025-12-18 17:06:42','2025-12-18 17:06:42'),(2,'Team Battle 2025-12-16','2025-12-18 08:00:00','2025-12-21 08:00:00',1,NULL,'2025-12-18 17:06:42','2025-12-18 08:49:52');
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
  `external_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` int NOT NULL DEFAULT '1',
  `xp` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vault_balance` int NOT NULL DEFAULT '0',
  `cash_balance` int NOT NULL DEFAULT '0',
  `vault_fill_used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_id` (`external_id`),
  KEY `ix_user_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'demo-user',NULL,NULL,1,0,'ACTIVE',NULL,NULL,0,0,NULL,'2025-12-18 17:06:41','2025-12-18 17:06:41'),(2,'smoke-user',NULL,'13d249f2cb4127b40cfa757866850278793f814ded3c587fe5889e889a7a9f6c',1,0,'ACTIVE','2025-12-18 08:07:03','172.19.0.1',15000,500,'2025-12-18 09:08:08','2025-12-18 08:06:58','2025-12-18 09:08:37'),(3,'test-user-001','Test User',NULL,1,0,'ACTIVE',NULL,NULL,0,0,NULL,'2025-12-18 18:48:38','2025-12-18 18:48:38'),(4,'지지미니',NULL,'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,0,'ACTIVE','2025-12-20 11:55:18','172.19.0.1',0,0,NULL,'2025-12-19 04:15:57','2025-12-20 11:55:18'),(5,'지지니미',NULL,'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',1,0,'ACTIVE','2025-12-19 09:41:54','172.19.0.1',0,0,NULL,'2025-12-19 09:41:54','2025-12-19 09:41:54');
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
  `last_play_at` datetime DEFAULT NULL,
  `roulette_plays` int NOT NULL DEFAULT '0',
  `dice_plays` int NOT NULL DEFAULT '0',
  `lottery_plays` int NOT NULL DEFAULT '0',
  `total_play_duration` int NOT NULL DEFAULT '0',
  `last_bonus_used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_activity_user` (`user_id`),
  KEY `ix_user_activity_user_updated_at` (`user_id`,`updated_at`),
  KEY `ix_user_activity_user_id` (`user_id`),
  KEY `ix_user_activity_id` (`id`),
  CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activity`
--

LOCK TABLES `user_activity` WRITE;
/*!40000 ALTER TABLE `user_activity` DISABLE KEYS */;
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
  `event_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_activity_event_event_id` (`event_id`),
  KEY `ix_user_activity_event_user_id` (`user_id`),
  KEY `ix_user_activity_event_user_created` (`user_id`,`created_at`),
  KEY `ix_user_activity_event_id` (`id`),
  CONSTRAINT `user_activity_event_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activity_event`
--

LOCK TABLES `user_activity_event` WRITE;
/*!40000 ALTER TABLE `user_activity_event` DISABLE KEYS */;
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
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_cash_ledger_id` (`id`),
  KEY `ix_user_cash_ledger_user_id` (`user_id`),
  CONSTRAINT `user_cash_ledger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_cash_ledger`
--

LOCK TABLES `user_cash_ledger` WRITE;
/*!40000 ALTER TABLE `user_cash_ledger` DISABLE KEYS */;
INSERT INTO `user_cash_ledger` VALUES (1,2,500,500,'roulette_spin',NULL,'{}','2025-12-18 09:08:37');
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
  `feature_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_event_log_id` (`id`),
  KEY `ix_user_event_log_user_created_at` (`user_id`,`created_at`),
  KEY `ix_user_event_log_event_name` (`event_name`),
  CONSTRAINT `user_event_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_event_log`
--

LOCK TABLES `user_event_log` WRITE;
/*!40000 ALTER TABLE `user_event_log` DISABLE KEYS */;
INSERT INTO `user_event_log` VALUES (1,2,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"smoke-user\"}','2025-12-18 08:06:58'),(2,2,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"smoke-user\"}','2025-12-18 08:07:03'),(3,2,'ROULETTE','PLAY','{\"label\": \"500 코인\", \"segment_id\": 3, \"reward_type\": \"POINT\", \"reward_amount\": 500, \"xp_from_reward\": 5}','2025-12-18 09:08:37'),(4,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 04:15:57'),(5,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 05:34:09'),(6,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 06:09:32'),(7,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 06:20:30'),(8,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 07:05:10'),(9,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 07:05:28'),(10,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 07:06:01'),(11,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 07:14:45'),(12,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 07:21:09'),(13,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 08:28:20'),(14,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 08:36:33'),(15,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 09:02:10'),(16,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 09:05:40'),(17,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 09:22:19'),(18,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 09:27:03'),(19,5,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지니미\"}','2025-12-19 09:41:54'),(20,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 09:49:12'),(21,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-19 09:52:36'),(22,4,'AUTH','AUTH_LOGIN','{\"ip\": \"172.19.0.1\", \"external_id\": \"지지미니\"}','2025-12-20 11:55:18');
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
  `token_type` enum('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `balance` int NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_token_type` (`user_id`,`token_type`),
  KEY `ix_user_game_wallet_id` (`id`),
  KEY `ix_user_game_wallet_user_id` (`user_id`),
  CONSTRAINT `user_game_wallet_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet`
--

LOCK TABLES `user_game_wallet` WRITE;
/*!40000 ALTER TABLE `user_game_wallet` DISABLE KEYS */;
INSERT INTO `user_game_wallet` VALUES (1,2,'CC_COIN',500,'2025-12-18 08:49:57'),(2,2,'DICE_TOKEN',5,'2025-12-18 09:08:10'),(3,2,'ROULETTE_COIN',4,'2025-12-18 09:08:36'),(4,1,'ROULETTE_COIN',0,'2025-12-19 03:20:16'),(11,4,'ROULETTE_COIN',0,'2025-12-19 05:03:53'),(12,4,'DICE_TOKEN',0,'2025-12-19 05:03:53'),(13,4,'LOTTERY_TICKET',0,'2025-12-19 05:03:53'),(14,5,'ROULETTE_COIN',0,'2025-12-19 09:41:54'),(15,5,'DICE_TOKEN',0,'2025-12-19 09:41:58'),(16,5,'LOTTERY_TICKET',0,'2025-12-19 09:42:00');
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
  `token_type` enum('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `delta` int NOT NULL,
  `balance_after` int NOT NULL,
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_game_wallet_ledger_id` (`id`),
  KEY `ix_user_game_wallet_ledger_token_type` (`token_type`),
  KEY `ix_user_game_wallet_ledger_user_id` (`user_id`),
  CONSTRAINT `user_game_wallet_ledger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_game_wallet_ledger`
--

LOCK TABLES `user_game_wallet_ledger` WRITE;
/*!40000 ALTER TABLE `user_game_wallet_ledger` DISABLE KEYS */;
INSERT INTO `user_game_wallet_ledger` VALUES (1,2,'CC_COIN',500,500,'GRANT',NULL,'{}','2025-12-18 08:49:57'),(2,2,'DICE_TOKEN',5,5,'GRANT',NULL,'{}','2025-12-18 09:08:10'),(3,2,'ROULETTE_COIN',5,5,'GRANT',NULL,'{}','2025-12-18 09:08:34'),(4,2,'ROULETTE_COIN',-1,4,'ROULETTE_PLAY','500 코인','{\"segment_id\": 3}','2025-12-18 09:08:36');
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
  `level` int NOT NULL,
  `xp` int NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_level_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `level` int NOT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_payload` json DEFAULT NULL,
  `auto_granted` tinyint(1) NOT NULL,
  `granted_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_level_reward` (`user_id`,`level`),
  KEY `ix_user_level_reward_log_id` (`id`),
  CONSTRAINT `user_level_reward_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `segment` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_segment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `source` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delta` int NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_user_xp_event_log_id` (`id`),
  CONSTRAINT `user_xp_event_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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

-- Dump completed on 2025-12-20 20:58:54
