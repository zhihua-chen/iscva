import {useState, useRef, useEffect} from 'react';
import * as itsne from '../iterateTsne';


export function useITSNEComputation(conf) {

    const {pcs, defaults} = conf;
    // console.log(`rendering useITSNEComputation`);
    const [coords, setCoords] = useState(null);
    const [perplexity, setPerplexity] = useState(defaults.perplexity);
    const [npcs, setNpcs] = useState(defaults.npcs);
    const [knnProgress, setKnnProgress] = useState(0);
    const [embeddingStep, setEmbeddingStep] = useState(0);
    const [paused, setPaused] = useState(true);

    const _activerun = useRef(-1);
    const _activeframe = useRef(null);
    const _paused = useRef(true);

    // console.log(`in useITSNEComputation ${run}`);


    // paused                              running                  paused
    // paused            resume            running        pause          paused
    // paused           cancel and new run           running       cancel and new run        running


    //     paused -> subscribe to loop -> start new -> loop -> loop -> loop 
    //     paused -> resume -> loop -> loop -> loop
    //     paused -> cancel old -> start new -> loop -> loop -> loop
    //     loop -> loop -> loop -> pause -> paused
    //     loop -> loop -> loop -> cancel old -> start new -> loop -> loop



    // TSNE Computation has several states:
    // 1. paused
    // 2. running


    async function loop() {

        if(_paused.current===true) {
            // cancellation doesnt alway catch the frame in time

            return;
        }
        // console.log(`frame ${_activeframe.current} run ${_activerun.current}`);
        // needs to stop if paused or cancelled
        // console.log(`looping ${run} ${_frame} ${paused} ${_paused.current}`);
        // called continuously 
        // if ( run < _activerun.current ) {
        //     return;
        // }
        // if ( _paused.current ) {
        //     return;
        // }
        await itsne.iterate();
        setKnnProgress(itsne.knnProgress());
        setEmbeddingStep(itsne.embeddingStep);

        if ( itsne.embeddingStep > 0 ) {
            setCoords(await itsne.getEmbedding());
        } 
        _activeframe.current=window.requestAnimationFrame(loop);
    }


    function startNew(n, p ) {
        console.log(`startNew`);
        setPerplexity(p);
        setNpcs(n);
        _activerun.current++;
        if(_paused.current) {
            _paused.current = false;
            setPaused(false);
        }
        start(n,p);
        if(_activeframe.current !== null ) {
            // cancel old frame
            window.cancelAnimationFrame(_activeframe.current);
            _activeframe.current = null;
        }
        _activeframe.current = window.requestAnimationFrame(loop);
    }
    function transpose(a) {
        return a[0].map((_, c) => a.map(r => r[c]));
    }
    function start(n, p) {
        console.log(`start itsne`);
        // const dataNPCs = transpose(pcs.slice(0, n));
        const dataNPCs = pcs.slice(0, n);
        // transpose it
        itsne.start(dataNPCs, p);
        // itsne.start(dataNPCs, p);
    }
    function togglePause() {
        console.log('toggle pause');
        if(_paused.current) {
            _paused.current = false;
            // restart or startnew
            if(_activerun.current === -1) {
                start(npcs, perplexity);
                _activerun.current = 0;
            } 
            _activeframe.current=window.requestAnimationFrame(loop);
        } else {
            _paused.current = true;
            if(_activeframe.current !== null ) {
                // cancellation doesnt alway catch the frame in time
                window.cancelAnimationFrame(_activeframe.current);
            }
            _activeframe.current = null;
        }
        // if(_paused.current &  _activerun.current===0) {
        //     setToStart(true);
        // }
        setPaused(p => !p);
        // _paused = !_paused;
    }
    return [ 
        {
            // results
            coords, perplexity, npcs
        }, 
        {
            // controls
            togglePause,
            startNew,
            paused,
            defaults,
            totalPcs: pcs.length,
            knnProgress,
            embeddingStep
        }
     ] ;
}