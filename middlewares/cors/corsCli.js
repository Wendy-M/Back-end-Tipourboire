/**
 * cors.js - CORS middleware file
 * Handles CORS requests
 */

const cors = {
    handle: (req, res, next) => {
      res.header(
        "Access-Control-Allow-Origin",
        process.env.ORIGIN || "https://client.osc-fr1.scalingo.io/" || "https://restaurant.osc-fr1.scalingo.io/"|| "https://serveur.osc-fr1.scalingo.io/"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.header("Access-Control-Allow-Credentials", true);
      if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, DELETE, GET");
        return res.status(200).json({});
      }
      next();
    },
  };
  
  module.exports = cors;
  