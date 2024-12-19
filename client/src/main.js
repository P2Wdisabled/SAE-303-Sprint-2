// ./src/main.js

import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import { Coordonees } from "./data/data-coordonees.js";
import { Map } from "./ui/map/index.js";
import './index.css';

let C = {};

C.init = async function() {
    V.init();
    let lyceesData = await Lycees.getAll();
    let candidaturesData = await Candidats.getAll();

    const { candidaturesParLycee, candidaturesPostBacParDept } = Candidats.aggregateCandidatures(candidaturesData);

    Map.init('map', lyceesData, candidaturesParLycee, candidaturesPostBacParDept);
}

let V = {
    header: document.querySelector("#header")
};

V.init = function(){
    V.renderHeader();
}

V.renderHeader = function(){
    V.header.innerHTML = HeaderView.render();
}

C.init();
