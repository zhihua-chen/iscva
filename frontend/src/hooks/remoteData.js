import {useState} from 'react';

export function useRemoteData({dataAPI, covs}) {
    const [ remoteData, setRemoteData ] = useState(null);
    async function loadRemoteData(featureCat, feature) {
        console.log(`Load remote data at ${dataAPI}/${featureCat}/${feature}`);
        setRemoteData(null);
        const ret = await fetch(`${dataAPI}/${featureCat}/${feature}`);
        // console.log(ret);
        const res = await(ret.json());
        // console.log(res);
        // console.log(covs);
        // setRemoteData(covs["id"].map(id => id in res ? Math.log2(res[id]+1e-07) : Math.log2(1e-07)));
        setRemoteData(covs["id"].map(id => id in res ? res[id] : 0));
    }

    return [remoteData, loadRemoteData];
}