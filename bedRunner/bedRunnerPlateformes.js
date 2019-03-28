(function () {
    "use strict"
    //*** Variables Globales
    var start = null;
    var socket;
    var can; // Client
    var ctx; // Client
    var fond; // Client
    var ratioEcran = 1; // Client
    var score = 0; // Client mais sécurité server
    var nbLight = 0; // Client mais sécurité server
    var loose= false; // Client mais sécurité server
    var rafresh = 0; // Client
    var stopJeu = true; // Server
    var touched = false; // on senfout
    var touchTimer = 0; // on senfout
    var plateformes = [];  // server
    var waitingPlatorme = [];
    var vitesse = param.plateforme.vitesse;  // pour l'instant client
    var runnerState = 'connected';

    //*** Preload de toutes les images appelées dans le canvas avant le lancement du jeu - client
    var imgLoaded = 0;
    var imgCollection= [];

    // * Sprite Personnage
    var imagePersoCourse = new Image();
    imagePersoCourse.src = "img/" + param.perso.spriteCourse;
    imgCollection.push(imagePersoCourse);

    // * Tableaux des images de plateformes
    var nbPlateforme = param.plateforme.sources.length;
    var preLoadImg1 = []; // * Images de début de plateformes
    var preLoadImg2 = []; // * Briques centrales
    var preLoadImg3 = []; // * Images de fin
    for (var i=0;i<nbPlateforme;i++){
        preLoadImg1 [i] = new Image();
        preLoadImg1[i].src = "img/" + param.plateforme.sources[i].debut;
        imgCollection.push(preLoadImg1[i]);

        //* Chaque plateforme à un tableaux de briques centrales disponibles
        preLoadImg2[i] = [];  
        var nbCentre = param.plateforme.sources[i].centre.length;
        for (var j=0;j < nbCentre;j++){ 
            // preLoadImg2 [i] = new Image();
            preLoadImg2[i][j] = new Image();
            preLoadImg2[i][j].src = "img/" + param.plateforme.sources[i].centre[j];
            imgCollection.push(preLoadImg2[i][j]);
        }

        preLoadImg3 [i] = new Image();
        preLoadImg3[i].src = "img/" + param.plateforme.sources[i].fin;
        imgCollection.push(preLoadImg3[i]);
    }
           
    var haloImage= new Image();
    haloImage.src = "img/" + param.illustrationHalo;
    imgCollection.push(haloImage);
    var flashMonster= new Image();
    flashMonster.src = "img/" + param.illustrationflashMonster;
    imgCollection.push(flashMonster);

    // * Chaque image appel la fonction "checkLoad" une fois chargée
    for(i=0;i<imgCollection.length;i++){
        imgCollection[i].onload = function () {
            imgLoaded ++;
            checkLoad ();
        };
    }

    // * Vérifie que toutes les images soient chargées avant de pouvoir lancer le jeu -- client
    function checkLoad (){
        if (imgLoaded === imgCollection.length){
            $("chargement").style.display = "none";
        }
        else {
            stopJeu = true;
        }
    }

    // * Musique non obligatoire pour le lancement du jeu -- client
    var music = new Audio("http://www.ycallier.fr/bedRunner/img/oogy_sound.wav");
    music.loop = true;
    var letTheMusicPlay = true;

    window.addEventListener("load", loader); // client conditionné par les donné du server
    function loader (){

        
        addListeners ();
        reSizeMobile();
        
        //* Canvas principal en plein écran
        can = $("scene");
        can.width = window.innerWidth;
        can.height = window.innerHeight;
        ctx = can.getContext("2d");
        
        // *  Fabrication manuelle de la prmière plateforme 
        var p1 = new Pateforme (1,100,can.height - (param.plateforme.hauteur / 2), 20);
        
        //* Definition de caractéristiques d'objet
        perso.creaSprite();
        light.creaCanLight();
        
        console.log(can);
        //* Connexion Server
        //var PORT = process.env.PORT || 8888;
        socket = io.connect();
        // socket = io.connect('bedrunnermulti.herokuapp.com:' + PORT);
        //socket = io.connect('http://localhost:8080');
        socket.emit('parametreClient', {canWidth : can.width, canHeight : can.height});

        socket.on('runnersListUpdate', function (data) {
            document.getElementById('runnersList').innerHTML = "";
            for (var connection in data.connections) {
                var login = data.connections[connection].login;
                var state = data.connections[connection].runnerState;
                var color;
                if (state === "dead") color = "#8A2E2F";
                else color = "white"; 
                
                document.getElementById('runnersList').innerHTML += "<li id='runner_"+ connection + "'>" + login + " (<span id='score_" + connection + "'>0</span> meters ran)</li>";
                document.getElementById("runner_" + connection).style.color = color;
            }
        });
        
        socket.on('scoreUpdate', function (data) {
            document.getElementById("score_" + data[0]).innerHTML = data[1];
        });

        socket.on('playPause', function () {
            console.log ('recu');
            pause();
        });

        socket.on('creaNewPlateforme', function (data) {
            //if(runnerState === 'running'){
                for (var prop in data) {
                waitingPlatorme[prop] = data.prop;
                }
            //}
        })
        
        socket.on('plateformOnProgress', function (data) {
            plateformOnProgress = true;
        });

        socket.on('plateformListening', function (data) {
            plateformOnProgress = false;
        });

        //* Raffraichissements différents selon navigateur
        if ( navigator.appName === "Microsoft Internet Explorer") setInterval(fresh,20);
        else requestAnimationFrame (timer);

        //* Ajout de la musique du jeu
        player ();
    };

    function reSizeMobile (){ // on senfiut
        if (window.innerWidth < 700){
            // * On donne un ratio
            ratioEcran = 3;
            param.plateforme.hauteur = param.plateforme.hauteur/3;

            // * On redimenssione toutes les images de plateformes;
            for (var i=0;i<nbPlateforme;i++){
                preLoadImg1[i].width = preLoadImg1[i].width/ratioEcran;
                preLoadImg1[i].height = preLoadImg1[i].height/ratioEcran;
                var nbCentre = param.plateforme.sources[i].centre.length;
                for (var j=0;j < nbCentre;j++){ 
                    preLoadImg2[i][j].width = preLoadImg2[i][j].width/ratioEcran;
                    preLoadImg2[i][j].height = preLoadImg2[i][j].height/ratioEcran;
                }
                preLoadImg3[i].width = preLoadImg3[i].width/ratioEcran;
                preLoadImg3[i].height = preLoadImg3[i].height/ratioEcran;
            }
        }
    }

    function addListeners () { // client

        //* Le jeu se joue uniquement avec la barre d'espace (saut) et le bouton Enter (fonctions utilitaires différentes selon l'état du jeu)

        document.addEventListener("keypress", function (eventInfos){
            if (eventInfos.keyCode === 32  || eventInfos.keyCode === 0) perso.jump();
        });

        document.addEventListener("keyup", function (eventInfos){
            if (eventInfos.keyCode === 32 || eventInfos.keyCode === 0) perso.stopJump();

            if (eventInfos.keyCode === 13) {
                enterFct();
            }
        });

        document.addEventListener("touchstart", function (infos){
            touched = true; // * fait tourné le touchTimer

            // * On vérifie avec le touchTimer si l'utilisateur à fait une double tape
            if (touchTimer < 20) {
                //* Si ce n'est pas déjà le cas on indique qu'il s'agit d'un mobile dans l'URL (pour le manifest.json)
                if (window.location.href.indexOf("?") ===  -1){
                    window.location.href += "?mobile";
                }
                enterFct();
            }
            else {
                perso.jump();
            }
            
            // * On remets le timer à 0 pour compter le nombre de rafraichissement jusqu'à la prochaine tape
            touchTimer = 0;  
        });

        document.addEventListener("touchend", function (){
            perso.stopJump();
                   
        });

        $("creditButton").addEventListener("click", function (){
            affCredit();
        });

        $("musicPlayer").addEventListener("click", function (){
            letTheMusicPlay = !letTheMusicPlay;
            player ();
        });

        $("musicQuestion").addEventListener("click", function (){
            letTheMusicPlay = !letTheMusicPlay;
            player ();
        });
    }

    function enterFct (){ //client mais la fonction pause envoie au server pour mettre le jeu en pause pour tout le monde
        // * Pour continuer à jouer après avoir atteint l'objectif principal
        if (light.catched) light.continue(); 
        
        if (loose) reload(); // * Recharge après un game-over
        else socket.emit('playPause'); // * Lance/Arrête le jeu 
    }


// *** Objet controllé par le joueur -- client mais l'affichage doit être géré par le server
    var perso = {

        //* Propriétés recalculées en cours de jeu
        vecteurUp: 0,
        vecteurDown: 0,
        mouvement: 0,
        toucherLeFond: true,
        stopeur: false,
        spriteCount : 0,
        spriteStart:0,
        spriteStop:5,
        y: 0,
        x: window.innerWidth/2.5,

        //* Constantes
        poid: param.perso.poid,
        impulsion: param.perso.impulsion / ratioEcran,
        inertie: param.perso.inertie,
        sprite : document.createElement ("canvas"),

        //* Propriétés calculées au lancement du jeu par la fonction creaSprite
        spriteSize:0,
        nbSprite:0,
        tailleDuPerso: 0,
        ratioPerso:1,        
        
        creaSprite: function () {
            //* Sprites carrés calculés en fonction de la taille de l'image
            this.spriteSize = imagePersoCourse.height;
            this.nbSprite = imagePersoCourse.width/this.spriteSize; 
            this.sprite.width = this.spriteSize;
            this.sprite.height = this.spriteSize;

            //* Canvas de défilement des sprites
            this.spriteCtx = this.sprite.getContext("2d");

            //* Redimensionnements mobile
            if (ratioEcran > 1) this.ratioPerso = ratioEcran/2; 
            this.tailleDuPerso = this.sprite.height / this.ratioPerso;
            this.impulsion = param.perso.impulsion / this.ratioPerso;
            this.inertie = this.inertie / this.ratioPerso;
        },
        
        anim: function () {
            // * Boucle du sprite. 
            if (ralentire(param.perso.spriteSpeed)) this.spriteCount ++;
            if (this.spriteCount >= this.spriteStop) this.spriteCount = this.spriteStart;

            // * Dessin
            this.spriteCtx.clearRect(0, 0, this.sprite.width, this.sprite.height);
            this.spriteCtx.drawImage(imagePersoCourse, this.spriteSize*this.spriteCount, 0, this.spriteSize, this.spriteSize, 0, 0, this.spriteSize, this.spriteSize);
        },

        jump: function() {
            if (this.toucherLeFond) this.spriteCount = param.perso.nbImageCourse; // * Place le sprite sur la dernière image de course *
            this.spriteStop = 9;
            this.spriteStart = 9; // * fige le sprite en position saut une fois que l'animation a  été jouée
            if (this.toucherLeFond){
                this.stopeur = false;
            }
            if (!this.stopeur){
                this.vecteurUp = this.impulsion-this.vecteurDown;                  
            }
        },
        
        stopJump: function() {
            if (!this.stopeur){
                if (this.vecteurUp > this.vecteurDown){
                    // * Le perso ne tombe pas tout de suite (inertie)
                    this.vecteurDown = this.vecteurUp - this.inertie;
                }
            }
            this.stopeur = true;
        },

        tombe: function() {
            // * Detection de collision avec une plateforme
            if (this.y + this.tailleDuPerso <= fond + 10 && this.y+this.tailleDuPerso >= fond - 10 && this.vecteurDown >= this.vecteurUp) {
                this.toucherLeFond = true;
                // * Remise à 0 des vecteur de mouvement
                this.vecteurUp = 0;
                this.vecteurDown = 0;
                // * Configuration du sprite pour la course
                this.spriteStart = 0;
                this.spriteStop = param.perso.nbImageCourse;
            }
            // * Sinon il tombe de plus en plus vite
            else {
                this.vecteurDown += this.poid;
                this.toucherLeFond = false;
            }
        },

        // * Raffraichissement
        maj: function(){
            this.tombe();
            this.mouvement = this.vecteurUp - this.vecteurDown;

            //* Recalcule du deplacement si collision avec une plateforme
            if (this.toucherLeFond){
                this.y = fond - this.tailleDuPerso;
                this.mouvement = this.vecteurUp;
            }

            this.y -= this.mouvement; 
            this.anim();
            ctx.drawImage(this.sprite, this.x, this.y, this.sprite.width / this.ratioPerso, this.sprite.height / this.ratioPerso);
        }
    }

//*** Constructeur des principaux objets du jeux : les plateformes -- création et caractéristiques server, mouvement et affichage client
    function Pateforme (plateformeSelected,x,y,nbBriqueCentral){
        this.x = x;
        this.y = y;
        this.hauteur = param.plateforme.hauteur; 
        this.ligneDeFlottaison = (param.plateforme.sources[plateformeSelected].ligneDeFlottaison / ratioEcran); // * Définition de l'endroit où le perso s'arrêtte quand il tombe sur la plateforme

        // * Chaque plateforme à une image de fin, une de début et un nombre aléatoir de briques centrales 
        this.imgDebut = preLoadImg1[plateformeSelected];
        this.imgCentre = preLoadImg2[plateformeSelected];
        this.imgFin = preLoadImg3[plateformeSelected];
        this.nbBriqueCentral = nbBriqueCentral;

        //* Calcule de la largeur : addition de toutes les largeurs d'images
        this.largeur = this.imgDebut.width + (nbBriqueCentral*this.imgCentre[0].width) + this.imgFin.width;

        //* L'image finale sera définie dans un canvas à la création de la plateforme
        this.image = document.createElement ("canvas");
        this.image.width = this.largeur;
        this.image.height = this.hauteur;
        this.plateformeCtx = this.image.getContext("2d");

        //* Dessin de la première image
        this.plateformeCtx.drawImage(this.imgDebut,0,0,this.imgDebut.width,this.imgDebut.height);

        //* Dessin central en fonction du nombre de briques
        for (var i=0;i<nbBriqueCentral;i++){
            //* Choix d'une brique aléatoire
            var centreSelected = lanceLeD(0,param.plateforme.sources[plateformeSelected].centre.length);
            var centreImage = this.imgCentre[centreSelected];
            
            var XPos = (i*this.imgCentre[centreSelected].width) + this.imgDebut.width; // * Position

                //* On vérifie si la brique est un ralentisseur
                if (centreImage.src.substring(centreImage.src.length-16) === "ralentisseur.png"){
                    if (this.ralentisseur) {
                        this.ralentisseur[this.ralentisseur.length] = [XPos, XPos + centreImage.width];
                    }
                    else {
                        this.ralentisseur = [[XPos, XPos + centreImage.width]];   
                    }
                }
            this.plateformeCtx.drawImage(centreImage,XPos,0,centreImage.width,centreImage.height);
        }

        // * Dessin de l'image de fin
        this.plateformeCtx.drawImage(this.imgFin, (nbBriqueCentral * this.imgCentre[0].width) + this.imgDebut.width,0,this.imgFin.width,this.imgFin.height);

        //* ajout de la plateforme au tableau de plateformes
        plateformes.push(this);

        // * Raffraichissement de la plateforme
        this.maj = function(){
            this.glisse(); // Position
            this.isFond(); // Définition de la plateforme comme objet de collision en fonction de sa position
            ctx.drawImage(this.image,this.x,this.y);
        }

        this.glisse = function() {
            if (plateformeSelected=="3") this.y -=0.2; //* Particularité pour une plateforme volante
            if (this.x + this.largeur > 0) this.x -= vitesse;
        }

        this.isFond = function (){
            // * Vérification de la position du perso par rapport à la plateforme  
            if (this.x < perso.x + perso.spriteSize && this.x + this.largeur > perso.x){
                fond = this.y + this.ligneDeFlottaison;
                // * Vérification d'une collision avec un ralentisseur
                if (this.ralentisseur && perso.toucherLeFond){
                    for (var i = 0; i < this.ralentisseur.length; i++){

                        if (this.ralentisseur[i][0]+ this.x < perso.x && this.ralentisseur[i][1] + this.x > perso.x){
                            //vitesse = param.plateforme.vitesse;                       
                    }
                    }
                }
            } 
        }
    }

// *** objet générateur de particules lumineuses représentant le but à atteindre  -- création et caractéristiques server, mouvement et affichage client
    var light = {
        centerX: window.innerWidth*2,
        centerY: window.innerWidth / 10, 
        switcher: 0,
        radius: 100,
        catched: false,
        particules : [],
        ctxP : [],
        particulesSize : [50,40,30,20,10], //* 5 particules de taille différentes
        
        //* Definition des caractéristiques de chaque particules (au début du jeu)
        creaCanLight: function () {
            for (var i=0; this.particulesSize[i]; i++ ){
                this.particules[i] = document.createElement ("canvas");
                this.particules[i].width = can.width;
                this.particules[i].height = can.height;
                this.ctxP[i] = this.particules[i].getContext("2d");
                this.ctxP[i].fillStyle = "white";
                this.ctxP[i].shadowBlur = this.particulesSize[i];
                this.ctxP[i].shadowColor = "white";
                this.ctxP[i].globalAlpha = 0.2 + ((i*2)/10); //* plus c'est grand moins c'est lumineux
            }
        },

        //* Raffraichissment des particules
        maj: function(){
            if (score > 10000) this.redLight(); // * Objectif caché
            this.anim();//* animation
            this.glisse(); //* position
            //* dessin des particules lumineuses et halo
            if (ralentire(2)) ctx.drawImage(haloImage, this.centerX-100,this.centerY-100);
            ctx.drawImage(this.particules[0], 0,0);
            ctx.drawImage(this.particules[1], 0,0);
            ctx.drawImage(this.particules[2], 0,0);
            ctx.drawImage(this.particules[3], 0,0);
            ctx.drawImage(this.particules[4], 0,0);
            //* Collision avec le joueur
            this.catchTheLight();
        },

        anim: function () {
            if (ralentire(2)) { //* L'animation se joue tous les 2 raffaichissements

                //* le "switcher" permet d'animer les particulles 1 aprés l'autre
                this.ctxP[this.switcher].clearRect(0, 0, can.width, can.width);
                this.ctxP[this.switcher].beginPath();

                this.ctxP[this.switcher].arc(this.centerX + lanceLeD(-30,30), 
                this.centerY + lanceLeD(-30,30), //* placement aléatoire dans une zonne donnée
                this.particulesSize[this.switcher],     
                0, 2 * Math.PI);

                this.ctxP[this.switcher].fill();
                this.ctxP[this.switcher].closePath();

                if (this.switcher === this.particules.length - 1 ) this.switcher = 0;
                else this.switcher ++;
            }
        },

        glisse : function() {
            //* avance doucement vers le personnage
            if (this.centerX + this.radius > 0)  this.centerX -= vitesse / 3;
            else this.centerX = window.innerWidth*3;
        },

        catchTheLight : function() {

            //* Verification de collision en x et en y avec le personnage
            var catchX = (this.centerX - this.radius) < perso.x && (this.centerX + this.radius) > perso.x;
            var catchY = (this.centerY - this.radius) < perso.y && (this.centerY + this.radius) > perso.y;

            if (catchX && catchY){
                music.volume = 0.04; //* On tamise
                nbLight ++;
                this.catched = true;
                masque("creditButton");
                masque("premierPlan");

                //* Dessin de l'écran de victoire et affichage des textes
                var reSizer = window.innerHeight*1.5;
                ctx.shadowBlur = reSizer;
                ctx.shadowColor = "white";
                ctx.drawImage(flashMonster, ((window.innerWidth/2) - (reSizer/2)), ((window.innerHeight/2) - (reSizer/2)), reSizer, reSizer);
                if (score > 10000) affiche ("redText");
                else affiche ("winnerText");

                stopJeu = true;
            }
        },

        //* En partique le jeu n'a pas de fin tant que le joueur n'a pas perdu
        continue: function(){
            ctx.shadowBlur = 0;
            this.catched = false;
            this.radius = 100;
            this.centerX = window.innerWidth*2;
            affiche("premierPlan");
            masque("winnerText");
        },

        redLight: function (){
            this.ctxP[0].fillStyle = "red";
            this.ctxP[1].fillStyle = "red";
            this.ctxP[2].fillStyle = "red";
            this.ctxP[3].fillStyle = "red";
            this.ctxP[4].fillStyle = "red";
        },
    }


// *** Fonctions de mise à jours générales du jeu ***

    // function timer  (){ // * Pas de timestamp : maj à chaque raffraichissement de l'écran -- client besoin d'un timestamp
    //     fresh();
    //     requestAnimationFrame (timer);
    // }

    function timer  (timestamp){ // * Pas de timestamp : maj à chaque raffraichissement de l'écran -- client besoin d'un timestamp
        var progress;
        if (start === null) start = timestamp;
        progress = timestamp - start;

        if (progress > 10) {
            start = null;
            fresh();
        }
        requestAnimationFrame (timer);
    }

    function fresh (){
        if (!stopJeu){
            rafresh += 1; // * nombre de rafraichissement (sert la fonction de ralentissement)
            majCan();
            majScore();
        }
        // if (touched){ // * Timer tactile
        //     touchTimer ++;
        // }
    }

    function majCan() { // client
        
            ctx.clearRect(0, 0, can.width, can.height);
            perso.maj();
            fond = can.height + 100; // * Avant maj des plataformes
            for (var i=0; plateformes[i]; i++){
                plateformes[i].maj();
            }
            usineDePlateforme (); // * Génération de plateformes
            light.maj();
            gameOver ();
    }

    function majScore () { // server ce serait bien
        
        // * La vitesse du jeu augmente constament (sauf quand je joueur marche sur un "ralentisseur")
        vitesse += param.plateforme.acceleration;
        score += vitesse/2;
        score = parseInt(score);
        socket.emit('scoreUpdate', { score: score });
        $("inGameScore").innerHTML = score;
        $("inGameLight").innerHTML = nbLight;

        // * Plus le score augmente plus les plateformes s'éloignent (besoin de plus de vitesse)
        param.plateforme.espacementMax = score/50;
    }

    function usineDePlateforme (){ //server
        //* Cette fonction simple est la plus compliquée du jeu 
        var lastPlateforme = plateformes[plateformes.length-1];

        
        //* On demande une plateformes au serveur s'il est dispo et si la dernière est totalement entrée dans l'écran 
        if (lastPlateforme.x + lastPlateforme.largeur < can.width){
            var newPlateformeSelected = waitingPlatorme.newPlateformeSelected;
            var newX = waitingPlatorme.eloignement + can.width;
            var newY = can.height - waitingPlatorme.hauteur;
            var newNbBriqueCentral = waitingPlatorme.newNbBriqueCentral;
            //socket.emit('needNewPlateforme', {message : 'I need you !'});
            new Pateforme (newPlateformeSelected, newX, newY, newNbBriqueCentral);
        }
        //* Suppression de plateforme quand elles sortent de l'écran
        if (plateformes[0].x + plateformes[0].largeur < 0) plateformes.shift();
    }

    function affCredit (){ //client
        affiche("credit");
        stopJeu = true;
    }

    function pause (){
        // * Affichages
        masque ("accueil", "game0ver", "winnerText", "redText", "looserText", "credit", "instruction");
        affiche("creditButton");
        runnerState = "running";
        if (stopJeu){
            music.volume = 0.2;
            stopJeu = false;
        }
        else {
            music.volume = 0.04; // * on tamise mais on éteint pas
            stopJeu = true;
        }
        //* Par de musique sur mobile
        if (!touched)  music.play();
    }

    function gameOver (){ // client
        if (perso.y > can.width){
            runnerState = "dead";
            music.volume = 0.04;
            loose = true;
            stopJeu = true;
            affiche ("game0ver", "looserText");
            socket.emit('gameOver', {score: score});
            $("overScore").innerHTML = score;
        }
    }

    function player (){ // client
        music.muted = !letTheMusicPlay;
        if (letTheMusicPlay){
            masque ("musicOff", "musicNop");
            affiche ("musicOn", "musicYeh");
        }
        else {
            masque ("musicOn","musicYeh");
            affiche ("musicOff", "musicNop");
        }
    }

    function reload (){ //client
        window.location.reload();
    }

// *** Fonctions de factorisation

    function ralentire (speed){  // client
    // * Ralentis l'animation d'un élément (qui s'anime tous les <speed> raffraichissements) 
        if (rafresh % speed === 0){
                return true;
            }
        else {
            return false;
        } 
    } 

    function masque (){ // client
        for (var j = 0; j < arguments.length; j++){
            $(arguments[j]).style.display = "none";
        }
    }

    function affiche (){ // client
        for (var j = 0; j < arguments.length; j++){
            $(arguments[j]).style.display = "inline-block";
        }
    }

    function $(element){ // client
        return document.getElementById(element);
    }

    function lanceLeD(min,max) { // server
        return min + parseInt(Math.random()*(max-min));
    };

    function ç(infos){ // client
        console.log(infos);
    };

    function fctTest(){ // client
        ç(arguments);
    };
})();
