import React, {useState} from 'react';
import {TextField, LinearProgress} from '@material-ui/core'


const minMaxTrim = (min, max) => v => {
    return v < min ? min : v > max ? max : v;
}


export function TSNEComputeControl(props) {
    const {classes, controls: {startNew, embeddingStep, togglePause, paused, defaults, totalPcs}} = props;
    const [perplexity, setPerplexity] = useState(defaults.perplexity);
    const [npcs, setNpcs] = useState(defaults.npcs);


    const handleNpcsChange = e => {
        setNpcs(e.target.value);
    }
    const handlePerplexityChange = e => {
        setPerplexity(e.target.value);
    }

    const handleTSNEComputeKeyDown = e => {
        if (e.keyCode === 13) {
            // check values and start computation
            const checked_perplexity = minMaxTrim(defaults.minPerplexity, defaults.maxPerplexity)(perplexity);
            const checked_npcs = minMaxTrim(2, totalPcs)(npcs);
            setPerplexity(checked_perplexity);
            setNpcs(checked_npcs);
            console.log(`${checked_perplexity} ${checked_npcs}`);
            startNew(checked_npcs, checked_perplexity);
        }
    };

    return (
        <div>

         {/* <FormControl className={classes.control} variant="outlined"> */}
            {/* <Grid container className={classes.controlArea}> */}
            {/* <Grid item xs={12}> */}
                <TextField
                    id="outlined-perplexity"
                    label="Perplexity"
                    className={classes.textField}
                    type="number"
                    value={perplexity}
                    onChange={handlePerplexityChange}
                    onKeyDown={handleTSNEComputeKeyDown}
                    margin="normal"
                    variant="outlined"
                />
            {/* </Grid>
            <Grid item xs={6}> */}
                <TextField
                    id="outlined-npcs"
                    label="Number of PCs"
                    className={classes.textField}
                    value={npcs}
                    type="number"
                    onChange={handleNpcsChange}
                    onKeyDown={handleTSNEComputeKeyDown}
                    margin="normal"
                    variant="outlined"
                />
            {/* </Grid> */}

            {/* </Grid> */}
{/* 

            <br/>

            <IconButton onClick={()=>{togglePause()}} color='primary' >
                <Icon>{paused?'play_arrow':'pause'}</Icon>
            </IconButton> 

            <br/>

            <span><i>Embedding iteration: {embeddingStep}</i></span> */}

         {/* </FormControl> */}

        </div>

    );
}


export function TSNEComputeProgress(props) {
    const {knnProgress, classes} = props;
    if ( knnProgress === 100 ) {
        return null;
    }
    return (
        <React.Fragment>
            <LinearProgress variant="determinate" value={knnProgress} color="primary"/>
            <div className={classes.center}>
                <span ><i>Computing KNN ... {knnProgress}% </i></span>
                <br/>
                <br/>
                <span><i>This can take minutes for larger perplexity values (>20) </i></span> 
            </div>
        </React.Fragment>  
    )
}
