/* ============================================================
   data/routes.js — Ordered stop lists for all 52 bus routes
   Single source of truth. Was duplicated in index.html + driver.html.

   Key format: {shift}_{bus}  e.g. "m730_b3", "d400_b5"
   Stops must match keys in data/stops.js exactly.

   TO ADD A ROUTE: add a new key with an ordered stop array
   ============================================================ */

const ROUTE_STOPS = {

  // ── Morning 7:30 AM pickup ───────────────────────────────────
  m730_b1:  ["KLS GIT","GCC Hostel", "Jain PU College", "Imer College", "Yellur Cross", "Vadagoan", "Bharat Nagar", "Khasbhag", "Nath Pai Circle", "Anand Wadi", "Goaves", "RPD Cross","KLS GIT"],
  m730_b2:  ["KLS GIT", "Vadagaon", "Channamma Circle", "CBT", "KLS GIT"],
  m730_b3:  ["KLS GIT", "Surabhi Hotel", "LSA School", "Kanbargi", "Ganesh Circle", "Uday School Stop 0", "Uday school stop 1", "KSCA CRICKET STADIUM", "Harsha hotel", "Janata plot", "Sai mandir", "Shrinagar garden", "SGBIT", "Kannada Bhavan ", "Ramdev", "Channamma circle", "Bogarves", "KLS GIT"],
  m730_b4:  ["KLS GIT", "Harsha Hotel", "Janata plot", "More Store", "Nandini Dairy", "Sidnal Stop", "Mahantesh Nagar 1st Stop", "Fort lake", "RTO", "Channamma Circle", "Bogarves", "KLS GIT"],
  m730_b5:  ["KLS GIT", "Ganesh Temple", "Kuvempu Nagar", "KLE School", "Sahaydri Nagar", "Kumarswami Layout", "Hostel","Hanuman Nagar 2nd Stop", "Hanuman Nagar Circle","NCC ground","Rail nagar", "Sadashiv Nagar Last Stop", "Channamma Circle", "Bogarves", "Congress Road", "KLS GIT"],
  m730_b6:  ["KLS GIT", "Ganeshpur", "Channamma Circle", "CBT", "KLS GIT"],
  m730_b7:  ["KLS GIT", "Swaroop Theater", "Kapileshwar", "Renuka Hotel", "Apoorva Hostipal", "Bhatkande School", "Tukaram Bank", "Datt Mandir", "KLS GIT",],
  m730_b8:  ["KLS GIT", "Kakati Police Station", "Muttanatti Cross", "Yamnapur", "Indal Circle", "LakeView Nursing College", "NEXA Showroom", "Convention Hall", "Basav Colony", "OLA Showroom", "Vishal Dhaba", "Shahu Nagar Bus Stop", "Basavan Temple", "Ladies Hostel", "Laxmi complex", "Zudio Mall", "Channamma Circle", "KLS GIT"],
  m730_b9:  ["KLS GIT","Bhagya Nagar", "Hari mandir","Raghunath Peth", "Girls hostel","KLE Engg College", "KLS GIT"],
  m730_b10: ["KLS GIT", "Marihal", "Modaga", "Anand Nagar", "Pant Balekundari", "Honnalli", "Balekundri", "Sambra", "Mutaga", "Niliji", "Shindoli", "Basavan Kudachi", "SC Motors", "Ghandhinagar", "KLS GIT"],
  m730_b11: ["KLS GIT", "CBT", "Killa Circle", "RTO", "Chennamma Circle", "Bogarves", "Fish Market", "Gogate Circle", "1st Gate", "2nd Gate", "3rd Gate", "KLS GIT" ],
  m730_b12: ["KLS GIT", "1st Gate", "Lotus Hospital","Mandoli Road", "Guru Prasad Colony", "Laxmi Temple", "SBI Bank", "Post Office", "Jain Heritage School", "Utsav Hotel", "Banko", "KLS` GIT"],
  m730_b13: ["KLS GIT", "Shahu Nagar", "Nehru Nagar", "Camp", "Congress Road", "KLS GIT"],
  m730_b14: ["KLS GIT", "Khanapur Old Bus Stop", "Khanapur New Bus Stop", "Jamboti Cross", "Court", "Idalonda", "Prabhu Nagar", "Desur", "BCM Macche", "Macche", "Phirwadi Naka", "Brahma Nagar", "Jitu Hostel", "KLS GIT"],

  // ── Morning 9:00 AM pickup ───────────────────────────────────
  m900_b1:  ["GCC Hostel", "Jain PU College", "Imer College", "Yellur Cross", "Vadagoan", "Bharat Nagar", "Khasbhag", "Nath Pai Circle", "Anand Wadi", "Goaves", "RPD Cross","KLS GIT"],
  m900_b2:  ["Vadagaon", "Channamma Circle", "CBT", "KLS GIT"],
  m900_b3:  ["Surabhi Hotel", "LSA School", "Kanbargi", "Ganesh Circle", "Uday School Stop 0", "Uday school stop 1", "KSCA CRICKET STADIUM", "Harsha hotel", "Janata plot", "Sai mandir", "Shrinagar garden", "Shri nagar stop", "SGBIT", "Kannada Bhavan ", "Ramdev", "Channamma circle", "Bogarves", "KLS GIT"],
  m900_b4:  ["Harsha Hotel", "Janata plot", "More Store", "Nandini Dairy", "Sidnal Stop", "Mahantesh Nagar 1st Stop", "Fort lake", "RTO", "Channamma Circle", "Bogarves", "KLS GIT"],
  m900_b5:  ["Ganesh Temple", "Kuvempu Nagar", "KLE School", "Sahaydri Nagar", "Kumarswami Layout", "Hostel","Hanuman Nagar 2nd Stop", "Hanuman Nagar Circle","NCC ground","Rail nagar", "Sadashiv Nagar Last Stop", "Channamma Circle", "Bogarves", "Congress Road", "KLS GIT"],
  m900_b6:  ["Ganeshpur", "Channamma Circle", "CBT", "KLS GIT"],
  m900_b7:  ["Shahapur", "Tukaram Bank", "Goa Ves", "RPD Cross", "KLS GIT"],
  m900_b8:  ["Kakati","Honaga","Kakati Police station","Yamnapur", "Indal bridge","Nexa showroom","Visha Dhaba","Shahunagar cross","Basavan temple","Nehru nagar hostel","Shri Laxmi complex", "Channamma Circle", "KLS GIT"],
  m900_b9:  ["Ladies Hostel", "City Hall", "Allahabad Bank", "Netra Group", "Chidambar Nagar 1at Stop", "Mandar Hotel", "Hari Mandir", "Big Bazar", "Banko", "KLS GIT"],
  m900_b10: ["Marihal", "Gandhi Nagar", "Fort Circle", "KLS GIT"],
  m900_b11: ["CBT", "Killa Circle", "RTO", "Chennamma Circle", "Bogarves", "Fish Market", "Gogate Circle", "1st Gate", "2nd Gate", "3rd Gate", "KLS GIT" ],
  m900_b12: ["KLS GIT", "1st Gate", "Lotus Hospital","Mandoli Road", "Guru Prasad Colony", "Laxmi Temple", "SBI Bank", "Post Office", "Jain Heritage School", "Utsav Hotel", "Banko", "KLS` GIT"],
  m900_b13: ["Shahu Nagar", "Nehru Nagar", "Camp", "Congress Road", "KLS GIT"],
  m900_b14: ["Khanapur Old Bus Stop", "Khanapur New Bus Stop", "Jamboti Cross", "Court", "Idalonda", "Prabhu Nagar", "Desur", "BCM Macche", "Macche", "Phirwadi Naka", "Brahma Nagar", "Jitu Hostel", "KLS GIT"],

  // ── Drop 1:30 PM ─────────────────────────────────────────────
  d130_b1: ["KLS GIT", "RPD Cross", "Goa Ves", "Nath Pai Circle", "Vadagaon", "Bhagya Nagar"],
  d130_b2: ["KLS GIT", "1st Gate", "Lotus Hospital","Mandoli Road", "Guru Prasad Colony", "Laxmi Temple", "SBI Bank", "Post Office", "Jain Heritage School", "Utsav Hotel", "Banko", "KLS` GIT"],
  d130_b3: ["KLS GIT", "Bogarves", "Channamma circle", "RTO", "Mahantesh Nagar", "Sidnal stop", "Nandini dairy", "More stop", "Kanbargi", "Ramtheerth Nagar", "Ganesh circle", "Uday school", "Harsha hotel ", "Sai mandir", "Shrinagar", "SGBIT", "Ramdev"],
  d130_b4: ["KLS GIT", "Pipeline","Ganeshpur","Vinayak circle","Ganapati temple","Kuvempu nagar","KLE International School","Vidya nagar","Kumar swamy layout","Hanuman nagar circle","NCC ground","Sadashiv nagar last stop"],
  d130_b5: ["KLS GIT", "Fish Market", "Channamma Circle", "RTO", "CBT"],
  d130_b6: ["KLS GIT", "Channamma Circle", "Azam Nagar", "Indal Colony", "Kakati"],
  d130_b7: ["KLS GIT", "Gandhi Nagar", "SC Motors", "Basavan Kudachi", "Shindolli Cross", "Nilaji Cross", "Mutaga", "Sambra", "Balekundri", "Honyall Cross", "Pant Balekundri"],
  d130_b8: ["KLS GIT", "RPD Cross", "Goa Ves", "Tukaram Bank", "Shahapur"],
  d130_b9: ["KLS GIT", "Machhe", "BCM Hostel", "Khanapur"],

  // ── Drop 4:00 PM ─────────────────────────────────────────────
  d400_b1: ["KLS GIT", "Channamma Circle", "Azam Nagar", "Indal Colony", "Kakati"],
  d400_b2: ["KLS GIT", "Guru Prasad Colony", "Mandoli Road", "RC Nagar"],
  d400_b3: ["KLS GIT", "RPD Cross", "Goa Ves", "Tukaram Bank", "Shahapur"],
  d400_b4: ["KLS GIT", "More", "Ganesh Temple", "Chavan Hostipal", "Vinayak Circle", "Ganapati TEemple", "Kuvempu Nagar", "KLE School", "Sahayadri Nagar", "Kumara Swamy Layout", "Hanuman Nagar 2nd Stop", "Hanuman Nagar Circle", "FirozSait Home Stop", "NCC Ground", "Neel Nagar", "Sadashiv Nagar", "Harsha"],
  d400_b5: ["KLS GIT", "Bogarves", "Channamma circle", "RTO", "Mahantesh Nagar", "Sidnal stop", "Nandini dairy", "More stop", "Kanbargi", "Ramtheerth Nagar", "Ganesh circle", "Uday school", "Harsha hotel ", "Sai mandir", "Shrinagar", "SGBIT", "Ramdev"],
  d400_b6: ["KLS GIT", "RPD Cross", "Goa Ves", "Nath Pai Circle", "Vadagaon"],
  d400_b7: ["KLS GIT", "KLE Engg College", "Raghunath Peth", "Bhagya Nagar"],
  d400_b8: ["KLS GIT", "Fish Market", "Channamma Circle", "RTO", "CBT"],

  // ── Drop 5:15 PM ─────────────────────────────────────────────
  d515_b1:  ["KLS GIT", "Channamma Circle", "Azam Nagar", "Indal Colony", "Kakati"],
  d515_b2:  ["KLS GIT", "RPD Cross", "Goa Ves", "Nath Pai Circle", "Vadagaon"],
  d515_b3:  ["KLS GIT", "Guru Prasad Colony", "Mandoli Road", "RC Nagar"],
  d515_b4:  ["KLS GIT", "RPD Cross", "Goa Ves", "Tukaram Bank", "Shahapur"],
  d515_b5:  ["KLS GIT", "Fish Market", "Channamma Circle", "RTO", "CBT"],
  d515_b6:  ["KLS GIT", "KLE Engg College", "Raghunath Peth", "Bhagya Nagar"],
  d515_b7:  ["KLS GIT", "CBT", "Channamma Circle", "Ganeshpur"],
  d515_b8:  ["KLS GIT", "Bogarves", "Channamma circle", "RTO", "Mahantesh Nagar", "Sidnal stop", "Nandini dairy", "More stop", "Kanbargi", "Ramtheerth Nagar", "Ganesh circle", "Uday school", "Harsha hotel ", "Sai mandir", "Shrinagar", "SGBIT", "Ramdev"],
  d515_b9:  ["KLS GIT", "Congress Road", "Sadashiv Nagar Last Stop","Rail Nagar","NCC Office" , "Hanuman Nagar Circle","Hanuman nagar second cross","Hostel","Sahayadri nagar ","KLE School","KUvempu nagar","Ganapati temple"],
  d515_b10: ["KLS GIT", "Fort Circle", "Gandhi Nagar", "Marihal"],
  d515_b11: ["Khanapur Old Bus Stop", "Khanapur New Bus Stop", "Jamboti Cross", "Court", "Idalonda", "Prabhu Nagar", "Desur", "BCM Macche", "Macche", "Phirwadi Naka", "Brahma Nagar", "Jitu Hostel"],
};