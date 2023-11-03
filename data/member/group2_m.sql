-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2023-10-19 05:37:24
-- 伺服器版本： 10.4.28-MariaDB
-- PHP 版本： 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `group2`
--

-- --------------------------------------------------------

--
-- 資料表結構 `bookmark_camp`
--

CREATE TABLE `bookmark_camp` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `campGroundID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 傾印資料表的資料 `bookmark_camp`
--

INSERT INTO `bookmark_camp` (`id`, `user_id`, `campGroundID`) VALUES
(1, 4, 1),
(3, 5, 1),
(4, 5, 2),
(5, 62, 1),
(6, 62, 2),
(7, 50, 1),
(8, 50, 2),
(9, 4, 2);

-- --------------------------------------------------------

--
-- 資料表結構 `bookmark_event`
--

CREATE TABLE `bookmark_event` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `events_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 傾印資料表的資料 `bookmark_event`
--

INSERT INTO `bookmark_event` (`id`, `user_id`, `events_id`) VALUES
(1, 4, 1),
(2, 4, 3),
(3, 4, 4),
(4, 4, 15),
(5, 4, 18),
(6, 4, 21),
(7, 4, 20),
(8, 4, 25),
(9, 4, 10);

-- --------------------------------------------------------

--
-- 資料表結構 `bookmark_product`
--

CREATE TABLE `bookmark_product` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 傾印資料表的資料 `bookmark_product`
--

INSERT INTO `bookmark_product` (`id`, `user_id`, `product_id`) VALUES
(1, 4, 39),
(2, 4, 40),
(13, 4, 41),
(16, 4, 42);

-- --------------------------------------------------------

--
-- 資料表結構 `forgotpsw`
--

