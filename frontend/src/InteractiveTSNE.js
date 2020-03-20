import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Plot from 'react-plotly.js';
import {d3} from 'plotly.js';
import * as itsne from './iterateTsne';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Grid, Paper, Card, TextField, IconButton, Icon, Select, MenuItem, OutlinedInput, InputLabel, FormControl } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';



// This component 
//     gets input data as list of PCs and covariates
//     creates UI components for  perplexity and N Pcs control
//     run iterative tsne and plot the results
// Define input json format
//  
//
//

// const randColor = Array.from({length: 3897}, () => Math.floor(Math.random() * 40));

const scale = d3.scale.category20();

const styles = theme => ({
    root: {
      flexGrow: 1,
      height: '100%',
      width: '100%'
    },
    card: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
    },
    paper: {
        // 'min-height': '800px',
        height: '100%',
        width: '100%',
    },
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
    },
    control: {
        margin: theme.spacing.unit,

        // padding: theme.spacing.unit * 2,
        minWidth: 120
    },
  });

// console.log(drawer);
class InteractiveTSNE extends Component {
    getDiscreteColor = function(c) {
        return scale(c);
        // const f = Number.parseFloat(c)
        // if (Number.isNaN(f)) {
        //     return scale(c);
        //   } else {
        //       return f;
        //   }
    }
    getContinuousColor = function(c) {
        return c;
    }

    getColors = function(colorBy) {
        if(colorBy === "") {
            return null;
        }
        if (this.props.continuousCovs.includes(colorBy)) {
            return this.props.cov[colorBy].map(c => this.getContinuousColor(c));
        } else {
            return this.props.cov[colorBy].map(c => this.getDiscreteColor(c));
        }
    }
    getAnnos = function(colorBy) {
        if (this.props.data.length===0) return '';
        return this.props.data[0].map( (d, idx) => {
            let cv;
            if (colorBy === "") {
                cv = null;
            } else {
                cv = this.props.cov[colorBy][idx];
            }
            const ret = `${colorBy}: ${cv} <br><br><br>`
            const covs = this.props.discreteCovs.concat(this.props.continuousCovs);
            const rows = covs.filter(c => c !== colorBy).map( c => `${c}: ${this.props.cov[c][idx]}`)
            // const rows = this.props.covs.map( c => `<span>${c}</span>:<span>${this.props.cov[c][idx]}</span>`)
            return ret + rows.join('\n<br>')
            // return this.props.cov[colorBy][idx];
        })
    }    
    state = { 
        labelWidth: 0,
        colorBy: '',
        // colorAttr: this.props.cov[this.props.covs[0]].map(c => getcolor(c)),
        colorAttr: null,
        annotation: null,
        search: '',

        plotData: [], 
        plotLayout: {
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
        }, 
        plotFrame: [], 
        plotConfig: {}, 
        plotUserResizeHandler: true,   
        knnProgress: 0, 
        perplexity: 10,
        npcs: 10,
        paused: false
    };

    // constructor(props) {
    //     super(props);
    // }

    handleChange = name => event => {
        this.setState({
            [name]: event.target.value,
        });
    };
    changeColorBy = async event => {
        this.setState({
            colorBy: event.target.value,
            colorAttr: this.getColors(event.target.value),
            annotation: this.getAnnos(event.target.value)
        })
        if ( this.state.paused) {
            if ( itsne.embeddingStep > 0 ) {
                const coords = await itsne.getEmbedding();
                // update plot
                this.draw(coords);    
            }    
        }   
    }
    initPlot() {
        this.setState({
            colorBy: this.props.discreteCovs.length > 100 ? this.props.discreteCovs[0] : "",
            // colorAttr: this.props.cov[this.props.covs[0]].map(c => getcolor(c)),
            colorAttr: this.getColors(this.props.discreteCovs.length > 100 ? this.props.discreteCovs[0] : ""),
            annotation: this.getAnnos(this.props.discreteCovs.length > 100 ? this.props.discreteCovs[0] : ""),
            plotData: [], 
            plotLayout: {
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
            }, 
            plotFrame: [], 
            plotConfig: {}, 
            plotUserResizeHandler: true,   
            paused: false    
        })
    }



