import * as tf from '@tensorflow/tfjs-core';
import * as tsne from '@tensorflow/tfjs-tsne';


// tsne computation needs numeric data in the form of
//        array of arrays
// iterative computation workflow
//         start() with data
//         iterate()
//         getEmbedding()


    // const eclaData = fetch("public/combined.ts.2.pcs.200.v2.rm.discordant.maf.0.05.indep_50_10_0.8.json");
    // eclaData.then(e => console.log(e));
    // console.log(`${process.env.PUBLIC_URL}`);
    // import * as eclaData from './combined.ts.2.pcs.200.v2.rm.discordant.maf.0.05.indep_50_10_0.8';
    // import eclaPcs200 from './pcs.200';

    // const n = eclaPcs200.length / 200;
    // console.log(eclaPcs200);
    // console.log(`npcs=${npcs} n=${n}`);
    // const eclaPcs200Tensor = tf.tensor2d(eclaPcs200).transpose();
    // const eclaPcs200Tensor = tf.tensor2d(eclaPcs200, [npcs, n]).transpose();
    // console.log(eclaPcs200Tensor);
let embedder;
let data;
let knnIterations;
let knnBatch = 1;
let knnStep = 0;
// const embeddingIterations = 30000;
export let embeddingStep = 0;
const embeddingBatch = 1;

export  async function start(d, perplexity) {
        // const numDimensions = 40;
        // const numPoints = 1000;
    
        // data = generateData(numDimensions, numPoints);
        data = tf.tensor2d(d).transpose();;
        console.log(data);
        embeddingStep = 0;
        knnStep = 0;
        // knnBatch = Math.floor(knnIterations * 45/ perplexity / perplexity) + 1;
        embedder = tsne.tsne(data, {
            perplexity: perplexity,
            verbose: true,
            knnMode: 'auto',
        });   
        knnIterations = embedder.knnIterations();

        console.log(embedder);
        // const coordinates = await computeEmbedding(data, numPoints);
        // console.log(coordinates);
    }
// function generateData(numDimensions, numPoints) {

//         const data = tf.tidy(() => {
//         return tf.linspace(0, 1, numPoints * numDimensions)
//             .reshape([numPoints, numDimensions])
//             .add(tf.randomUniform([numPoints, numDimensions]));
//         });
//         return data;
//     }


async function stepKnn() {
    // console.log('knnStep '+knnStep);
    if (knnStep === 0 ) {
        console.time("knn");
    }

    knnStep += knnBatch;
    let tostep = knnBatch;
    if (knnStep > knnIterations) {
        tostep -= (knnStep - knnIterations)
        knnStep = knnIterations;
    }
    await embedder.iterateKnn(tostep);
    if (knnStep === knnIterations) {
        console.timeEnd("knn");
    }
}




async function stepEmbedding() {
    // console.log('embeddingStep '+embeddingStep);
    embeddingStep+=embeddingBatch;
    await embedder.iterate(embeddingBatch);
    // console.log('embeddingStep '+embeddingStep);
}
export async function iterate() {
    // console.log('iterating');
    // console.log(`${knnStep} ${knnIterations} ${knnBatch}`);
    if (knnStep < knnIterations) {
        // console.log('stepknn');
        await stepKnn();
    } else  {
        await stepEmbedding();
    } 
}


export async function completeKnn() {
    while(knnStep < knnIterations) {
        await embedder.iterateKnn(knnBatch);
        knnStep += knnBatch;
        // await embedder.iterateKnn(100000);
    }
}

export async function getEmbedding() {
    return await embedder.coordsArray();
}

// export function embeddingProgress() {
//     return Math.floor(embeddingStep / embeddingIterations * 100);
// }

// export function cov(attr) {
//     return eclaCombinedPcs200[attr];
// }

// export function isDone() {
//     return knnStep >= knnIterations && embeddingStep >= embeddingIterations;
// }

export function knnProgress() {
    return Math.floor(knnStep / knnIterations * 100);
}