CREATE TABLE `forgotpsw` (
  `s_id` int(11) NOT NULL,
  `user_mail` varchar(75) NOT NULL,
  `resetCode` varchar(10) NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `members`
--

CREATE TABLE `members` (
  `user_id` int(11) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `gender` tinyint(1) NOT NULL,
  `user_mail` varchar(75) NOT NULL,
  `user_img` varchar(100) NOT NULL,
  `user_phone` varchar(15) NOT NULL,
  `city` varchar(10) NOT NULL,
  `area` varchar(10) NOT NULL,
  `user_address` varchar(100) NOT NULL,
  `postal_code` int(6) NOT NULL,
  `create_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `update_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_state` tinyint(1) NOT NULL DEFAULT 1,
  `level_id` tinyint(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 傾印資料表的資料 `members`
--

INSERT INTO `members` (`user_id`, `user_name`, `password`, `first_name`, `last_name`, `gender`, `user_mail`, `user_img`, `user_phone`, `city`, `area`, `user_address`, `postal_code`, `create_date`, `update_date`, `user_state`, `level_id`) VALUES
(4, 'Tom123', '$2a$08$pppez6ONf6G7o3Q.FspxK.wRx4n94C31MM3zAAGPJUxI0NGQYotb2', 'Close', 'Tom', 1, 'Tom_Close@campmail.com', '4_1697420591792.png', '9553658464', '臺南市', '安南區', '開安一街9號', 709, '2023-07-24 06:00:30', '2023-10-16 01:43:11', 1, 2),
(5, 'Amy456', '$2a$08$Y.XMqskdr6z7wD3Azx1e4u.M5pM2O69EvwL0RGSeNkPyr78GxrwKC', '宜琳', '陳', 1, '456@campmail.com', '1690687262.png', '9364444444', '屏東縣', '新園鄉', '中山路3號', 900, '2023-07-24 06:02:24', '2023-07-30 03:21:02', 1, 2),
(6, 'Sue111', '$2a$08$1c5sQDP20uWgef4FwOAQe.Gua34zXxxZlfJEkFaDcakA.xLvkebRi', '江', '一二', 0, 'AGGGG@campmail.com', '1690686557.png', '1234567890', '宜蘭縣', '員山鄉', '大湖十二路14號', 264, '2023-07-24 06:22:16', '2023-07-28 09:32:08', 1, 3),
(7, 'Salen156', '45678', '林', '國', 1, 'TTSSS13@campmail.com', '1690687273.png', '1456667890', '臺南市', '仁德區', '中清路14號', 700, '2023-07-24 06:22:16', '2023-07-30 03:21:13', 1, 2),
(8, 'Tony8792', '12894aa', '洪', '都拉斯', 1, 'Tose@campmail.com', '1690687281.png', '9553658464', '花蓮縣', '光復鄉', '民生路11號', 970, '2023-07-24 06:22:16', '2023-07-30 03:21:21', 1, 2),
(9, 'Alex579', 'aaa58', '林', '小明', 1, 'Toe1385@campmail.com', '1690687529.png', '8085956321', '臺北市', '大安區', '濟南路23號', 100, '2023-07-24 06:22:16', '2023-07-30 03:25:29', 1, 3),
(10, 'Rest', '2334as5', '王', '曉華', 0, 'G153as@campmail.com', '1690687529.png', '2592585299', '臺中市', '神岡區', '前寮路31號', 429, '2023-07-24 06:22:16', '2023-07-24 06:22:16', 1, 2),
(11, 'TT45676', 'xc845', '吳', '柏毅', 1, 'cpcp@campmail.com', '1690687529.png', '1659665842', '彰化縣', '花壇鄉', '虎山街16號', 503, '2023-07-24 06:22:16', '2023-07-24 06:22:16', 1, 3),
(12, 'Reee13', 'r98cg', '賴', '貼圖', 1, 'vvvv@campmail.com', '1690684385.png', '9854621351', '臺中市', '烏日區', '三榮路5號', 414, '2023-07-24 06:22:16', '2023-07-26 06:11:01', 1, 4),
(13, 'YEEEEsss', 'ns86d45s', '蔡', '英文', 0, 'aspsds@campmail.com', '1690684385.png', '2147483647', '高雄市', '旗山區', '光復二街21號', 800, '2023-07-24 06:22:16', '2023-07-30 02:33:05', 1, 6),
(14, 'POPEOL', 'dsd94', '蘇', '加權', 1, 'aposldd@campmail.com', '1690684385.png', '9845741691', '桃園市', '大溪區', '安和路29號', 335, '2023-07-24 06:22:16', '2023-07-24 06:22:16', 1, 5),
(15, 'KLOL333', 'eeret9', '江', '哲明', 1, 'bbsdsds@campmail.com', '1690684352.png', '9874581651', '苗栗縣', '頭份市', '興四街25號', 351, '2023-07-24 06:22:16', '2023-07-24 06:22:16', 1, 5),
(16, 'Sue11', '12345', '江', '二', 1, 'AGGG@campmail.com', '1690684352.png', '1234554690', '臺中市', '北屯區', '景賢三路31號', 406, '2023-07-24 06:31:27', '2023-07-24 06:31:27', 1, 4),
(17, 'Sal156', '45678', '林', '家女孩', 0, 'TTS13@campmail.com', '1690684352.png', '1123667890', '臺南市', '關廟區', '深坑三街33號', 718, '2023-07-24 06:31:27', '2023-07-24 06:31:27', 1, 4),
(18, 'Ton792', '12894aa', '洪', '黃藍', 1, 'Toe@campmail.com', '1690684352.png', '9553489462', '新北市', '雙溪區', '大平21號', 207, '2023-07-24 06:31:27', '2023-07-30 06:07:09', 1, 1),
(19, 'Al579', 'aaa58', '林', '阿明', 1, 'To185@campmail.com', '1690686541.png', '8085556321', '彰化縣', '和美鎮', '忠全路10號', 500, '2023-07-24 06:31:27', '2023-07-30 03:09:01', 1, 1),
(20, 'Rt', '2334as5', '王', '國華', 0, 'G53as@campmail.com', '1690684352.png', '2592225255', '南投縣', '南投市', '大庄路16號', 540, '2023-07-24 06:31:27', '2023-07-30 03:09:05', 1, 1),
(21, 'TT676', 'xc845', '陳', '相', 0, 'ccp@campmail.com', '1690686557.png', '1659655442', '臺中市', '大里區', '上田街21號', 412, '2023-07-24 06:31:27', '2023-07-24 06:31:27', 1, 4),
(22, 'Re13', 'r98cg', '賴', '痛', 1, 'vvv@campmail.com', '1690686557.png', '9878921359', '宜蘭縣', '五結鄉', '錦草五路16號', 260, '2023-07-24 06:31:27', '2023-07-30 03:09:17', 1, 1),
(23, 'YEEEss', 'ns86d45s', '蔡', '菜子', 0, 'aspds@campmail.com', '1690686569.png', '2147483647', '南投縣', '集集鎮', '中山街13號', 540, '2023-07-24 06:31:27', '2023-07-30 03:09:29', 1, 1),
(24, 'POPE', 'dsd94', '蘇', '達丙', 1, 'apldd@campmail.com', '1690686630.png', '9845789699', '桃園市', '中壢區', '松智二街5號', 320, '2023-07-24 06:31:27', '2023-07-30 03:10:30', 1, 1),
(25, 'LOL3', 'eeret9', '蘇', '翠翠', 0, 'bbdss@campmail.com', '1690686648.png', '9877891654', '雲林縣', '麥寮鄉', '光復路6號', 630, '2023-07-24 06:31:27', '2023-07-30 03:10:48', 1, 1),
(26, 'Tony8792', '12894aa', '洪', '都拉斯', 0, 'Tose@campmail.com', '1690686682.png', '9553658464', '花蓮縣', '光復鄉', '民生路11號', 970, '2023-07-24 06:22:16', '2023-07-30 03:11:22', 1, 1),
(27, 'Andy123', '14569', '王', '中仁', 1, 'andy879@campmail.com', '1690687189.png', '1254984521', '臺中市', '西區', '精誠三十街5號', 400, '2023-07-24 08:55:58', '2023-07-30 03:19:49', 1, 1),
(37, 'YEEEEsss', 'ns86d45s', '蔡', '英文', 0, 'aspsds@campmail.com', '1690687218.png', '2147483647', '高雄市', '旗山區', '光復二街21號', 800, '2023-07-26 09:55:53', '2023-07-30 03:20:18', 1, 1),
(38, 'YEEEEsss', 'ns86d45s', '蔡', '英文', 0, 'aspsds@campmail.com', '1690687227.png', '2147483647', '高雄市', '旗山區', '光復二街21號', 800, '2023-07-26 10:17:55', '2023-07-30 03:20:27', 1, 1),
(43, 'ROE888', '12345', '王', '大名', 1, 'REN888@campmail.com', '1690370680.jpg', '1698745862', '台北市', '信義區', '吃吃路呵呵街56號', 124, '2023-07-26 11:56:00', '2023-07-26 11:56:00', 1, 3),
(46, 'Tom123', 'a12345', '林', '天與', 1, '1@13.mo', '1690687241.png', '1985649372', '新北市', '深坑區', '00路000號', 207, '2023-07-28 06:42:37', '2023-07-30 03:20:41', 1, 1),
(47, 'Sal156', '45678', '林', '家女孩', 0, 'TTS13@campmail.com', '1690687352.png', '1123667890', '臺南市', '關廟區', '深坑三街33號', 700, '2023-07-24 06:31:27', '2023-07-30 03:22:32', 1, 2),
(51, 'PineApple', '$2a$08$KLy3LX.j5f50UiZLcI2T8eiGE.YVRKhHJfbkBGVQqMI/E9xlG4tY2', '珍妮', '波蘿汁', 0, 'Jenny@campmail.com', '', '9553658464', '臺南市', '安南區', '開安一街9號', 709, '2023-10-04 02:32:58', '2023-10-04 02:32:58', 1, 1);

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `forgotpsw`
--
ALTER TABLE `forgotpsw`
  ADD PRIMARY KEY (`s_id`);

--
-- 資料表索引 `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`user_id`,`user_name`),
  ADD KEY `level_no` (`level_id`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `forgotpsw`
--
ALTER TABLE `forgotpsw`
  MODIFY `s_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `members`
--
ALTER TABLE `members`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `members`
--
ALTER TABLE `members`
  ADD CONSTRAINT `level_no` FOREIGN KEY (`level_id`) REFERENCES `level` (`level_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
