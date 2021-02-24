const Restaurateur = require("../model/Restaurateur");
const Serveur = require("../model/Serveur");
const Client = require("../model/Client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const date = require("date-and-time");
var mangopay = require("mangopay2-nodejs-sdk");

const crypto = require("crypto");

const { options } = require("../routes/restaurateur");

var stripe = require("stripe")(
  "sk_test_51HAxRlHoh2Vgz5Qd4gemyV84ODV8vdNB69QzOSv7Zn3MRGX09aNq4cbmZtHzYqwkCCVHE1F2CNd9b2v1sq9HiTdM00mEihmKKL"
);
var api = new mangopay({
  clientId: "ctottt",
  clientApiKey: "sPuA8HB9cKzPFFxyyTaNW0rxx7Zp9zmOqynxMp9ocOHKzqeKvM",
  // Set the right production API url. If testing, omit the property since it defaults to sandbox URL
  baseUrl: "https://api.sandbox.mangopay.com",
});
const restaurateurController = {
  /**
   * PARTIE MENU
   */

  /*Afficher les menus*/
  getMenu: (req, res, next) => {
    Restaurateur.findOne({ _id: req.user._id }, "menu", (err, data) => {
      if (err) {
        res.status(500).send("Une erreur s'est produite");
        return;
      }
      res.json(data);
    });
  },

  /*Ajouter les menus*/
  addMenu: (req, res, next) => {
    req.files.forEach((e) => {
      req.user.menu.otherMenu.push({ picture: e.path.replace("public", "") });
    });

    req.user.save((err) => {
      if (err) {
        res.status(500).json({ message: "Erreur" });
      } else {
        res.json({ message: "Menus ajoutés" });
      }
    });
  },

  /*Supprimer les menus*/
  deleteMenu: (req, res, next) => {
    Restaurateur.updateOne(
      { _id: req.user._id },
      {
        $pull: {
          "menu.otherMenu": {
            picture: req.body.picture,
          },
        },
      },

      (err) => {
        if (err) {
          console.log(err);
          res.json({ message: "une erreur s'est produite" });
        } else {
          res.json({
            message: "Suppression ok",
          });
          console.log(req.body.picture);
        }
      }
    );
  },

  /*Ajouter le menu du jour */
  addDailyMenu: (req, res, next) => {
    const filePath = req.file.path.replace("public", "");
    const now = new Date();
    Restaurateur.updateOne(
      { _id: req.user._id },
      {
        $set: {
          "menu.dailyMenu": {
            picture: filePath,
            label: date.format(now, "DD/MM/YYYY"),
          },
        },
      },
      (err) => {
        if (err) {
          console.log(err);
          res.json({ message: "une erreur s'est produite" });
        } else {
          res.json({
            message: "Photo ok ",
          });
          console.log(req.body.picture);
        }
      }
    );
  },

  deleteDailyMenu: (req, res, next) => {
    Restaurateur.updateOne(
      { _id: req.user._id },
      {
        $set: {
          "menu.dailyMenu": {
            picture: "",
            label: "",
          },
        },
      },

      (err) => {
        if (err) {
          console.log(err);
          res.json({ message: "une erreur s'est produite" });
        } else {
          res.json({
            message: "Votre menu a bien été supprimé",
          });
        }
      }
    );
  },

  /**
   * PARTIE PROFIL
   */

  /*Inscription*/
  verify: (req, res, next) => {
    if (!req.query.id) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    /* ETAPE 1: Trouver le restaurateur */
    Restaurateur.findOne({ verificationId: req.query.id }, (error, user) => {
      /* En cas d'erreur */
      if (error) {
        res.status(500).json({ message: "An error has occured" });
        return;
      }

      /* Aucun restaurateur trouvé */
      if (!user) {
        res.status(404).json({ message: "Not found" });
        return;
      }

      /* ETAPE 2: Création de l'utilistaeur Stripe + MangoPay */
      stripe.customers
        .create({
          email: user.email,
          description: "Restaurateur",
        })
        .then(
          /* Restaurateur enregistré comme utilisateur MangoPay */
          (model) => {
            /* ETAPE 3: Engresitrement de la vérification du restaurateur */
            user.confirmed = true;
            user.verificationId = null;
            user.stripeId = model.id;

            /* Enregistrement du restaurateur */
            user.save((error) => {
              /* En cas d'erreur */
              if (error) {
                res.status(500).json({
                  message: "An error has occured",
                });
                return;
              }
              res.redirect(
                "https://restaurant.osc-fr1.scalingo.io/" //'<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px; font-family:arial">TIPOURBOIRE</h1></header> <p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Vous êtes maintenant inscrit à TiPourBoire !<br/> Veuillez vous connecter pour vous abonner. <br/> <br/>  <a style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=https://restaurant.osc-fr1.scalingo.io/connexionAbo>S\'abonner</a> </p>  <footer style="background-color:#f4a521; padding:10px "></footer>'
              );
            });
          }
        );
    });
  },

  inscription: (req, res, next) => {
    const emailVerif = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const passwordVerif = RegExp(
      "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
    );

    /*stockage d'un mot de passe crypté dans la base de données apres le req*/
    const hash = bcrypt.hashSync(req.body.password, 10);

    if (
      typeof req.body.restaurantName != "string" ||
      typeof req.body.bossFirstName != "string" ||
      typeof req.body.phone != "string" ||
      typeof req.body.bossName != "string" ||
      typeof req.body.adress != "string" ||
      emailVerif.test(req.body.email) == false
    ) {
      res.status(417);
      res.json({
        message:
          "Veuillez compléter les champs obligatoires et respecter le format de saisie.",
      });
    } else if (passwordVerif.test(req.body.password) == false) {
      res.status(417);
      res.json({
        message:
          "Votre mot de passe doit comporter au minimum 8 caractères dont une minuscule, une majuscule, un chiffre et un caractère spécial.",
      });
    } else {
      /*TEST ENVOI MAIL*/
      let rand = new Array(10).fill("").reduce(
        (accumulator) =>
          accumulator +
          Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, "")
            .substr(0, 5)
      );

      const newRestaurateur = new Restaurateur({
        restaurantName: req.body.restaurantName,
        bossFirstName: req.body.bossFirstName,
        phone: req.body.phone,
        email: req.body.email,
        password: hash /*mdp hashé*/,
        bossName: req.body.bossName,
        adress: req.body.adress,
        location: {
          longitude: req.body.longitude,
          latitude: req.body.latitude,
        },
        serviceNumber: {
          noon: req.body.noon === "on",
          evening: req.body.evening === "on",
        },
        pourboireGeneral: req.body.together === "on",
        pourboireIndividuel: req.body.alone === "on",
        logo: "/images/logo-init.png",
        menu: { dailyMenu: { picture: "", label: "" }, otherMenu: [] },
        confirmed: false,
        verificationId: rand,
        stripeId: "",
        abonne: false,
        subId: "",
        tabServeur: [],
        resetPasswordDate: null,
        autorisation: false,
        referent: {},
      });
      newRestaurateur.save((err) => {
        if (err) {
          console.log(err);
          res.json({
            message:
              "L'e-mail saisi est déja lié à un compte. Veuillez vous connecter ou saisir une autre adresse mail.",
          });
        } else {
          res.json({
            message:
              "Merci pour votre inscription ! Un e-mail de confirmation vient de vous être envoyé.",
          });
        }
      });
      let transporter = nodemailer.createTransport({
        pool: true,
        host: "authsmtp.securemail.pro",
        port: 465,
        secure: true, // use TLS
        auth: {
          user: "contact@tipourboire.com",
          pass: "Vitrine20203T/",
        },
      });

      link =
        "https://back-end.osc-fr1.scalingo.io/restaurateur/verify?id=" + rand;
      let mailOptions = {
        from: "contact@tipourboire.com",
        to: req.body.email,
        subject: "Tipourboire - Mail",
        html:
          '<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header> <p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour et merci pour votre inscription à TiPourBoire ! <br/> Cliquez sur le lien ci-dessous pour confirmer votre inscription. <br/> <br/>  <a style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=' +
          link +
          '>Confirmer</a> </p>  <footer style="background-color:#f4a521; padding:10px "></footer>',
      };

      transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
          return console.log(err);
        }
        return console.log("Email sent!!!");
      });
    }
  },

  /*Récupération du profil du restaurateur connecté*/
  getProfil: (req, res) => {
    res.json(req.user);
    /*permet de ne pas afficher le password crypté*/
  },
  getLogo: (req, res, next) => {
    const filePath = req.file.path.replace("public", "");
    Restaurateur.updateOne(
      { _id: req.user._id },
      {
        $set: {
          logo: filePath,
        },
      },

      (err) => {
        if (err) {
          console.log(err);
          res.json({ message: "une erreur s'est produite" });
        } else {
          res.json({
            message: "Photo ok ",
          });
          console.log(req.body.logo);
          console.log(req.file.path);
        }
      }
    );
  },

  getDataClient: (req, res) => {
    Client.find(
      { "historique.restaurantName": req.user.restaurantName },
      "lastname firstname email age phone",
      (err, user) => {
        if (err) {
          res.status(404).end();
        } else {
          res.json(user);
          console.log(user);
        }
      }
    );
  },
  /*Modification du profil du restaurateur connecté*/
  editProfil: (req, res, next) => {
    const emailVerif = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");

    if (
      typeof req.body.restaurantName != "string" ||
      typeof req.body.bossFirstName != "string" ||
      typeof req.body.bossName != "string" ||
      typeof req.body.phone != "string" ||
      typeof req.body.adress != "string" ||
      emailVerif.test(req.body.email) == false
    ) {
      res.status(417);
      res.json({
        message:
          "Veuillez compléter les champs obligatoires et respecter le format de saisie.",
      });
    } else {
      Restaurateur.updateOne(
        /*Modif et mise à jour des données l'user repéré grace a son id */
        {
          _id: req.user.id,
        },
        {
          restaurantName: req.body.restaurantName,
          email: req.body.email,
          phone: req.body.phone,
          bossName: req.body.bossName,

          adress: req.body.adress,
          bossFirstName: req.body.bossFirstName,
        },
        (err) => {
          if (err) {
            console.log(err);
            res.json({ message: "une erreur s'est produite" });
          } else {
            res.json({
              message:
                "Vos modifications ont bien été prises en compte. Merci.",
            });
          }
        }
      );
    }
  },

  /**
   * LOGIN MOT DE PASSE
   */

  login: (req, res, next) => {
    const verifEmail = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const email = req.body.email;

    if (
      verifEmail.test(email) == false ||
      typeof req.body.password != "string" /**check des formats emails et pwd */
    ) {
      res.status(417);
      res.json({
        message:
          "Saisie incorrects. Veuillez ressaisir vos identifiants et mot de passe.",
      });
    } else if (Restaurateur.confirmed == false) {
      res.status(417).json({
        message:
          "Veuillez confirmer votre adresse e-mail pour pouvoir vous connecter",
      });
    } else {
      /*comparaison email user et base de donnée si match ou pas */
      Restaurateur.findOne({ email: req.body.email }, (err, data) => {
        if (!data) {
          return res
            .status(401)
            .json({ message: "Identifiant et/ou Mot de passe incorrects" });
        }
        bcrypt.compare(req.body.password, data.password, (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).json({
              message: "une erreur s'est produite",
            }); /*erreur de saisie ou autre err*/
          } else if (!data || !result) {
            res.status(401).json({
              message:
                "Identifiant et/ou Mot de passe incorrects" /*donnée ne matche pas avec database*/,
            });
          } else {
            res.status(200).json({
              userId: data._id,
              token: jwt.sign({ userId: data._id }, "RANDOM_TOKEN_SECRET", {
                expiresIn: "24h",
                /*durée de validité du Token, l'utilisateur devra se reconnecter au bout de 24h*/
              }),
              message: "Connexion Réussie !" /*good password */,
            });
          }
        });
      });
    }
  },
  loginAbo: (req, res, next) => {
    const verifEmail = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const email = req.body.email;

    if (
      verifEmail.test(email) == false ||
      typeof req.body.password != "string" /**check des formats emails et pwd */
    ) {
      res.status(417);
      res.json({
        message:
          "Saisie incorrects. Veuillez ressaisir vos identifiants et mot de passe.",
      });
    } else if (Restaurateur.confirmed == false) {
      res.status(417).json({
        message:
          "Veuillez confirmer votre adresse e-mail pour pouvoir vous connecter",
      });
    } else {
      /*comparaison email user et base de donnée si match ou pas */
      Restaurateur.findOne({ email: req.body.email }, (err, data) => {
        if (!data) {
          returnres
            .status(401)
            .json({ message: "Identifiant et/ou Mot de passe incorrects" });
        }
        bcrypt.compare(req.body.password, data.password, (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).json({
              message: "Une erreur s'est produite",
            }); /*erreur de saisie ou autre err*/
          } else if (!data || !result) {
            res.status(401).json({
              message:
                "Identifiant et/ou Mot de passe incorrects" /*donnée ne matche pas avec database*/,
            });
          } else {
            res.status(200).json({
              userId: data._id,
              token: jwt.sign({ userId: data._id }, "RANDOM_TOKEN_SECRET", {
                expiresIn: "24h",
                /*durée de validité du Token, l'utilisateur devra se reconnecter au bout de 24h*/
              }),
              message: "Connexion Réussie !" /*good password */,
            });
          }
        });
      });
    }
  },

  /*Récupération du QR code */
  getQRCODE: (req, res) => {
    res.json(req.user.qrCode);
  },

  /**
   * PARTIE GESTION PERSONNEL
   */

  /*Récupération de la liste des serveurs*/
  getWaiterList: (req, res) => {
    Restaurateur.findOne(
      { _id: req.user._id },
      "tabServeur.serveurName tabServeur.serveurMail",

      (err, data) => {
        if (err) {
          res.status(500).end();
        } else {
          res.json(data);
        }
      }
    );
  },

  /*Suppression d'un serveur de son restaurant*/
  deleteWaiter: (req, res) => {
    Restaurateur.updateOne(
      { _id: req.user._id },
      { $pull: { tabServeur: { serveurMail: req.body.mail } } },

      (err, data) => {
        if (err) {
          res.status(500).end();
        } else {
          res.json({ message: "Suppression Ok" });
        }
      }
    ),
      Restaurateur.updateOne();
  },

  /**
   * PARTIE AFFILIATION
   */

  envoiMailAffiliation: (req, res) => {
    let transporter = nodemailer.createTransport({
      pool: true,
      host: "authsmtp.securemail.pro",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: "contact@tipourboire.com",
        pass: "Vitrine20203T/",
      },
    });

    link =
      "https://back-end.osc-fr1.scalingo.io/restaurateur/confirmAffi?email=" +
      req.body.email +
      "&_id=" +
      req.user._id +
      "&name=" +
      req.user.restaurantName;
    let mailOptions = {
      from: "contact@tipourboire.com",
      to: req.body.email,
      subject: "Votre demande d'affiliation",

      html:
        '<header  style= "background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header><p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour, le restaurant ' +
        req.user.restaurantName +
        ' veut s\'affilier avec vous. <br/> Pour accepter la demande, cliquez sur le lien ci-dessous. <br/><br/>  <a  style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=' +
        link +
        '>Confirmer</a> </p><footer style="background-color:#f4a521; padding:10px "></footer>',
    };
    transporter.sendMail(mailOptions, (err, data) => {
      if (err) {
        return console.log("Error occurs");
      }
      return res.json({ message: "Votre email a bien été envoyé" });
    });
  },

  /* A VOIR AVEC WENDY/LAMBERT*/
  validAffiliation: (req, res) => {
    if (!req.query.email) {
      res.status(404).json({ message: "Not found1" });
      return;
    }
    Serveur.findOne(
      { email: req.query.email },
      "firstname lastname picture",
      (err, result) => {
        if (err) {
          res.status(417).json({ message: "erreur" });
          console.log(err);
          return;
        }

        Restaurateur.updateOne(
          { _id: req.query._id },
          {
            $push: {
              tabServeur: {
                serveurMail: req.query.email,
                serveurName: result.lastname + " " + result.firstname,
                serveurPicture: result.picture,
              },
            },
          },
          (err, result) => {
            if (err) {
              res.status(417).json({ message: "erreur" });
              console.log(err);
              return;
            }

            res.redirect("https://serveur.osc-fr1.scalingo.io/");
            console.log(result);
          }
        );
      }
    );
  },
  envoiMailReferent: (req, res) => {
    let transporter = nodemailer.createTransport({
      pool: true,
      host: "authsmtp.securemail.pro",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: "contact@tipourboire.com",
        pass: "Vitrine20203T/",
      },
    });

    link =
      "https://back-end.osc-fr1.scalingo.io/restaurateur/confirmReferent?email=" +
      req.body.email +
      "&_id=" +
      req.user._id +
      "&name=" +
      req.user.restaurantName;
    let mailOptions = {
      from: "contact@tipourboire.com",
      to: req.body.email,
      subject: "Votre demande d'affiliation",

      html:
        '<header  style= "background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header><p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour, le restaurant ' +
        req.user.restaurantName +
        ' vous a choisi pour être le référent pourboire commun <br/> Pour accepter la demande, cliquez sur le lien ci-dessous. <br/><br/>  <a  style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=' +
        link +
        '>Confirmer</a> </p><footer style="background-color:#f4a521; padding:10px "></footer>',
    };
    transporter.sendMail(mailOptions, (err, data) => {
      if (err) {
        return console.log("Error occurs");
      }
      return res.json({ message: "Votre email a bien été envoyé" });
    });
  },
  validReferent: (req, res) => {
    if (!req.query.email) {
      res.status(404).json({ message: "Not found1" });
      return;
    }
    Serveur.findOne(
      { email: req.query.email },
      "firstname lastname picture mangoID",
      (err, user) => {
        if (err) {
          res.status(417).json({ message: "erreur" });
          console.log(err);
          return;
        }

        Restaurateur.updateOne(
          { _id: req.query._id },
          {
            $set: {
              referent: {
                email: req.query.email,
                name: user.lastname + " " + user.firstname,
              },
            },
          },
          (err, result) => {
            if (err) {
              res.status(417).json({ message: "erreur" });
              console.log(err);
              return;
            }
            api.Wallets.create(
              {
                Owners: [user.mangoID],
                Description:
                  "Wallet referent du  restaurant " +
                  req.query.name +
                  " " +
                  user.lastname +
                  " " +
                  user.firstname,
                Currency: "EUR",
                Tag: "custom meta",
              },
              function (model) {
                user.mangoWalletReferent = model.Id;
                user.save((error) => {
                  if (error) {
                    res.status(500).json({
                      message: "An error has occured with MANGO users",
                    });
                    return;
                  }
                });
              }
            );
            console.log(user.mangoID);
            res.redirect("https://serveur.osc-fr1.scalingo.io/");
          }
        );
      }
    );
  },

  /**
   * PARTIE STRIPE
   */

  createSubscription: async (req, res) => {
    Restaurateur.findOne({ _id: req.user._id }, async (err, user) => {
      try {
        await stripe.paymentMethods.attach(req.body.paymentMethodId, {
          customer: user.stripeId,
        });
      } catch (error) {
        return res.status("402").send({ error: { message: error.message } });
      }
      await stripe.customers.update(req.user.stripeId, {
        invoice_settings: {
          default_payment_method: req.body.paymentMethodId,
        },
      });

      // Create the subscription
      stripe.subscriptions
        .create({
          customer: user.stripeId,
          items: [{ price: "price_1IGLo3Hoh2Vgz5QdnS6OVonj" }],
          expand: ["latest_invoice.payment_intent"],
        })
        .then((model) => {
          user.abonne = true;
          user.subId = model.id;
          user.save((error) => {
            if (error) {
              res.status(500).json({
                message: "An error has occured",
              });
              return;
            }
            res.json(model);
          });
        });
    });
  },

  unSubscription: (req, res) => {
    Restaurateur.findOne({ _id: req.user.id }, (err, user) => {
      let transporter = nodemailer.createTransport({
        pool: true,
        host: "authsmtp.securemail.pro",
        port: 465,
        secure: true, // use TLS
        auth: {
          user: "contact@tipourboire.com",
          pass: "Vitrine20203T/",
        },
      });
      let mailOptions = {
        from: "contact@tipourboire.com",
        to: user.email,
        subject: "Résiliation affiliation",
        html:
          '<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header> <p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour, votre demande de désabonnement a bien été prise en compte. <br/> Votre abonnement sera définitivement résilié à la fin de votre mensualité. <br/> A bientôt</p>  <footer style="background-color:#f4a521; padding:10px "></footer>',
      };

      transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
          return console.log("Error occurs");
        }
        return console.log("Email sent!!!");
      });
      Serveur.find({ "restaurantName._id": user._id }, (error, serveurs) => {
        let transporter = nodemailer.createTransport({
          pool: true,
          host: "authsmtp.securemail.pro",
          port: 465,
          secure: true, // use TLS
          auth: {
            user: "contact@tipourboire.com",
            pass: "Vitrine20203T/",
          },
        });
        let maillist = [serveurs.email];
        let mailOptions = {
          from: "contact@tipourboire.com",
          to: maillist,
          subject: "Désabonnement affiliation",
          html:
            '<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header> <p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour, le restaurant ' +
            user.restaurantName.name +
            " a choisi de se désabonner de TiPourBoire. <br/> Si vous n'avez pas d'autres restaurant affilié vous pouvez choisir de vous désabonner directement via votre profil. <br/> A bientôt</p>  <footer style=\"background-color:#f4a521; padding:10px \"></footer>",
        };
        if (!maillist) {
          stripe.subscriptions.update(user.subId, {
            cancel_at_period_end: true,
          });
        } else {
          transporter.sendMail(mailOptions, (err, data) => {
            if (err) {
              return console.log("Error occurs");
            }
            return console.log("Email sent!!!");
          });
        }
      });

      stripe.subscriptions.update(user.subId, { cancel_at_period_end: true });
      user.subId = null;
      user.save((error) => {
        /* En cas d'erreur */
        if (error) {
          res.status(500).json({
            message: "An error has occured",
          });
          return;
        }
        res.json({ message: "Vous êtes bien désabonné(e)" });
      });
    });
  },

  /***
   * PARTIE MOT DE PASSE OUBLIE
   */
  /* Reset password */
  resetPassword: (req, res) => {
    const email = req.body.email;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Veuillez saisir votre Email",
      });
      return;
    }

    const resetPasswordToken = crypto.randomBytes(20).toString("hex");

    Restaurateur.updateOne(
      { email: email },
      {
        $set: {
          resetPasswordToken: resetPasswordToken,
          resetPasswordDate: new Date().toISOString(),
        },
      },
      (error, result) => {
        if (error) {
          res.status(500).json({
            success: false,
            message: "An error has occured",
          });
          return;
        }

        if (result.nModified == 1) {
          console.log("/password-renew/" + resetPasswordToken);
        }

        res.json({
          success: true,
          message: "Un e-mail pour reset votre password vous a été envoyé.",
        });
        Restaurateur.findOne({ email: email }, (error, user) => {
          let transporter = nodemailer.createTransport({
            pool: true,
            host: "authsmtp.securemail.pro",
            port: 465,
            secure: true, // use TLS
            auth: {
              user: "contact@tipourboire.com",
              pass: "Vitrine20203T/",
            },
          });

          let link =
            "https://back-end.osc-fr1.scalingo.io/restaurateur/autorisation-password?email=" +
            user.email;
          let mailOptions = {
            from: "contact@tipourboire.com",
            to: req.body.email,
            subject: "Récupération de votre mot de passe",
            html:
              '<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header> <p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Vous avez demandé la modification de votre mot de passe. <br/> Cliquez sur le lien ci-dessous pour confirmer votre demande <br/> <br/>  <a style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=' +
              link +
              '>Confirmer</a> </p>  <footer style="background-color:#f4a521; padding:10px "></footer>',
          };

          transporter.sendMail(mailOptions, (err, data) => {
            if (err) {
              return console.log("Error occurs");
            }
            return console.log("Email sent!!!");
          });
        });
      }
    );
  },

  /* Renew password */
  renewPassword: (req, res) => {
    const [email, password] = [req.body.email, req.body.password];

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Votre Email et votre Mot de Passe sont requis.",
      });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);

    Restaurateur.findOne({ email: email }, (error, data) => {
      if (error) {
        res.status(500).json({
          success: false,
          message: "An error has occured",
        });
        return;
      }

      if (!data || data.autorisation === false) {
        res.status(401).json({
          success: false,
          message: "Une erreur viens de se produire.",
        });
        return;
      }

      if (
        new Date(data.resetPasswordDate).getTime() + 300000 <
        new Date().getTime()
      ) {
        data.autorisation === false;

        data.save();

        res.status(401).json({
          success: false,
          message: "Adresse mail introuvable veuillez réessayer.",
        });
        return;
      }

      data.password = bcrypt.hashSync(password, 10);
      data.autorisation = false;
      data.resetPasswordToken = null;
      data.resetPasswordDate = null;

      data.save((error) => {
        if (error) {
          res.status(500).json({
            success: false,
            message: "Une erreur viens de se produire.",
          });
          return;
        }

        res.json({
          success: true,
          message: "Votre MDP a bien été modifié",
        });
      });
    });
  },

  validPasswordRenew: (req, res) => {
    if (!req.query.email) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    Restaurateur.findOne(
      { email: req.query.email },

      (err, result) => {
        if (err) {
          res.status(417).json({ message: "erreur" });
          console.log(err);
          return;
        }

        Restaurateur.updateOne(
          { email: req.query.email },
          {
            $set: {
              autorisation: true,
            },
          },
          (err, result) => {
            if (err) {
              res.status(417).json({ message: "erreur" });
              console.log(err);
              return;
            }

            res.redirect(
              "https://restaurant.osc-fr1.scalingo.io/passwordRenew"
            );
          }
        );
      }
    );
  },
};

module.exports = restaurateurController;
