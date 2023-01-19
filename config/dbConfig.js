const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL);

const connection = mongoose.connection;

connection.on("connected", () => {
  console.log("Conectado a MongoDB");
});

connection.on("error", (error) => {
  console.log("Error conectando a MongoDB", error);
});

module.exports = mongoose;
