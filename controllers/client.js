const Client = require("../model/Client");
const Serveur = require("../model/Serveur");
const Restaurateur = require("../model/Restaurateur");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const stripe = require("stripe")(
  "sk_test_51HAxRlHoh2Vgz5Qd4gemyV84ODV8vdNB69QzOSv7Zn3MRGX09aNq4cbmZtHzYqwkCCVHE1F2CNd9b2v1sq9HiTdM00mEihmKKL"
);
var mangopay = require("mangopay2-nodejs-sdk");
var api = new mangopay({
  clientId: "ctottt",
  clientApiKey: "sPuA8HB9cKzPFFxyyTaNW0rxx7Zp9zmOqynxMp9ocOHKzqeKvM",
  // Set the right production API url. If testing, omit the property since it defaults to sandbox URL
  baseUrl: "https://api.sandbox.mangopay.com",
});
const crypto = require("crypto");
const serveurController = require("./serveur");

/* Controller to register; get data of client; login; edit and delete client*/

// Create a PaymentIntent with the order amount and currency

const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 1400;
};
const clientController = {
  createPayementIntent: async (req, res) => {
    // Create a PaymentIntent with the order amount and currency
    /*const amount = req.body.amount;*/
    await stripe.paymentIntents.create(
      {
        amount: parseFloat(req.body.amount) * 100, // pour eviter les cts
        currency: "eur",
        // Verify your integration in this guide by including this parameter
        metadata: { integration_check: "accept_a_payment" },
      },
      { stripeAccount: "acct_1Hlb6NQn2qN1lHlc" },
      (err, data) => {
        if (err) {
          res.status(500).json({
            message:
              "Une erreur s'est produite dans le chargement de la liste des serveurs",
          });
        } else {
          res.json(data);
        }
      }
    );
  },

  createUserCardRegistration: (req, res) => {
    api.Users.create({
      FirstName: req.body.firstname,
      LastName: req.body.lastname,
      Birthday: 1000186358,
      Nationality: "FR",
      CountryOfResidence: "FR",

      PersonType: "NATURAL",
      Email: req.body.email,
      Tag: "Client",

      PersonType: "NATURAL",
    }).then(function (model) {
      api.CardRegistrations.create(
        {
          UserId: model.Id,
          Currency: "EUR",
        },
        function (result) {
          res.json(result);
        }
      );
    });
  },
  payin: (req, res) => {
    let body = {
      RegistrationData: req.body.registrationData,
    };
    fetch(
      "https://api.sandbox.mangopay.com/v2.01/ctottt/CardRegistrations/" +
        req.body.cardRegistrationId +
        "/",
      {
        method: "put",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic Y3RvdHR0OnNQdUE4SEI5Y0t6UEZGeHl5VGFOVzByeHg3WnA5em1PcXlueE1wOW9jT0hLenFlS3ZN",
        },
      }
    )
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        fetch(
          "https://api.sandbox.mangopay.com/v2.01/ctottt/CardRegistrations/" +
            req.body.cardRegistrationId +
            "/",
          {
            method: "get",

            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Basic Y3RvdHR0OnNQdUE4SEI5Y0t6UEZGeHl5VGFOVzByeHg3WnA5em1PcXlueE1wOW9jT0hLenFlS3ZN",
            },
          }
        )
          .then((response1) => {
            return response1.json();
          })
          .then((data1) => {
            console.log(data1);
            let body = {
              AuthorId: data1.UserId,

              CreditedWalletId: req.body.walletID,
              DebitedFunds: {
                Currency: "EUR",
                Amount: req.body.amount * 100,
              },
              Fees: {
                Currency: "EUR",
                Amount: req.body.amount - req.body.amount,
              },
              SecureModeReturnURL:
                "https://client.osc-fr1.scalingo.io/TipCommun",
              CardId: data1.CardId,
            };

            fetch(
              "https://api.sandbox.mangopay.com/v2.01/ctottt/payins/card/direct/",
              {
                method: "post",
                body: JSON.stringify(body),
                headers: {
                  "Content-Type": "application/json",
                  Authorization:
                    "Basic Y3RvdHR0OnNQdUE4SEI5Y0t6UEZGeHl5VGFOVzByeHg3WnA5em1PcXlueE1wOW9jT0hLenFlS3ZN",
                },
              }
            )
              .then((response2) => {
                return response2.json();
              })
              .then((data2,err) => {
                if (err) {
                  res.status(500).json({
                    message:
                      "Une erreur c'est produite, veuillez réessayer."
                  });return 
                }
                res.json(data2);
              });
          });
      });
  },
  /*INSCRIPTION*/

  register: (req, res, next) => {
    const cacahuete = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const email = req.body.email;
    const mdp = RegExp(
      "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
    );
    const password = req.body.password;

    /* - - - - - Directives pour le mdp - - - - 
                  (?=.?[A-Z]) : Au moins une lettre majuscule  
                  (?=.?[a-z]) : Au moins une lettre anglaise minuscule, 
                  (?=.?[0-9]) : Au moins un chiffre, 
                  (?=.*?[^ws]) : Au moins un caractère spécial, 
                  .{8,} Longueur minimale de huit (avec les ancres)
                            - - - - - - Directives pour le mdp - - - - - - - - */

    if (
      (req.body.gender && typeof req.body.gender != "string") ||
      typeof req.body.lastname != "string" ||
      typeof req.body.firstname != "string" ||
      (req.body.age && typeof req.body.age != "string") ||
      (req.body.adress && typeof req.body.adress != "string") ||
      (req.body.phone && typeof req.body.phone != "string") ||
      cacahuete.test(email) ==
        false /*check de format de saisie de l'email avec RegExp*/
    ) {
      res.status(417);
      res.json({
        message:
          "Veuillez compléter les champs obligatoires et respecter le format de saisie.",
      });
    } else if (mdp.test(password) == false) {
      res.status(417);
      res.json({
        message: "Veuillez respecter le format de saisie du mot de passe.",
      });
    } else {
      const hash = bcrypt.hashSync(password, 10); //10= nb de hasch

      const newClient = new Client({
        gender: req.body.gender,
        lastname: req.body.lastname,
        firstname: req.body.firstname,
        password: hash /*mdp hashé*/,
        age: req.body.age,
        adress: req.body.adress,
        phone: req.body.phone,
        email: req.body.email,
        resetPasswordDate: null,
        autorisation: false,
      });
      /*sauvegarde du nouveau client*/
      newClient.save((err) => {
        if (err) {
          console.log(err);
          res.json({
            message:
              "L'e-mail saisi est déja lié à un compte. Veuillez vous connecter ou saisir une autre adresse mail.",
          });
        } else {
          res.json({
            success: true /**Permet d'envoyer vers la page de connexion apres le succes de l'inscription */,
            message:
              "Votre inscription a bien été prise en compte. Un e-mail de confirmation vient de vous être envoyé. Merci.",
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

          let mailOptions = {
            from: "contact@tipourboire.com",
            to: req.body.email,
            subject: "Creation compte TiptoThank",
            html:
              '<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 25px; text-align:center; padding:10px">Tip to Thank</h1></header> <p style=" padding:15px; text-align:justify; font-size:15px; font-family:arial">Bonjour, votre inscription à Tip to Thank a bien été prise en compte ! <br/> <br/> Merci pour votre confiance et bon appétit dans nos restaurants partenaires ! <br/><br/> <br/><br/>La team Tip to Thank,</p>',
          };

          transporter.sendMail(mailOptions, (err, data) => {
            if (err) {
              return console.log("Une erreur s'est produite");
            } else {
              return console.log("Votre inscription a bien été prise en compte");
            }
          });
        }
      });
    }
  },
  /*Récupération du profil du client connecté*/
  getDataClient: (req, res, next) => {
    delete req.user.password; /*permet de ne pas afficher le password crypté*/
    res.json(req.user); /*on request sous format json les données du client */
  },

  login: (req, res, next) => {
    const cacahuete = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const email = req.body.email;
    const mdp = RegExp(
      "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
    );
    const password = req.body.password;
    console.log(req.body);

    if (
      cacahuete.test(email) == false ||
      mdp.test(password) == false /**check des formats emails et pwd */
    ) {
      res.status(417);
      res.json({
        message:
          "Saisie incorrects. Veuillez ressaisir vos identifiants et mot de passe.",
      });
    } else {
      /*comparaison email user et base de donnée si match ou pas */
      Client.findOne({ email: req.body.email }, (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({
            message: "une erreur s'est produite",
          }); /*erreur de saisie ou autre err*/
        } else if (!data) {
          res.status(401).json({
            message:
              "Identifiant de connexion incorrect." /*donnée ne matche pas avec database*/,
          });
        } else {
          /* quand utilisateur enfin ok => comparaison password avec bcrypt */
          bcrypt.compare(req.body.password, data.password, (err, result) => {
            if (err) {
              console.log(err);
              res.status(500).json({
                message: "Une erreur s'est produite.",
              }); /*erreur de saisie ou autre err*/
            } else if (!result) {
              res.status(401).json({
                message:
                  "Mot de passe incorrect." /*password ne matche pas avec database*/,
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
        }
      });
    }
  },
  /*Modification info compte client*/
  edit: (req, res, next) => {
    if (
      typeof req.body.client.age != "string" ||
      typeof req.body.client.lastname != "string" ||
      typeof req.body.client.firstname != "string" ||
      typeof req.body.client.adress != "string" ||
      typeof req.body.client.gender != "string" ||
      (req.body.client.phone && typeof req.body.client.phone != "string")
    ) {
      res.status(417);
      res.json({
        message:
          "Veuillez compléter les champs au bon format pour confirmer la modification de votre compte.",
      });
    } else {
      Client.updateOne(
        /*Modif et mise à jour des données l'user repéré grace a son id */
        {
          _id: req.user._id,
          /* _id: "5f18130fd733700fa02869e2",*/
        },
        {
          gender: req.body.client.gender,
          lastname: req.body.client.lastname,
          firstname: req.body.client.firstname,
          adress: req.body.client.adress,
          phone: req.body.client.phone,
          age: req.body.client.age,
        },
        (err) => {
          if (err) {
            console.log(err);
            res.json(err);
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
  chargeTest: async (req, res) => {
    await stripe.charges.create({
      amount: 10000,
      currency: "eur",
      source: "tok_visa",
      description: "My First Test Charge (created for API docs)",
    });
  },
  delete: (req, res, next) => {
    Client.deleteOne(
      {
        _id: req.user._id,
        /*_id: "5f16f25f03bfa2298cf52f2e",*/
      },
      (err) => {
        if (err) {
          console.log(err);
          res.json({ message: "une erreur s'est produite" });
        } else {
          res.json({
            message:
              "La suppression de votre compte a bien été prise en compte. Merci.",
          });
        }
      }
    );
  },
  transfertFond: async (req, res) => {
    if (typeof localStorage === "undefined" || localStorage === null) {
      var LocalStorage = require("node-localstorage").LocalStorage;
      localStorage = new LocalStorage("./scratch");
    }
    Serveur.findOne(
      { email: localStorage.getItem("serveurEmail") },

      async (err, data) => {
        if (data.abonne === false) {
          await stripe.transfers.create({
            amount: parseFloat(1) * (req.query.qte * 100 * 0.75),

            currency: "eur",
            destination: data.accountId,
          });
        } else {
          await stripe.transfers.create({
            amount: parseFloat(1) * (req.query.qte * 100 * 0.85),

            currency: "eur",
            destination: data.accountId,
          });
        }

        Client.updateOne(
          { email: req.query.mail },
          {
            $push: {
              historique: {
                montant: parseFloat(1) * (req.query.qte * 100),
                date: Date.now(),
                waiter: data.firstname + " " + data.lastname,
                restaurantName: req.query.RN,
              },
            },
          },
          async (err, data) => {
            if (err) {
              res.status(500).json({
                message:
                  "Une erreur s'est produite dans le chargement de la liste des serveurs",
              });
            } else {
              console.log(req.query.mail);
            }
          }
        );
        Serveur.updateOne(
          { email: req.query.mail },
          {
            $push: {
              history: {
                amount: parseFloat(1) * (req.query.qte * 100),
                date: Date.now(),
              },
            },
          },
          async (err, data) => {
            if (err) {
              res.status(500).json({
                message:
                  "Une erreur s'est produite dans le chargement de la liste des serveurs",
              });
            } else {
              console.log(req.query.mail);
            }
          }
        );
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
          to: data.email,
          subject: "Votre pourboire a bien été envoyé",

          html:
            '<header  style= "background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header><p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour, vous avez recu un don  <a  style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=</p><footer style="background-color:#f4a521; padding:10px "></footer>',
        };
        transporter.sendMail(mailOptions, (err, data) => {
          if (err) {
            return console.log("Error occurs");
          }
          return res.json({ message: "Votre email a bien été envoyé" });
        });
        (err) => {
          if (err) {
            console.log(err);
            res.json({ message: "une erreur s'est produite" });
          } else {
          }
        };

        res.redirect("https://client.osc-fr1.scalingo.io/Commentaires");
      }
    );
    
  },
  stockLSemail: (req, res) => {
    if (typeof localStorage === "undefined" || localStorage === null) {
      var LocalStorage = require("node-localstorage").LocalStorage;
      localStorage = new LocalStorage("./scratch");
    }

    localStorage.setItem("serveurEmail", req.body.email);

    res.json({ message: "done" });
  },
  getDataServeur: (req, res) => {
    if (typeof localStorage === "undefined" || localStorage === null) {
      var LocalStorage = require("node-localstorage").LocalStorage;
      localStorage = new LocalStorage("./scratch");
    }
    Restaurateur.findOne(
      { restaurantName: JSON.parse(localStorage.getItem("restaurant")) },
      "tabServeur restaurantName",

      (err, data) => {
        if (err) {
          res.status(500).json({
            message:
              "Une erreur s'est produite dans le chargement de la liste des serveurs",
          });
        } else {
          console.log("Restau");
          console.log(data);
          res.json(data);
        }
      }
    );
  },
  getMenu: (req, res, next) => {
    Restaurateur.findOne(
      /*Get la photo du daily menu, accolade vide permet de récuper l'Id*/
      { restaurantName: req.query.restaurantName },
      "menu logo restaurantName tabServeur",
      {},
      (err, data) => {
        if (err) {
          res.status(417).json({
            message: "Une erreur s'est produite dans le chargement du menu",
          });
        } else {
          console.log(data);
          if (typeof localStorage === "undefined" || localStorage === null) {
            var LocalStorage = require("node-localstorage").LocalStorage;
            localStorage = new LocalStorage("./scratch");
          }

          localStorage.setItem("myFirstKey", JSON.stringify(data));
          localStorage.setItem(
            "restaurant",
            JSON.stringify(req.query.restaurantName)
          );
          res.redirect("https://client.osc-fr1.scalingo.io/Menu");
        }
      }
    );
  },

  getMenuTicket: (req, res, next) => {
    Restaurateur.findOne(
      /*Get la photo du daily menu, accolade vide permet de récuper l'Id*/
      { restaurantName: req.query.restaurantName },
      "menu logo restaurantName tabServeur",
      {},
      (err, data) => {
        if (err) {
          res.status(417).json({
            message: "Une erreur s'est produite dans le chargement du menu",
          });
        } else {
          console.log(data);
          if (typeof localStorage === "undefined" || localStorage === null) {
            var LocalStorage = require("node-localstorage").LocalStorage;
            localStorage = new LocalStorage("./scratch");
          }

          localStorage.setItem("myFirstKey", JSON.stringify(data));
          localStorage.setItem(
            "restaurant",
            JSON.stringify(req.query.restaurantName)
          );
          res.redirect("https://client.osc-fr1.scalingo.io/ListeServeurs");
        }
      }
    );
  },

  menu: (req, res) => {
    if (typeof localStorage === "undefined" || localStorage === null) {
      var LocalStorage = require("node-localstorage").LocalStorage;
      localStorage = new LocalStorage("./scratch");
    }
    res.json(localStorage.getItem("myFirstKey"));
  },
  getWalletId: (req, res) => {
    Restaurateur.findOne(
      /*Get la photo du daily menu, accolade vide permet de récuper l'Id*/
      { _id: req.body._id },

      (err, result) => {
        if (err) {
          res.status(417).json({
            message: "Une erreur s'est produite dans le chargement du menu",
          });
        } else {
          Serveur.findOne(
            { email: result.referent.email },

            (err, resultat) => {
              if (err) {
                res.status(417).json({
                  message:
                    "Une erreur s'est produite dans le chargement du menu",
                });
              } else {
                res.json(resultat.mangoWalletReferent);
              }
            }
          );
        }
      }
    );
  },
  /*Commentaires*/
  postCommentaire: (req, res, next) => {
    if (typeof localStorage === "undefined" || localStorage === null) {
      var LocalStorage = require("node-localstorage").LocalStorage;
      localStorage = new LocalStorage("./scratch");
    }
    Serveur.updateOne(
      { email: localStorage.getItem("serveurEmail") },
      {
        $push: {
          commentaires: {
            texte: req.body.texte,
            nom: req.body.nom,
            prenom: req.body.prenom,
          },
        },
      },
      (err, data) => {
        if (err) {
          res.status(500).end();
        } else {
          console.log(req.body.id);
          console.log(req.body.texte);
          res.json(data);
        }
      }
    );
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
        message: "Email is required",
      });
      return;
    }

    const resetPasswordToken = crypto.randomBytes(20).toString("hex");

    Client.updateOne(
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
          message: "A reset link was send",
        });
        Client.findOne({ email: email }, (error, user) => {
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
            "https://back-end.osc-fr1.scalingo.io/client/autorisation-password?email=" +
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
        message: "Email, password and token are required",
      });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);

    Client.findOne({ email: email }, (error, data) => {
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
          message: "User not found or invalid token",
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
          message: "User not found or invalid token",
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
            message: "An error has occured",
          });
          return;
        }

        res.json({
          success: true,
          message: "New password set",
        });
      });
    });
  },

  validPasswordRenew: (req, res) => {
    if (!req.query.email) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    Client.findOne(
      { email: req.query.email },

      (err, result) => {
        if (err) {
          res.status(417).json({ message: "erreur" });
          console.log(err);
          return;
        }

        Client.updateOne(
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

            res.redirect("https://client.osc-fr1.scalingo.io/passwordRenew");
          }
        );
      }
    );
  },
};

module.exports = clientController;
