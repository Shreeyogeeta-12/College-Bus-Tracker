/* ============================================================
   data/routes.js — Ordered stop lists for all 52 bus routes
   Single source of truth. Was duplicated in index.html + driver.html.

   Key format: {shift}_{bus}  e.g. "m730_b3", "d400_b5"
   Stops must match keys in data/stops.js exactly.

   TO ADD A ROUTE: add a new key with an ordered stop array
   ============================================================ */

const ROUTE_STOPS = {

  // ── Morning 7:30 AM pickup ───────────────────────────────────
  m730_b1:  ["KLS GIT","GCC Hostel", "Jain PU College", "Imer College", "Yellur Cross", "Vadagoan", "Bharat Nagar", "Khasbhag", "Nath Pai Circle", "Anand Wadi", "Goaves", "RPD Cross"],
  m730_b2:  ["KLS GIT", "Vadagaon", "Channamma Circle", "CBT"],
  m730_b3:  ["KLS GIT", "Surabhi Hotel", "LSA School", "Kanbargi", "Ganesh Circle", "Uday School Stop 0", "Uday school stop 1", "KSCA CRICKET STADIUM", "Harsha hotel", "Janata plot", "Sai mandir", "Shrinagar garden", "SGBIT", "Kannada Bhavan ", "Ramdev", "Channamma circle", "Bogarves"],
  m730_b4:  ["KLS GIT", "Harsha Hotel", "Janata plot", "More Store", "Nandini Dairy", "Sidnal Stop", "Mahantesh Nagar 1st Stop", "Fort lake", "RTO", "Channamma Circle", "Bogarves"],
  m730_b5:  ["KLS GIT", "Ganesh Temple", "Kuvempu Nagar", "KLE School", "Sahaydri Nagar", "Kumarswamy Layout", "Hostel","Hanuman Nagar 2nd Stop", "Hanuman Nagar Circle","NCC ground","Rail nagar", "Sadashiv Nagar Last Stop", "Channamma Circle", "Bogarves", "Congress Road"],
  m730_b6:  ["KLS GIT", "Ganapati Temple", "Vijayanagar 2nd Stop", "Hindalga Jail", "Sulaga", "Uchagoan Cross", "Kranti Nagar", "Ganeshpur", "Pipeline", "Vinayak Nagar"],
  m730_b7:  ["KLS GIT", "Swaroop Theater", "Kapileshwar", "Renuka Hotel", "Apoorva Hostipal", "Bhatkande School", "Tukaram Bank", "Datt Mandir", "Goaves"],
  m730_b8:  ["KLS GIT", "Kakati Police Station", "Muttanatti Cross", "Yamnapur", "Indal Circle", "LakeView Nursing College", "NEXA Showroom", "Convention Hall", "Basav Colony", "OLA Showroom", "Vishal Dhaba", "Shahu Nagar Bus Stop", "Basavan Temple", "Ladies Hostel", "Laxmi complex", "Zudio Mall", "Channamma Circle"],
  m730_b9:  ["KLS GIT","Bhagya Nagar", "Hari mandir","Raghunath Peth", "Girls hostel","KLE Engg College"],
  m730_b10: ["KLS GIT", "Marihal", "Modaga", "Anand Nagar", "Pant Balekundari", "Honnalli", "Balekundri", "Sambra", "Mutaga", "Niliji", "Shindoli", "Basavan Kudachi", "SC Motors", "Gandhi Nagar"],
  m730_b11: ["KLS GIT", "CBT", "Fort Circle", "RTO", "Chennamma Circle", "Bogarves", "Fish Market", "Gogte Circle", "1st Gate", "2nd Gate", "3rd Gate"],
  m730_b12: ["KLS GIT", "1st Gate", "Lotus Hospital","Mandoli Road", "Guru Prasad Colony", "Laxmi Temple", "SBI Bank", "Post Office", "Jain Heritage School", "Utsav Hotel", "Banko"],
  m730_b13: ["KLS GIT", "Shahu Nagar", "Nehru Nagar", "Camp", "Congress Road"],
  m730_b14: ["KLS GIT", "Khanapur Old Bus Stop", "Khanapur New Bus Stop", "Jamboti Cross", "Court", "Idalonda", "Prabhu Nagar", "Desur", "BCM Macche", "Macche", "Phirwadi Naka", "Brahma Nagar", "Jitu Hostel"],

  // ── Morning 9:00 AM pickup ───────────────────────────────────
  m900_b1:  ["KLS GIT", "GCC Hostel", "Jain PU College", "Imer College", "Yellur Cross", "Vadagoan", "Bharat Nagar", "Khasbhag", "Nath Pai Circle", "Anand Wadi", "Goaves", "RPD Cross"],
  m900_b2:  ["KLS GIT", "Vadagaon", "Channamma Circle", "CBT"],
  m900_b3:  ["KLS GIT", "Surabhi Hotel", "LSA School", "Kanbargi", "Ganesh Circle", "Uday School Stop 0", "Uday school stop 1", "KSCA CRICKET STADIUM", "Harsha hotel", "Janata plot", "Sai mandir", "Shrinagar garden", "Shri nagar stop", "SGBIT", "Kannada Bhavan ", "Ramdev", "Channamma circle", "Bogarves"],
  m900_b4:  ["KLS GIT", "Harsha Hotel", "Janata plot", "More Store", "Nandini Dairy", "Sidnal Stop", "Mahantesh Nagar 1st Stop", "Fort lake", "RTO", "Channamma Circle", "Bogarves"],
  m900_b5:  ["KLS GIT", "Ganesh Temple", "Kuvempu Nagar", "KLE School", "Sahaydri Nagar", "Kumarswamy Layout", "Hostel","Hanuman Nagar 2nd Stop", "Hanuman Nagar Circle","NCC ground","Rail nagar", "Sadashiv Nagar Last Stop", "Channamma Circle", "Bogarves", "Congress Road"],
  m900_b6:  ["KLS GIT", "Ganapati Temple", "Vijayanagar 2nd Stop", "Hindalga Jail", "Sulaga", "Uchagoan Cross", "Kranti Nagar", "Ganeshpur", "Pipeline", "Vinayak Nagar"],
  m900_b7:  ["KLS GIT", "Swaroop Theater", "Kapileshwar", "Renuka Hotel", "Apoorva Hostipal", "Bhatkande School", "Tukaram Bank", "Datt Mandir", "Goaves"],
  m900_b8:  ["KLS GIT", "Kakati","Honaga","Kakati Police station","Yamnapur", "Indal bridge","Nexa showroom","Vishal Dhaba","Shahunagar cross","Basavan temple","Nehru nagar hostel","Shri Laxmi complex", "Channamma Circle"],
  m900_b9:  ["KLS GIT", "Ladies Hostel", "City Hall", "Allahabad Bank", "Netra Group", "Chidambar Nagar 1at Stop", "Mandar Hotel", "Hari Mandir", "Big Bazar", "Banko"],
  m900_b10: ["KLS GIT", "Marihal", "Modaga", "Anand Nagar", "Pant Balekundari", "Honnalli", "Balekundri", "Sambra", "Mutaga", "Niliji", "Shindoli", "Basavan Kudachi", "SC Motors", "Gandhi Nagar"],
  m900_b11: ["KLS GIT", "CBT", "Fort Circle", "RTO", "Chennamma Circle", "Bogarves", "Fish Market", "Gogte Circle","1st Gate", "2nd Gate", "3rd Gate"],
  m900_b12: ["KLS GIT", "1st Gate", "Lotus Hospital","Mandoli Road", "Guru Prasad Colony", "Laxmi Temple", "SBI Bank", "Post Office", "Jain Heritage School", "Utsav Hotel", "Banko"],
  m900_b13: ["KLS GIT", "Shahu Nagar", "Nehru Nagar", "Camp", "Congress Road"],
  m900_b14: ["KLS GIT", "Khanapur Old Bus Stop", "Khanapur New Bus Stop", "Jamboti Cross", "Court", "Idalonda", "Prabhu Nagar", "Desur", "BCM Macche", "Macche", "Phirwadi Naka", "Brahma Nagar", "Jitu Hostel"],

};