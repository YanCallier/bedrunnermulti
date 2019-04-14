//////////////////////////////////////////////////////////////////// Dependances et middle ware

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const MongoClient = require('mongodb').MongoClient;

//const uri = 'mongodb://localhost:27017/';
const uri = "mongodb+srv://yanAdmin:DATE2naissance@cluster0-mjp15.mongodb.net/test?retryWrites=true";

app.use(bodyParser.urlencoded({
    extended: false
  }));

const session = require('express-session')({
    secret: "qergsgsdfgdhdsfghdfgh",
    resave: true,
    saveUninitialized: true
});

const sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session, {
    autoSave:true
}));

app.use("/", express.static(__dirname + '/bedRunner'));

//////////////////////////////////////////////////////////////////// Routes

app.post('/connexion', function(req,res){

    MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
        if (err) console.log ('conexion error : ' + err);
        let collection = client.db('bedrunnermulti').collection('users');

        collection.find({ "login" : req.body.login }).toArray(function(err, result) {
            if (result.length === 1){
                if (req.body.pass === result[0].pass){
                    req.session.login = req.body.login;
                }
            }
            else {
                req.session.message = "Identifiants incorrects";
            }
            client.close();
            res.redirect ('/');
        });

    });
});

app.post('/inscription', function(req,res){

    if (req.body.pass !="" && req.body.login !=""){

        MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
            if (err) console.log ('Inscription Error : ' + err);
            let collection = client.db('bedrunnermulti').collection('users');

            collection.find({ "login" : req.body.login }).toArray(function(err, result) {
                if (result.length === 0){

                    let user = {
                        "login": req.body.login, 
                        "pass": req.body.pass,
                        "level": "2",
                    };

                    collection.insertOne(user, function (err){
                        if (err) console.log('Insersion error : ' + err);
                        client.close();
                        res.redirect ('/')
                    });
                    req.session.login = user.login;
                    req.session.newAccount= true;
                }
                else {
                    req.session.message = "Ce login existe déjà, il faut en choisir un autre";
                    res.redirect ('/');                }
                client.close();
            });
    
        });

    }
    else {
        req.session.message = "Tous les champs sont obligatoires";
        res.redirect ('/');
        //res.render('connection', {message : "Tous les champs sont obligatoires"});
    }

});

app.get('/logout', function(req,res){
    //sockets.disconnectUser(req.session.login);
    console.log (req);
    res.redirect ('/');
});

//////////////////////////////////////////////////////////////////// Echanges client - serveur

let connections = {};
let partieEnCours = false;
let vitesse = 3;
let score = 0;
let plateformeOnProgress = false;
let scoreTimer;
let freshTimer;

