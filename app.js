
/**
	* Node.js Login Boilerplate
	* More Info : http://kitchen.braitsch.io/building-a-login-system-in-node-js-and-mongodb/
	* Copyright (c) 2013-2016 Stephen Braitsch
**/

var http = require('http');
var express = require('express');
var cors = require("cors");
var session = require('express-session');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var cookieParser = require('cookie-parser');
var fs = require("fs");

//var MongoStore = require('connect-mongo')(session);

var pg = require('pg');
var app = express();

var config = {
	user: 'postgres', //env var: PGUSER
	database: 'indoor_position',
	password: 'tiancai', //env var: PGPASSWORD
	host: 'ngrok.ztwang.net', // Server hosting the postgres database
	port: 15432, //env var: PGPORT	database: 'AI_Aided_City_Planning', //env var: PGDATABASE

	max: 100, // max number of clients in the pool
	idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
};

const pool = new pg.Pool(config);

pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  console.error('idle client error', err.message, err.stack);
});

//export the query method for passing queries to the pool
module.exports.query = function (text, values, callback) {
  console.log('query:', text, values);
  return pool.query(text, values, callback);
};

// the pool also supports checking out a client for
// multiple operations, such as a transaction
module.exports.connect = function (callback) {
  return pool.connect(callback);
};


app.locals.pretty = true;
// app.set('port', process.env.PORT || 3000);
//app.set('pgInModule', pg);
//app.set('fsInModule', fs);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static("./public"));

//var mainFunction = require('./app/server/routes/mainFunction');
//should be modulized later on 


function getDateTime() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

app.use(function(req, res, next) {
	console.log(`${req.method} request for '${req.url}' - ${JSON.stringify(req.body)}`);
	next();
});

app.get('/', function(req, res){
	res.location('./public/full.html');
})

app.post('/random_scene', function(req, res){
	var coords = JSON.parse(req.body.geoJSON)["geometry"]["coordinates"][0];
	var description = req.body.description;
	if (description == ''){description = 'null'}
	var lat = [];
	var lon = [];
	var string_coords = ''
	var tablename = 'drawn_boundary'
	coords.forEach(function(d){
		// lat.push(d[0]);
		// lon.push(d[1])
		string_coords += d[0] + ' ' + d[1] + ',';
	});
	string_coords = string_coords.substring(0, string_coords.length - 1);
	console.log(string_coords)
	query = `INSERT INTO public.${tablename} VALUES
				('${description}', ST_MakePolygon(ST_GeomFromText('LINESTRING(${string_coords})')));`
	console.log(query);
	pool.query(query, function(err, result){
		console.log(err)
	})

	// console.log(lat,lon)
});

var zone_list = ["second_0" , "second_1" , "second_2" , "second_3" , "second_4" , "second_5" , "second_6" , "second_7" , "second_9" , "second_10" , "second_11" , "second_12" , "second_13" , "second_14" , "second_16" , "second_17" , "second_18" , "bottom_4"  , "bottom_5"  , "bottom_6"  , "bottom_7"  , "bottom_8"  , "bottom_9"  , "bottom_10" , "bottom_11" , "bottom_12" , "bottom_13" , "bottom_14" , "bottom_15" , "bottom_16" , "bottom_17" , "bottom_18" , "bottom_19" , "bottom_20" , "bottom_21" , "bottom_22" , "bottom_23" , "bottom_24" , "bottom_25" , "bottom_26" , "bottom_27" , "bottom_28" , "bottom_29" , "bottom_30" , "bottom_31" , "bottom_32"]

app.get('/getVideo', function(req, res){
    zone_id = Math.floor((Math.random() * zone_list.length));
    // res.write(response.statusCode.toString());
    res.end(zone_list[zone_id].toString());
})

app.get('/getImages', function(req, res){
	
	query = `select count(*) from gare_st_lazare.survey`
	pool.query(query, function(err, result1){
		var count = result1.rows[0]['count']
		query = `select * from gare_st_lazare.survey_test_set order by random() limit 1`;
	    pool.query(query, function(err, result2){
	    	console.log(result2.rows[0])
			res.end(JSON.stringify({"original_img_path": result2.rows[0]['img_id_a_0'], "false_img_path": result2.rows[0]['img_id_b'], "true_img_path": result2.rows[0]['img_id_a_1'], "true_category": result2.rows[0]['category_a'], "false_category": result2.rows[0]['category_b'], "count": count}))
	    })
	})
	
})


