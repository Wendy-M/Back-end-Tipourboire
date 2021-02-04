const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const historySchema = new mongoose.Schema({
  date: Date,
  amount: Number,
});

const avgUser = new mongoose.Schema({
  restaurantID: String,
  restaurantName: String,
});

const commentaires = new mongoose.Schema({
  nom: String,
  prenom: String,
  texte: String,
});

const serveurSchema = new mongoose.Schema(
  {
    lastname: String,
    firstname: String,
    email: { type: String, unique: true },
    password: String,
    date: String,
    adress: String,
    city: String,
    phone: String,
    staff: String,
    picture: String,
    abonne: Boolean,
    id: String,
    restaurant: [avgUser],
    verificationIdAffiliation: String,
    confirmed: Boolean,
    verificationId: String,
    stripeId: String,
    mangoWalletReferent: String,
    history: [historySchema],
    subId: String,
    accountId: String,
    tokenId: String,
    country: String,
    currency: String,
    account_number: String,
    stripeVerif: Boolean,
    resetPasswordDate: Date,
    autorisation: Boolean,
    commentaires: [commentaires],
    mangoID: String,
    mangoWallet: String,
    mangoBankAcc: String,
  },
  { collection: "serveurs" }
);
serveurSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Serveur", serveurSchema);
