var express = require("express");
var router = express.Router();
const restaurateurController = require("../controllers/restaurateur");
const auth = require("../middlewares/auth-restaurateur");
const multer = require("../middlewares/multer-restaurateur");
let uploadsingle = multer.single("file");
let upload = multer.array("file", 10);

/* Routes Menu */
router.get("/menu", auth, restaurateurController.getMenu);
router.post("/menu/add", upload, auth, restaurateurController.addMenu);

router.delete("/menu/delete", auth, restaurateurController.deleteMenu);
router.put(
  "/dailymenu/add",
  uploadsingle,
  auth,
  restaurateurController.addDailyMenu
);

router.get("/getDataClient", auth, restaurateurController.getDataClient);

router.delete(
  "/dailymenu/delete",
  auth,
  restaurateurController.deleteDailyMenu
);

/* Routes Inscription */
router.post("/inscription", uploadsingle, restaurateurController.inscription);

/*Système de paiement !! */
router.post("/login", restaurateurController.login);
router.post("/loginAbo", restaurateurController.loginAbo);
router.get("/verify", restaurateurController.verify);

/**
 * APPEL DE ROUTES DE PROFIL
 */

/* Appel du router profil affichage */
router.get("/profil", auth, restaurateurController.getProfil);

/* Appel du router profil affichage */
router.put("/profil/edit", auth, restaurateurController.editProfil);
router.put(
  "/profil/edit/logo",
  auth,
  uploadsingle,
  restaurateurController.getLogo
);

/* Appel du router de Recupération du QRCODE */
router.get("/profil/qrcode");

/* Appel du router pour le désabonnement*/

router.delete("/profil/unsubscribe");

/**
 * APPEL DES ROUTES GESTION DE PERSONNEL
 */

/* Appel du router validation d'affiliation*/
router.post(
  "/management/affiliation",
  auth,
  restaurateurController.envoiMailAffiliation
);
router.post(
  "/management/referent",
  auth,
  restaurateurController.envoiMailReferent
);

router.get("/confirmAffi", restaurateurController.validAffiliation);
router.get("/confirmReferent", restaurateurController.validReferent);

/* Appel du router pour récupérer la liste server */
router.get(
  "/management/waiter-list",
  auth,

  restaurateurController.getWaiterList
);

/* Appel du router pour la suppression des serveurs */

router.delete(
  "/management/waiter-delete",
  auth,
  restaurateurController.deleteWaiter
);
/**
 * PARTIE STRIPE PAIEMENT
 */
router.post(
  "/createsubscription",
  auth,
  restaurateurController.createSubscription
);

router.post("/delete", auth, restaurateurController.unSubscription);

/**
 * Partie MDP OUBLIE
 */
router.post("/password-reset", restaurateurController.resetPassword);

/* POST renew password */
router.post("/password-renew", restaurateurController.renewPassword);

router.get("/autorisation-password", restaurateurController.validPasswordRenew);

module.exports = router;
