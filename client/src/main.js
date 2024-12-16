// src/main.js

import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import { Map } from "./ui/map/index.js"; // Importer le composant Map
import './index.css';

let C = {};

// Fonction pour obtenir le dernier UAI d'une candidature
function getLatestUai(candidature) {
    for (let i = 0; i < candidature.Scolarite.length; i++) {
        const scolarite = candidature.Scolarite[i];
        if (scolarite.UAIEtablissementorigine) {
            return scolarite.UAIEtablissementorigine.toUpperCase();
        }
    }
    return null;
}

// Fonction d'initialisation
C.init = async function(){
    V.init();
    let lyceesData = Lycees.getAll();
    let candidaturesData = Candidats.getAll();
    console.log("Candidatures:", candidaturesData);
    console.log("Lycées:", lyceesData);
    
    // Compter les candidatures par lycée
    const candidaturesParLycee = {};
    candidaturesData.forEach(candidature => {
        const uai = getLatestUai(candidature);
        if (uai) {
            if (candidaturesParLycee[uai]) {
                candidaturesParLycee[uai]++;
            } else {
                candidaturesParLycee[uai] = 1;
            }
        }
    });
    console.log("Candidatures par lycée:", candidaturesParLycee);

    // Initialiser la carte en utilisant le composant Map
    Map.init('map', lyceesData, candidaturesParLycee);
}

// Objet pour gérer l'interface utilisateur
let V = {
    header: document.querySelector("#header")
};

// Initialiser l'interface utilisateur
V.init = function(){
    V.renderHeader();
}

// Rendre le header
V.renderHeader= function(){
    V.header.innerHTML = HeaderView.render();
}

// Lancer l'initialisation
C.init();
