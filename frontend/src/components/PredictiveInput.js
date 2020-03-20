import React from 'react';
import {Typography, TextField, MenuItem, Chip, Paper, NoSsr} from '@material-ui/core';
import classNames from 'classnames';
import CancelIcon from '@material-ui/icons/Cancel';
import ReactSelect from 'react-select';
import {Creatable as CreatableSelect} from 'react-select';


function NoOptionsMessage(props) {
    return (
      <Typography
        color="textSecondary"
        className={props.selectProps.classes.noOptionsMessage}
        {...props.innerProps}
      >
        {props.children}
      </Typography>
    );
  }
  
  function inputComponent({ inputRef, ...props }) {
    return <div ref={inputRef} {...props} />;
  }

function Control(props) {
    return (
      <TextField
        fullWidth
        InputProps={{
          inputComponent,
          inputProps: {
            className: props.selectProps.classes.input,
            inputRef: props.innerRef,
            children: props.children,
            ...props.innerProps,
          },
        }}
        {...props.selectProps.textFieldProps}
      />
    );
  }
  
  function Option(props) {
    return (
      <MenuItem
        buttonRef={props.innerRef}
        selected={props.isFocused}
        component="div"
        style={{
          fontWeight: props.isSelected ? 500 : 400,
        }}
        {...props.innerProps}
      >
        {props.children}
      </MenuItem>
    );
  }
  
  function Placeholder(props) {
    return (
      <Typography
        color="textSecondary"
        className={props.selectProps.classes.placeholder}
        {...props.innerProps}
      >
        {props.children}
      </Typography>
    );
  }
  
  function SingleValue(props) {
    return (
      <Typography className={props.selectProps.classes.singleValue} {...props.innerProps}>
        {props.children}
      </Typography>
    );
  }
  
  function ValueContainer(props) {
    return <div className={props.selectProps.classes.valueContainer}>{props.children}</div>;
  }
  
  function MultiValue(props) {
    return (
      <Chip
        tabIndex={-1}
        label={props.children}
        className={classNames(props.selectProps.classes.chip, {
          [props.selectProps.classes.chipFocused]: props.isFocused,
        })}
        onDelete={props.removeProps.onClick}
        deleteIcon={<CancelIcon {...props.removeProps} />}
      />
    );
  }
  
  function Menu(props) {
    return (
      <Paper square className={props.selectProps.classes.paper} {...props.innerProps}>
        {props.children}
      </Paper>
    );
  }
const components = {
    Control,
    Menu,
    MultiValue,
    NoOptionsMessage,
    Option,
    Placeholder,
    SingleValue,
    ValueContainer,
  };

  export function PredictiveInput(props) {
      return <NoSsr>
        <ReactSelect
            {...props}
            // styles={selectStyles}
            textFieldProps={{
                // label: 'Label',
                InputLabelProps: {
                    shrink: false,
                },
            }}
            components={components}
        />
        </NoSsr>
    
  }
  export function CreatablePredictiveInput(props) {
    const resultLimit = 50;
    let i = 0;
    return <NoSsr>
      <CreatableSelect
          {...props}
          filterOption={({label}, query) => label.toLowerCase().indexOf(query.toLowerCase()) >= 0 && i++ < resultLimit}
          onInputChange={() => { i = 0 }}
          // styles={selectStyles}
          textFieldProps={{
              // label: 'Label',
              InputLabelProps: {
                  shrink: false,
              },
          }}
          components={components}
      />
      </NoSsr>
  
}


