const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const session= require('express-session');
const sequelize= new Sequelize('postgres://' + process.env.POSTGRES_USER + ":" + process.env.POSTGRES_PASSWORD + '@localhost/blog_app');

app.use('/', bodyParser());

app.set('views', './');
app.set('view engine', 'pug');
app.use(express.static("public"));

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

Post.belongsTo(User);
User.hasMany(Post);
Comment.belongsTo(Post);
Post.hasMany(Comment);
Comment.belongsTo(User);
User.hasMany(Comment);

app.use(session({
	secret: 'Idha kanu ridjalu yafaluna maa yumarun maa kana nisaa yashtakunn',
	resave: true,
	saveUninitialized: false
}));

app.get('/', function (req,res){
	res.render('views/index', {
		message: req.query.message,
		user: req.session.user
	});
});

app.get('/register', (req,res) =>{
	res.render('views/register')
});

app.post('/register', bodyParser.urlencoded({extended:true}), (req,res) => {
	User.sync()
		.then(function(){
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
				User.sync()
					.then(function(){
						return User.create({
							firstname: req.body.firstname,
							lastname: req.body.lastname,
							email: req.body.email,
							password: req.body.password
						})
					})
					.then(function(){
						res.render('views/login')
					})
					.then().catch(error => console.log(error))
			}
		})
		.then().catch(error => console.log(error))
		})
	.then().catch(error => console.log(error))
})

app.get('/profile', function (req, res) {
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
	}).then(function (user) {
		if(user !== null && req.body.password === user.password) {
			req.session.user = user;
			res.redirect('profile');
		} else {
			res.redirect('/?message=' + encodeURIComponent("Invalid email or password.")); //This one does not seem to trigger
		} 
	}, function (error) {
		res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});

app.get('/logout', function (req, res) {
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
    Post.sync()
    	.then(function(){
    		Post.findAll()
    			.then(function(posts){
    				let promises = []
    				for (var i = 0; i < posts.length; i++) {
    					promises.push(User.findOne({
    						where: {
    							id: posts[i].userId}
    						}));
    				}
    				Promise.all(promises)
    				.then((users) => {
	    				// console.log(post[0].dataValues.title);
	    				console.log(users)
	    				res.render('views/post', {
	    					posts: posts,
	    					users: users
	    				})
    				})
    			}).then().catch(error => console.log(error))
    	})
    	.then().catch(error=> console.log(error))
});

app.post('/post', (req,res) => {
	if(req.body.message.length===0 || req.body.title.length===0) {
		res.end('You forgot your title or message!');
	}
	Post.sync()
		.then()
		console.log('email is: ' + req.session.user.email);
			User.findOne({
				where: {
					email: req.session.user.email
				}
			}).then(function(user){
				return Post.create({
					title: req.body.title,
					body: req.body.message,
					userId: user.id
				})
			}).then().catch(error=> console.log(error))
		//doe een query findOne met req.session.user.email als argument
		//.then() --> return Post.create
			// return Post.create({
			// 	title: req.body.title,
			// 	body: req.body.message,
			// 	userId: req.session.user.email
			// })
		.then(function() {
			res.redirect('/post');
		})
		.then().catch(error => console.log(error));
})

app.post('/comment', (req,res)=>{
	if(req.body.comment.length===0) {
		res.end('You forgot your comment!')
	}
	Comment.sync()
		.then()
			User.findOne({
				where: {
					email: req.session.user.email
				}
			}).then(user => {
				return Comment.create({
					body: req.body.comment,
					userId: user.id
				})
			}).then(function(){
				res.redirect('/post')
			}).then().catch(error => console.log(error));
})

var server = app.listen(3000, function() {
  console.log('http//:localhost:' + server.address().port);
});