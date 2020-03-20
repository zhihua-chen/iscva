import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Paper from '@material-ui/core/Paper';
import {withStyles} from '@material-ui/core/styles';
import Draggable from 'react-draggable';
import {ListSubheader} from '@material-ui/core';


function PaperComponent(props) {
  return (
    <Draggable>
      <Paper {...props} />
    </Draggable>
  );
}

const styles = theme => ({
  root: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
  nested: {
    paddingLeft: theme.spacing.unit * 4,
  },
  buildInfo: {
    float: "right",
    "font-style": "italic",
    "font-size": "small",
  },
  heading: {
    // color: theme.palette.primary.main
  }
});


class DraggableDialog extends React.Component {
  async loadDataFromURL(url, name,dataAPI) {
    const response = await fetch(url);
    const j = await response.json();
    this.loadData(j,name, dataAPI);
  }
  loadData(res,name, dataAPI) {
    console.log(res);
    const data = {};
    data.pcs = [];
    for(let i = 1; ; i++) {
      if(`PC${i}` in res.pcs) {
        data.pcs.push(res.pcs[`PC${i}`])
      } else {
        break;
      }
    }
    data.covs = res.covs;
    data.continuousCovs = res.continuousCovs;
    data.discreteCovs = res.discreteCovs;
    // data.covs = Object.keys(data.srcData).filter(k => (!k.startsWith('PC')));
    // data.continuousCovs = data.covs.filter(k => !(data.discreteCovs.includes(k))) ;
    // data.continuousCovs = ["hrGFPIINLS",  "EYFP" ,       "tdimer2"  ,   "MbmCerulean", "sumFluorophore"];
    // data.continuousCovs = data.covs.slice(8);
    // send data back to parent and close dialog
    this.props.onClose(data,name, dataAPI);
  }

  async loadDataFromLocal(e) {
    console.log(e.target.files[0]);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      const res = JSON.parse(reader.result);
      this.loadData(res, file.name);
    }
    reader.readAsText(file);
  }

  // handleClickOpen = () => {
  //   this.setState({ open: true });
  // };

  handleClose = () => {
    this.props.onClose(null);
    console.log('handling close');
  };

  render() {
    const {classes} = this.props;
    // console.log('rendering choosedata');
    // console.log(this.props.open);
    // console.log(this.props.pristine);
    return (
      <div>
        {/* <Button variant="outlined" color="primary" onClick={this.handleClickOpen}>
          Open form dialog
        </Button> */}
        <Dialog
          open={this.props.open}
          onClose={this.handleClose}
          PaperComponent={PaperComponent}
          disableBackdropClick={this.props.pristine}
          disableEscapeKeyDown={this.props.pristine}
          aria-labelledby="draggable-dialog-title"
        >
          <DialogTitle id="draggable-dialog-title">{this.props.title}</DialogTitle>
          <DialogContent>
              <input
                accept=".json"
                id="contained-button-file"
                type="file"
                onChange={e => this.loadDataFromLocal(e)}
                style={{display:'none'}}
              />

              {/* <Grid container   justify="center" alignItems="center">  */}
                {/* <Grid item xs={8}> */}
                    <List subheader={<ListSubheader>Choose Data</ListSubheader>}>

                      {this.props.defaultDataUrls.map( ({name, url, dataAPI}) => (
                        <ListItem button key={name} > 
                          <ListItemText primary={name} onClick={ ()=>this.loadDataFromURL(url, name, dataAPI)} />
                        </ListItem>))}

                        <br/>
                        <br/>
                          <ListItem button > 
                          <label htmlFor="contained-button-file">
                            <ListItemText primary="Upload your own data"/>
                          </label>
                        </ListItem>

                    </List>
                {/* </Grid> */}
              {/* </Grid> */}


              <Divider></Divider>
              <br></br>
              <span  className={classes.buildInfo}>
                  v{this.props.versions.version}, 
                  branch {this.props.versions.branch},
                  revision {this.props.versions.revision}
                </span>

          </DialogContent>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(DraggableDialog);