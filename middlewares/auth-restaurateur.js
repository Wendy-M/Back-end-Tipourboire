/*auth.js - Middleware d'autentification avec token et userId */

/* Imports */
const Restaurateur = require("../model/Restaurateur");
const jwt = require("jsonwebtoken");

/* Middleware */
const authentification = (req, res, next) => {
  try {
    /* decode token and compare, set userID */
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, "RANDOM_TOKEN_SECRET");
    const userId = decodedToken.userId;

    /* if userID in body compare with DB userID, else (no userID in body) it's ok*/

    if (req.body.userId && req.body.userId !== userId) {
      throw "Invalid user ID";
    } else {
      Restaurateur.findOne({ _id: userId }, (err, data) => {
        if (err) {
          res.status(500).json({
            error: new Error("Internal server error"),
          });
          return;
        }

        if (!data) {
          res.status(404).json({
            error: new Error("Erreur d'authentification"),
          });
          return;
        }

        req.user = data;
        next();
      });
    }
  } catch {
    res.status(401).json({
      error: new Error("Invalid request!"),
    });
  }
};

/* Export */
module.exports = authentification;
