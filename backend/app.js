const cors = require('cors');
const express = require('express')
const app = express()
const port = 8001;
const host = '0.0.0.0';
const compression = require('compression');

app.use(cors());
app.use(compression())

// gene sets
var fs  = require("fs");
var genesets={}
function loadGeneSets() {
  var path = "./genesets/msigdb.v6.2.symbols.gmt";
  var lines = fs.readFileSync(path).toString().split('\n');
  lines.forEach( line => {
    var tokens = line.split('\t');
    genesets[tokens[0]] = {genes:tokens.slice(2),url:tokens[1]};
  });
}
loadGeneSets();
console.log(`${Object.keys(genesets).length} gene sets loaded.`);
var datasets = [
  {name: 'smalley30', filename: 'data/smalley30/filtered_feature_bc_matrix.h5' },
  {name: 'tirosh', filename: 'data/tirosh/test.h5' },
  {name: '2386', filename: 'data/2386/csf_2386_combined_with_past_csf.filtered_feature_bc_matrix.h5' },
  {name: 'T042718', filename: 'data/T042718/T042718_filtered_gene_bc_matrices_h5.h5' },
  {name: 'acral_2101', filename: 'data/acral_2101/filtered_feature_bc_matrix.h5'},
  {name: 'all_csf', filename: 'data/all_csf/filtered_feature_bc_matrix.h5' },
  {name: 'all_xl', filename: 'data/all_xl/filtered_feature_bc_matrix.h5' },
  {name: 'nras_2183', filename: 'data/nras_2183/nras_2183.filtered_feature_bc_matrix.h5' },
  {name: 'uveal_2135', filename: 'data/uveal_2135/uveal_2135_filtered_feature_bc_matrix.h5' },
  {name: 'uveal_2135_MM', filename: 'data/uveal_2135_MM/uveal_2135_MM_filtered_feature_bc_matrix.h5' },
  {name: 'EphA', filename: 'data/EphA/filtered_feature_bc_matrix.h5' },
  {name: 'combined_18_ex4_add9_NK_XL10_mb1864', filename: 'data/combined_18_ex4_add9_NK_XL10_mb1864/filtered_feature_bc_matrix.h5' },
  {name: '1747uvmiceSet1_2_3_4', filename: 'data/1747uvmice/set1_2_3_4_norm_none.filtered_feature_bc_matrix.h5'},
  {name: '1747uvmiceSet1', filename: 'data/1747uvmice/set1_norm_none.filtered_feature_bc_matrix.h5'},
  {name: '1747uvmiceSet2', filename: 'data/1747uvmice/set2_norm_none.filtered_feature_bc_matrix.h5'},
  {name: '1747uvmiceSet3', filename: 'data/1747uvmice/set3_norm_none.filtered_feature_bc_matrix.h5'},
  {name: '1747uvmiceSet4', filename: 'data/1747uvmice/set4_norm_none.filtered_feature_bc_matrix.h5'},
  {name: 'pbmc10k10xv3', filename: 'data/10xPublic/pbmc_10k_protein_v3_filtered_feature_bc_matrix.h5' },
  {name: 'malt10k10xv3', filename: 'data/10xPublic/malt_10k_protein_v3_filtered_feature_bc_matrix.h5' },
  {name: '1743', filename: 'data/1743/1743_batch2_norm_none.filtered_feature_bc_matrix.h5' },
  {name: '1743_08292019', filename: 'data/1743_08292019/1743_08292019.filtered_feature_bc_matrix.h5' },
  {name: 'mb1864', filename: 'data/mb1864/mb1864_batch1_2_norm_none.filtered_feature_bc_matrix.h5' }
  ]
var hdf5 = require('hdf5').hdf5;
var h5lt = require('hdf5').h5lt;
var h5tb = require('hdf5').h5tb;
var Access = require('hdf5/lib/globals').Access;
var H5Type = require('hdf5/lib/globals.js').H5Type;


function U8ArrayToU32(buffer) {
  return Uint32Array.from(buffer)
}

function u64ArrayToU32(buffer, len) {
  for(let i = 0 ; i < len; i++) {
    buffer.writeUInt32LE(buffer.readUInt32LE(i*8), i*4)
  }
  return new Uint32Array(buffer.buffer.slice(0, len*4));
}
function min(arr) {
  if ( ! arr || !arr.length || arr.length < 1 ) {
    return undefined;
  }
  var ret = Number.MAX_VALUE;
  arr.forEach( v => {
    if(v < ret) {
      ret = v;
    }
  })
  return ret;
}
function max(arr) {
  if ( ! arr || !arr.length || arr.length < 1 ) {
    return undefined;
  }
  var ret = Number.MIN_VALUE;
  arr.forEach( v => {
    if(v > ret) {
      ret = v;
    }
  })
  return ret;
}

