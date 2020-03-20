import React, { Component } from 'react';
import logo from './logo.svg';

import { Toolbar, Typography, Icon, IconButton, Fab, withStyles } from '@material-ui/core';
// import InteractiveTSNE from './InteractiveTSNE';
import ScDataViewer from './components/ScDataViewer'
import ChooseData from './ChooseData';
import Draggable from 'react-draggable';
import {versions} from './versions';

// const title = 'scRNA-Seq Interactive Visual Analytics';
const title = 'iscva';
const settingsURL = 'app-settings.json';


// create array of PCs

// const covs = ["sample"   ,           "dermis"     ,         "mice"             ,   "cluster" ,"celltypeImmgen"   ,   "celltypeMouseRnaseq" ,"tSNE_1"             , "tSNE_2"]

// const covs = Object.keys(eclaCombinedPcs200).filter(k => !k.startsWith('PC'));
// const covs = ["sp", "p", "gender", "cluster.infomap", "cluster.walktrap"];
// All the following keys are optional.
// We try our best to provide a great default value.

const styles = theme => ({
  fab: {
    margin: theme.spacing.unit,
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    "z-index": 100
  },
  fab2: {
    margin: theme.spacing.unit,
    position: 'absolute',
    right: '100px',
    bottom: '10px',
    "z-index": 200
  }

});


class MainPage extends Component {
  
  state = {
    data: null,
    settings: null,
    dragged: false,
    openChooseData: true,
    pristineChooseData: true
  }
  async componentDidMount() {
    const settings = await (await fetch(settingsURL)).json();
    console.log(settings);
    this.setState({settings});
  }

  async closeChooseData(data, name, dataAPI) {
    if (data !== null) {
      console.log('setting data');
      const genesets = await (await fetch(`${dataAPI}/genesets`)).json();

      this.setState({
        data,
        name,
        pristineChooseData: false,
        openChooseData: false,
        dataAPI,
        genesets
      });
    } else {
      this.setState({openChooseData:false});
    }
  }
  openChooseData() {
    this.setState({
      openChooseData: true
    })
  }
  render() {
    const {classes} = this.props;

    return (
        <div className="App">
        {/* <AppBar position="static" color="default">
          <Toolbar>
          <Typography variant="h6" color="inherit">
              Interactive t-SNE
            </Typography>
            <IconButton onClick={this.openChooseData.bind(this)} color='primary' >
              <Icon>keyboard_arrow_left</Icon>
            </IconButton> 
          </Toolbar>
        </AppBar> */}
        {this.state.openChooseData ? '' : 
        <React.Fragment>
          <Draggable  onDrag={e=>{this.setState({dragged:true})}}>
            <Fab color='primary' className={classes.fab} onClick={e=>{
              if(!this.state.dragged) {
                this.openChooseData();
              } else {
                this.setState({dragged:false})
              }} }> 
              <Icon>add</Icon>
            </Fab>
          </Draggable>
        </React.Fragment>

}


        {/* <header className="App-header"> */}
        
        { this.state.settings !== null ? <ChooseData
          onClose={this.closeChooseData.bind(this)}
          defaultDataUrls={this.state.settings.defaultDataUrls}
          open={this.state.openChooseData}
          pristine={this.state.pristineChooseData}
          title={title}
          versions={versions}
        > 
        </ChooseData> : null }
        { this.state.data === null ? (<span> </span>) :  (
                    <ScDataViewer
                      name={this.state.name}
                      dataAPI={this.state.dataAPI}
                      pcs={this.state.data.pcs}
                      covs={this.state.data.covs}
                      genesets={this.state.genesets}
                      discreteCovs={this.state.data.discreteCovs}
                      continuousCovs={this.state.data.continuousCovs}
                    ></ScDataViewer>
 
        
            // <InteractiveTSNE
            //   data={this.state.data.pcs}
            //   cov={this.state.data.covs}
            //   discreteCovs={this.state.data.discreteCovs}
            //   continuousCovs={this.state.data.continuousCovs}
            // ></InteractiveTSNE>      
          )}


        {/* </header>           */}
        </div>
    );
  }
}



export default withStyles(styles)(MainPage);
