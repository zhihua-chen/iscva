import {useMemo, useState} from 'react';
import settings from '../settings';
export function usePlotting({xys, colorBy, selected, covs, discreteCovs, continuousCovs, contrast, scale, remoteData}) {
    function hexToRgbA(hex){
        let c;
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
          c= hex.substring(1).split('');
          if(c.length === 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
          }
          c= '0x'+c.join('');
          return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
        }
        throw new Error('Bad Hex');
      }
    function darker(color) {
        // console.log(color);
        if ( color === undefined) {
            return null;
        }
        if ( !isNaN(color)) {
          // console.log(color);
          return color;
        }
        if (color.startsWith('#')) {
          // hex color
          color = hexToRgbA(color);
        }
        if (color.startsWith('rgba')) {
          // color looks like this  'rgba(0,0,0,0)'
          const col = color.slice(5, -1).split(',');
          const newcol = col.slice(0, -1).map(c => parseInt(c, 10))
            .map(c => c - 40 < 0 ? 0 : c - 40);
          newcol.push(col[col.length - 1]);
          return 'rgba(' + newcol.join() + ')';
        } else {
            // console.log(color);
            return null;
        }
    }
    function transparent(color, alpha) {
        if ( color===undefined) {
            return null;
        }
        if ( !isNaN(color)) {
            // console.log(color);
            return color;
          }
          if (color.startsWith('#')) {
            // hex color
            color = hexToRgbA(color);
          }
          if (color.startsWith('rgba')) {
            // color looks like this  'rgba(0,0,0,0)'
            const col = color.slice(5, -1).split(',');
            col[col.length-1] = alpha;
            return 'rgba(' + col.join() + ')';
          } else {
            //   console.log(color);
              return null;
          }  
    }
    const frames = [];
    const config = {displayModeBar: true, 
        displaylogo: false,
        modeBarButtonsToRemove: ['sendDataToCloud',
        'hoverCompareCartesian', 'zoom2d',
        'pan2d', 'select2d', 'lasso2d', 'zoomIn2d',
        'zoomOut2d', 'autoScale2d', 'resetScale2d', 
        'hoverClosestCartesian', 'toggleSpikelines'
    ]};
    const useResizeHandler = true;
    // const style={height:'100%',width:'90%'};
    const style={};
    const updateFigure = f => setLayout(f.layout);
    const {maxRowsInTooltip, backgroundOpacity, backgroundSize, highlightOpacity, 
        highlightSize, highlightBorderWidth, backgroundBorderWidth} = settings.plottingDefaults;

    // set highlight and background according to contrast
    // contrast 0-1
    // 0 no contrast
    // 1 maximum contrast
    function interpolate(a, b, r) {
        return a + (b-a)*r;
    }
    const brushedHighlightSize = interpolate(backgroundSize,highlightSize, contrast);
    

    const colors = useMemo( () => {
        // console.log(colorBy);
        // console.log(covs);
        // console.log(remoteData);
        if ( colorBy === null) {
            return null;
        }
        if ( colorBy !== '' && colorBy in covs && discreteCovs.includes(colorBy)) {
            return covs[colorBy].map(cov => scale(cov));
        } 
        if ( colorBy !== '' && colorBy in covs && continuousCovs.includes(colorBy)) {
            return covs[colorBy];
        } 
        if ( colorBy !== '' && ! (colorBy in covs) && remoteData !== null ) {
            // console.log("remote colorby");
            // console.log(remoteData);
                    //     const res = await((await fetch(`${dataAPI}/gene/${colorBy}`)).json());
            return remoteData;
        }
        return null;
    }, [colorBy, covs,remoteData]);
    // const linecolor = colors;
    const linecolor = useMemo( () => colors === null ? null : 
        colors.map( c => darker(c)), [colorBy, covs,remoteData]);
    const bgcolors = useMemo( () => colors === null ? null : 
        colors.map( c => transparent(c, 0.8)), [colorBy, covs, remoteData]);


    const annos = useMemo( () => {
        if ( covs === null ) return null;
        // const covnames = Object.keys(covs);
        const covnames = Object.keys(covs).slice(0, maxRowsInTooltip);
        console.log('computing annos');
        console.log(`colorBy: ${colorBy}`);
        console.log(remoteData);
        if ( covnames.length === 0 ) return null;
        return covs[covnames[0]].map( (x, idx) => {
            if ( selected != null && !selected[idx]) {
                return null;
            }
            let ret = '';
            if (colorBy !== '' && colorBy in covs) {
                ret += `${colorBy}: ${covs[colorBy][idx]}<br><br>`;
            } else {
                if (colorBy !== '' && colorBy !== null && ! (colorBy in covs) && remoteData !== null ) {
                    ret += `${colorBy}: ${remoteData[idx]}<br><br>`;
                }
            }
            ret += covnames.map( cn => `${cn}: ${covs[cn][idx]}`).join('<br>')
            return ret;
        })
    }, [covs, colorBy, selected, remoteData]);

    const opacity = useMemo( () => selected === null ? 0.6 : selected.map( s => s ? highlightOpacity : backgroundOpacity),
    [selected]);
    const size =  useMemo( () => selected === null ? 6 : selected.map( s => s ? brushedHighlightSize : backgroundSize), [selected]);
    const lineopacity =  useMemo( () => selected === null ? null : selected.map( s => s ? highlightOpacity : backgroundOpacity), [selected]);
    const linewidth =  useMemo( () => selected === null ? null : selected.map( s => s ? highlightBorderWidth : backgroundBorderWidth), [selected]);


    // const [ xys, setXys ] = useState([null,null]);
    const [ layout, setLayout ] = useState({
        hovermode:'closest',
        margin: {
            l: 0,
            r: 0,
            t: 0,
            b: 0
        },
        xaxis: {
            showline: false,
            showgrid: false,
            zeroline: false,
            showticks: false,
            showticklabels: false
        },
        yaxis: {
            showline: false,
            showgrid: false,
            zeroline: false,
            showticks: false,
            showticklabels: false
        },
        autosize: true
    });
    const data = [{
        x: xys[0],
        y: xys[1],
        type: 'scattergl',
        mode: 'markers',
        marker: { color: colors, size: size, opacity: opacity, line: {
            width: linewidth,
            opacity: lineopacity,
            color: linecolor
        }},
        // marker: {color: this.state.colorAttr, size: 8, opacity:0.8},
        text: annos,
        hoverlabel: {bgcolor: bgcolors},
        // hoverlabel: {bgcolor: 'rgba(0,0,0,0)'},
        hoverinfo: 'text'
    }];    

    const plot = {data, frames, config, layout, useResizeHandler, style, onInitialized: updateFigure,
        onUpdate: updateFigure};
    // function changeCoords(coords) {
    //     setXys(coords === null ? [null, null] : [0,1].map(i => coords.map( c => c[i])));
    // }
    return plot;
}