function loadDataFromDisk(ds) {
  console.time("initial lookup from disk 1");
  var file = new hdf5.File(ds.filename, Access.ACC_RDONLY);
  var children = file.getMemberNames();
  var group;
  if(file.getMemberNames().includes('matrix') ) { 
    group = file.openGroup('matrix');
  } else if (file.getMemberNames().includes('GRCh38') ) {
    group = file.openGroup('GRCh38');
  }
  var barcodes = h5lt.readDataset(group.id, 'barcodes');
  var data = h5lt.readDataset(group.id, 'data');
  console.timeEnd("initial lookup from disk 1");
  console.time("initial lookup from disk indices");
  var indices = h5lt.readDataset(group.id, 'indices');
  console.timeEnd("initial lookup from disk indices");
  var barcodesLen = group.getDatasetDimensions('barcodes');
  var dataLen = group.getDatasetDimensions('data');
  var indicesLen = group.getDatasetDimensions('indices');
  
  var indptrLen = group.getDatasetDimensions('indptr');
 
  console.log(indices.length);
  var indicesByteLen = indices.length / indicesLen;
  var uint32size = 4;
  console.assert(barcodesLen < Math.pow(2, uint32size*8));
  console.assert(dataLen < Math.pow(2, uint32size*8));
  // force uint64 to uint32
  console.time("initial lookup from disk indices conversion");
  //indices = u64ArrayToU32(indices, indicesLen);
  console.timeEnd("initial lookup from disk indices conversion");
  console.time("initial lookup from disk 2");
  var indptr = h5lt.readDataset(group.id, 'indptr');

  if(indptrLen != indptr.length) {
    // 10xgenomics u64 array
    indptr = u64ArrayToU32(indptr, indptrLen);
  }
  console.timeEnd("initial lookup from disk 2");
  var shape = h5lt.readDataset(group.id, 'shape');


  var genes;
  var features;
  if(group.getMemberNames().includes('gene_names') ) { 
    var genes = h5lt.readDataset(group.id, 'gene_names' );
  } else {
    var features = file.openGroup('matrix/features')
    var genes = h5lt.readDataset(features.id, 'name' );
  }

  var geneMap = new Map(genes.map( (n,i) => [n.toUpperCase(), i]));

  // read visualization artifacts
  var artifacts = {};
  if(file.getMemberNames().includes('artifacts') ) {
    var artiGroup = file.openGroup('artifacts');
    var artiSubGroups = artiGroup.getMemberNames();
    var pcs, covs, discreteCovs, continuousCovs;
    artiSubGroups.forEach( ag => {
      var artiSub = file.openGroup('artifacts/'+ag);
      pcs = h5tb.readTable(artiSub.id, 'pcs' );
      covs = h5tb.readTable(artiSub.id, 'covs' );
      discreteCovs = h5lt.readDataset(artiSub.id, 'discreteCovs' );
      continuousCovs = h5lt.readDataset(artiSub.id, 'continuousCovs' );
      artifacts[ag]={pcs,covs,discreteCovs,continuousCovs};
    })
  }


  file.close();
  return {barcodes, data, indices, indicesLen, indptr, shape, geneMap, artifacts };
}

var cache = (function () {
  var _cache = {};
  var limit = 10;
  var _cacheKeysInOrder = [];

  function get(key) {
    if(key in _cache) {
      return _cache[key]
    } else {
	throw 'key not found';
    }
  }
  function put(key, val)  {
    _cache[key] = val
    if ( ! key in _cacheKeysInOrder )  {
      _cacheKeysInOrder.push(key);
    }
    if(Object.keys(cache).length > limit) {
      // cache is full
      // eject oldest
      console.log('ejecting old cache');
      delete _cache[_cacheKeysInOrder[0]];
      _cacheKeysInOrder = _cacheKeysInOrder.slice(1);
    }
  }
  return {get, put};
})();

function loadDataset(ds) {
  console.log('loaddataset');
  let ret;
  try {
    ret = cache.get(ds.name);
  } catch(e) {
    console.log(e);
    if (e == 'key not found') {
      console.log('key not found in cache');
      ret = loadDataFromDisk(ds);
      cache.put(ds.name, ret)
    }
  }
  return ret;
}

function lookupGenesetFromDisk(ds, genesetId) {

  let  {barcodes, data, indices, indicesLen, indptr, shape, geneMap}  = loadDataset(ds);


  var geneIds = new Set(genesets[genesetId]["genes"].map( g => geneMap.get(g.toUpperCase()) ).filter(a=>a!==undefined));
//  geneIds = geneIds.sort( (a, b) => a - b );
  console.log(`${geneIds.size} genes in geneset ${genesetId}`);
// var matchData = [];
  // d.indices.forEach( (ind, i) => {if(ind === geneIdx) {matchData[matchData.length]=d.data[i]}});

  const ret = {};
  console.time('going through the barcodes');
  if(indices.length==indicesLen) {
  barcodes.forEach( (barcode, i) => {
//    console.log(`number of genes: ${indptr[i+1]-indptr[i]+1}`);
    for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
      let idx;
      idx = indices[cursor];
      if(geneIds.has(idx)) {
        if(! (barcode in ret ) ) {
          ret[barcode] = data[cursor];
        } else {
          ret[barcode] += data[cursor];
        }
      }
    }

    if(barcode in ret) {
      // normalize to total reads in barcode
      let total = 0;
      for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
        total += data[cursor]
      }
      ret[barcode] = ret[barcode]/total*100
    } 
  })


  } else {

  barcodes.forEach( (barcode, i) => {
//    console.log(`number of genes: ${indptr[i+1]-indptr[i]+1}`);
    for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
      let idx;
      idx = indices.readUInt32LE(cursor*8);
      //idx = indicesLen==indices.length?indices[cursor]:indices.readUInt32LE(cursor*8);
      if(geneIds.has(idx)) {
        if(! (barcode in ret ) ) {
          ret[barcode] = data[cursor];
        } else {
          ret[barcode] += data[cursor];
        }
      }
    }

    if(barcode in ret) {
      // normalize to total reads in barcode
      let total = 0;
      for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
        total += data[cursor]
      }
      ret[barcode] = ret[barcode]/total*100
    } 
  })
}
  console.timeEnd('going through the barcodes');
  return ret;
}

