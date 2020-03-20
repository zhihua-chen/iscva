import React, {useState, useEffect, useRef, useMemo } from 'react';
import { Grid, Select, Paper, NoSsr, Typography, Chip, Card, Tabs, Tab, Fab, Divider, FormControlLabel, FormLabel, RadioGroup, Radio, TextField, IconButton, Icon, LinearProgress, MenuItem, OutlinedInput, InputLabel, FormControl, withStyles } from '@material-ui/core';
// import Slider from '@material-ui/lab/Slider';
import settings from '../settings';
import Plot from 'react-plotly.js';
import {d3} from 'plotly.js';
import SearchAndHighlight from './SearchAndHighlight';
import {TSNEComputeControl, TSNEComputeProgress} from './TSNECompute';
import {useBrushing} from '../hooks/brushing';
import {useITSNEComputation} from '../hooks/itsneComputation';
import {usePlotting} from '../hooks/plotting';
import {useRemoteData} from '../hooks/remoteData';


// import { ScPlot } from './ScPlot';
// let scale;


// const scale = d3.scale.category20b();
const styles = theme => ({
    root: {
      flexGrow: 1,
      height: '100%',
      width: '100%'
    },
    input: {
        display: 'flex',
        padding: 0,
    },
    title: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        marginTop: 0,
        marginBottom: 0,
        // padding: theme.spacing.unit,
        'word-wrap': 'break-word'
    },
    card: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
    },
    paper: {
        // 'min-height': '800px',
        height: '100%',
        width: '100%',
    },
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        // display: 'inline-block'
        // minWidth: 100
    },
    floatingControls: {
        position: 'absolute',
        // marginTop: 0,
        // marginBottom: theme.spacing.unit,
        // width: '100%',
        'z-index': 10
    },

    controlArea: {
        // marginTop: 0,
        // marginBottom: theme.spacing.unit,
        // width: '100%',
    },
    center: {
        position: 'absolute',
        // width: '100%',
        top: '50%',
        left: '30%',
        right: '30%',
        'background-color': 'white',
        'margin-left': 'auto',
        'margin-right': 'auto',
        // left: '50%',
        // transform: 'translate(-50%, -50%)',
        // left: '50%',
        padding: '20px',
        'z-index': 100
    },
    plot: {
        height: '90%',
        width: '98%'
    },
    // slider: {
    //     height: '90%',
    //     width: '10%'
    // },
    footer: {
        position: 'absolute',
        width: '100%',
        // marginTop: theme.spacing.unit,
        // marginBottom: theme.spacing.unit,
        // right: '50%',
        bottom: '2px',
        'font-size': '0.8em',
        'z-index': 10
    },
    searchControl: {
        margin: theme.spacing.unit,
        // "margin-left": 0,
        // left: 40,
        // padding: theme.spacing.unit * 2,
        minWidth: 100,
        maxWidth: 300
    },
    paintControl: {
        margin: theme.spacing.unit,
        // left: 40,
        // padding: theme.spacing.unit * 2,
        minWidth: 100,
        maxWidth: 200
        // 'z-index': 100
    },
    paintGenesetControl: {
        margin: theme.spacing.unit,
        // left: 40,
        // padding: theme.spacing.unit * 2,
        minWidth: 100,
        maxWidth: 300
        // 'z-index': 100
    }

});









function useBrushedPlotting(conf) {
    const { covs, discreteCovs, continuousCovs, xys, scale, remoteData } = conf;
    const brushing  = useBrushing(conf);
    // given current state of brushing, generate plot
    const plot = usePlotting({xys, colorBy: brushing.colorBy, selected: brushing.selected, 
        covs, discreteCovs, continuousCovs, contrast: brushing.contrast, scale, remoteData});
    return [plot, brushing];
}

function useBrushedPlottingWithRemoteCov(conf) {
    const { covs, discreteCovs, continuousCovs, xys, scale, remoteData } = conf;
    const brushing  = useBrushing(conf);
    // given current state of brushing, generate plot
    const plot = usePlotting({xys, colorBy: brushing.colorBy, selected: brushing.selected, 
        covs, discreteCovs, continuousCovs, contrast: brushing.contrast, scale, remoteData});
    return [plot, brushing];
}





