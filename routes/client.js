/* SI TU N'ES PAS ILIAS OU SAIDA TU SORS */

var express = require("express");
var router = express.Router();

/*route for client infos*/
const clientController = require("../controllers/client");
const authentification = require("../middlewares/authentif");

router.post("/create-payment-intent", clientController.createPayementIntent);

router.post("/emailServeur", clientController.stockLSemail);

/* POST Inscription client */

router.post("/register", clientController.register);

/*POST client data.*/
router.post("/getDataClient", authentification, clientController.getDataClient);
router.get("/transfert", clientController.transfertFond);

/* POST profil login. */
router.post("/login", clientController.login);

/* PUT client edit.*/
router.put("/edit", authentification, clientController.edit);
/*Mettre l'autenthif en commentaire quand on veux tester sur postman sinon ca fonctionne pas*/

/* DELETE client delete.*/
router.delete("/delete", authentification, clientController.delete);

/*GET  ou POST fonctionnent liste serveur*/
router.get("/getDataServeur", clientController.getDataServeur);
router.post("/payin", clientController.payin);
router.post("/getWalletId", clientController.getWalletId);
/*GET  ou POST fonctionnent liste serveur*/
router.get("/getMenu", clientController.getMenu);
router.get("/menu", clientController.menu);
router.get("/getMenuTicket", clientController.getMenuTicket);

/* POST commentaires*/
router.post("/commentaire", clientController.postCommentaire);
router.post("/test", clientController.chargeTest);
/**
 * Partie MDP OUBLIE
 */
router.post("/password-reset", clientController.resetPassword);

/* POST renew password */
router.post("/password-renew", clientController.renewPassword);

router.get("/autorisation-password", clientController.validPasswordRenew);

router.post("/TipUser", clientController.createUserCardRegistration);

//router.get("/cardInfo", clientController.getInfoCardRegistration);
module.exports = router;
