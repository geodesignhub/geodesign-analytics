let express = require("express");
let req = require('request');
let async = require('async');
let bodyParser = require('body-parser');
let app = express();

let ejs = require('ejs');
app.set('view engine', 'ejs');

// app.use(express.static(__dirname + '/views'));
app.use('/assets', express.static('static'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json())


app.get('/', function (request, response) {

    if (request.query.apitoken && request.query.projectid) {
        
        let baseurl = 'https://www.geodesignhub.com/api/v1/projects/';
        // let baseurl = 'http://local.test:8000/api/v1/projects/';
        let apikey = request.query.apitoken;
        let projectid = request.query.projectid;
        let cred = "Token " + apikey;        
        
        let systems = baseurl + projectid + '/systems/';
        let diagrams = baseurl + projectid + '/diagrams/';
        let design_teams = baseurl + projectid + '/cteams/';
        let members = baseurl + projectid + '/members/';

        let all_synthesis = [];
        let URLS = [systems, diagrams, design_teams, members];
        
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
            // get the design_teams
            systems = results[0];
            diagrams = results[1];
            design_teams = results[2];
            members = results[3];
            let design_team_length = design_teams.length;
            let ctURLS = [];
            for (let x = 0; x < design_team_length; x++) {
                let ctid = design_teams[x]['id'];
                let cturl = baseurl + projectid + '/cteams/' + ctid + '/';
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
                let result_length = results.length;
                let synURLs = [];
                for (let k = 0; k < result_length; k++) {
                    let synList = results[k]['synthesis'];
                    let synthesis_length = synList.length;
                    for (let y = 0; y < synthesis_length; y++) {
                        let current_synthesis = synList[y];
                        all_synthesis.push(current_synthesis);
                        let cteamid = current_synthesis['cteamid'];
                        let synthesis_id = current_synthesis['id']
                        let cturl = baseurl + projectid + '/cteams/' + cteamid + '/' + synthesis_id + '/diagrams/';
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
                        "cteams": design_teams,
                        "syns": all_synthesis,
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