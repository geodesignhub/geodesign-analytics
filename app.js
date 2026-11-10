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
    if (!request.query.apitoken || !request.query.projectid) {
        return response.status(400).send('Not all query parameters provided.');
    }

    let baseurl = 'http://local.test:8000/api/v1/projects/';
    let apikey = request.query.apitoken;
    let projectid = request.query.projectid;
    let cred = "Token " + apikey;

    let endpoints = ['systems', 'diagrams', 'cteams', 'members'];
    let urls = endpoints.map(endpoint => `${baseurl}${projectid}/${endpoint}/`);

    async.map(urls, (url, done) => {
        req({
            url: url,
            headers: {
                "Authorization": cred,
                "Content-Type": "application/json"
            }
        }, (err, res, body) => {
            if (err || res.statusCode !== 200) {
                return done(err || new Error());
            }
            done(null, JSON.parse(body));
        });
    }, (err, results) => {
        if (err) return response.sendStatus(500);

        let [systems, diagrams, design_teams, members] = results;
        let design_team_urls = design_teams.map(team => `${baseurl}${projectid}/cteams/${team.id}/`);

        async.map(design_team_urls, (url, done) => {
            req({
                url: url,
                headers: {
                    "Authorization": cred,
                    "Content-Type": "application/json"
                }
            }, (err, res, body) => {
                if (err || res.statusCode !== 200) {
                    return done(err || new Error());
                }
                done(null, JSON.parse(body));
            });
        }, (err, results) => {
            if (err) return response.sendStatus(500);

            let all_synthesis = [];
            let syn_urls = [];

            results.forEach(result => {
                result.synthesis.forEach(syn => {
                    all_synthesis.push(syn);
                    syn_urls.push(`${baseurl}${projectid}/cteams/${syn.cteamid}/${syn.id}/diagrams/`);
                });
            });

            async.map(syn_urls, (url, done) => {
                req({
                    url: url,
                    headers: {
                        "Authorization": cred,
                        "Content-Type": "application/json"
                    }
                }, (err, res, body) => {
                    if (err || res.statusCode !== 200) {
                        return done(err || new Error());
                    }
                    done(null, JSON.parse(body));
                });
            }, (err, results) => {
                if (err) return response.sendStatus(500);

                let opts = {
                    "apitoken": request.query.apitoken,
                    "projectid": request.query.projectid,
                    "projectdata": JSON.stringify({
                        "status": 1,
                        "syndiagrams": results,
                        "diagrams": diagrams,
                        "systems": systems,
                        "cteams": design_teams,
                        "syns": all_synthesis,
                        "members": members
                    })
                };
                response.render('gdhdna', opts);
            });
        });
    });
});

app.listen(process.env.PORT || 5001);