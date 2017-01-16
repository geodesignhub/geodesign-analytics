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

app.get('/', function(request, response) {
    var opts = {};
    if (request.query.apitoken && request.query.projectid) {
        opts = { 'apitoken': request.query.apitoken, 'projectid': request.query.projectid };
    } else {
        opts = { 'apitoken': '0', 'projectid': '0' };

    }

    response.render('gdhdna', opts);
});

app.post('/post/', function(request, response) {
    var baseurl = 'https://www.geodesignhub.com/api/v1/projects/';
    // var baseurl = 'http://local.dev:8000/api/v1/projects/';
    var apikey = request.body.apikey;
    var projectid = request.body.projectid;
    var cred = "Token " + apikey;
    var systems = baseurl + projectid + '/systems/';
    var diagrams = baseurl + projectid + '/diagrams/';
    var cteams = baseurl + projectid + '/cteams/';
    var allsyns = [];
    var URLS = [systems, diagrams, cteams];

    async.map(URLS, function(url, done) {
        req({
            url: url,
            headers: {
                "Authorization": cred,
                "Content-Type": "application/json"
            }
        }, function(err, response, body) {
            if (err || response.statusCode !== 200) {
                return done(err || new Error());
            }
            return done(null, JSON.parse(body));
        });
    }, function(err, results) {

        if (err) return response.sendStatus(500);
        // get the cteams
        systems = results[0];
        diagrams = results[1];
        cteams = results[2];
        var ctlen = cteams.length;
        var ctURLS = [];
        for (var x = 0; x < ctlen; x++) {
            var ctid = cteams[x]['id'];
            var cturl = baseurl + projectid + '/cteams/' + ctid + '/';
            ctURLS.push(cturl);
        }
        async.map(ctURLS, function(url, done) {
            req({
                url: url,
                headers: {
                    "Authorization": cred,
                    "Content-Type": "application/json"
                }
            }, function(err, response, body) {
                if (err || response.statusCode !== 200) {
                    return done(err || new Error());
                }
                return done(null, JSON.parse(body));
            });
        }, function(err, results) {
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

            async.map(synURLs, function(url, done) {
                req({
                    url: url,
                    headers: {
                        "Authorization": cred,
                        "Content-Type": "application/json"
                    }
                }, function(err, response, body) {
                    if (err || response.statusCode !== 200) {
                        return done(err || new Error());
                    }
                    return done(null, JSON.parse(body));
                });
            }, function(err, results) {

                if (err) return response.sendStatus(500);
                response.contentType('application/json');

                response.send({
                    "status": 1,
                    "syndiagrams": results,
                    "diagrams": diagrams,
                    "systems": systems,
                    "cteams": cteams,
                    "syns": allsyns
                });
            });
        });
    });
});

app.listen(process.env.PORT || 5001);