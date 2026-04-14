import React from 'react';
import styled from 'styled-components';

export type IconProps = {
  width: number | string;
  height: number | string;
  className?: string;
  onClick?: () => void;
};

type Props = {
  width: number | string;
  height: number | string;
  viewBox: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

const Svg = styled.svg`
  fill: ${props => props.theme.colors.text.primary};
  stroke: ${props => props.theme.colors.text.primary};
`;

const Icon: React.FC<Props> = ({ width, height, viewBox, className, onClick, children }) => {
  return (
    <Svg
      onClick={e => {
        if (onClick) {
          onClick();
        }
      }}
      className={className}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
    >
      {children}
    </Svg>
  );
};

export default Icon;
