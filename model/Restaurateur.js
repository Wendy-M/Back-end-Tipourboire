const mongoose = require("mongoose");

const uniqueValidator = require("mongoose-unique-validator");

const Menu = new mongoose.Schema({
  dailyMenu: { picture: String, label: String },
  otherMenu: [{ picture: String, label: String, value: String }],
});

const avgUser = new mongoose.Schema({
  serveurMail: String,
  serveurName: String,
  serveurPicture: String,
});

const RestaurateurSchema = new mongoose.Schema(
  {
    restaurantName: String,
    email: { type: String, unique: true },
    password: String,
    bossFirstName: String,
    bossName: String,
    adress: String,
    location: { longitude: String, latitude: String },
    referent: { name: String, firstname: String, email: String },
    phone: String,
    serviceNumber: { noon: Boolean, evening: Boolean },
    logo: String,
    picture: [],
    menu: Menu,
    qrCode: String,
    confirmed: Boolean,
    verificationId: String,
    tabServeur: [avgUser],
    stripeId: String,
    abonne: Boolean,
    subId: String,
    pourboireGeneral: Boolean,
    pourboireIndividuel: Boolean,
    resetPasswordDate: Date,
    autorisation: Boolean,
  },
  {
    collection: "restaurateurs",
  }
);
RestaurateurSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Restaurateur", RestaurateurSchema);
