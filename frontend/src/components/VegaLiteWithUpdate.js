import React, { useEffect, useRef, useMemo } from 'react';
import * as vl from 'vega-lite';
import Vega from 'react-vega';


const VegaLite = props => {
  const parsedProps = { ...props };
  const { spec, data } = props;
  const combinedSpec = { ...spec };
  if (data) {
    combinedSpec.data = data;
    delete parsedProps.data;
  }

  let vegaSpec;
  useEffect( () => {
      vegaSpec = {};
  }, []);
  useEffect( () => {
      console.log(vegaSpec);
      Object.assign(vl.compile(combinedSpec).spec, vegaSpec);
      parsedProps.spec = vegaSpec;
      parsedProps.data = {[vegaSpec.data[0].name]: vegaSpec.data[0].values};
    }, [combinedSpec]);



//   useEffect( () => {
//     console.log("in effect setting spec");
//     vegaSpec.current = vl.compile(combinedSpec).spec;
//   }, [spec]);

  // maintain spec
  // create spec
  // update spec
  // set parsedProps data
  // save parseProps spec


  return <Vega {...parsedProps} />;
};

VegaLite.propTypes = Vega.propTypes;

export default VegaLite;