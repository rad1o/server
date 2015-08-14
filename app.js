var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var express_session = require('express-session');
var path = require("path");
var ejs = require('ejs'); 
var favicon = require('serve-favicon');
var randomstring = require("randomstring");

var mysql = require('mysql');
var dbpool = mysql.createPool(
{
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

app.use(express_session({
	secret: 'uzJUTvotdw6azdf789654wWjB3sxucivoppJJGhkio',
	resave: true,
	saveUninitialized: true
}));

app.set("view options", {layout: false});  
app.engine('html', require('ejs').renderFile); 
app.set('view engine', 'html');
app.set('views', __dirname + "/www");

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded(
{
	// to support URL-encoded bodies
	extended: true
}));

app.get('/',function(req,res)
{
	if (!req.session.badgeid)
	{
		res.render(path.join(__dirname+'/www/login.html'));
		return;
	}
	
	res.render(path.join(__dirname+'/www/index.html'), { nickname : req.session.nickname });
});

app.post('/login',function(req,res)
{
	if (req.body.login_nickname == "" || req.body.login_password == "")
	{
		res.render(path.join(__dirname+'/www/error.html'), {errormessage : "mandatory values not set:<br/>nickname or password"});	
		return;
	}
	
	var session = req.session;
	var nickname = req.body.login_nickname;
	var password = req.body.login_password;

	dbpool.getConnection(function(err, connection)
	{
		var sqlStatement = "UPDATE TA_BADGE SET sp_last_seen=now() WHERE sp_nickname=? and sp_password=sha2(?, 256)";
		var sqlValues = [nickname, password];
		connection.query(sqlStatement, sqlValues, function(err, result)
		{
			if (err)
			{
				connection.release();			
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
			
			if (result.changedRows == 1)
			{
				var sqlStatement = "select sp_badge_id from TA_BADGE WHERE sp_nickname=? and sp_password=sha2(?, 256)";
				var sqlValues = [nickname, password];
				connection.query(sqlStatement, sqlValues, function(err, result)
				{
					connection.release();
					session.nickname = nickname;
					session.badgeid = result[0].sp_badge_id;
					
					res.redirect('/');
					return;
				});
			}
			else
			{
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : "error: you could not be logged in. please check the data you entered."});		
			}
		});
	});
});

