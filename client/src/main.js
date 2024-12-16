import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import './index.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Importer le CSS de Leaflet



let C = {};

C.init = async function(){
    V.init();
    console.log(Candidats.getAll());
    console.log(Lycees.getAll());
    
  // Crée la carte et la centre sur Limoges
  const map = L.map('map').setView([45.8336, 1.2611], 13); // Zoom niveau 13

  // Ajoute la couche de tuiles OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // (Optionnel) Ajoute un marqueur sur Limoges
  const marker = L.marker([45.8336, 1.2611]).addTo(map);
  marker.bindPopup("<b>Limoges</b><br>Bienvenue à Limoges !").openPopup();
}

let V = {
    header: document.querySelector("#header")
};

V.init = function(){
    V.renderHeader();
}

V.renderHeader= function(){
    V.header.innerHTML = HeaderView.render();
}


C.init();