/* ============================================================
   data/shifts.js — All shifts and their bus rosters
   Single source of truth. Was duplicated in index.html + driver.html.

   TO ADD A BUS: add { id: "mXXX_bN", label: "Route Name" }
   TO ADD A SHIFT: add a new key with its bus array
   ============================================================ */

const SHIFT_BUSES = {
  morning730: [
    { id: "m730_b1",  label: "Vadagaon (via Nath Pai Circle)" },
    { id: "m730_b2",  label: "Vadagaon (alt route)" },
    { id: "m730_b3",  label: "Ramtheerth Nagar" },
    { id: "m730_b4",  label: "Mahantesh Nagar" },
    { id: "m730_b5",  label: "Hanuman Nagar" },
    { id: "m730_b6",  label: "Uchagoan/Ganeshpur" },
    { id: "m730_b7",  label: "Shahapur" },
    { id: "m730_b8",  label: "Kakati" },
    { id: "m730_b9",  label: "Bhagya Nagar" },
    { id: "m730_b10", label: "Marihal" },
    { id: "m730_b11", label: "RTO Circle & CBT" },
    { id: "m730_b12", label: "RC Nagar" },
    { id: "m730_b13", label: "Shahu Nagar" },
    { id: "m730_b14", label: "Khanapur" },
  ],

  morning900: [
    { id: "m900_b1",  label: "Vadagaon (via Nath Pai Circle)" },
    { id: "m900_b2",  label: "Vadagaon (alt route)" },
    { id: "m900_b3",  label: "Ramtheerth Nagar" },
    { id: "m900_b4",  label: "Mahantesh Nagar" },
    { id: "m900_b5",  label: "Hanuman Nagar" },
    { id: "m900_b6",  label: "Uchagoan/Ganeshpur" },
    { id: "m900_b7",  label: "Shahapur" },
    { id: "m900_b8",  label: "Kakati" },
    { id: "m900_b9",  label: "Bhagya Nagar" },
    { id: "m900_b10", label: "Marihal" },
    { id: "m900_b11", label: "RTO Circle & CBT" },
    { id: "m900_b12", label: "RC Nagar" },
    { id: "m900_b13", label: "Shahu Nagar" },
    { id: "m900_b14", label: "Khanapur" },
  ],
};
