import {useState, useMemo} from 'react';
export function useBrushing(conf) {
    const { covs, discreteCovs, continuousCovs } = conf;
    const [ colorBy, setColorBy ]  = useState('');
    const [ filter, setFilter ] = useState([]);
    const [ contrast, setContrast ] = useState(1);

    // filters contain active filters to be applied

    // function changeColorBy(c) {
    //     console.log('computing colors');
    //     setColorBy(c);
    //     let newColors = null;
    //     if ( c !== '' && c in covs && discreteCovs.includes(c)) {
    //         newColors = covs[c].map(cov => scale(cov));
    //     }
    //     setColors(newColors);
    // }
    // choose cells to highlight
    function selectSubpop(v) {
        setFilter(v);
    }

    const selected = useMemo( () => {
        if ( filter !== null && filter.length > 0  && covs !== null) {   
            console.log(filter);  
            return covs[filter[0].value.group].map( (_c, i) =>
                filter.some( ({value: {group, term}}) => covs[group][i] === term )
            );
        }
        return null;
    }, [filter]);

    return  {selected, setColorBy, colorBy, filter, setFilter, selectSubpop, contrast, setContrast};
}