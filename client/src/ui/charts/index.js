// ./src/ui/charts/index.js

import { Coordonees } from "../../data/data-coordonees";
import { Candidats } from "../../data/data-candidats.js";
import * as echarts from 'echarts';
import { Lycees } from "../../data/data-lycees.js";


let Charts = {};


Charts.updateChart = async function(lycees, candidaturesLycee, candidaturesPostBac, Map) {
    let candidaturesParDept = Lycees.filtercandidaturesParDept(lycees, candidaturesLycee, candidaturesPostBac, Map);

    

    let deptArray = Object.keys(candidaturesParDept).map(d => {
        let dd = candidaturesParDept[d];
        return {dept:d, ...dd};
    });

    deptArray.sort((a,b) => b.total - a.total);

    if (Map._threshold > 0) {
        let regroupes = {dept:"Autres", postbac:0, generale:0, sti2d:0, autre:0, total:0};
        let filteredArray = [];
        deptArray.forEach(item => {
            if (item.total <= Map._threshold) {
                regroupes.postbac += item.postbac;
                regroupes.generale += item.generale;
                regroupes.sti2d += item.sti2d;
                regroupes.autre += item.autre;
                regroupes.total += item.total;
            } else {
                filteredArray.push(item);
            }
        });
        if (regroupes.total > 0) {
            filteredArray.push(regroupes);
        }
        deptArray = filteredArray;
    }

    let depts = deptArray.map(d => d.dept);
    let series = [];
    let legend = [];

    function addSeriesIfChecked(name, field) {
        let selected = false;
        if (name === 'Post-bac') selected = Map._catFilters.postBac;
        else if (name === 'Générale') selected = Map._catFilters.generale;
        else if (name === 'STI2D') selected = Map._catFilters.sti2d;
        else if (name === 'Autre') selected = Map._catFilters.autre;
        if (selected) {
            series.push({
                name: name,
                type: 'bar',
                stack: 'total',
                data: deptArray.map(d => d[field])
            });
            legend.push(name);
        }
    }

    addSeriesIfChecked('Post-bac', 'postbac');
    addSeriesIfChecked('Générale', 'generale');
    addSeriesIfChecked('STI2D', 'sti2d');
    addSeriesIfChecked('Autre', 'autre');

    let chartDom = document.getElementById('chartContainer');
    let myChart = echarts.init(chartDom);

    let option = {
        title: {
            text: 'Candidatures par Département',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {type: 'shadow'}
        },
        legend: {
            bottom: '0',
            data: legend
        },
        grid: {
            left: '3%', right: '4%', bottom: '10%', containLabel: true
        },
        xAxis: {
            type: 'value',
            boundaryGap: [0, 0.01]
        },
        yAxis: {
            type: 'category',
            data: depts
        },
        series: series
    };

    myChart.setOption(option);
};



export { Charts };
