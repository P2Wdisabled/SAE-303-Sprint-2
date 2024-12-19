// ./src/ui/charts/index.js

import { Coordonees } from "../../data/data-coordonees";
import { Candidats } from "../../data/data-candidats.js";
import * as echarts from 'echarts';
import { Lycees } from "../../data/data-lycees.js";

let Charts = {};

// Stocker l'instance du graphique
Charts.myChart = null;

Charts.updateChart = async function(lycees, candidaturesLycee, candidaturesPostBac, Map) {
    try {
        let candidaturesParDept = Lycees.filtercandidaturesParDept(lycees, candidaturesLycee, candidaturesPostBac, Map);

        let deptArray = Object.keys(candidaturesParDept).map(d => {
            let dd = candidaturesParDept[d];
            return { dept: d, ...dd };
        });

        const selectedCategories = [];
        if (Map._catFilters.postBac) selectedCategories.push('postbac');
        if (Map._catFilters.generale) selectedCategories.push('generale');
        if (Map._catFilters.sti2d) selectedCategories.push('sti2d');
        if (Map._catFilters.autre) selectedCategories.push('autre');

        if (selectedCategories.length === 0) {
            console.warn("Aucune catégorie sélectionnée. Le graphique ne sera pas mis à jour.");
            return;
        }

        deptArray.forEach(dept => {
            dept.sortTotal = selectedCategories.reduce((acc, category) => acc + (dept[category] || 0), 0);
        });

        deptArray.sort((a, b) => b.sortTotal - a.sortTotal);

        if (Map._threshold > 0) {
            let regroupes = { dept: "Autres", postbac: 0, generale: 0, sti2d: 0, autre: 0, sortTotal: 0 };
            let filteredArray = [];

            deptArray.forEach(item => {
                if (item.sortTotal <= Map._threshold) {
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

            deptArray.sort((a, b) => b.sortTotal - a.sortTotal);
        }

        let depts = deptArray.map(d => d.dept);

        let series = [];
        let legend = [];

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

        addSeriesIfChecked('Post-bac', 'postbac');
        addSeriesIfChecked('Générale', 'generale');
        addSeriesIfChecked('STI2D', 'sti2d');
        addSeriesIfChecked('Autre', 'autre');

        if (series.length === 0) {
            console.warn("Aucune série sélectionnée. Le graphique ne sera pas mis à jour.");
            return;
        }

        let chartDom = document.getElementById('chartContainer');
        if (!chartDom) {
            console.error("L'élément avec l'ID 'chartContainer' n'a pas été trouvé dans le DOM.");
            return;
        }

        if (Charts.myChart) {
            echarts.dispose(chartDom);
        }

        Charts.myChart = echarts.init(chartDom);

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
                inverse: true
            },
            series: series
        };

        Charts.myChart.setOption(option);
    }catch(e){
        console.error(e);
    }
}
export { Charts };
