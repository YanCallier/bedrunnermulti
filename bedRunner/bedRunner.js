
(function () {
"use strict"

//////////////////////////////////////////////////////////////////// Variables Globales

    var socket;
    var can;
    var ctx;
    var fond;
    var ratioEcran = 1;

    var rafresh = 0;
    var stopJeu = true;
    var plateformes = [];
    var vitesse = param.plateforme.vitesse;
    var lastRunner = false;
    var connectedRunners;
    var runnerState = 'connected';
    var readyToPlay = false;

//////////////////////////////////////////////////////////////////// Preload des ressources

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

    // * Vérification
    for(i=0;i<imgCollection.length;i++){
        imgCollection[i].onload = function () {
            imgLoaded ++;
            checkLoad ();
        };
    }

    function checkLoad (){
        if (imgLoaded === imgCollection.length){
            $("chargement").style.display = "none";
        }
        else {
            stopJeu = true;
        }
    }

//////////////////////////////////////////////////////////////////// Preload des ressources
    
    window.addEventListener("load", loader);
    function loader (){
        
        can = $("scene");
        ctx = can.getContext("2d");
        
        addListeners();
        addSockets();
        
        // * Definition de caractéristiques d'objet
        perso.creaSprite();
        light.creaCanLight(); 
 
    };

    function addListeners () {

        // * Le jeu se joue uniquement avec la barre d'espace (saut) et le bouton Enter (fonctions utilitaires différentes selon l'état du jeu)

        document.addEventListener("keypress", function (eventInfos){
            if (eventInfos.keyCode === 32  || eventInfos.keyCode === 0) perso.jump();
        });

        document.addEventListener("keyup", function (eventInfos){
            if (eventInfos.keyCode === 32 || eventInfos.keyCode === 0) perso.stopJump();

            if (eventInfos.keyCode === 13) {
                enterFct();
            }
        });

        $("creditButton").addEventListener("click", function (){
            affCredit();
        });

        $("top5Button").addEventListener("click", function (){
            affTop5();
        });

        $("howToPlayButton").addEventListener("click", function (){
            affHowToPlay();
        });

        var closable = document.getElementsByClassName("closable");
        for (i=0; closable[i]; i++){
            closable[i].addEventListener("click", function (){
                this.style.display="none";
            });
        }
        
    }

    function addSockets (){

        socket = io.connect();
        //socket = io.connect('http://localhost:8080');

        // * Interface d'accueil
        socket.on ('hello', function (message){
            if (message) alert (message);
            affiche ("connection");
        });

        socket.on ('instructions', function (partieEnCours){
            if (partieEnCours) {
                affiche ('partieEnCours');
                masque ('enterToGo');
            }
            else{
                masque ('partieEnCours');
                affiche ('enterToGo');
            }
            readyToPlay = true;
        });

        socket.on ('welcome', function (){
            affiche ('howToPlay');
        });

        socket.on ('pleaseWait', function (){
            alert ('Please wait, there are runners in run');
        });

        // * Panneau des scores
        socket.on('runnersListUpdate', function (data) {
            
            connectedRunners = data.connections;

            document.getElementById('runnersList').innerHTML = "";
            for (var connection in data.connections) {
                var scoreRun = data.connections[connection].score;
                var login = data.connections[connection].login;
                var state = data.connections[connection].runnerState;
                var color;
                var headPicture
                if (state === "dead"){
                    color = "#8A2E2F";
                    headPicture = "💀";
                } 
                else {
                    color = "white";
                    headPicture = "";
                }            
                
                document.getElementById('runnersList').innerHTML += "<div id='runner_"+ connection + "'> "+ headPicture + " " + login + " (<span id='score_" + connection + "'>"+ scoreRun + "</span> meters ran)</div>";
                document.getElementById("runner_" + connection).style.color = color;
            }
        });
        
        // * Evenements de jeu
        socket.on('play', function () { 
            play();
        });

        socket.on('fresh', function () {
            if (!stopJeu){
            rafresh += 1;
            majCan();
            }
        });

        socket.on('scoreUpdate', function (score) {
            for (var runner in connectedRunners){
                if (connectedRunners[runner].runnerState === 'running'){
                    document.getElementById("score_" + runner).innerHTML = score;
                };
            }
        });

        socket.on('creaNewPlateforme', function (data) {
            var lastPlatforme = plateformes[plateformes.length - 1];

            if(runnerState === 'running' && (lastPlatforme.x + lastPlatforme.largeur) < can.width){
                new Pateforme (data.newPlateformeSelected, data.eloignement + can.width, can.height - data.hauteur, data.newNbBriqueCentral);
                vitesse = data.vitesse;
            }
        })

        socket.on('lightUp', function () {
            lastRunner = true;
        });

        // * Records
        socket.on('top5', function (top) {
            $('top5Liste').innerHTML = "";
            for (i=0; top[i]; i++){
                $('top5Liste').innerHTML += top[i].login + " : " + top[i].perf + " meters ran</br>";
            }
            affiche("top5");
        });

    }

//////////////////////////////////////////////////////////////////// Personnage controllé par le joueur
    
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
        x: 700,

        //* Constantes
        poid: param.perso.poid,
        impulsion: param.perso.impulsion,
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
            if (this.toucherLeFond) {
                this.spriteCount = param.perso.nbImageCourse; // * Place le sprite sur la dernière image de course *
                this.test = 0;
            }
            this.spriteStop = 9;
            this.spriteStart = 9; // * fige le sprite en position saut une fois que l'animation a  été jouée
            if (this.toucherLeFond){
                this.stopeur = false;
            }
            if (!this.stopeur){
                this.vecteurUp = this.impulsion-this.vecteurDown;
            }
            if (this.vecteurUp < 20) this.stopJump();            
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
                console.log (this.tailleDuPerso);
                this.y = fond - this.tailleDuPerso;
                this.mouvement = this.vecteurUp;
            }

            this.y -= this.mouvement; 
            this.anim();
            ctx.drawImage(this.sprite, this.x, this.y, this.sprite.width / this.ratioPerso, this.sprite.height / this.ratioPerso);
        }
    }

