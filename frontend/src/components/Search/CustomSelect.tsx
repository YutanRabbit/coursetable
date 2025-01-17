import React, { useMemo } from 'react';
import { type DefaultTheme, useTheme } from 'styled-components';
import makeAnimated from 'react-select/animated';
import chroma from 'chroma-js';
import Select, {
  mergeStyles,
  type Props as SelectProps,
  type StylesConfig,
  type Theme,
  type ThemeConfig,
} from 'react-select';
import type { Option } from '../../contexts/searchContext';

// Styles for the select indicators
function indicatorStyles<
  T extends Option<number | string>,
  IsMulti extends boolean,
>(theme: DefaultTheme, isMulti: IsMulti): StylesConfig<T, IsMulti> {
  const iconFocus = chroma(theme.iconFocus);
  const icon = chroma(theme.icon);
  const newIconFocus =
    theme.theme === 'light' ? iconFocus.darken() : iconFocus.brighten();
  const newIcon = theme.theme === 'light' ? icon.darken() : icon.brighten();

  return {
    clearIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? iconFocus.css() : icon.css(),
      ':hover': {
        ...base[':hover'],
        color: state.isFocused ? newIconFocus.css() : newIcon.css(),
      },
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      display: isMulti && state.hasValue ? 'none' : 'flex',
      color: state.isFocused ? iconFocus.css() : icon.css(),
      ':hover': {
        ...base[':hover'],
        color: state.isFocused ? newIconFocus.css() : newIcon.css(),
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      display: 'none',
    }),
  };
}

// Styles for default select
function defaultStyles<T extends Option<number | string>>(
  theme: DefaultTheme,
): StylesConfig<T> {
  return {
    control: (base, { isDisabled }) => ({
      ...base,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      backgroundColor: isDisabled ? theme.disabled : theme.select,
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: '2px',
      transition: 'none',
      userSelect: 'none',
    }),
    menu: (base) => ({
      ...base,
      paddingTop: 0,
      marginTop: 0,
      borderRadius: '8px',
      boxShadow:
        '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    }),
    menuList: (base) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
      borderRadius: '8px',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    multiValue: (base) => base,
    multiValueLabel: (base) => base,
    option: (base, { isSelected }) => ({
      ...base,
      cursor: 'pointer',
      color: isSelected ? 'white' : undefined,
    }),
    singleValue: (base, { isDisabled }) => ({
      ...base,
      color: isDisabled ? theme.text[2] : undefined,
    }),
  };
}

// Styles for popout select
function popoutStyles(
  theme: DefaultTheme,
  width: number,
): StylesConfig<Option<number | string>> {
  return {
    control: (base, { isDisabled }) => ({
      ...base,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      backgroundColor: isDisabled ? theme.disabled : theme.select,
      borderColor: 'rgba(0, 0, 0, 0.1)',
      minWidth: width,
      margin: 8,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      display: 'none',
    }),
    menu: () => ({ boxShadow: 'inset 0 1px 0 rgba(0, 0, 0, 0.1)' }),
    option: (base) => ({
      ...base,
      cursor: 'pointer',
    }),
  };
}

// Styles for skills/areas select
function colorStyles(): StylesConfig<Option<number | string>> {
  return {
    multiValue(base, { data }) {
      const backgroundColor = chroma(data.color!).alpha(0.16).css();
      return {
        ...base,
        backgroundColor,
      };
    },
    multiValueLabel: (base, { data }) => ({
      ...base,
      color: data.color,
      fontWeight: 'bold',
    }),
    multiValueRemove: (base, { data }) => ({
      ...base,
      color: data.color,
      ':hover': {
        backgroundColor: data.color,
        color: 'white',
      },
    }),
    // @ts-expect-error: probably wrong react-select type def
    option(base, { data, isDisabled, isFocused, isSelected }) {
      const color = chroma(data.color!);
      return {
        ...base,
        fontWeight: 'bold',
        backgroundColor: isDisabled
          ? null
          : isSelected
            ? data.color
            : isFocused
              ? color.alpha(0.1).css()
              : null,
        color: isDisabled
          ? '#ccc'
          : isSelected
            ? chroma.contrast(color, 'white') > 2
              ? 'white'
              : 'black'
            : data.color,

        ':active': {
          ...base[':active'],
          backgroundColor:
            !isDisabled && (isSelected ? data.color : color.alpha(0.5).css()),
        },
      };
    },
  };
}

type Props = {
  readonly popout?: boolean;
  readonly useColors?: boolean;
  readonly isMulti?: boolean;
};

/**
 * Custom Component for React-Select
 * @prop popout - rendering on a popout?
 * @prop useColors - use the color styles?
 * @prop isMulti - multi select?
 */
function CustomSelect<
  T extends Option<string | number>,
  IsMulti extends boolean = false,
>({
  popout = false,
  useColors = false,
  isMulti = false as IsMulti,
  components,
  ...props
}: SelectProps<T, IsMulti> & Props) {
  const globalTheme = useTheme();

  // All the default theme colors
  const themeStyles: ThemeConfig = (theme: Theme): Theme => ({
    ...theme,
    borderRadius: 8,
    colors: {
      ...theme.colors,
      primary50: '#85c2ff', // OptionBackground :focus
      primary25: globalTheme.selectHover, // OptionBackground :hover
      neutral0: globalTheme.select, // AllBackground & optionText :selected
      neutral10: globalTheme.multivalue, // SelectedOptionBackground & disabledBorder
      neutral30: 'hsl(0, 0%, 70%)', // Border :hover
      neutral60: globalTheme.text[0], // DropdownIconFocus & clearIconFocus
      neutral80: globalTheme.text[0], // SelectedOptionText & dropdownIconFocus :hover & clearIconFocus :hover
    },
  });

  // Makes Select forms animated
  const animatedComponents = useMemo(
    () => components ?? makeAnimated(),
    [components],
  );

  // Configure styles
  let styles = mergeStyles(
    indicatorStyles(globalTheme, isMulti),
    popout ? popoutStyles(globalTheme, 400) : defaultStyles(globalTheme),
  );
  if (useColors) styles = mergeStyles(styles, colorStyles());

  return (
    <Select<T, IsMulti>
      {...props}
      isMulti={isMulti}
      styles={styles as StylesConfig<T, IsMulti>}
      components={animatedComponents}
      theme={themeStyles}
    />
  );
}

export default CustomSelect;
