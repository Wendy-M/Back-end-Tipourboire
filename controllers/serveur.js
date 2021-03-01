const Serveur = require("../model/Serveur");
var fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { model, base } = require("../model/Serveur");
const Restaurateur = require("../model/Restaurateur");
const crypto = require("crypto");
const { resolve } = require("path");
const fetch = require("node-fetch");
var mangopay = require("mangopay2-nodejs-sdk");
var Buffer = require("buffer/").Buffer;

const stripe = require("stripe")(
  "sk_test_51HAxRlHoh2Vgz5Qd4gemyV84ODV8vdNB69QzOSv7Zn3MRGX09aNq4cbmZtHzYqwkCCVHE1F2CNd9b2v1sq9HiTdM00mEihmKKL"
);

var api = new mangopay({
  clientId: "ctottt",
  clientApiKey: "sPuA8HB9cKzPFFxyyTaNW0rxx7Zp9zmOqynxMp9ocOHKzqeKvM",
  // Set the right production API url. If testing, omit the property since it defaults to sandbox URL
  baseUrl: "https://api.sandbox.mangopay.com",
});

/* Controller to register; get data of serveur; login; edit and delete serveur*/
const serveurController = {
  // Verification d'inscription TTT
  verify: (req, res, next) => {
    if (!req.query.id) {
      res.status(404).json({ message: "An error has occured" });
      return;
    }

    /* ETAPE 1: Trouver le serveur */
    Serveur.findOne({ verificationId: req.query.id }, (error, user) => {
      /* En cas d'erreur */
      if (error) {
        res.status(500).json({ message: "An error has occured" });
        return;
      }

      /* Aucun serveur trouvé */
      if (!user) {
        res.status(404).json({ message: "Not found" });
        return;
      }

      /* ETAPE 2: Création de l'utilistaeur stripe */
      stripe.customers
        .create({
          description: "serveur",
          email: user.email,
        })

        .then((model) => {
          /* ETAPE 3: Engresitrement de la vérification du serveur */
          user.confirmed = true;
          user.verificationId = null;
          user.stripeId = model.id;

          /* Enregistrement du serveur */
          user.save((error) => {
            /* En cas d'erreur */
            if (error) {
              res.status(500).json({
                message: "An error has occured",
              });
              return;
            }
            async (req, res) => {
              Serveur.findOne({ _id: req.user._id }, async (err, user) => {
                try {
                  await stripe.accounts
                    .create({
                      country: "FR",
                      type: "express",

                      requested_capabilities: ["card_payments", "transfers"],
                    })
                    .then((model) => {
                      user.accountId = model.id;
                      user.save((error) => {
                        if (error) {
                          res.status(500).json({
                            message: "An error has occured",
                          });
                          return;
                        }
                      });
                    });
                } catch (error) {
                  return res
                    .status("402")
                    .send({ error: { message: error.message } });
                }
              });
            },
              api.Users.create(
                {
                  FirstName: user.firstname,
                  LastName: user.lastname,
                  Birthday: 1000186358,
                  Nationality: "FR",
                  CountryOfResidence: "FR",
                  Occupation: "Serveur",
                  PersonType: "NATURAL",
                  Email: user.email,
                  Tag: "Serveur",
                  Occupation: "Serveur",
                  IncomeRange: "6",
                  ProofOfIdentity: null,
                  ProofOfAddress: null,
                  PersonType: "NATURAL",
                },
                function (model) {
                  user.mangoID = model.Id;
                  user.save((error) => {
                    if (error) {
                      res.status(500).json({
                        message: "An error has occured with MANGO users",
                      });
                      return;
                    }
                  });
                }
              ).then(function (model) {
                api.Wallets.create(
                  {
                    Owners: [user.mangoID],
                    Description:
                      "Wallet de " + user.firstname + " " + user.lastname,
                    Currency: "EUR",
                    Tag: "custom meta",
                  },
                  function (model) {
                    user.mangoWallet = model.Id;
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
              });

            /* Réponse */
            res.redirect("https://serveur.osc-fr1.scalingo.io/");
          });
        });
    });
  },
  // Systeme paiement abonnement serveur
  paiement: (req, res, next) => {
    stripe.paymentMethods.create(
      {
        type: "card",
        card: {
          number: req.body.card.number,
          exp_month: req.body.card.exp_month,
          exp_year: req.body.card.exp_year,
          cvc: req.body.card.cvc,
        },
      },
      function (err, paymentMethod) {
        if (err) {
          console.log(err);
          res.status(500).json({
            message: "Il y a un problème dans l'enregistrement de votre carte",
          });
          return;
        }
        req.user.paymentMethodId = paymentMethod.id;
        req.user.save((error) => {
          /* En cas d'erreur */
          if (error) {
            res.status(500).json({
              message: "An error has occured",
            });
            return;
          }

          /* Réponse */
          res.json({ message: "votre carte a bien été enregistrée" });
        });
      }
    );
  },
  // Inscription TTT
  inscription: (req, res, next) => {
    const emailVerif = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const passwordVerif = RegExp(
      "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
    );

    /*stockage d'un mot de passe crypté dans la base de données apres le req*/
    const hash = bcrypt.hashSync(req.body.password, 10);

    if (
      typeof req.body.firstname != "string" ||
      typeof req.body.lastname != "string" ||
      typeof req.body.phone != "string" ||
      typeof req.body.adress != "string" ||
      typeof req.body.city != "string" ||
      typeof req.body.staff != "string" ||
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

      const newServeur = new Serveur({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        phone: req.body.phone,
        email: req.body.email,
        password: hash /*mdp hashé*/,
        date: req.body.date,
        adress: req.body.adress,
        city: req.body.city,
        staff: req.body.staff,
        confirmed: false,
        stripeId: "",
        verificationId: rand,
        subId: "",
        mangoID: "",
        mangoWallet: "",
        commentaires: [{ prenom: "", nom: "", texte: "" }],
        restaurantName: [{ restaurantID: "", restaurantName: "" }],
        stripeVerif: false,
        accountId: "",
        resetPasswordDate: null,
        autorisation: false,
        mangoWalletReferent: "",
      });

      newServeur.save((err) => {
        if (err) {
          console.log(err);
          res.json({
            message:
              "L'e-mail saisi est déja lié à un compte. Veuillez vous connecter ou saisir une autre adresse mail.",
          });
        } else {
          res.json({
            message: "Votre compte à bien été crée",
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
          pass: "Tipourboire06!",
        },
      });

      link = "https://back-end.osc-fr1.scalingo.io/serveur/verify?id=" + rand;
      let mailOptions = {
        from: "contact@tipourboire.com",
        to: req.body.email,
        subject: "Votre inscription a Tipourboire a été validée",
        html:
          '<header  style=" background-color:#f4a521"> <h1 style="color: white; font-size: 30px; text-align:center; padding:10px">TIPOURBOIRE</h1></header> <p style=" padding:15px; text-align:center; font-size:18px; font-family:arial">Bonjour et merci pour votre inscription à Tipourboire ! <br/> Cliquez sur le lien ci-dessous pour confirmer votre inscription. Si vous voulez percevoir vos pourboires, veuillez finir les étapes de votre inscription dans mes pourboires indivuels et/ou mes pourboires collectifs <br/> <br/>  <a style=" margin-top:15px; text-decoration:none; color: #f4a521; font-weight:bold; font-size:23px; font-family:arial" href=' +
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
  // Récupération du profil du serveur connecté
  getServeur: (req, res, next) => {
    delete req.user.password; /*permet de ne pas afficher le password crypté*/
    res.json(req.user); /*on request sous format json les données du serveur */
  },
  // Connexion TTT
  login: (req, res, next) => {
    const cacahuete = RegExp("([A-z]|[0-9])+@([A-z]|[0-9])+.[A-z]{2,3}");
    const email = req.body.email;
    const mdp = RegExp(
      "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
    );
    const password = req.body.password;

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
      Serveur.findOne({ email: req.body.email }, (err, data) => {
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
  // Modification du profil
  edit: (req, res, next) => {
    if (
      typeof req.body.serveur.city != "string" ||
      typeof req.body.serveur.lastname != "string" ||
      typeof req.body.serveur.firstname != "string" ||
      typeof req.body.serveur.adress != "string" ||
      typeof req.body.serveur.staff != "string" ||
      (req.body.serveur.phone && typeof req.body.serveur.phone != "string")
    ) {
      res.status(417);
      res.json({
        message:
          "Veuillez compléter les champs au bon format pour confirmer la modification de votre compte.",
      });
    } else {
      Serveur.updateOne(
        /*Modif et mise à jour des données l'user repéré grace a son id */
        {
          _id: req.user._id,
          /* _id: "5f18130fd733700fa02869e2",*/
        },
        {
          city: req.body.serveur.city,
          lastname: req.body.serveur.lastname,
          firstname: req.body.serveur.firstname,
          adress: req.body.serveur.adress,
          phone: req.body.serveur.phone,
          staff: req.body.serveur.staff,
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
  // Récupération de la photo serveur
  getLogo: (req, res, next) => {
    const filePath = req.file.path.replace("public", "");
    Serveur.updateOne(
      { _id: req.user._id },
      {
        $set: {
          picture: filePath,
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
          console.log(req.file.path);
        }
      }
    );
  },
  // Création compte stripe + link vers onboardingflow {si onboarding fini => connexion account via stripe} (à finir)
  customerAccount: async (req, res) => {
    Serveur.findOne({ _id: req.user._id }, async (err, user) => {
      //Condition: Si stripeVerif = true alors ca fais le createLoginLink
      if (req.user.stripeVerif === true) {
        await stripe.accounts

          .createLoginLink(req.user.accountId)
          .then((model) => {
            res.json(model.url);
          });
      }
      //Sinon ca créer l'account et le liens vers l'onboarding en ajoutant l'account ID dans la DB + modifier le stripeVerif en true
      else {
        //Création accounts Stripe
        await stripe.accounts
          .create({
            country: "FR",
            type: "express",
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          })
          //Model du accounts create pour récupérer l'id du accountID + enregistrement dans la base de donnée
          .then(async (modelAccount) => {
            user.accountId = modelAccount.id;
            user.save(async (error) => {
              if (error) {
                res.status(500).json({
                  message: "An error has occured",
                });
                return;
              }

              await stripe.accountLinks
                .create({
                  // Mettre dans return url l'adresse d'un composant envoyant un requête pour valier stripeVerif
                  account: modelAccount.id,
                  refresh_url: "https://example.com/reauth",
                  return_url:
                    "https://back-end.osc-fr1.scalingo.io/serveur/verif?_id=" +
                    req.user._id,
                  type: "account_onboarding",
                })
                .then(
                  (modelLink) => {
                    res.json(modelLink.url);
                  },
                  () => {
                    res.status(500).json({
                      message: "An error has occured",
                    });
                  }
                );
            });
          });
      }
    });
  },
  verifOnboarding: async (req, res) => {
    Serveur.findOne({ _id: req.query._id }, async (err, user) => {
      await stripe.accounts.retrieve(user.accountId).then((modelAccount) => {
        if (modelAccount.charges_enabled === true) {
          Serveur.updateOne(
            { _id: req.query._id },
            {
              stripeVerif: true,
            },
            (err) => {
              if (err) {
                console.log(err);
                res.json({ message: "une erreur s'est produite" });
              } else {
                res.redirect("https://serveur.osc-fr1.scalingo.io/monprofil");
              }
            }
          );
        } else {
          res.json({ message: "Vous n'avez pas fini l'onboarding" });
        }
      });
    });
  },

  /*Serveur.findOne({ _id: req.query._id }, async (userData) => {
      await stripe.accounts.retrieve(userData).then((modelAccountRetrieve) => {
        Serveur.updateOne(
          
          {
            accountId: modelAccountRetrieve.id,
          },
          {
            stripeVerif: true,
          },
          (err) => {
            if (err) {
              console.log(err);
              res.json({ message: "une erreur s'est produite" });
              return;
            }
          }
        );
        res.json(userData);
      });
    })*/

  // Création abonnement
  createSubscription: async (req, res) => {
    Serveur.findOne({ _id: req.user._id }, async (err, user) => {
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
          items: [{ price: "price_1Hr1j9Hoh2Vgz5QdvrI9FBDN" }],
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
  // Peut-être à virer (à voir)
  createBankAccount: async (req, res) => {
    Serveur.findOne({ _id: req.user._id }, async (err, user) => {
      try {
        await stripe.customers.createSource({
          source: {
            object: "bank_account",
            currency: "eur",
            country: "FR",
            account_number: "FR89370400440532013000",
          },
        });
      } catch (error) {
        return res.status("402").send({ error: { message: error.message } });
      }
    });
  },
  // Supréssion du compte profil
  delete: (req, res, next) => {
    Serveur.deleteOne(
      {
        _id: req.user._id,
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
  // Affichage historique de paiement + addition somme reçu
  addToWallet: (req, res) => {
    Serveur.findOne({ _id: req.body.id }, (err, user) => {
      if (err) {
        res.status(500).json({ message: "error" });
        return;
      }
      if (!user) {
        res.status(400).json({ message: "waiter not found" });
        return;
      }
      const amount = parseFloat(req.body.amount);
      if (typeof user.wallet != "number") {
        user.wallet = 0;
      }
      user.wallet += amount;
      user.history.push({
        date: new Date().toISOString(),
        amount: amount,
      });
      user.save((err) => {
        if (err) {
          res.status(500).json(err);

          return;
        }
        res.json({ message: "Changement sauvegarder" });
      });
    });
  },
  getCagnotteMango: (req, res) => {
    Serveur.findOne({ _id: req.user._id }, (err, user) => {
      api.Wallets.get(user.mangoWallet, (model) => {
        res.json(model.Balance.Amount);
      });
    });
  },
  createMangoBankAccount: (req, res) => {
    Serveur.findOne({ _id: req.user._id }, (err, user) => {
      let body = {
        OwnerName: user.firstname + " " + user.lastname,
        OwnerAddress: {
          AddressLine1: req.body.adress,

          City: req.body.city,
          Region: req.body.region,
          PostalCode: req.body.zip,
          Country: "FR",
        },
        IBAN: req.body.iban,
      };

      fetch(
        "https://api.sandbox.mangopay.com/v2.01/ctottt/users/" +
          user.mangoID +
          "/bankaccounts/iban",
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
        .then((res) => res.json())
        .then((json) => {
          if (err) {
            res.json({ message: "An error has occured" });
          } else {
            user.mangoBankAcc = json.Id;
            user.save((error) => {
              if (error) {
                res.status(500).json({
                  message: "An error has occured with MANGO users",
                });
                return;
              } else {
                return res.json({ message: "Vos documents sont téléchargés" });
              }
            });
          }
        });
    });
  },

  kycDocument: async (req, res) => {
    Serveur.findOne({ _id: req.user._id }, (err, user) => {
      const filePath = req.file.path;
      let body = {
        Type: "IDENTITY_PROOF",
      };

      fetch(
        "https://api.sandbox.mangopay.com/v2.01/ctottt/users/" +
          user.mangoID +
          "/kyc/documents",
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
        .then((response) => response.json())
        .then((json) => {
          let bodyPage = {
            File: fs.readFileSync(filePath, { encoding: "base64" }),
          };

          fetch(
            "https://api.sandbox.mangopay.com/v2.01/ctottt/users/" +
              user.mangoID +
              "/kyc/documents/" +
              json.Id +
              "/pages/",
            {
              method: "post",
              body: JSON.stringify(bodyPage),

              headers: {
                "Content-Type": "application/json",
                Authorization:
                  "Basic Y3RvdHR0OnNQdUE4SEI5Y0t6UEZGeHl5VGFOVzByeHg3WnA5em1PcXlueE1wOW9jT0hLenFlS3ZN",
              },
            }
          )
            .then((response) => {
              if (response.status != 204) {
                res.json({ message: "An error has occured" });
                return;
              }

              let body = {
                Status: "VALIDATION_ASKED",
              };

              fetch(
                "https://api.sandbox.mangopay.com/v2.01/ctottt/users/" +
                  user.mangoID +
                  "/kyc/documents/" +
                  json.Id,
                {
                  method: "put",
                  body: JSON.stringify(body),
                  headers: {
                    "Content-Type": "application/json",
                    Authorization:
                      "Basic Y3RvdHR0OnNQdUE4SEI5Y0t6UEZGeHl5VGFOVzByeHg3WnA5em1PcXlueE1wOW9jT0hLenFlS3ZN",
                  },
                }
              ).then((response) => {
                if (response.status != 200) {
                  res.json({ message: "An error has occured" });
                } else {
                  res.json({
                    message:
                      "Votre document à bien été envoyé une réponse vous sera fournis dans les 24 heures.",
                  });
                }
              });
            })
            .finally(() => {
              fs.unlinkSync(filePath);
            });
        });
    });
  },
  kycDocument1: (req, res) => {
    Serveur.findOne({ _id: "5ff46ce579582449ccef3402" }, (err, user) => {
      let body = {
        Type: "IDENTITY_PROOF",
      };

      fetch(
        "https://api.sandbox.mangopay.com/v2.01/ctottt/users/" +
          user.mangoID +
          "/kyc/documents",
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
        .then((res) => res.json())
        .then((json) => {
          res.json(json.Id);
        });
    });
  },
  /* Serveur référent qui répartie les pourboires */
  transfertMangoReferent: (req, res) => {
    Serveur.findOne(
      { email: req.body.email },
      "mangoWallet abonne",
      (err, user) => {
        if (user.abonne === true) {
          api.Transfers.create(
            {
              AuthorId: req.user.mangoID,

              DebitedFunds: {
                Currency: "EUR",
                Amount: req.body.amount * 100,
              },
              Fees: {
                Currency: "EUR",
                Amount: req.body.amount * 100 * 0.15,
              },

              DebitedWalletId: req.user.mangoWalletReferent,
              CreditedWalletId: user.mangoWallet,
              Tag: "Versement du pot Commun",
            },
            (model) => {
              (error) => {
                if (error) {
                  res.status(500).json({
                    message: "An error has occured with MANGO users",
                  });
                  return;
                }
              };
            }
          );
        } else {
          api.Transfers.create(
            {
              AuthorId: req.user.mangoID,

              DebitedFunds: {
                Currency: "EUR",
                Amount: req.body.amount * 100,
              },
              Fees: {
                Currency: "EUR",
                Amount: req.body.amount * 100 * 0.25,
              },

              DebitedWalletId: req.user.mangoWalletReferent,
              CreditedWalletId: user.mangoWallet,
              Tag: "Versement du pot Commun",
            },
            (model) => {
              (error) => {
                if (error) {
                  res.status(500).json({
                    message: "An error has occured with MANGO users",
                  });
                  return;
                }
              };
            }
          );
        }
      }
    );
  },
  /* get mes commentaires*/
  afficherCommentaire: (req, res) => {
    Serveur.findOne(
      { _id: req.user._id },
      "commentaires",

      (err, data) => {
        if (err) {
          res.status(500).end();
        } else {
          console.log(data);
          res.json(data);
        }
      }
    );
  },
  // Récupération des restaurants du serveur
  getRestaurantList: (req, res) => {
    Restaurateur.find(
      { "tabServeur.serveurMail": req.user.email },
      "restaurantName",
      (err, data) => {
        if (err) {
          res.status(401).json({ message: "An error as occured" });
        } else {
          res.json(data);
        }
      }
    );
  },
  getWaiterList: (req, res) => {
    Restaurateur.findOne(
      { "tabServeur.serveurMail": req.user.email },
      "tabServeur",

      (err, data) => {
        if (err) {
          res.status(500).end();
        } else {
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
        message: "Veuillez saisir votre email",
      });
      return;
    }

    const resetPasswordToken = crypto.randomBytes(20).toString("hex");

    Serveur.updateOne(
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
          message: "Le lien afin de reset votre mot de passe vous à été envoyé",
        });
        Serveur.findOne({ email: email }, (error, user) => {
          let transporter = nodemailer.createTransport({
            pool: true,
            host: "authsmtp.securemail.pro",
            port: 465,
            secure: true, // use TLS
            auth: {
              user: "contact@tipourboire.com",
              pass: "Tipourboire06!",
            },
          });

          let link =
            "https://back-end.osc-fr1.scalingo.io/serveur/autorisation-password?email=" +
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
  payoutMangoPay: (req, res) => {
    Serveur.findOne({ _id: req.user._id }, (err, user) => {
      api.Wallets.get(req.user.mangoWallet, (model) => {
        let body = {
          AuthorId: user.mangoID,
          DebitedFunds: {
            Currency: "EUR",
            Amount: model.Balance.Amount,
          },
          Fees: {
            Currency: "EUR",
            Amount: model.Balance.Amount / 10,
          },
          BankAccountId: user.mangoBankAcc,
          DebitedWalletId: user.mangoWallet,
        };

        fetch(
          "https://api.sandbox.mangopay.com/v2.01/ctottt/payouts/bankwire/",
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
          .then((res) => res.json())
          .then((json) => {
            res.json(json);
          });
      });
    });
  },
  /* Renew password */
  renewPassword: (req, res) => {
    const [email, password] = [req.body.email, req.body.password];

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Veuillez saisir votre Email et nouveau mot de passe.",
      });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);

    Serveur.findOne({ email: email }, (error, data) => {
      if (error) {
        res.status(500).json({
          success: false,
          message: "Une erreur c'est produite, veuillez reéssayer.",
        });
        return;
      }

      if (!data || data.autorisation === false) {
        res.status(401).json({
          success: false,
          message: "Adresse mail invalide",
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
          message: "Adresse mail introuvable, veuillez reéssayer.",
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
            message: "Une erreur c'est produite, veuillez reéssayer.",
          });
          return;
        }

        res.json({
          success: true,
          message: "Mot de passe changé.",
        });
      });
    });
  },
  getReferentWallet: (req, res) => {
    Serveur.findOne({ _id: req.user._id }, (err, user) => {
      api.Wallets.get(user.mangoWalletReferent, (model) => {
        res.json(model.Balance.Amount);
        res.json ({message:"l'argent a bien été transféré"})
      });
    });
  },

  validPasswordRenew: (req, res) => {
    if (!req.query.email) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    Serveur.findOne(
      { email: req.query.email },

      (err, result) => {
        if (err) {
          res.status(417).json({ message: "erreur" });
          console.log(err);
          return;
        }

        Serveur.updateOne(
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

            res.redirect("https://serveur.osc-fr1.scalingo.io/passwordRenew");
          }
        );
      }
    );
  },
};

module.exports = serveurController;
