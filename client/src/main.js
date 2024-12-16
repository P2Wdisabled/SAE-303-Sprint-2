import { HeaderView } from "./ui/header/index.js";
import { Candidats } from "./data/data-candidats.js";
import { Lycees } from "./data/data-lycees.js";
import './index.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Importer le CSS de Leaflet

function ajouterMarqueursLycees(map, lycees) {
    lycees.forEach(lycee => {
      const lat = parseFloat(lycee.latitude);
      const lng = parseFloat(lycee.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<b>${lycee.appellation_officielle}</b><br>${lycee.adresse_uai || 'Adresse non disponible'}`);
      }
    });
  }
  

let C = {};

C.init = async function(){
    V.init();
    let lyceesData = Lycees.getAll();
    console.log(Candidats.getAll());
    
  
    const map = L.map('map').setView([45.8336, 1.2611], 13); // Centré sur Limoges

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  
    // Ajouter un marqueur de test (optionnel)
    const markerTest = L.marker([45.8336, 1.2611]).addTo(map);
    markerTest.bindPopup("<b>Limoges</b><br>Bienvenue à Limoges !").openPopup();
  
    // Ajouter les marqueurs des lycées
    ajouterMarqueursLycees(map, lyceesData);
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