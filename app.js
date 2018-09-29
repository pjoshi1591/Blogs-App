var express      = require("express"),
mongoose         = require("mongoose"),
bodyParser       = require("body-parser"),
flash            = require("connect-flash"),
methodOverride   = require("method-override"),
app              = express(),
moment           = require("moment"),
passport         = require("passport"),
LocalStrategy    = require("passport-local"),
expressSanitizer = require("express-sanitizer"),
User             = require("./models/user");

// mongoose.connect('mongodb://localhost:27017/restful_blog_app_v3', { useNewUrlParser: true });
var url = process.env.DATABASEURL || "mongodb://localhost:27017/restful_blog_app";
mongoose.connect(url, { useNewUrlParser: true });

app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(flash());

// Passport Configuration
app.use(require("express-session")({
    secret:"This is the secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
})

var blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    body: String,
    author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String
   },
    date: { type: Date, default:Date.now }
});
var Blog = mongoose.model("Blog",blogSchema);

app.get("/", function(req,res){
    res.redirect("/blogs");
});
//Index Route
app.get("/blogs", function(req,res){
    Blog.find({},function(err,blogs){
        if(err){
            console.log("error");
        } else {
            res.render("index",{blogs:blogs,currentUser:req.user});
        }
    });
    
});
//New route
app.get("/blogs/new",isLoggedIn,function(req,res){
    res.render("new");
});
//Create Route
app.post("/blogs",isLoggedIn,function(req,res){
    req.body.content = req.sanitize(req.body.content);
    var title = req.body.title;
    var image = req.body.image;
    var body =  req.body.content;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var newblog = {title:title,image:image,body:body,author:author}
    Blog.create(newblog,function(err,newlyCreated){
        if(err){
            console.log("ERROR");
        } else {
            // console.log(newlyCreated);
            req.flash("success", "Successfully added Blog");
            res.redirect("/blogs");
        }
    })
});

app.get("/blogs/:id",function(req,res){
    Blog.findById(req.params.id,function(err,foundBlog){
        if(err){
            console.log("Error");
        }else {
            res.render("show",{blog:foundBlog})
        }
    });
});

app.get("/blogs/:id/edit",checkOwnership,function(req,res){
        Blog.findById(req.params.id, function(err,foundBlog){
            res.render("edit",{blog: foundBlog});
    });
});

app.put("/blogs/:id",checkOwnership,function(req,res){
    req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err,updatedBlog){
        if(err){
            console.log("ERROR");
        } else {
            req.flash("success", "Successfully Updated Blog");
            res.redirect("/blogs/" + req.params.id);
        }
    })
});

app.delete("/blogs/:id",checkOwnership,function(req,res){
    Blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            console.log("ERROR");
        }else {
            req.flash("success", "Successfully Deleted Blog");
            res.redirect("/blogs")
        }
    });
});

//Auth Routes

//show the register form

app.get("/register",function(req, res) {
    res.render("register");
});

//handle sign up logic
app.post("/register",function(req,res){
    var newUser = new User({username:req.body.username});
    User.register(newUser, req.body.password, function(err,user){
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        } else {
            passport.authenticate("local")(req,res,function(){
                req.flash("success", "Successfully Signed Up! Nice to meet you " + req.body.username);
                res.redirect("/blogs");
            })
        }
    })
});

//SHow login form
app.get("/login",function(req, res) {
    res.render("login");
});

//Handling login logic

app.post("/login", function (req, res, next) {
  passport.authenticate("local",
    {
      successRedirect: "/blogs",
      failureRedirect: "/login",
      failureFlash: true,
      successFlash: "Welcome to Blog, " + req.body.username + "!"
    })(req, res);
});

//Logout Route
app.get("/logout",function(req, res) {
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect("/blogs");
});

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
}

function checkOwnership(req,res,next){
    if(req.isAuthenticated()){
        Blog.findById(req.params.id, function(err,foundBlog){
        if(err){
            console.log("back");
        }else {
            if(foundBlog.author.id.equals(req.user._id)){
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
            
        }
    });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}


app.listen(process.env.PORT,process.env.IP,function(){
    console.log("Server listening");
});