//////////////////////////////////////////////////////////////////// Constructeur de plateformes

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

        //* Previent le serveur que la plateforme est créée
        socket.emit('largeurPlateforme', this.largeur);
        
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
            this.plateformeCtx.drawImage(centreImage,XPos,0,centreImage.width,centreImage.height);
        }

        // * Dessin de l'image de fin
        this.plateformeCtx.drawImage(this.imgFin, (nbBriqueCentral * this.imgCentre[0].width) + this.imgDebut.width,0,this.imgFin.width,this.imgFin.height);

        //* ajout de la plateforme au tableau de plateformes
        plateformes.push(this);

        // * Raffraichissement de la plateforme 
        this.maj = function(){
            this.destroy();
            this.glisse();
            this.isFond(); // Définition de la plateforme comme objet de collision en fonction de sa position
            ctx.drawImage(this.image,this.x,this.y);
        }

        this.glisse = function() {
            if (plateformeSelected=="3") this.y -=0.2; //* Particularité pour une plateforme volante
            if (this.x + this.largeur > 0) this.x -= parseInt(vitesse);
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

        this.destroy = function (){
            if (this.x + this.largeur < 0) plateformes.splice( plateformes.indexOf(this), 1 );
        }
    }

//////////////////////////////////////////////////////////////////// Générateur de particules

    var light = {
        centerX: 1500,
        centerY: 200, 
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
            this.anim();
            this.glisse();
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

                socket.emit('gotIt');
                runnerState = "winner";
                this.catched = true;
                masque("premierPlan");

                //* Dessin de l'écran de victoire et affichage des textes
                var reSizer = window.innerHeight*1.5;
                ctx.drawImage(flashMonster, ((window.innerWidth/2) - (reSizer/2)), ((window.innerHeight/2) - (reSizer/2)), reSizer, reSizer);
                affiche ("winnerText");
                endGame ();
            }
        },

    }

//////////////////////////////////////////////////////////////////// Fonctions de mise à jours générales du jeu

    // * Lancement du jeu
    function play (){
        masque ("accueil", "game0ver", "winnerText", "looserText", "credit", "instruction", "redLink");
        affiche ("premierPlan");

        // *  Fabrication manuelle de la prmière plateforme 
        plateformes = [];
        var p1 = new Pateforme (1,100,can.height - (param.plateforme.hauteur / 2), 20);

        // *  Paramètres début de jeu
        perso.y = 0;
        perso.vecteurUp = 0,
        perso.vecteurDown = 0,
        perso.mouvement =  0,
        lastRunner = false;
        light.catched = false;
        light.centerX = 1500;
        readyToPlay = false;
        stopJeu = false;
        runnerState = 'running';
    }

    // * Animations
    function majCan() {
            ctx.clearRect(0, 0, can.width, can.height);
            perso.maj();
            fond = can.height + 1000; // * Avant maj des plataformes
            for (var i=0; plateformes[i]; i++){
                plateformes[i].maj();
            }
            if (lastRunner) light.maj();
            gameOver ();
    }

    // * fin du jeu
    function gameOver (){
        if (perso.y > can.width){
            runnerState = "dead";
            affiche ("game0ver", "looserText");
            socket.emit('gameOver');
            endGame();
        }
    }

    function endGame () {
        light.centerX = 1500;
        vitesse = 3;
        stopJeu = true;
        $("redLink").style.display = "flex";
    }
    
    function enterFct (){
        
        if (readyToPlay) {
            socket.emit('play');
        }
        else {
            if (runnerState === 'dead' || runnerState === 'winner')  reloadFct ();
        }
    }

    function reloadFct () {
        
        affiche ("accueil", "instruction");
        masque ("looserText", "winnerText");
        readyToPlay = true;
    }
    
    function affCredit (){
        affiche("credit");
    }

    function affTop5 (){
        socket.emit('top5');
    }

    function affHowToPlay (){
        affiche("howToPlay");
    }

//////////////////////////////////////////////////////////////////// Fonctions de factorisation

    function ralentire (speed){  // client
    // * Ralentis l'animation d'un élément (qui s'anime tous les <speed> raffraichissements) 
        if (rafresh % speed === 0){
                return true;
            }
        else {
            return false;
        } 
    } 

    function masque (){
        for (var j = 0; j < arguments.length; j++){
            $(arguments[j]).style.display = "none";
        }
    }

    function affiche (){
        for (var j = 0; j < arguments.length; j++){
            $(arguments[j]).style.display = "inline-block";
        }
    }

    function $(element){
        return document.getElementById(element);
    }

    function lanceLeD(min,max) { // server
        return min + parseInt(Math.random()*(max-min));
    };

    function ç(infos){
        console.log(infos);
    };

    function fctTest(){
        ç(arguments);
    };
})();
