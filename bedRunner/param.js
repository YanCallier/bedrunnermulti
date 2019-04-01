//*** Ce fichier a été créé essentiellement pour pouvoir ajouter simplement des plateformes au jeux, et des briques de plateformes. Nous y avons ajouté petit à petit différentes variables du jeu, permettant de faire des tests de rendus graphiques et de jouabilité.

var param = {

    illustrationHalo:"halo.png",
    illustrationflashMonster:"flash_monster.png",

    perso: {
        nom:"Roger",
        spriteCourse: "bande_perso.png",
        nbImageCourse: 5,
        nbImageSaute:4,
        impulsion:20,
        poid: 0.3,
        spriteSpeed: 3,
        inertie: 7
    },
    plateforme: {
        hauteur:500,
        vitesse: 2,
        acceleration: 0.001, // attention ça va très vite.
        espacementMin: 0,
        espacementMax: 0,

        //*** On peut ajouter/enlever autant de plateformes et de briques centrales de plateforme qu'on veut, sans toucher le reste du code
        sources: [
                {
                    ligneDeFlottaison : 6, //* definit la ligne sur laquelle le perso évolue
                    debut:"plateforme_bord.png",
                    centre:["plateforme_centre.png","plateforme_centre.png","plateforme_centre.png","plateforme_centre2.png"],
                    fin:"plateforme_bord2.png",
                },
                {
                    ligneDeFlottaison : 6,
                    debut:"plateforme_bord.png",
                    centre:["plateforme_centre.png","plateforme_centre2.png","ralentisseur.png"],
                    fin:"plateforme_bord2.png",
                },
                {
                    ligneDeFlottaison : 6,
                    debut:"plateforme_bord.png",
                    centre:["plateforme_centre.png","plateforme_centre2.png"],
                    fin:"plateforme_bord2.png",
                },
                {
                    ligneDeFlottaison : 70,
                    debut:"rocher_volant.png",
                    centre:["vide.gif"],
                    fin:"vide.gif",
                }
            ]
    },
};