app.get('/register',function(req,res)
{
	//console.log('register: ', req.query.badgeid, "   ", req.query.badgekey);
	if (req.session.badgeid)
	{
		dbpool.getConnection(function(err, connection)
		{
			connection.query("SELECT * from TA_BADGE where sp_badge_id=?", 
			[req.session.badgeid],
			function(err, rows)
			{
				connection.release();

				if (err)
				{
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				var badge;
				if (rows.length != 1)
				{
					badge = {
						badge_id       : "",
						badge_key      : "",
						badge_nickname : "",
						badge_callsign : "",
						badge_email    : "",
						badge_password : ""
					}
				}
				else
				{
					var result = rows[0];				
					
					badge = {
						badge_id       : result.sp_badge_id,
						badge_key      : result.sp_badge_key,
						badge_nickname : result.sp_nickname,
						badge_callsign : result.sp_callsign,
						badge_email    : result.sp_email,
						badge_password : result.sp_password
					}
				}
				
				res.render(path.join(__dirname+'/www/register.html'), badge);
			});
		});
	} 
	else
	{
		var badge = {
			badge_id       : "",
			badge_key      : "",
			badge_nickname : "",
			badge_callsign : "",
			badge_email    : "",
			badge_password : ""
		}
		res.render(path.join(__dirname+'/www/register.html'), badge);
	}
});

app.get('/challenge',function(req,res)
{
	var challengeId = req.query.challengeid;
	
	if (!challengeId)
	{
		dbpool.getConnection(function(err, connection)
		{
			connection.query("SELECT sp_id, sp_title from TA_CHALLENGE where sp_class is not null",
				[],
				function(err, rows)
			{
				connection.release();
	
				if (err)
				{
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				var challengeList = [];
				for (i in rows)
				{
					var row = rows[i];
					challengeList.push('<tr><td class="mdl-data-table__cell--non-numeric"><a href="/challenge?challengeid=' + row.sp_id + '">' + row.sp_title + '</a></td></tr>');
				}
						
				res.render(path.join(__dirname+'/www/challengechooser.html'), { challengelist : challengeList.join('\n') });
			});
		});
	}
	else
	{	
		dbpool.getConnection(function(err, connection)
		{
			connection.query("SELECT * from TA_CHALLENGE where sp_id=?",
			[challengeId],
			function(err, rows)
			{
				connection.release();
	
				if (err)
				{
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				//console.log('Query result: ', rows[0]);
				
				if (rows.length == 1)
				{
					var challenge = rows[0]; 
						
					res.render(path.join(__dirname+'/www/challenge.html'),
					{
						number      : challenge.sp_id,
						title       : challenge.sp_title,
						description : challenge.sp_description,	
						answer1     : challenge.sp_answer1, 
						answer2     : challenge.sp_answer2, 
						answer3     : challenge.sp_answer3, 
						answer4     : challenge.sp_answer4,
						hint        : challenge.sp_hint,
						credits     : challenge.sp_credits,
						points      : challenge.sp_points
					});
				}
				else
				{
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : "no challenge found with that id"});
				}
			});
		});
	}
});

app.post('/challenge', function(req,res)
{	
	var session = req.session;

	if (!session.badgeid)
	{
		res.render(path.join(__dirname+'/www/login.html'));
		return;
	}
	
	if (!req.body.challenge_id)
	{
		res.render(path.join(__dirname+'/www/error.html'), {errormessage : "mandatory values not set:<br/>nickname or password"});	
		return;
	}
	
	var challengeId = req.body.challenge_id;
	var answer = req.body.options;
	
	if (!answer)
	{
		res.render(path.join(__dirname+'/www/error.html'), {errormessage : "please select your answer."});	
		return;
	}
	
	dbpool.getConnection(function(err, connection)
	{
		connection.query("select sp_correct_answer, sp_points from TA_CHALLENGE where sp_id = ?",
		[challengeId],
		function(err, rows)
		{
			if (err)
			{
				connection.release();
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
			
			if (rows.length == 1)
			{
				var challenge = rows[0];
				var score = 0;
				var correctAnswer = challenge.sp_correct_answer;
				
				if (answer == correctAnswer)
				{
					score = challenge.sp_points;
				}				
				
				connection.query("insert into TA_BADGE_CHALLENGE (fk_badge, fk_challenge, sp_answer, sp_score) "
					+ "values ((select sp_oid from TA_BADGE where sp_badge_id = ?), "
					+ "(select sp_oid from TA_CHALLENGE where sp_id = ?), ?, ?);",
				[session.badgeid, challengeId, correctAnswer, score],
				function(err, rows)
				{
					connection.release();
					
					
					if (err && err.code === 'ER_DUP_ENTRY')
					{
						res.render(path.join(__dirname+'/www/error.html'), {errormessage : "you already answered this question"});
						return;							
					}
					else if (err)
					{
						res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
						return;	
					}
					
					res.render(path.join(__dirname+'/www/success.html'), {
						message : "your answer was submited, we added " + score + " points to your score",
						target : "/"
					});		
				});
			}
			else
			{
				connection.release();
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : "error: your answer could not be submited. please try again"});
				return;	
			}
		});
	});
});