    keypress = name => event => {
        // console.log(event);
        // console.log(name);
        // console.log(event.target);
        // console.log(event.target.value);
        // console.log(event.keyCode);

        if (event.keyCode === 13) {
            console.log('enter key');
            if ( this.state.perplexity >= 40) {
                this.setState({perplexity: 39});
            }
            if ( this.state.npcs >= this.props.data.length) {
                this.setState({npcs: this.props.data.length});
            }
    
            // if(!itsne.isDone()) {
                this.stopLoop();
            // }
            this.startLoop();
            // setTimeout( () => this.startLoop(), 1000);    
        }
    };

    togglePause = () => { 
        if (this.state.paused) {
            this.setState({paused:false});
            this._frameId = window.requestAnimationFrame( this.loop.bind(this) );
        } else {
            this.setState({paused:true});
        }
    }

    restartloop = () => {
        this.setState({paused:false});
        this.stopLoop();
        this.startLoop();
        // setTimeout( () => this.startLoop(), 1000);    
    }

    render() {
        const { classes } = this.props;
        // const { spacing } = this.state;
    
         return (
            <Grid container className={classes.root} spacing={8}>
                <Grid item xs={2}>
                    <Paper className={classes.paper}>
                    <form autoComplete="off">
                        <FormControl className={classes.control} variant="outlined">
                                    <TextField
                                        id="outlined-search"
                                        label="Search"
                                        className={classes.textField}
                                        value={this.state.search}
                                        onChange={this.handleChange('search')}
                                        onKeyDown={this.keypress('search')}
                                        margin="normal"
                                        variant="outlined"
                                    />
                        </FormControl>

                        <Card className={classes.card}>
                            <span>{this.state.search}</span>
                            <span>{this.state.search}</span>
                            <span>{this.state.search}</span>

                        </Card>


                        <FormControl className={classes.control} variant="outlined">
                                <TextField
                                    id="outlined-perplexity"
                                    label="Perplexity"
                                    className={classes.textField}
                                    value={this.state.perplexity}
                                    onChange={this.handleChange('perplexity')}
                                    onKeyDown={this.keypress('perplexity')}
                                    margin="normal"
                                    variant="outlined"
                                />
                                <TextField
                                    id="outlined-npcs"
                                    label="Number of PCs"
                                    className={classes.textField}
                                    value={this.state.npcs}
                                    onChange={this.handleChange('npcs')}
                                    onKeyDown={this.keypress('npcs')}
                                    margin="normal"
                                    variant="outlined"
                                />

                        </FormControl>

                            <FormControl className={classes.control} variant="outlined">
                                <InputLabel
                                    ref={ref => {
                                    this.InputLabelRef = ref;
                                    }}
                                    htmlFor="annotate-by"
                                >
                                    Annotate by
                                </InputLabel>
                                <Select
                                    value={this.state.colorBy}
                                    onChange={this.changeColorBy}
                                    input={
                                        <OutlinedInput
                                            labelWidth={this.state.labelWidth}
                                            name="Annotate by"
                                            id='annotate-by'
                                        />
                                    }
                                >
                                    <MenuItem value=""><em>None</em> </MenuItem>
                                    { this.props.discreteCovs.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>) }
                                    { this.props.continuousCovs.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </form>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>

                        <IconButton onClick={this.togglePause} color='primary' >
                            <Icon>{this.state.paused?'play_arrow':'pause'}</Icon>
                        </IconButton> 
                        <IconButton onClick={this.restartloop} color='primary' >
                            <Icon>replay</Icon>
                        </IconButton> 

                        {/* <Select> */}
                        {/* </Select> */}

                        <br/>
                        <br/>
                        <br/>
                        <br/>
                        <br/>

                        { this.state.knnProgress < 100 ? 
                            '' :
                            <span><i>Embedding iteration: {itsne.embeddingStep}</i></span>
                        
                            // label = <span><i>Computing KNN {this.state.knnProgress}% </i></span>
                        }

                    </Paper>
                </Grid>
                <Grid item xs={10}>
                    <Paper className={classes.paper}>
                    { this.state.knnProgress < 100 ?  
                        <React.Fragment>
                            <LinearProgress variant="determinate" value={this.state.knnProgress} color="primary"/>
                            <br/>
                            <span><i>Computing KNN ... {this.state.knnProgress}% </i></span>
                            <br/>
                            <br/>
                            <span><i>This can take minutes for larger perplexity values (>20) </i></span>
                        </React.Fragment> : ''}
                        <Plot
                            style={{height:'90%',width:'90%'}}
                            data={this.state.plotData}
                            layout={this.state.plotLayout}
                            frames={this.state.plotFrames}
                            config={this.state.plotConfig}
                            userResizeHandler={this.state.plotUserResizeHandler}
                            onInitialized={(figure) => this.setState(figure)}
                            onUpdate={(figure) => this.setState(figure)}
                        />
                    
                        

                    </Paper>
                </Grid>
            </Grid>
        )
    }
    draw(coords) {
        // console.log(coords);
        this.setState({
            plotData:
                [{
                    x: coords.map( c => c[0]),
                    y: coords.map( c => c[1]),
                    type: 'scattergl',
                    mode: 'markers',
                    marker: {color: this.state.colorAttr, size: 8, opacity:0.8},
                    text: this.state.annotation,
                    hoverlabel: {bgcolor: this.state.colorAttr},
                    hoverinfo: 'text'
                }]
        });
    }
    async loop() {
        if (this._stopped) {
            return;
        }

        if (this.state.paused) {
            return;
        }
        // console.log(`looping ${this._frameId}`);
        // if(itsne.isDone()) {
        //     return;
        // }
        await itsne.iterate();
        this.setState( {
            knnProgress: itsne.knnProgress()
        });
        if ( itsne.embeddingStep > 0 ) {
            const coords = await itsne.getEmbedding();
            // update plot
            this.draw(coords);    
        }
        // Set up next iteration of the loop
        this._frameId = window.requestAnimationFrame( this.loop.bind(this) )
    }

