-- ============================================================
-- Mutfak Nabzı — Seed Data (Demo Restoranlar)
-- ============================================================

INSERT INTO restaurants (id, name, brand, city, district, address, region, capacity, lat, lng) VALUES
('r1','Burger King Kadıköy','BURGER_KING','İstanbul','Kadıköy','Bahariye Cad. No:42','Anadolu Yakası',80,40.9903,29.0264),
('r2','Burger King Beşiktaş','BURGER_KING','İstanbul','Beşiktaş','Barbaros Blv. No:15','Avrupa Yakası',100,41.0434,29.0055),
('r3','Burger King Ümraniye','BURGER_KING','İstanbul','Ümraniye','Alemdağ Cad. No:88','Anadolu Yakası',120,41.0167,29.1000),
('r4','Burger King Şişli','BURGER_KING','İstanbul','Şişli','Halaskargazi Cad. No:7','Avrupa Yakası',90,41.0602,28.9877),
('r5','Burger King Maltepe','BURGER_KING','İstanbul','Maltepe','Bağdat Cad. No:203','Anadolu Yakası',75,40.9340,29.1308),
('r6','Popeyes Taksim','POPEYES','İstanbul','Beyoğlu','İstiklal Cad. No:12','Avrupa Yakası',60,41.0369,28.9850),
('r7','Popeyes Üsküdar','POPEYES','İstanbul','Üsküdar','Hakimiyet-i Milliye Cad. No:5','Anadolu Yakası',70,41.0233,29.0151),
('r8','Popeyes Bağcılar','POPEYES','İstanbul','Bağcılar','Fevzi Çakmak Cad. No:44','Avrupa Yakası',85,41.0378,28.8558),
('r9','Burger King Pendik','BURGER_KING','İstanbul','Pendik','Ankara Cad. No:120','Anadolu Yakası',95,40.8753,29.2313),
('r10','Popeyes Bakırköy','POPEYES','İstanbul','Bakırköy','İncirli Cad. No:34','Avrupa Yakası',65,40.9814,28.8731)
ON CONFLICT (id) DO NOTHING;
