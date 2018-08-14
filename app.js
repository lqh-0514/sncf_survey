
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

var pg = require('pg');
var app = express();

app.set('port', process.env.PORT || 3004);

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

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 6; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function writeIntoDB(parsed_data, i, survey_code, res){
	var category_a    = parsed_data[i][0].category_a;
	var img_id_a_0    = parsed_data[i][0].img_id_a_0;
	var img_id_a_1 = parsed_data[i][0].img_id_a_1;
	var category_b   = parsed_data[i][0].category_b;
	var img_id_b    = parsed_data[i][0].img_id_b
	var category_c   = parsed_data[i][0].category_c;
	var img_id_c    = parsed_data[i][0].img_id_c
	var decision   = parsed_data[i][0].decision
	var point0   = parsed_data[i][0].point0
	var point1   = parsed_data[i][0].point1
	var point2   = parsed_data[i][0].point2
	var type0   = parsed_data[i][0].type0
	var type1   = parsed_data[i][0].type1
	var type2   = parsed_data[i][0].type2
	var ip      = parsed_data[i][0].ip

	query = `insert into gare_st_lazare.survey values('${category_a}', '${img_id_a_0}', '${img_id_a_1}', '${category_b}', '${img_id_b}', '${category_c}', '${img_id_c}', '${decision}', '${point0}', '${point1}', '${point2}', '${type0}', '${type1}', '${type2}', '${ip}', now(), '${survey_code}')`

	pool.query(query, function(err, result2){
		if (i == 4){
			res.write(survey_code);
			res.end()
		}
		else{writeIntoDB(parsed_data, i + 1, survey_code, res)}
	})
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
		query = `select * from gare_st_lazare.survey_test_set_2 order by random() limit 1`;
	    console.log(query)
	    pool.query(query, function(err, result2){
	    	console.log(result2.rows[0])
			res.end(JSON.stringify({"img_id_a_0": result2.rows[0]['img_id_a_0'], "img_id_b": result2.rows[0]['img_id_b'], "img_id_c": result2.rows[0]['img_id_c'],"img_id_a_1": result2.rows[0]['img_id_a_1'], "category_a": result2.rows[0]['category_a'], "category_b": result2.rows[0]['category_b'], "category_c": result2.rows[0]['category_c'], "count": count}))
	    })
	})
	
})

app.post('/getBinary', function(req, res){
	zone_id = req.body.zone;
	query = `select path from gare_st_lazare.images where category = '` + zone_id + `' order by random() limit 1`;
	console.log(query)
	pool.query(query, function(err, result1){
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

	var parsed_data = JSON.parse(req.body.data);
	console.log(parsed_data)
	var survey_code = makeid()
	writeIntoDB(parsed_data, 0, survey_code, res)
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
 http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
 });


console.log('listening');