    async startLoop() {
        console.log('starting tsne');
        const dataNPCs = this.props.data.slice(0, this.state.npcs);
        this.setState({
            knnProgress: 0,
            embeddingProgress: 0
        });
        itsne.start(dataNPCs, this.state.perplexity);
        // await itsne.completeKnn();
        // if( !this._frameId ) {
            setTimeout( ()=>{
                this._frameId = window.requestAnimationFrame( this.loop.bind(this) );
                this._stopped = false;      
            }, 1000);
        // }
    }
    componentDidUpdate(prevProps) {
        if(prevProps.data === null && this.props.data !== null) {
            console.log('prop updated: startLoop');
            this.initPlot();
            this.startLoop();
        } else if(prevProps.data !== null && this.props.data !== prevProps.data) {
            console.log('prop updated: restartLoop');
            this.initPlot();
            this.restartloop();
        }
    }
    componentDidMount() {
        this.setState({
            labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth,
          });

        this.initPlot();
        // this.drawer = new drawer.EmbeddingDrawer(10000);
        // console.log(this.drawer);
        this.startLoop();

        // setTimeout( () => this.startLoop(), 100);
    }
    componentWillUnmount() {
        this.stopLoop();
    }
    stopLoop() {
        console.log(`stopping loop ${this._frameId}`);

        window.cancelAnimationFrame( this._frameId );
        this._stopped = true;
        // this._frameId = null;
        // Note: no need to worry if the loop has already been cancelled
        // cancelAnimationFrame() won't throw an error
    }
};


export default withStyles(styles)(InteractiveTSNE);