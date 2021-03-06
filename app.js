require("dotenv").config();   //// No need to use const. as we never gonna use it again, it's just active and running....
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");   /// require these constants in this order.....
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");  // we do not requiring passport-local as it is internally required by passport-local-mongoose....
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app =  express();

// console.log(md5("123456"));   //// Inside the heroku including this .gitignore file we have to set config vars as to heroku access the secrets.....

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: process.env.SECRET,     //// place this line right here....below all other app.use and above mongoose connection....
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-lucky:lucky@cluster0.zunk9.mongodb.net/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://quiet-caverns-88695.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      }else {
        if (foundUsers){
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });
  }else {
    res.redirect("/login");
  }

});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  }else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser){
    if (err){
      console.log(err);
    } else {
      if (foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

//// cookies get deleted everytime we restarted the server.....

app.post("/register", function(req, res){
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     });
//     newUser.save(function(err){
//       if (err){
//         console.log(err);
//       } else {
//         res.render("secrets");
//       }
// });
//
//
//   });


User.register({username: req.body.username}, req.body.password, function(err, user){
  if (err){
    console.log(err);
    res.redirect("/register");
  }else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});

});

app.post("/login", function(req, res){
  // const username = req.body.username;
  // const password = req.body.password;
  //
  // User.findOne({email: username}, function(err, foundUser){
  //   if (err){
  //     console.log(err);
  //   } else {
  //     if (foundUser){
  //       bcrypt.compare(password, foundUser.password, function(err, result) {
  //        if (result === true){
  //          res.render("secrets");
  //        }
  //         });
  //     }
  //   }
  // });



  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err){
      console.log(err);
    }else {
      passport.authenticate("local")(req, req, function(){
        res.redirect("/secrets");
      });
    }
  });

});









let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function(){
  console.log("Server has started successfully.");
});
