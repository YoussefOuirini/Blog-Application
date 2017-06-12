// Seting up the libraries:
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const session= require('express-session');
const bcrypt= require('bcrypt-nodejs');

// Setting up the link to the database.
const sequelize= new Sequelize('blog_app', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: true
	}
})

app.use('/', bodyParser());

app.set('views', './');
app.set('view engine', 'pug');
app.use(express.static("public"));

// Setting up the tables
var User = sequelize.define('user', {
	firstname: Sequelize.STRING,
	lastname: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING
});

var Post= sequelize.define('post', {
	title: Sequelize.STRING,
	body: Sequelize.STRING
})

var Comment= sequelize.define('comment', {
	body: Sequelize.STRING
})

// Setting up the model by linking the tables to each other
Post.belongsTo(User);
User.hasMany(Post);
Comment.belongsTo(Post);
Post.hasMany(Comment);
Comment.belongsTo(User);
User.hasMany(Comment);

sequelize.sync({force: false}) //Change false to true to wipe clean the whole database.

// Creates session when user logs in
app.use(session({
	secret: `#{process.env.SECRET_SESSION}`,
	resave: true,
	saveUninitialized: false
}));

// Goes to the index page, which is the homepage of the blog app
app.get('/', function (req,res){
	res.render('views/index', {
		// You can also use req.session.message so message won't show in the browser
		message: req.query.message,
		user: req.session.user
	});
});
// Goes to the register page.
app.get('/register', (req,res) =>{
	res.render('views/register')
});

app.post('/register', bodyParser.urlencoded({extended:true}), (req,res) => {
	User.sync()
	.then(function(){
			// Finds if the email is already in the database.
			User.findOne({
				where: {
					email: req.body.email
				}
			})
			.then(function(user){
			if(user !== null && req.body.email=== user.email) {
        		res.redirect('/?message=' + encodeURIComponent("Email already in use!"));
				return;
			}
			else {
				bcrypt.hash(req.body.password, null, null, (err, hash)=>{
							// Store hash in your password DB
							if (err) {
								throw err;
							} 
							User.sync()
							.then(()=>{
								User.create({
									firstname: req.body.firstname,
									lastname: req.body.lastname,
									email: req.body.email,
									password: hash
								})
							})
							.then(function(){
								res.render('views/login')
							})
							.then().catch(error=> console.log(error))
				})
			}})
			.then().catch(error => console.log(error))
		})
	.then().catch(error => console.log(error))
})

app.get('/profile', (req, res)=> {
    var user = req.session.user;
    if (user === undefined) {
        res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
    } else {
        res.render('views/profile', {
            user: user
        });
    }
});

app.get('/login', (req,res) =>{
	res.render('views/login')
})

app.post('/login', (req, res)=>{
	if(req.body.email.length ===0) {
		res.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}
	if(req.body.password.length===0) {
		res.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}
	User.findOne({
		where: {
			email:req.body.email
		}
	}).then((user) => {
		bcrypt.compare(req.body.password, user.password, (err, data)=>{
			if (err) {
				throw err;
			} else {
				console.log(data);
				if(user !== null && data === true) {
					req.session.user = user;
					res.redirect('/');
				} else {
					res.redirect('/?message=' + encodeURIComponent("Invalid email or password.")); //This one does not seem to trigger
				} 
			}
		});
	}, (error)=> {
		res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});

app.get('/logout', (req, res)=> {
    req.session.destroy(function(error) {
        if(error) {
            throw error;
        }
        res.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
    })
});

app.get('/post', (req,res) =>{
	var user = req.session.user;
	if (user === undefined) {
        res.redirect('/?message=' + encodeURIComponent("Please log in to view and post messages!"));
    }
    else {
	    Post.sync()
	    	.then(function(){
	    		User.findAll()
	    			.then((users)=>{
	    				Post.findAll({include: [{
			    				model: Comment,
			    				as: 'comments'
			    			}],
			    			order: '"updatedAt" DESC'
			    		})
			    		.then((posts)=>{
			    			res.render('views/post', {
			    				posts: posts,
			    				users: users
			    			})
			    		})
	    			})
	    	})
	    	.then().catch(error=> console.log(error))
	}
});

app.get('/myposts', (req,res) =>{
	var user = req.session.user;
	if (user === undefined) {
        res.redirect('/?message=' + encodeURIComponent("Please log in to view and post messages!"));
    }
    else {
		Post.findAll({
			where: {
				userId: user.id
			},
			include:[{
				model: Comment,
				as: 'comments'
			}],
			order: '"updatedAt" DESC'
		})
		.then((posts)=>{
			User.findAll().then((users)=>{
				res.render('views/post', {
					posts: posts,
					users: users
				})
			})
		})
		.then().catch(error => console.log(error))
	}
});

app.post('/post', (req,res) => {
	if(req.body.message.length===0 || req.body.title.length===0) {
		res.end('You forgot your title or message!');
		return
	}
	else {
		Post.sync()
			.then()
				User.findOne({
					where: {
						email: req.session.user.email
					}
				}).then((user)=>{
					return Post.create({
						title: req.body.title,
						body: req.body.message,
						userId: user.id
					})
				}).then().catch(error=> console.log(error))
			.then(function() {
				res.redirect('/post');
			})
			.then().catch(error => console.log(error));
	}
})

app.post('/comment', (req,res)=>{
	if(req.body.comment.length===0) {
		res.end('You forgot your comment!')
	}
	else {
		Comment.sync()
			.then()
				User.findOne({
					where: {
						email: req.session.user.email
					}
				}).then(user => {
					return Comment.create({
						body: req.body.comment,
						postId: req.body.messageId,
						userId: user.id
					})
				}).then(function(){
					res.redirect('/post')
				}).then().catch(error => console.log(error));
	}
})

var server = app.listen(3000, function() {
  console.log('http//:localhost:' + server.address().port);
});