function lookupFromDisk(ds, gene) {
  let  {barcodes, data, indices, indicesLen, indptr, shape, geneMap}  = loadDataset(ds);
  var geneIdx = geneMap.get(gene.toUpperCase());
  console.log(geneIdx);
// var matchData = [];
  // d.indices.forEach( (ind, i) => {if(ind === geneIdx) {matchData[matchData.length]=d.data[i]}});

  const ret = {};
  console.log(geneIdx);
  console.time('going through the barcodes');
  console.log(barcodes.length);

  if(indices.length==indicesLen) {
  barcodes.forEach( (barcode, i) => {

    let total = 0;
    for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
      total += data[cursor]
    }
//    console.log(`number of genes: ${indptr[i+1]-indptr[i]+1}`);

    for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
      let idx;
      // temporary solution to support UINT8 arrays
      idx =  indices[cursor] ;
//      console.log(idx);       
      //if(indices[cursor]==geneIdx) {
      if(idx==geneIdx) {
        ret[barcode] = Math.log1p(data[cursor]/total*10000);
        break;
      }
    }
  })


  } else {

  barcodes.forEach( (barcode, i) => {

    let total = 0;
    for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
      total += data[cursor]
    }
//    console.log(`number of genes: ${indptr[i+1]-indptr[i]+1}`);

    for(let cursor = indptr[i]; cursor < indptr[i+1]; cursor++) {
      let idx;
      // temporary solution to support UINT8 arrays
      idx = indices.readUInt32LE(cursor*8);
      //idx = indices.length==indicesLen ? indices[cursor] : indices.readUInt32LE(cursor*8);
//      console.log(idx);	
      //if(indices[cursor]==geneIdx) {
      if(idx==geneIdx) {
        ret[barcode] = Math.log1p(data[cursor]/total*10000);
        break;
      }
    }
  })

}

  console.timeEnd('going through the barcodes');
  return ret;
}
app.get('/genesets/', (req, res) => {
  res.json(Object.keys(genesets));
});
app.get('/project/:projectId/genesets/', (req, res) => {
  res.json(Object.keys(genesets));
});


const getGenesetFromDisk = (req,res) => {
  console.time('lookup gene set from disk');
  var d = datasets.filter(r=>r.name==req.params.projectId)[0];
  var genesetId = req.params.genesetId;
  if( !(genesetId in genesets)) {
    res.status(400).send(`${genesetId} not found`);
    return;
  }
  var ret = lookupGenesetFromDisk(d, genesetId);
  console.timeEnd('lookup gene set from disk');
  console.log(Object.keys(ret).length);
  res.json(ret);
}
const getGeneFromDisk = (req, res) => {
  // console.log(data);
  console.time('lookup from disk');
  var d = datasets.filter(r=>r.name==req.params.projectId)[0];
  var gene = req.params.geneId;
  var ret = lookupFromDisk(d, gene);
  console.log(Object.keys(ret).length);
  console.timeEnd('lookup from disk');
  res.json(ret);
}

app.get('/project/:projectId/geneset/:genesetId',  getGenesetFromDisk);
app.get('/project/:projectId/gene/:geneId',  getGeneFromDisk);

app.get('/from_disk/project/:projectId/geneset/:genesetId',  getGenesetFromDisk);
app.get('/from_disk/project/:projectId/gene/:geneId',  getGeneFromDisk);


// project  gene
app.get('/project/:projectId/:artifactId', (req, res) => {
  // console.log(data);
  console.time('load artifact');
  //var d = data.get(req.params.projectId);
  var d = datasets.filter(r=>r.name==req.params.projectId)[0];
  let  {artifacts}  = loadDataset(d);
  let  {pcs, covs, continuousCovs, discreteCovs}  = artifacts[req.params.artifactId];
  pcs=pcs.reduce( (m,o) => {m[o.name]=Array.prototype.slice.call(o);return m}, {});
  covs=covs.reduce( (m,o) => {m[o.name]=Array.prototype.slice.call(o);return m}, {});
  res.json({pcs,covs,discreteCovs,continuousCovs});
  console.timeEnd('load artifact');
});

app.get('/', (req, res) => res.send('Hello World!'))
app.listen(   port, host, () => console.log(`Example app listening on port ${port}!`))
