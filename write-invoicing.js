// This script writes the invoicing feature files
const fs = require("fs");
const p = (f, c) => { fs.writeFileSync(f, c, "utf8"); console.log("OK: " + f); };