app.post('/getBinary', function(req, res){
	zone_id = req.body.zone;
	query = `select path from gare_st_lazare.images where category = '` + zone_id + `' order by random() limit 1`;
	console.log(query)
	pool.query(query, function(err, result1){
		// console.log("11111", result1)
		original_img = result1.rows[0].path;
		query = `select path, category from gare_st_lazare.images where category <> '` + zone_id + `' order by random() limit 1`;
		pool.query(query, function(err, result2){
			confuse_img = result2.rows[0].path;
			confuse_zone_id = result2.rows[0].category;
			// console.log(confuse_img, confuse_zone_id)
			var random_boolean = Math.random() >= 0.5;
			if (random_boolean == true){
			    res.end(JSON.stringify({'left': confuse_img, 'right': original_img, 'zone_id': zone_id, 'confuse_zone_id': confuse_zone_id}));
			}
			else{
			    res.end(JSON.stringify({'left': original_img, 'right': confuse_img, 'zone_id': zone_id, 'confuse_zone_id': confuse_zone_id}));
			}
		})
	})
	// res.write(response.statusCode.toString());
})

app.post('/results', function(req, res){
	var category_a    = req.body.category_a;
	var img_id_a_0    = req.body.img_id_a_0;
	var img_id_a_1 = req.body.img_id_a_1;
	var category_b   = req.body.category_b;
	var img_id_b    = req.body.img_id_b
	var decision   = req.body.decision
	var point0   = req.body.point0
	var point1   = req.body.point1
	var point2   = req.body.point2
	var type0   = req.body.type0
	var type1   = req.body.type1
	var type2   = req.body.type2
	var ip      = req.body.ip
	var current_time = getDateTime()

// {'category_a': true_category, 'img_id_a_0' : original_img_path, 'img_id_a_1': true_img_path, 'category_b': false_category, 'img_id_b' false_img_path, 'decision': , decision, 'point0': coordinate[0], 'point1': coordinate[1], 'point2': coordinate[2], 'type0': selection[0], 'type1': selection[1], 'type2': selection[2]}

	query = `insert into gare_st_lazare.survey values('${category_a}', '${img_id_a_0}', '${img_id_a_1}', '${category_b}', '${img_id_b}', ${decision}, '${point0}', '${point1}', '${point2}', '${type0}', '${type1}', '${type2}', '${ip}', '${current_time}')`
	console.log(query)
	pool.query(query, function(err, result2){
		res.write('success!');
		res.end()
	})
	// res.write(response.statusCode.toString());
})

app.post('/receiveResult', function(req, res){
	zone_id = req.body.zone_id;
	var left_image   = req.body.left_image;
	var right_image  = req.body.right_image;
	var zone_id      = req.body.zone_id;
	var confuse_zone_id = req.body.confuse_zone_id;
	var direction    = req.body.direction
	var ip_address   = req.body.ip_address
	var current_time = getDateTime()
	query = `select category from gare_st_lazare.images where path = '` + left_image + `'`
	console.log(`select category from gare_st_lazare.images where path = '` + left_image + `' order by random()`)
	console.log(confuse_zone_id, ip_address)
	pool.query(query, function(err, result1){
		if (zone_id == result1.rows[0].category){
			var original_img = left_image;
			var confuse_img  = right_image;
		}
		else{
			var original_img = right_image
			var confuse_img  = left_image;
		}
		console.log(`insert into gare_st_lazare.survey values('${zone_id}', '${confuse_zone_id}', '${original_img}', '${confuse_img}', 'not_sure', '${ip_address}', '${current_time}')`)
		console.log(direction, zone_id, result1.rows[0].category)
		if (direction == 'center'){
			query = `insert into gare_st_lazare.survey values('${zone_id}', '${confuse_zone_id}', '${original_img}', '${confuse_img}', 'not_sure', '${ip_address}', '${current_time}')`
			pool.query(query, function(err, result2){
				res.write('not_sure');
				res.end()
			})
		}
		else if ((direction == 'left' && zone_id == result1.category) || (direction == 'right' && confuse_zone_id == result1.category)){
			query = `insert into gare_st_lazare.survey values('${zone_id}', '${confuse_zone_id}', '${original_img}', '${confuse_img}', 'wrong', '${ip_address}', '${current_time}')`
			pool.query(query, function(err, result2){
				res.write('wrong');
				res.end()
			})
		}
		else{
			query = `insert into gare_st_lazare.survey values('${zone_id}', '${confuse_zone_id}', '${original_img}', '${confuse_img}', 'right', '${ip_address}', '${current_time}'')`
			pool.query(query, function(err, result2){
				res.write('right');
				res.end()
			})
		}

	})
	// res.write(response.statusCode.toString());
})



//listening port
// http.createServer(app).listen(app.get('port'), function(){
// 	console.log('Express server listening on port ' + app.get('port'));
// });

app.listen(8001);
console.log('listening');
