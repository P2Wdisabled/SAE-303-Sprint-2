// ./src/ui/charts/index.js

import { Coordonees } from "../../data/data-coordonees";
import { Candidats } from "../../data/data-candidats.js";
import * as echarts from 'echarts';
import { Lycees } from "../../data/data-lycees.js";

let Charts = {};

Charts.updateChart = async function(lycees, candidaturesLycee, candidaturesPostBac, Map) {
    try {
        // Filtrer les candidatures par département
        let candidaturesParDept = Lycees.filtercandidaturesParDept(lycees, candidaturesLycee, candidaturesPostBac, Map);

        // Convertir en tableau avec les données de chaque département
        let deptArray = Object.keys(candidaturesParDept).map(d => {
            let dd = candidaturesParDept[d];
            return { dept: d, ...dd };
        });

        // Déterminer les catégories sélectionnées
        const selectedCategories = [];
        if (Map._catFilters.postBac) selectedCategories.push('postbac');
        if (Map._catFilters.generale) selectedCategories.push('generale');
        if (Map._catFilters.sti2d) selectedCategories.push('sti2d');
        if (Map._catFilters.autre) selectedCategories.push('autre');

        // Vérification des catégories sélectionnées
        if (selectedCategories.length === 0) {
            console.warn("Aucune catégorie sélectionnée. Le graphique ne sera pas mis à jour.");
            return;
        }

        // Calculer sortTotal pour chaque département en fonction des catégories sélectionnées
        deptArray.forEach(dept => {
            dept.sortTotal = selectedCategories.reduce((acc, category) => acc + (dept[category] || 0), 0);
        });

        // Trier les départements en ordre décroissant basé sur sortTotal
        deptArray.sort((a, b) => b.sortTotal - a.sortTotal);

        // Appliquer le seuil si nécessaire
        if (Map._threshold > 0) {
            let regroupes = { dept: "Autres", postbac: 0, generale: 0, sti2d: 0, autre: 0, sortTotal: 0 };
            let filteredArray = [];

            deptArray.forEach(item => {
                if (item.sortTotal <= Map._threshold) {
                    // Additionner uniquement les catégories sélectionnées
                    selectedCategories.forEach(category => {
                        regroupes[category] += item[category] || 0;
                    });
                    regroupes.sortTotal += item.sortTotal;
                } else {
                    filteredArray.push(item);
                }
            });

            if (regroupes.sortTotal > 0) {
                filteredArray.push(regroupes);
            }

            deptArray = filteredArray;

            // Re-trier après regroupement
            deptArray.sort((a, b) => b.sortTotal - a.sortTotal);
        }

        // Mettre à jour la liste des départements après tri et regroupement
        let depts = deptArray.map(d => d.dept);

        // Initialiser les séries et la légende
        let series = [];
        let legend = [];

        // Fonction pour ajouter une série si elle est sélectionnée
        function addSeriesIfChecked(name, field) {
            let selected = false;
            switch (name) {
                case 'Post-bac':
                    selected = Map._catFilters.postBac;
                    break;
                case 'Générale':
                    selected = Map._catFilters.generale;
                    break;
                case 'STI2D':
                    selected = Map._catFilters.sti2d;
                    break;
                case 'Autre':
                    selected = Map._catFilters.autre;
                    break;
                default:
                    break;
            }

            if (selected) {
                series.push({
                    name: name,
                    type: 'bar',
                    stack: 'total',
                    data: deptArray.map(d => d[field] || 0)
                });
                legend.push(name);
            }
        }

        // Ajouter les séries sélectionnées
        addSeriesIfChecked('Post-bac', 'postbac');
        addSeriesIfChecked('Générale', 'generale');
        addSeriesIfChecked('STI2D', 'sti2d');
        addSeriesIfChecked('Autre', 'autre');

        // Vérifier si au moins une série est sélectionnée
        if (series.length === 0) {
            console.warn("Aucune série sélectionnée. Le graphique ne sera pas mis à jour.");
            return;
        }

        // Initialiser ou réinitialiser le graphique ECharts
        let chartDom = document.getElementById('chartContainer');
        if (!chartDom) {
            console.error("L'élément avec l'ID 'chartContainer' n'a pas été trouvé dans le DOM.");
            return;
        }

        // Dispose du graphique existant si déjà initialisé pour éviter les erreurs
        if (chartDom._echarts_instance_) {
            echarts.dispose(chartDom);
        }

        let myChart = echarts.init(chartDom);

        // Configuration des options du graphique
        let option = {
            title: {
                text: 'Candidatures par Département',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                bottom: '0',
                data: legend
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                boundaryGap: [0, 0.01]
            },
            yAxis: {
                type: 'category',
                data: depts,
                inverse: true  // Inversion de l'axe Y pour afficher le plus grand en haut
            },
            series: series
        };

        // Appliquer les options au graphique
        myChart.setOption(option);
    } catch (error) {
        console.error("Erreur lors de la mise à jour du graphique :", error);
    }
};

export { Charts };
