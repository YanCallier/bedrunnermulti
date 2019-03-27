// https://bedrunnermulti.herokuapp.com
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const WebSocket = require('ws');
const server = require('http').Server(app);
const io = require('socket.io')(server);

const MongoClient = require('mongodb').MongoClient;
//const uri = 'mongodb://localhost:27017/';
const uri = "mongodb+srv://yanAdmin:DATE2naissance@cluster0-mjp15.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true });
const objectId = require('mongodb').ObjectID;

app.use(bodyParser.urlencoded({
    extended: false
  }));

const session = require('express-session')({
    secret: "qsdygskjdghmquhrg",
    resave: true,
    saveUninitialized: true
});

const sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session, {
    autoSave:true
}));

app.use('/bedRunner', function (req, res, next) {
    if (!req.session.login) res.render('home', {login : req.session.login});
    else next();
  }, express.static(__dirname + '/bedRunner'));

app.set('view engine', 'pug')

////////////////////////////////////////////////////////////////////

app.get('/', function(req,res){
    res.render('home', {login : req.session.login});
});

app.post('/connexion', function(req,res){
    let message = "Identifiants incorrects";

    MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
        if (err) console.log ('conexion error : ' + err);
        //else console.log ("Okkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
        const collection = client.db('bedrunnermulti').collection('users');
        collection.find({ "login" : req.body.login }).toArray(function(err, result) {
            if (result.length === 1){
                if (req.body.pass === result[0].pass){
                    req.session.login = req.body.login;
                    req.session.port = PORT;
                    message = "Welcome " + req.session.login;
                }
            }
            client.close();
            res.render('home', {message : message, login : req.session.login});
        });

    });
});

app.post('/inscription', function(req,res){

    if (req.body.pass !="" && req.body.login !=""){

        MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
            if (err) console.log ('Inscription Error : ' + err);
            const collection = client.db('bedrunnermulti').collection('users');
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
                        res.render('home', {message : "Merci " + user.login + ". Vous êtes enregistré et connecté.", login : user.login});
                    });
                    req.session.login = user.login;
                }
                else {
                    res.render('home', {message : "Ce login existe déjà, il faut en choisir un autre"});
                }
                client.close();
            });
    
        });

    }
    else {
        res.render('home', {message : "Tous les champs sont obligatoires"});
    }
});

app.get('/bedRunner', function(req,res){
    res.render('home', {message : "Tous les champs sont obligatoires"});
    // res.sendFile('index.html', {root: 'bedRunner'});
});

////////////////////////////////////////////////////////////////////

let connections = {};
let partieEncours = false;
io.on('connection', function (socket) {
    connections[socket.id]={login: socket.handshake.session.login, port: socket.handshake.session.port, runnerState : 'connected', score: 0};
    console.log("conected!");
    io.emit('runnersListUpdate', { connections: connections});

    socket.on('scoreUpdate', function (data) {
        connections[socket.id].score = data.score;
        io.emit('scoreUpdate', [socket.id, data.score]);
    });

    socket.on('parametreClient', function (data) {
        connections[socket.id].canWidth = data.canWidth;
        connections[socket.id].canHeight = data.canHeight;
        //console.log(connections);
    });

    socket.on('playPause', function () {
        if (partieEncours){
            if (connections[socket.id].runnerState === 'running')  io.emit('playPause');
        }
        else {
            for (var runner in connections) {
                connections[socket.id].runnerState = 'running';
            }
            partieEncours = true;
            //console.log(connections);
            io.emit('playPause');
        }
    });

    let tempo = true;
    socket.on('needNewPlateforme', function (data) {

        if (tempo){
            tempo = false;
            //* Calcule des paramètres aléatoires
            let newPlateformeSelected = lanceLeD(0,4);
            let newX = connections[socket.id].canWidth
            let newY = lanceLeD(500, 100);
            let newNbBriqueCentral = lanceLeD(1,5)
            //console.log("reception server");
            io.emit('creaNewPlateforme', { 
                newPlateformeSelected: newPlateformeSelected,
                newX: newX,
                newY: newY,
                newNbBriqueCentral: newNbBriqueCentral,
            });
            setTimeout (function (){
                tempo = true;
                io.emit('plateformListening');
            },500)
        }
        else {
            io.emit('plateformOnProgress');
        }
    })

    socket.on('gameOver', function (data) {

        let nbRunner = 0;
        for (var runner in connections) {
            if (connections[runner].runnerState === 'running') nbRunner += 1;
        }

        connections[socket.id].runnerState = 'dead';
        io.emit('runnersListUpdate', { connections: connections});
        
        if ( nbRunner === 1){
            
            // client.connect(err => {
                // if (err) console.log ('Save Perf Error : ' + err);
                // const collection = client.db('bedrunnermulti').collection('users');
                // collection.find({ "login" : "login" }).toArray(function(err, result) {
                //     console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ' + socket.handshake.session.login );
                //     if (result.length === 1){
                //         if (!result.perf || result.perf < data.score) {
                //             console.log ("ok" + data.score);
                //             try {
                //                 collection.updateOne(
                //                    { "login" : socket.handshake.session.login },
                //                    { $set: { "Perf" : data.score } },
                //                    {upsert: true}
                //                 );
                //             } catch (e) {
                //                 print(e);
                //             }
                //         }
                //     }
                //     client.close();
                // });
            // });
            MongoClient.connect(uri,{ useNewUrlParser: true },function(err, client) {
                if (err) console.log ('connect' + err);
        
                const collection = client.db('bedrunnermulti').collection('users');
                collection.find({ "login" : socket.handshake.session.login }).toArray(function(err, result) {
                    if (result.length === 1){
                        if (!result.perf || result.perf < data.score) {
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
            partieEncours = false;
        }


    });

    socket.on('disconnect', (reason) => {
        console.log(('Événement socket.io [disconnect]socket.id : ' + socket.id +'reason : ' + reason));
        delete connections[socket.id];
        // connectionsId.splice(connectionsId.indexOf(socket.id),1)
        io.emit('runnersListUpdate', { connections: connections});
        }
    );
});



////////////////////////////////////////////////////////////////////
function lanceLeD(min,max) {
    return min + parseInt(Math.random()*(max-min));
};

const PORT = process.env.PORT || 8080;
app.use(function (req, res) { res.status(404).render('404'); })
server.listen(PORT, function(){
// server.listen(8080,'192.168.105.78', function(){
// server.listen(8080, function(){
    console.log('ping');
});
