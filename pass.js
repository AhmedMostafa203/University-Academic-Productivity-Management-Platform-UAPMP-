const bcrypt = require("bcrypt");

// الكلمة التي تريد اختبارها
const password = process.argv[2];

// الهاش الموجود عندك
const hash = "$2b$10$r9aQX.flEACZnaMENsWh5Ou0M/0iGfdMMrUVJ7KI22oeyzqTZe/LK";

if (!password) {
  console.log("Usage: node testPassword.js <password>");
  process.exit();
}

bcrypt
  .compare(password, hash)
  .then((result) => {
    if (result) {
      console.log("✅ Password is correct");
    } else {
      console.log("❌ Wrong password");
    }
  })
  .catch((err) => console.error(err));
