// ----------------------- MONGOOSE ----------------------------------
const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

module.exports = {
  connectDatabase: () => {
    mongoose
      .connect(process.env.DATABASE)
      .then((data) => {
        console.log(`Database server connected at port: ${data.connection.port}`);
        console.log(`Database server connected at host: ${data.connection.host}`);
      })
      .catch((e) => console.log(e));
  }
};