app.get('/highscore',function(req,res)
{
	var badgeId = req.session.badgeid;
	
	if (badgeId === undefined)
	{
		badgeId = '0';
	}
	
	dbpool.getConnection(function(err, connection)
	{
		connection.query("call refreshHighscore;",
		[],
		function(err, rows)
		{
			if (err)
			{
				connection.release();
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
	
			connection.query('select * from MV_HIGHSCORE LIMIT 10 UNION select * from MV_HIGHSCORE where badgeid = ?;',
							  badgeId,
							  function(err, rows)
			{
				connection.release();
				
				if (err)
				{
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				var toptentable = [];
				for (var i in rows)
				{
					var row = rows[i];
					if (row.badgeid == badgeId)
					{
						if (row.rank > 11)
						{
							toptentable.push('<tr><td colspan="5">...</td></tr>');		
						}
						toptentable.push('<tr class="toptentable-self">');
					}
					else
					{
						toptentable.push('<tr>');
					}
					
					var image = 'logo.png';
					if (row.image != null)
					{
						image = row.image;
					}
					
					toptentable.push('<td>' + row.rank + '</td>');
					toptentable.push('<td><img src="' + image + '"/></td>');
					toptentable.push('<td>' + row.nickname + '</td>');
					toptentable.push('<td>' + row.score + '</td>');
					toptentable.push('<td>' + row.challenges_played + '</td></tr>');
				}		
					
				res.render(path.join(__dirname+'/www/highscore.html'),
				{
					toptentable : toptentable.join('\n')
				});
			});
		});
	});
});

app.post('/registerbadge',function(req,res)
{	
	if (req.body.badge_nick == "" || req.body.badge_password1 == "" || req.body.badge_password1 != req.body.badge_password2)
	{
		res.render(path.join(__dirname+'/www/error.html'), {errormessage : "mandatory values not set:<br/>nickname or password"});	
		return;
	}
	
	var session = req.session;
	
	dbpool.getConnection(function(err, connection)
	{
		var sqlStatement;
		var sqlValues;
		if (session.badgeid)
		{
			sqlStatement = "UPDATE TA_BADGE SET sp_nickname=?, sp_callsign=?, sp_email=?, sp_password=? WHERE sp_badge_id=?";
			sqlValues = [req.body.badge_nick, req.body.badge_callsign, req.body.badge_email, req.body.badge_password1, session.badge_id];
		}
		else
		{
			var newId = randomstring.generate(32);
			//console.log('new ID: ', newId);
			session.badgeid = newId;
			sqlStatement = "insert into TA_BADGE (sp_nickname, sp_callsign, sp_email, sp_password, sp_register_time, sp_badge_id) values (?, ?, ?, sha2(?, 256), now(), ?)";
			sqlValues = [req.body.badge_nick, req.body.badge_callsign, req.body.badge_email, req.body.badge_password1, newId];
		}	
		connection.query(sqlStatement, sqlValues, function(err, result)
		{
			connection.release();			
			if (err)
			{
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
				return;	
			}
			
			if (result.affectedRows == 1)
			{
				session.nickname = req.body.badge_nick;
				
				res.render(path.join(__dirname+'/www/success.html'), {
					message : "badge data updated. if you want, you can now upload an image as avatar. if not, please select something from the menu.",
					target : "/imageconverter"
				});		
			}
			else
			{
				res.render(path.join(__dirname+'/www/error.html'), {errormessage : "error: badge not updated. please check the data you entered. maybe the nickname is already in use. error: " + err});		
			}
		});
	});
});

app.get('/imageconverter',function(req,res)
{	
	if (!req.session.badgeid)
	{
		res.render(path.join(__dirname+'/www/login.html'));
		return;
	}
	
	res.render(path.join(__dirname+'/www/imageupload.html'));
});

app.post('/imageupload',function(req,res)
{
	var session = req.session;
	
	if (!req.session.badgeid)
	{
		res.redirect('/');
		return;
	}
		
	if (req.body.image_avatar)
	{
		dbpool.getConnection(function(err, connection)
		{
			var sqlStatement = "UPDATE TA_BADGE SET sp_icon=? WHERE sp_badge_id=?";
			var sqlValues = [req.files.image.path, session.badgeid];
			connection.query(sqlStatement, sqlValues, function(err, result)
			{
				connection.release();			
				if (err)
				{
					console.log('Error in imageupload (post) for ', session.nickname, ' : ', err);
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : err});
					return;	
				}
				
				if (result.affectedRows == 1)
				{
					res.render(path.join(__dirname+'/www/success.html'), {
						message : "your image was added as your avatar.",
						target : "/"
					});		
				}
				else
				{
					console.log('Error in imageupload (post) for ', session.nickname, ' : ', err);
					res.render(path.join(__dirname+'/www/error.html'), {errormessage : "error: badge not updated. please check the data you entered. error: " + err});		
				}
			});
		});
	}
	else
	{
		res.render(path.join(__dirname+'/www/index.html'));
	}
});


app.listen(3000);

console.log("Running at Port 3000");