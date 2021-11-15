// COPIED FROM GRAFANA UI
import React from 'react';
import { css, cx } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { components, ContainerProps as BaseContainerProps, GroupTypeBase } from 'react-select';
import { stylesFactory, useTheme2 } from '@grafana/ui';
import { getInputStyles } from './Input';
import { sharedInputStyle } from './commonStyles';
import { focusCss } from './mixins';

// isFocus prop is actually available, but its not in the types for the version we have.
export interface ContainerProps<Option, isMulti extends boolean, Group extends GroupTypeBase<Option>>
  extends BaseContainerProps<Option, isMulti, Group> {
  isFocused: boolean;
}

export const SelectContainer = <Option, isMulti extends boolean, Group extends GroupTypeBase<Option>>(
  props: ContainerProps<Option, isMulti, Group>
) => {
  const {
    isDisabled,
    isFocused,
    children,
    selectProps: { prefix },
  } = props;

  const theme = useTheme2();
  const styles = getSelectContainerStyles(theme, isFocused, isDisabled, !!prefix);

  // this is throwing an error Unable to dynamically transpile ES module for some reason
  return (
    <components.SelectContainer {...props} className={cx(styles.wrapper, props.className)}>
      {children}
    </components.SelectContainer>
  );
  // return <div className={cx(styles.wrapper, props.className)}>{children}</div>;
};

const getSelectContainerStyles = stylesFactory(
  (theme: GrafanaTheme2, focused: boolean, disabled: boolean, withPrefix: boolean) => {
    const styles = getInputStyles({ theme, invalid: false });

    return {
      wrapper: cx(
        styles.wrapper,
        sharedInputStyle(theme, false),
        focused &&
          css`
            ${focusCss(theme.v1)}
          `,
        disabled && styles.inputDisabled,
        css`
          position: relative;
          box-sizing: border-box;
          /* The display property is set by the styles prop in SelectBase because it's dependant on the width prop  */
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;

          min-height: 32px;
          height: auto;
          max-width: 100%;

          /* Input padding is applied to the InputControl so the menu is aligned correctly */
          padding: 0;
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
        `,
        withPrefix &&
          css`
            padding-left: 0;
          `
      ),
    };
  }
);