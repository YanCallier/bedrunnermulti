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

//////////////////////////////////////////////////////////////////// Echanges client - serveur

let connections = {};
let partieEnCours = false;
let vitesse = 4;
let plareformeOnProgress = false;

// function majTop (){
//     MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
//         if (err) console.log ('conection erroor : ' + err);
//         else console.log ("ok");
//         const collection = client.db('bedrunnermulti').collection('users');
//         collection.find({ Perf: { $gt: 0 } }).toArray(function(err, result) {
//             top = result.sort((a, b) => (a.Perf > b.Perf) ? -1 : 1);
    
//         });
//         // top5 = collection.aggregate(
//         //     [
//         //         { $sort : { Perf : 1} }
//         //     ]
//         //  )
//     });
// }

io.on('connection', function (socket) {
    
    // gestion connection
    if (socket.handshake.session.login) {
        connections[socket.id]={login: socket.handshake.session.login, runnerState : 'connected', score: 0};
        console.log("conected!");
        io.emit('runnersListUpdate', { connections: connections });
        io.emit('partieEnCours', partieEnCours);
    }   
    else {
        socket.emit('hello', socket.handshake.session.message);
    }

    // génération de plateformes 
    socket.on('largeurPlateforme', function (largeur) {
        if (!plareformeOnProgress) {
            plareformeOnProgress = true;
            let eloignement = 100;
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
        vitesse += 0.01;

        io.emit('creaNewPlateforme', {
            newPlateformeSelected: newPlateformeSelected,
            eloignement: eloignement,
            hauteur: hauteur,
            newNbBriqueCentral: newNbBriqueCentral,
            vitesse : vitesse,
        });
        plareformeOnProgress = false;
        //io.emit ('majVitesse', vitesse);
    }

    // lancement du jeu
    socket.on('play', function () {
        if (!partieEnCours){
            for (var runner in connections) {
                connections[runner].runnerState = 'running';
            }
            setTimeout(UsineDePlateforme, 8000);
            partieEnCours = true;
            io.emit('play');
        }
        else {
            if (connections[socket.id].runnerState != 'running')
            socket.emit('pleaseWait');
        }
    }); 

    // gestions des scores en temps réèl
    socket.on('scoreUpdate', function (data) {
        connections[socket.id].score = data.score;
        io.emit('scoreUpdate', [socket.id, data.score]);
    });

    // génération et envois des meilleurs scores
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

    // Gestion de la fin du jeu
    socket.on('gameOver', function (data) {

        connections[socket.id].runnerState = 'dead';
        io.emit('runnersListUpdate', { connections: connections});
        

        let nbRunner = 0;
        for (var runner in connections) {
            if (connections[runner].runnerState === 'running') nbRunner += 1;
        }

        if ( nbRunner === 1) io.emit('lightUp');
        if ( nbRunner === 0) partieEnCours = false;

    });

    // Le dernier joueur doit "attraper la lumière" pour pouvoir enregistrer son score
    socket.on('gotIt', function (data) {
        connections[socket.id].runnerState = "winner";
        partieEnCours = false;

        MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
            if (err) console.log ('connect' + err);
            const collection = client.db('bedrunnermulti').collection('users');

            collection.find({ "login" : socket.handshake.session.login }).toArray(function(err, result) {
                if (result.length === 1){
                    if (!result[0].Perf || result[0].Perf < data.score) {
                        console.log ("ok" + data.score);
                        try {
                            collection.updateOne(
                               { "login" : socket.handshake.session.login },
                               { $set: { "Perf" : data.score } },
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

    // gestion de la déconnection
    socket.on('disconnect', (reason) => {
        console.log(('Événement socket.io [disconnect]socket.id : ' + socket.id +'reason : ' + reason));
        delete connections[socket.id];
        io.emit('runnersListUpdate', { connections: connections});
        }
    );
});

//////////////////////////////////////////////////////////////////// 404 & port listening

app.use(function (req, res) { res.status(404).send('Cette page n\'existe pas')});
const PORT = process.env.PORT || 8080;
server.listen(PORT, function(){
    console.log('ping');
});
