import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import 'typeface-roboto';


// console.log(tf);
// console.log(tsne);
ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();

// Create some data
// const data = tf.randomUniform([2000,10]);

// Initialize the tsne optimizer
// const data = generateData(10, 2000)
// const tsneOpt = tsne.tsne(data, {
//           perplexity: 18,
//           verbose: true,
//           knnMode: 'auto',
//         });
//  computeEmbedding(data, 2000);



// Compute a T-SNE embedding, returns a promise.
// Runs for 1000 iterations by default.
// tsneOpt.compute(1000).then(() => {
//   // tsne.coordinate returns a *tensor* with x, y coordinates of
//   // the embedded data.
// //   const coordinates = tsneOpt.coordinates();
// //   coordinates.print();
// }) ;
