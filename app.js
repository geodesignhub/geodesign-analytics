var express = require("express");
var req = require('request');
var async = require('async');
var bodyParser = require('body-parser');
var app = express();

var ejs = require('ejs');
app.set('view engine', 'ejs');

// app.use(express.static(__dirname + '/views'));
app.use('/assets', express.static('static'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json())


app.get('/', function (request, response) {

    if (request.query.apitoken && request.query.projectid) {
        
        var baseurl = 'https://www.geodesignhub.com/api/v1/projects/';
        // var baseurl = 'http://local.test:8000/api/v1/projects/';
        var apikey = request.query.apitoken;
        var projectid = request.query.projectid;
        var cred = "Token " + apikey;
        
        
        var systems = baseurl + projectid + '/systems/';
        var diagrams = baseurl + projectid + '/diagrams/';
        var cteams = baseurl + projectid + '/cteams/';
        var members = baseurl + projectid + '/members/';

        var allsyns = [];
        var URLS = [systems, diagrams, cteams, members];
        
        async.map(URLS, function (url, done) {
            req({
                url: url,
                headers: {
                    "Authorization": cred,
                    "Content-Type": "application/json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode !== 200) {
                    return done(err || new Error());
                }
                return done(null, JSON.parse(body));
            });
        }, function (err, results) {
            if (err) return response.sendStatus(500);
            // get the cteams
            systems = results[0];
            diagrams = results[1];
            cteams = results[2];
            members = results[3];
            var ctlen = cteams.length;
            var ctURLS = [];
            for (var x = 0; x < ctlen; x++) {
                var ctid = cteams[x]['id'];
                var cturl = baseurl + projectid + '/cteams/' + ctid + '/';
                ctURLS.push(cturl);
            }
            async.map(ctURLS, function (url, done) {
                req({
                    url: url,
                    headers: {
                        "Authorization": cred,
                        "Content-Type": "application/json"
                    }
                }, function (err, response, body) {
                    if (err || response.statusCode !== 200) {
                        return done(err || new Error());
                    }
                    return done(null, JSON.parse(body));
                });
            }, function (err, results) {
                if (err) return response.sendStatus(500);
                var reslen = results.length;
                var synURLs = [];
                for (var k = 0; k < reslen; k++) {
                    var synList = results[k]['synthesis'];
                    var synlength = synList.length;
                    for (var y = 0; y < synlength; y++) {
                        var cursyn = synList[y];
                        allsyns.push(cursyn);
                        var cteamid = cursyn['cteamid'];
                        var synID = cursyn['id']
                        var cturl = baseurl + projectid + '/cteams/' + cteamid + '/' + synID + '/diagrams/';
                        synURLs.push(cturl);
                    }
                }

                async.map(synURLs, function (url, done) {
                    req({
                        url: url,
                        headers: {
                            "Authorization": cred,
                            "Content-Type": "application/json"
                        }
                    }, function (err, response, body) {
                        if (err || response.statusCode !== 200) {
                            return done(err || new Error());
                        }
                        return done(null, JSON.parse(body));
                    });
                }, function (err, results) {
                    if (err) return response.sendStatus(500);
                    let opts = {
                        "apitoken": request.query.apitoken, 
                        "projectid": request.query.projectid,
                        "projectdata":JSON.stringify({
                        "status": 1,
                        "syndiagrams": results,
                        "diagrams": diagrams,
                        "systems": systems,
                        "cteams": cteams,
                        "syns": allsyns,
                        "members": members})
                    }
                    response.render('gdhdna', opts);
                });
            });
        });

    }
    else {
        response.status(400).send('Not all query parameters provided.');
    }

});

app.listen(process.env.PORT || 5001);