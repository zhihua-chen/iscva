/* Viewer, Control */
/* Brushing hooks */
/* Plotting */
/* Search And Highlight is a control component for scRANseq visualization. */

/* Presentation */
/*
    Viewer
        Plot
            given data
            plot it
            change color according to color by
        Search And Highlight
            menu items
            search words
            ondemand highlights
        tSNE Computation Control
        
        fdfd
*/

import {useState, useEffect, useMemo} from 'react';
import React from 'react';
import {PredictiveInput, CreatablePredictiveInput} from './PredictiveInput';
import {FormControl, Icon, IconButton} from '@material-ui/core';
function usePlotModes() {
    const plotModes = ["t-SNE", "scatter"];
    const [ plotMode, setPlotMode] = useState(0);
    function togglePlotMode() {
        setPlotMode(1 - plotMode);
    }
    return [plotModes[plotMode], togglePlotMode];
}

export default function SearchAndHighlight(props) {
    const { classes, covs, discreteCovs, continuousCovs, brushing, genesets, loadRemoteData} = props;
    const [ search, setSearch] = useState([]);
    const [ colorBy, setColorBy] = useState(null);
    const [ colorByGeneset, setColorByGeneset] = useState(null);
    // all unique, discrete covs becomes searchable
    const searchTerms = useMemo( () => discreteCovs.map(c => ({label: c, options:
        [...new Set(covs[c])].map(cv => ({value: {group: c, term: cv}, label: cv}))
    })), [covs, discreteCovs]);


    const colorTerms = useMemo( () => {
        let cterms = discreteCovs.map(c => ({value: c, label: c}));
        continuousCovs.forEach( c => cterms.push({value: c, label: c}) );
        return cterms;
    }, [covs, discreteCovs, continuousCovs]);

    const genesetTerms = useMemo( () => {
        return genesets.map(c => ({value: c, label: c}));
    },[genesets]);

    const [ plotMode, togglePlotMode ] = usePlotModes();



    function handleSearchChange(e) {
        console.log(e);
        setSearch(e);
        brushing.setFilter(e)
    } 

    async function changeColorBy(e) {
        
        setColorBy(e);
        const colorBy = e===null?null:e.value;
        console.log(`colorby change to ${colorBy}`);

        if(! (colorBy === null || colorBy === '' || colorBy in covs )) {
            loadRemoteData("gene", colorBy);
        }
        brushing.setColorBy(colorBy);
    }

    async function changeColorByGeneSet(e) {
        
        setColorByGeneset(e);
        const colorByGeneset = e===null?null:e.value;
        console.log(`colorbygeneset change to ${colorByGeneset}`);

        if(! (colorByGeneset === null || colorByGeneset === '' )) {
            loadRemoteData("geneset", colorByGeneset);
        }
        brushing.setColorBy(colorByGeneset);
    }


    return (
            <div>
                {/* <IconButton className={classes.searchControl} onClick={()=>togglePlotMode()} color='primary' >
                    <Icon>{plotMode==="t-SNE"? 'details' : 'scatter_plot'}</Icon>
                </IconButton>  */}

                <FormControl className={classes.searchControl} variant="outlined">
                    <PredictiveInput
                        classes={classes}
                        options={searchTerms}
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Select "
                        isMulti
                    />
                </FormControl>
                <FormControl className={classes.paintControl} variant="outlined">
                    <CreatablePredictiveInput
                        classes={classes}
                        options={colorTerms}
                        formatCreateLabel={(v)=> `Look up gene: ${v}`}
                        value={colorBy}
                        onChange={changeColorBy}
                        placeholder="Paint "
                        isClearable
                    />
                </FormControl>
                <FormControl className={classes.paintGenesetControl} variant="outlined">
                    <CreatablePredictiveInput
                        classes={classes}
                        options={genesetTerms}
                        formatCreateLabel={(v)=> `Look up geneset: ${v}`}
                        value={colorByGeneset}
                        onChange={changeColorByGeneSet}
                        placeholder="Paint mSigDB Geneset "
                        isClearable
                    />
                </FormControl>

            </div>
    )
}