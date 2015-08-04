var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var path = require("path");
var ejs = require('ejs'); 
var favicon = require('serve-favicon');

var mysql = require('mysql');
var dbpool = mysql.createPool({
  connectionLimit : 10,
  host     : 'localhost',
  user     : 'rad1o',
  password : 'rad1o',
  database : 'rad1o'
});

app.engine('.ejs', require('ejs').__express);
app.use(express.static('mdl'));
app.use(express.static('img'));

app.use(favicon(__dirname + '/img/favicon.ico'));

app.set("view options", {layout: false});  
app.engine('html', require('ejs').renderFile); 
app.set('view engine', 'html');
app.set('views', __dirname + "/www");

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
}));

app.get('/',function(req,res){
	if (req.body.badgeid === undefined || req.body.badgekey === undefined) {
		// TODO Login
	}
	else {
		dbpool.getConnection(function(err, connection) {
			connection.query("SELECT sp_nickname from TA_BADGE where sp_badge_id=? and sp_badge_key=?", 
			[req.query.badgeid, req.query.badgekey],
					function(err, rows) {
				connection.release();

				if (err) {
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				var badge;
				if (rows.length != 1) {
					res.redirect('/register');
				}
				else {			
					res.render(path.join(__dirname+'/www/index.html'), { nickname : rows[0].sp_nickname });
				}
			});
		});
	}
});

app.get('/register',function(req,res) {
	//console.log('register: ', req.query.badgeid, "   ", req.query.badgekey);
	if (req.query.badgeid !== undefined && req.query.badgekey !== undefined) {
		dbpool.getConnection(function(err, connection) {
			connection.query("SELECT * from TA_BADGE where sp_badge_id=? and sp_badge_key=?", 
			[req.query.badgeid, req.query.badgekey],
					function(err, rows) {
				connection.release();

				if (err) {
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				var badge;
				if (rows.length != 1) {
					badge = {
						badge_id       : "",
						badge_key      : "",
						badge_nickname : "",
						badge_callsign : "",
						badge_email    : ""
					}
				}
				else {
					var result = rows[0];				
					
					badge = {
						badge_id       : result.sp_badge_id,
						badge_key      : result.sp_badge_key,
						badge_nickname : result.sp_nickname,
						badge_callsign : result.sp_callsign,
						badge_email    : result.sp_email
					}
				}
				
				res.render(path.join(__dirname+'/www/register.html'), badge);
			});
		});
	} 
	else {
		var badge = {
			badge_id       : "",
			badge_key      : "",
			badge_nickname : "",
			badge_callsign : "",
			badge_email    : ""
		}
		res.render(path.join(__dirname+'/www/register.html'), badge);
	}
});

app.get('/challenge',function(req,res){
	var challengeId = req.query.challengeid;
	
	if (challengeId === undefined) {
		res.render(path.join(__dirname+'/www/challengechooser.html'));
		return;
	}
	
	dbpool.getConnection(function(err, connection) {
		connection.query("SELECT * from TA_CHALLENGE where sp_number=?",
				[challengeId],
				function(err, rows) {
			connection.release();

			if (err) {
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
			
			//console.log('Query result: ', rows[0]);
			
			var challenge = rows[0]; 
				
			res.render(path.join(__dirname+'/www/challenge.html'), {
				number      : challenge.sp_number,
				title       : challenge.sp_title,
				description : challenge.sp_description,
				classid     : challenge.sp_class,		
				answer1     : challenge.sp_answer1, 
				answer2     : challenge.sp_answer2, 
				answer3     : challenge.sp_answer3, 
				answer4     : challenge.sp_answer4,
				hint        : challenge.sp_hint,
				credits     : challenge.sp_credits,
				points      : challenge.sp_points
			});
		});
	});
});

app.get('/highscore',function(req,res){
	var badgeId = req.query.badgeid;
	
	dbpool.getConnection(function(err, connection) {
		connection.query('SELECT * from TA_BADGE_CHALLENGE GROUP BY fk_badge  ' + challengeId + ';', function(err, rows, fields) {
			connection.release();				
			
			if (err) {
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
			
			var challenge = rows[0]; 
				
			res.render(path.join(__dirname+'/www/challenge.html'), {
				number      : challenge.sp_number,
				title       : challenge.sp_title,
				description : challenge.sp_description,
				classid     : challenge.sp_class,		
				answer1     : challenge.sp_answer1, 
				answer2     : challenge.sp_answer2, 
				answer3     : challenge.sp_answer3, 
				answer4     : challenge.sp_answer4,
				hint        : challenge.sp_hint,
				credits     : challenge.sp_credits,
				points      : challenge.sp_points
			});
		});
	});
});

app.post('/registerbadge',function(req,res){	
	if (req.body.badge_nick == "" || req.body.badge_id == "" || req.body.badge_key == "") {
		res.render(path.join(__dirname+'/www/error.html'), {errormessage : "mandatory values not set:\nbadge_id, badge_key or nickname"});	
		return;
	}
	
	dbpool.getConnection(function(err, connection) {
		connection.query("SELECT sp_oid, sp_nickname from TA_BADGE WHERE sp_badge_id=? and sp_badge_key=?", 
			[req.body.badge_id, req.body.badge_key],
			function(err, rows) {
				
			if (err) {
				connection.release();
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
		
			if (rows.length == 1) {
				var sqlStatement, sqlValues;
				if (req.body.badge_image === undefined) {
					sqlStatement = "UPDATE TA_BADGE SET sp_nickname=?, sp_callsign=?, sp_email=? WHERE sp_oid=?";
					sqlValues = [req.body.badge_nick, req.body.badge_callsign, req.body.badge_email, rows[0].sp_oid];
				} else {
					sqlStatement = "UPDATE TA_BADGE SET sp_nickname=?, sp_callsign=?, sp_email=?, sp_icon=? WHERE sp_oid=?";
					sqlValues = [req.body.badge_nick, req.body.badge_callsign, req.body.badge_email, req.body.badge_image, rows[0].sp_oid];				
				}
				connection.query(sqlStatement, sqlValues, function(err, result) {
					connection.release();			
					if (err) {
						res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
						return;	
					}
					
					if (result.changedRows == 1) {
						res.render(path.join(__dirname+'/www/success.html'), {message : "badge data updated.", target : "/"});		
					} else {
						res.render(path.join(__dirname+'/www/error.html'), {errormessage : "error: badge not updated."});		
					}
				});
			} else {
				connection.release();
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : "error: no badge with this id and key found."});		
			}
		});
	});
});

app.listen(3000);

console.log("Running at Port 3000");