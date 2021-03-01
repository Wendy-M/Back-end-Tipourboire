/**
 * cors.js - CORS middleware file
 * Handles CORS requests
 */

 //let ALLOWORIGIN= ["https://client.osc-fr1.scalingo.io/" , "https://restaurant.osc-fr1.scalingo.io/", "https://serveur.osc-fr1.scalingo.io/"]

    
let allowedOrigins = ["https://client.osc-fr1.scalingo.io/" , "https://restaurant.osc-fr1.scalingo.io/", "https://serveur.osc fr1.scalingo.io/"]
const cors = {
    handle: (req, res, next) => {

      let origin = req.get('origin')
      
      res.header(
        "Access-Control-Allow-Origin", allowedOrigins.includes(origin) ? origin : "null"      
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
  