/*Mongoose imports*/

const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

/* Template schéma correspond à une collection MongoDB et définit la forme des documents au sein de cette collection*/
const ClientSchema = new mongoose.Schema(
  {
    resetPasswordDate: Date,
    autorisation: Boolean,
    gender: String,
    lastname: String,
    firstname: String,
    password: String,
    age: String,
    adress: String,
    phone: String,
    email: { type: String, unique: true },
    /*check que notre email est bien unique */
    historique: [
      {
        montant: Number,
        date: Date,
        waiter: String,
        general: String,
        restaurantName: String,
      },
    ],
    favoris: [{ restaurantName: String, link: String }],
  },
  { collection: "TestClientSaida" }
);

/*  uniqueValidator verifie que 2 utilisateurs n'ont pas la même adresse mail */
ClientSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Client", ClientSchema);
