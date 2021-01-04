import React from 'react';
import { Row } from 'react-bootstrap';
import styled from 'styled-components';
import styles from './RatingsGraph.module.css';
import { TextComponent } from './StyledComponents';

const StyledLabel = styled.p`
  font-size: 10px !important;
  width: 55px;
  text-align: center;
  color: #468ff2;
`;

/**
 * Displays Evaluation Graphs
 * @prop ratings - list that holds the counts for each rating 1-5
 * @prop reverse - boolean of whether or not to reverse the colors
 * @prop labels - list that holds the x-axis labels for the grpah
 */

const RatingsGraph = ({ ratings, reverse, labels }) => {
  let max_val = 1;
  // Find the maximum count for a rating
  ratings.forEach((rating) => {
    max_val = Math.max(rating, max_val);
  });

  // Bar chart colors
  const colors = ['#f54242', '#f5a142', '#f5f542', '#aeed1a', '#00e800'];
  // Reverse colors if needed
  if (reverse) colors.reverse();

  // Holds the bars
  const columns = [];
  // Variables used for list keys
  let indx = 0;
  // Set minimum bar height
  const MIN_HEIGHT = 15;
  // Loop through each rating to build the bar
  ratings.forEach((rating) => {
    // Calculate height of the bar
    const height = rating ? MIN_HEIGHT + (rating / max_val) * 100 : 0;
    // Skip to last color if this is the yes/no question
    if (indx === 1 && ratings.length === 2) indx = 4;
    // Build bar
    columns.push(
      <div key={indx} className={styles.bar}>
        {/* Number of votes for each rating */}
        <p className={`${styles.value} m-0 `}>
          <TextComponent type={1}>{rating}</TextComponent>
        </p>
        {/* Bar */}
        <div
          className={`${styles.column} px-1 mx-auto`}
          style={{
            backgroundColor: colors[indx],
            height: `${height.toString()}px`,
          }}
        />
        {/* Rating labels */}
        {ratings.length === 2 && (
          <StyledLabel className={`${styles.value} m-0`}>
            {indx === 0 ? 'yes' : 'no'}
          </StyledLabel>
        )}
        {ratings.length === 5 && (
          <StyledLabel className={`${styles.value} m-0`}>
            <span className="d-none d-sm-block">{labels[indx]}</span>
            <span className="d-sm-none">{indx + 1}</span>
          </StyledLabel>
        )}
      </div>
    );
    indx++;
  });

  return (
    <Row
      className={`${styles.container} mx-auto px-3 mb-5 justify-content-center align-items-end`}
    >
      {columns}
    </Row>
  );
};

export default RatingsGraph;
