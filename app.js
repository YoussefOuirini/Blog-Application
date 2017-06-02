const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const sequelize= new Sequelize('postgres://' + process.env.POSTGRES_USER + ":" + process.env.POSTGRES_PASSWORD + '@localhost/blog_app');

app.use('/', bodyParser());

app.set('views', './');
app.set('view engine', 'pug');
app.use(express.static("public"));

var User = sequelize.define('user', {
	username: Sequelize.STRING,
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
	title: Sequelize.STRING,
	body: Sequelize.STRING
})

Post.belongsTo(User);
User.hasMany(Post);
Comment.belongsTo(Post);
Post.hasMany(Comment);
Comment.belongsTo(User);
User.hasMany(Comment);

app.get('/register', (req,res) =>{
	res.render('view/register')
});

var server = app.listen(3000, function() {
  console.log('http//:localhost:' + server.address().port);
});