io.on('connection', function (socket) {

    // * gestion connection
    if (socket.handshake.session.login) {

        connections[socket.id]={login: socket.handshake.session.login, runnerState : 'connected', score: 0};
        io.emit('runnersListUpdate', { connections: connections });
        socket.emit('instructions', partieEnCours);
        if (socket.handshake.session.newAccount) socket.emit('welcome');
    }   
    else {
        socket.emit('hello', socket.handshake.session.message);
    }

    // * lancement du jeu
    socket.on('play', function () {
        if (!partieEnCours){
            for (var runner in connections) {
                connections[runner].runnerState = 'running';
            }
            setTimeout(UsineDePlateforme, 6000);
            partieEnCours = true;
            io.emit('runnersListUpdate', { connections: connections});
            score = 0;
            runUpdate();
            freshTheClient();
            io.emit('play');
        }
        else {
            socket.emit('pleaseWait');
        }
    }); 

    // * maj client 
    function runUpdate (){
        scoreTimer = setInterval(function () {
            score += (parseInt(vitesse)*3);
            
            for (var runner in connections){
                if (connections[runner].runnerState === 'running'){
                    connections[runner].score = score; 
                };
            }

            io.emit('scoreUpdate', score);
        },200)
    }

    function freshTheClient (){
        freshTimer = setInterval (function (){
            io.emit('fresh');
        },20)
    }

    // * génération de plateformes
    socket.on('largeurPlateforme', function (largeur) {
        if (!plateformeOnProgress) {
            plateformeOnProgress = true;
            let eloignement = 100;
            // calcule du temps après lequel sera envoyée la prochaine plateforme en fonction de la largeur de la précédente
            let tempo = ((largeur + eloignement) / parseInt(vitesse)) * 20;
            if (partieEnCours){
                setTimeout(UsineDePlateforme, tempo);
            }
        }
    });

    function lanceLeD(min,max) {
        return min + parseInt(Math.random()*(max-min));
    };

    function UsineDePlateforme (){
        // Calcule des paramètres aléatoires
        let newPlateformeSelected = lanceLeD(0,4);
        let eloignement = 0;
        let hauteur = lanceLeD(500, 100);
        let newNbBriqueCentral = lanceLeD(1,5);
        vitesse += 0.1;

        io.emit('creaNewPlateforme', {
            newPlateformeSelected: newPlateformeSelected,
            eloignement: eloignement,
            hauteur: hauteur,
            newNbBriqueCentral: newNbBriqueCentral,
            vitesse : parseInt(vitesse),
        });
        plateformeOnProgress = false;
    }

    // * fin du jeu
    function endGame () {
        clearInterval(scoreTimer);
        clearInterval(freshTimer);
        vitesse = 3;
        setTimeout(function(){
            partieEnCours = false;
        },3000)
    }

    function runnerCount (){
        let nbRunner = 0;
        for (var runner in connections) {
            if (connections[runner].runnerState === 'running') nbRunner += 1;
        }

        if ( nbRunner === 1) io.emit('lightUp');
        if ( nbRunner === 0) endGame ();
    }

    socket.on('gameOver', function () {
        if (connections[socket.id]) {

            connections[socket.id].runnerState = 'dead';
            socket.emit('scoreUpdate', score);
            io.emit('runnersListUpdate', { connections: connections});
        }
        runnerCount ();
    });

    // * Le dernier joueur doit "attraper la lumière" pour enregistrer son score
    socket.on('gotIt', function () {

        if (connections[socket.id]) connections[socket.id].runnerState = "winner";
        endGame();

        MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
            if (err) console.log ('connect' + err);
            const collection = client.db('bedrunnermulti').collection('users');

            collection.find({ "login" : socket.handshake.session.login }).toArray(function(err, result) {
                if (result.length === 1){
                    if (!result[0].Perf || result[0].Perf < score) {
                        console.log ("ok" + score);
                        try {
                            collection.updateOne(
                               { "login" : socket.handshake.session.login },
                               { $set: { "Perf" : score } },
                               {upsert: true}
                            );
                        } catch (e) {
                            print(e);
                        }
                    }
                }
                client.close();
            });
        });
    });

    // * meilleurs scores
    socket.on('top5', function () {
        MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {

            if (err) console.log ('conection erroooor : ' + err);
            const collection = client.db('bedrunnermulti').collection('users');

            collection.find({ Perf: { $gt: 0 } }, { "login": 1, "Perf": 1, "pass": 0 })
            //.project({ "login": 1, "Perf": 1, "pass": 0 })
            .toArray(function(err, users) {

                let top = [];
                for ( user in users){
                    top.push({login : (users[user].login), perf: (users[user].Perf)})
                }

                top = top.sort((a, b) => (a.perf > b.perf) ? -1 : 1);
                top = top.slice(0,5);

                socket.emit('top5', top);
            });
        });
    });

    // * déconnection
    socket.on('disconnect', (reason) => {
        console.log(('Événement socket.io [disconnect]socket.id : ' + socket.id +'reason : ' + reason));
            if (connections[socket.id]) {
                connections[socket.id].runnerState = 'dead';
                //socket.handshake.session.login = false;
                
                runnerCount ();
                delete connections[socket.id];
                io.emit('runnersListUpdate', { connections: connections});
            }
        }
    );
});

//////////////////////////////////////////////////////////////////// 404 & port listening

app.use(function (req, res) { res.status(404).send('Cette page n\'existe pas')});
const PORT = process.env.PORT || 8080;
server.listen(PORT, function(){
    console.log('ping');
});
