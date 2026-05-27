/* ============================================================
   data/stops.js — GPS coordinates for every bus stop
   Single source of truth. Referenced by tracker.js only.

   TO ADD A STOP: add one line → "Stop Name": { lat: XX, lng: YY }
   ============================================================ */

const STOP_COORDS = {
  // ── Campus ─────────────────────────────────────────────────
  "KLS GIT":                  { lat: 15.814578304063655, lng: 74.48783567932439 },

  // ── City centre / CBT area ──────────────────────────────────
  "CBT":                      { lat: 15.862597703480448, lng: 74.52135239334002 },
  "Channamma Circle":         { lat: 15.867239677878619, lng: 74.5116872942316  },
  "Channamma circle":         { lat: 15.867239677878619, lng: 74.5116872942316  },
  "Bogarves":                 { lat: 15.859392831086069, lng: 74.50804352220592 },
  "RTO":                      { lat: 15.866162146121916, lng: 74.51920953747813 },
  "Fort lake":                { lat: 15.863277670308042, lng: 74.52515759286305 },
  "Fort Circle":              { lat: 15.8578,            lng: 74.5265            },
  "Fish Market":              { lat: 15.852919171544498, lng: 74.50622700152316 },

  // ── Ramtheerth Nagar / Kanbargi area ────────────────────────
  "Surabhi Hotel":            { lat: 15.879310572925196, lng: 74.54071920363943 },
  "LSA School":               { lat: 15.882715046210498, lng: 74.54435240405182 },
  "Kanbargi":                 { lat: 15.891702743041684, lng: 74.55608644028787 },
  "KPTCL":                    { lat: 15.883341886972437, lng: 74.5225009785071  },
  "Ganesh Circle":            { lat: 15.889504428235583, lng: 74.54884420231672 },
  "Ganesh circle":            { lat: 15.889504428235583, lng: 74.54884420231672 },
  "Uday School Stop 0":       { lat: 15.889430031590685, lng: 74.54728287540544 },
  "Uday school stop 1":       { lat: 15.888658144504205, lng: 74.54551317015296 },
  "Uday school":              { lat: 15.889618808076461, lng: 74.54548446923341 },
  "KSCA CRICKET STADIUM":     { lat: 15.886899193938705, lng: 74.54513625075737 },
  "Harsha hotel":             { lat: 15.887393551711304, lng: 74.54183239725833 },
  "Harsha Hotel":             { lat: 15.887393551711304, lng: 74.54183239725833 },
  "Harsha hotel ":            { lat: 15.887393551711304, lng: 74.54183239725833 },
  "Janata plot":              { lat: 15.885793559614829, lng: 74.53787674914886 },
  "Sai mandir":               { lat: 15.88180173133962,  lng: 74.53253209646233 },
  "Sai mandir ":              { lat: 15.88180173133962,  lng: 74.53253209646233 },
  "Shrinagar garden":         { lat: 15.880628133488766, lng: 74.5295568729132  },
  "Ramtheerth Nagar":         { lat: 15.887393551711304, lng: 74.54183239725833 }, // approx Harsha Hotel area

  // ── Mahantesh Nagar / Sidnal area ───────────────────────────
  "Nandini Dairy":            { lat: 15.8698,            lng: 74.5342            },
  "Nandini dairy":            { lat: 15.8698,            lng: 74.5342            },
  "Sidnal Stop":              { lat: 15.875980875387944, lng: 74.53346818447068 },
  "Sidnal stop":              { lat: 15.875980875387944, lng: 74.53346818447068 },
  "More Store":               { lat: 15.877482007161944, lng: 74.51483555995031 },
  "More stop":                { lat: 15.877482007161944, lng: 74.51483555995031 },
  "Mahantesh Nagar 1st Stop": { lat: 15.8741,            lng: 74.5391            },
  "Mahantesh Nagar":          { lat: 15.8741,            lng: 74.5391            },
  "Azam Nagar":               { lat: 15.8752,            lng: 74.5242            },
  "Gandhi Nagar":             { lat: 15.8535,            lng: 74.5342            },

  // ── SGBIT / Ramdev area ─────────────────────────────────────
  "SGBIT":                    { lat: 15.880756552550618, lng: 74.51930605282095 },
  "Kannada Bhavan ":          { lat: 15.878150570899914, lng: 74.51748429685132 },
  "Ramdev":                   { lat: 15.878547851761866, lng: 74.51578001515573 },

  // ── Hanuman Nagar / Sadashiv Nagar area ─────────────────────
  "Hindalga Ganesh Temple":   { lat: 15.868964004747033, lng: 74.48942158165639 },
  "Ganesh Temple":            { lat: 15.868964004747033, lng: 74.48942158165639 },
  "Kuvempu Nagar":            { lat: 15.874813628415831, lng: 74.4914875069715  },
  "KLE School":               { lat: 15.879464938336959, lng: 74.4849004606231  },
  "Sahaydri Nagar":           { lat: 15.88140981084143,  lng: 74.4854294948751  },
  "Kumarswami Layout":        { lat: 15.882894216407953, lng: 74.4914412919549  },
  "Hanuman Nagar 2nd Stop":   { lat: 15.880412109390043, lng: 74.49287119936872 },
  "Hanuman Nagar Circle":     { lat: 15.88020935614367,  lng: 74.49658544912198 },
  "Hanuman Nagar":            { lat: 15.88020935614367,  lng: 74.49658544912198 },
  "Sadashiv Nagar":           { lat: 15.87436655611429,  lng: 74.5079470939882  },
  "TV Centre":                { lat: 15.876,             lng: 74.502             }, // approx Sadashiv Nagar area
  "Shri nagar stop":          { lat: 15.880628133488766, lng: 74.5295568729132  }, // approx Shrinagar garden
  "Shrinagar":                { lat: 15.880628133488766, lng: 74.5295568729132  },

  // ── Ganeshpur / Indal Colony area ───────────────────────────
  "Ganeshpur":                { lat: 15.8895,            lng: 74.4998            },
  "Indal Colony":             { lat: 15.8955,            lng: 74.5212            },

  // ── Vadagaon / Goa Ves area ─────────────────────────────────
  "Congress Road":            { lat: 15.8368,            lng: 74.5008            },
  "Vadagaon":                 { lat: 15.8211,            lng: 74.5072            },
  "Nath Pai Circle":          { lat: 15.840318884689,    lng: 74.51742348182789 },
  "Goa Ves":                  { lat: 15.8429,            lng: 74.5028            },
  "RPD Cross":                { lat: 15.8354,            lng: 74.4972            },
  "Shahapur":                 { lat: 15.8338,            lng: 74.5162            },
  "Tukaram Bank":             { lat: 15.846454412651212, lng: 74.51622855097081 },
  "Bhagya Nagar":             { lat: 15.8341,            lng: 74.4985            },
  "Raghunath Peth":           { lat: 15.8338,            lng: 74.5068            },

  // ── Other areas ─────────────────────────────────────────────
  "KLE Engg College":         { lat: 15.818341735130394, lng: 74.49274331694994 },
  "Marihal":                  { lat: 15.8821,            lng: 74.6294            },
  "Sambra":                   { lat: 15.8524,            lng: 74.6148            },
  "RC Nagar":                 { lat: 15.8385,            lng: 74.4912            },
  "Mandoli Road":             { lat: 15.8315,            lng: 74.4795            },
  "Guru Prasad Colony":       { lat: 15.8431,            lng: 74.4941            },
  "Shahu Nagar":              { lat: 15.8162,            lng: 74.5295            },
  "Nehru Nagar":              { lat: 15.8762,            lng: 74.5115            },
  "Camp":                     { lat: 15.8512,            lng: 74.5035            },
  "Kakati":                   { lat: 15.9398,            lng: 74.5204            },
  "Khanapur":                 { lat: 15.6394,            lng: 74.5185            },
  "BCM Hostel":               { lat: 15.7915,            lng: 74.4421            },
  "Machhe":                   { lat: 15.7952,            lng: 74.4485            },
};
