/* SI TU N'ES PAS LAMBERT OU WENDY TU SORS */

var express = require("express");
var router = express.Router();

const multer = require("../middlewares/multer");
const multerMango = require("../middlewares/multerKYCMango");
/*route for serveur infos*/
const serveurController = require("../controllers/serveur");
const authentification = require("../middlewares/auth");

/* POST Inscription serveur */
router.post("/register", serveurController.inscription);

router.get("/monProfil", authentification, serveurController.getServeur);

router.post("/dataProfil", authentification, serveurController.getServeur);
router.get("/verify", serveurController.verify);

/* POST profil login. */
router.post("/login", serveurController.login);

/* PUT serveur edit.*/
router.put("/edit", authentification, serveurController.edit);
router.put("/editLogo", authentification, multer, serveurController.getLogo);

/* DELETE serveur delete.*/
router.delete("/delete", authentification, serveurController.delete);

/* PUT abonnement edit.*/
router.put("/id", authentification, multer, serveurController.getLogo);

router.post("/paiement", authentification, serveurController.paiement);
router.post(
  "/createsubscription",
  authentification,
  serveurController.createSubscription
);

/*commentaire*/
router.get(
  "/mesCommentaires",
  authentification,
  serveurController.afficherCommentaire
);
/* create and transfer money */
router.get("/getWalet", authentification, serveurController.getCagnotteMango);
router.post("/account", authentification, serveurController.customerAccount);
router.post("/iban", authentification, serveurController.createBankAccount);
router.get(
  "/customerAccount",
  authentification,
  serveurController.customerAccount
);
router.post(
  "/mangoBank",
  authentification,
  serveurController.createMangoBankAccount
);
router.post(
  "/mangoKYC",
  multerMango,

  serveurController.kycDocument
);
router.get(
  "/waiterList",
  authentification,

  serveurController.getWaiterList
);

router.post(
  "/referentTransfert",
  authentification,
  serveurController.transfertMangoReferent
);
router.get(
  "/referentWallet",
  authentification,
  serveurController.getReferentWallet
);
router.post("/payoutMango", authentification, serveurController.payoutMangoPay);
router.get("/verif", serveurController.verifOnboarding);
router.get(
  "/restaurantList",
  authentification,
  serveurController.getRestaurantList
);

/* Show Wallet*/
router.post("/addtowallet", serveurController.addToWallet);

/**
 * Partie MDP OUBLIE
 */
router.post("/password-reset", serveurController.resetPassword);

/* POST renew password */
router.post("/password-renew", serveurController.renewPassword);

router.get("/autorisation-password", serveurController.validPasswordRenew);

module.exports = router;