function useSplits(n) {
    const [ splits, setSplits ] = useState(1);

    function toggleSplits() {
        setSplits(s => 4-s);
    }
    return [ splits, toggleSplits];
}
function ScDataViewer(props) {
    const {classes, pcs, name, covs, discreteCovs, continuousCovs, genesets, dataAPI} = props;
    const tsneComputationDefaults = settings.tsneComputationDefaults;
    const [ {coords}, tsneControls] = useITSNEComputation({pcs, defaults: tsneComputationDefaults });
    // const [ activeControl, setActiveControl ] = useState(0)
    // const controls = ['tsne control', 'Search & Highlight'];

    // show what? pre-computed or not?
    const [ showWhatEmbedding, setShowWhatEmbedding ] = useState("umap");
    function toggleShowWhatEmbedding() {
        const options = ['umap', 'tsne', 'tsneRealtime'];
        const idx = options.findIndex(o => o===showWhatEmbedding);
        setShowWhatEmbedding(options[(idx+1)%options.length]);
    }
    const xys = useMemo( () => {switch(showWhatEmbedding) {
        case "umap":
            return [covs["umap_1"], covs["umap_2"]];
        case "tsne":
            return [covs["tSNE_1"], covs["tSNE_2"]];
        default:
            return coords === null ? [null, null] : [0,1].map(i => coords.map( c => c[i]));
      }}, [coords, showWhatEmbedding]);


    // const vs = Object.values(covs);
    // const ks = Object.keys(covs);
    
    // const covObjs = useMemo ( () => covs === null ? null : 
    //     vs[0].map( (v, i) => ks.reduce( (pv, cv, ci) => {pv[cv]=vs[ci][i]; return pv}, {})), [covs] );
    // const objs = useMemo( () => coords === null ? null :
    //     coords.map( (c,i) => {covObjs[i]['x']=c[0];covObjs[i]['y']=c[1];return covObjs[i];}), [coords]);

    // const [ plot, brushing ] = useBrushedPlotting({covs, discreteCovs, continuousCovs, xys});
    // const [ plot2, brushing2 ] = useBrushedPlotting({covs, discreteCovs, continuousCovs, xys});
    // const [ plot3, brushing3 ] = useBrushedPlotting({covs, discreteCovs, continuousCovs, xys});

    // fix color scales for all discrete covs
    const scale = useMemo( () => {
        console.log("fixing color scales for all discrete covs");
        let scale = d3.scale.category20();
        discreteCovs.forEach(c => {
            (new Set(covs[c])).forEach(cv => scale(cv))
        });
        return scale;            
    }, [covs, discreteCovs]);
    // useEffect( () => {
    //     console.log("fixing color scales for all discrete covs");
    //     scale = d3.scale.category10();
    // },  [covs, discreteCovs]);

    const [ splits, toggleSplits ] = useSplits(1);
    const maxSplits = 4;
    const plots = Array(maxSplits);
    const brushings = Array(maxSplits);
    const loadRemoteData = Array(maxSplits);
    const remoteData = Array(maxSplits);
    // const plotModes = Array(maxSplits);
    // const togglePlotModes = Array(maxSplits);
    for(let i = 0; i<maxSplits; i++) {
        // [ plotModes[i], togglePlotModes[i] ] = usePlotModes();

        [remoteData[i], loadRemoteData[i]] = useRemoteData({dataAPI, covs});
        [plots[i], brushings[i]] = useBrushedPlotting({covs, 
            discreteCovs, continuousCovs, xys, scale, remoteData:remoteData[i]})
    }

    // when do i fetch data? on colorby change

    // const [ mode, setMode ] = useState('split');
    const mode  = 'split';

    const [ showControls, setShowControls ] = useState(false);


    return (
            (mode === 'split' ? 
        <React.Fragment>
            {showWhatEmbedding!=="tsneRealtime"? null : 
            <TSNEComputeProgress classes={classes} knnProgress={tsneControls.knnProgress} />}

            <Grid container className={classes.footer} alignItems="center">
                {showControls&&showWhatEmbedding==="tsneRealtime"?
                    <Grid item xs={4}>
                        <TSNEComputeControl classes={classes} controls={tsneControls} />
                    </Grid> : null }
                <Grid item xs={showControls&&showWhatEmbedding==="tsneRealtime"?1:5}>
                    <span><i>{showWhatEmbedding!=="tsneRealtime"?
                        `Precomputed ${showWhatEmbedding}`:
                        `Embedding iteration: ${tsneControls.embeddingStep}` }
                    </i></span>
                </Grid>

                <Grid item xs={2}>
                    <IconButton onClick={()=>toggleSplits()} color='primary' >
                        <Icon>view_column</Icon>
                    </IconButton> 
                    <IconButton onClick={()=>setShowControls(s => !s)} color='primary' >
                        <Icon>{showControls?'fullscreen':'fullscreen_exit'}</Icon>
                    </IconButton> 
                    <IconButton onClick={
                        ()=>{toggleShowWhatEmbedding();
                            if((showWhatEmbedding!=="tsneRealtime")&&!tsneControls.paused)
                            {tsneControls.togglePause()}} } color='primary' >
                        <Icon>{ function(){
                            switch(showWhatEmbedding) {
                                case 'umap':
                                    return 'star';
                                case 'tsne':
                                    return 'stars';
                                case 'tsneRealtime':
                                    return 'star_border';
                                default:
                                    return '';
                            }
                        }() }</Icon>
                    </IconButton> 
                    {showWhatEmbedding!=="tsneRealtime"?'':
                        <IconButton onClick={()=>{
                            // if(tsneControls.paused){setShowPreComputedTSNE(false)} 
                            tsneControls.togglePause()}} color='primary' >
                            <Icon>{tsneControls.paused?'play_arrow':'pause'}</Icon>
                        </IconButton> 
                    }



                </Grid>
                <Grid item xs={4}>
                    <span><i>{name}</i></span>
                </Grid>
            </Grid>
            <Grid container className={classes.root} spacing={0}>
                {plots.slice(0,splits).map( (plot, idx) => 
                    <Grid key={idx} item xs={12/splits}>
                        <Paper className={classes.paper}>

                            { showControls?
                                <div className={classes.floatingControls} >
                                    <SearchAndHighlight classes={classes} {...props} brushing={brushings[idx]} genesets={genesets}
                                     loadRemoteData={loadRemoteData[idx]}  />
                                </div> : null                        
                            }     
                            <Grid container className={classes.root} spacing={0}>
                                <Plot className={classes.plot} {...plot}> </Plot>
                            </Grid>                       

                                {/* <ScPlot id={`plot{idx}`} 
                                    data={ objs } colorBy={brushings[idx].colorBy} /> */}

                        </Paper>
                    </Grid>
                )}
                    {/* <Grid item xs={4}>
                        <Paper className={classes.paper}>
                            <div className={classes.floatingControls} >
                                <SearchAndHighlight classes={classes} {...props} brushing={brushings[0]} />
                            </div>
                            <Plot {...plots[0]}> </Plot>
                        </Paper>
                    </Grid>
                    <Grid item xs={4}>
                        <Paper className={classes.paper}>
                            <div className={classes.floatingControls} >
                                <SearchAndHighlight classes={classes} {...props} brushing={brushings[1]} />
                            </div>
                            <Plot {...plots[1]}> </Plot>
                        </Paper>
                    </Grid>
                    <Grid item xs={4}>
                        <Paper className={classes.paper}>
                            <div className={classes.floatingControls} >
                                <SearchAndHighlight classes={classes} {...props} brushing={brushings[2]} />
                            </div>
                            <Plot {...plots[2]}> </Plot>
                        </Paper>
                    </Grid> */}
            </Grid> 

        </React.Fragment> :
        <Grid container className={classes.root} spacing={0}>
            <Grid item xs={4}>
                <Paper className={classes.paper}>
                    <h4 className={classes.title} > {name}</h4>
                    {/* <Tabs value={activeControl} onChange={ (e, v) =>setActiveControl(v)}>
                        {controls.map( c => <Tab label={c}/>)}
                    </Tabs>
                    {activeControl === 1 &&
                        <SearchAndHighlight className={classes.control} {...props} brushing={brushing} >
                        </SearchAndHighlight>}

                        <Divider />

                    {activeControl === 0 && 
                        <TSNEComputeControl classes={classes} controls={tsneControls} >
                        </TSNEComputeControl>
                    } */}
                        <SearchAndHighlight classes={classes} {...props} brushing={brushings[0]} 
                        loadRemoteData={loadRemoteData[0]} genesets={genesets}/>
                        <Divider />
                        <TSNEComputeControl classes={classes} controls={tsneControls} />
                </Paper>
            </Grid>
            <Grid item xs={8}>
                <Paper className={classes.paper}>
                    <TSNEComputeProgress classes={classes} knnProgress={tsneControls.knnProgress} />
                    {/* <Plot className={classes.plot} {...plots[0]}> </Plot> */}
                </Paper>
            </Grid>
        </Grid>)


    
    )
}

export default withStyles(styles)(ScDataViewer);