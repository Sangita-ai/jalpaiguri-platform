const bcrypt = require("bcryptjs");

bcrypt.hash("Demo@1234", 10).then((hash) => {
  console.log(hash);
});