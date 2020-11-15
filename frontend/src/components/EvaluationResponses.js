import React from 'react';
import { Tab, Row, Tabs } from 'react-bootstrap';
import styles from './EvaluationResponses.module.css';
import { TextComponent } from './StyledComponents';
import styled from 'styled-components';

// Tabs of evaluation comments in modal
const StyledTabs = styled(Tabs)`
  background-color: ${({ theme }) => theme.surface[0]};
  .active {
    background-color: ${({ theme }) => theme.select_hover + ' !important'};
    color: ${({ theme }) => theme.text[0] + ' !important'};
    border-bottom: none;
  }
  .nav-item {
    color: ${({ theme }) => theme.text[0]};
  }
  .nav-item:hover {
    background-color: ${({ theme }) => theme.banner};
    color: ${({ theme }) => theme.text[0]};
  }
`;

/**
 * Displays Evaluation Comments
 * @prop crn - integer that holds current listing's crn
 * @prop info - dictionary that holds the eval data for each question
 */

const EvaluationResponses = ({ crn, info }) => {
  // Dictionary that holds the comments for each question
  let responses = {};
  // Loop through each section for this course code
  info.forEach((section) => {
    const crn_code = section.crn;
    // Only fetch comments for this section
    if (crn_code !== crn) return;
    const nodes = section.course.evaluation_narratives_aggregate.nodes;
    // Return if no comments
    if (!nodes.length) return;
    // Add comments to responses dictionary
    nodes.forEach((node) => {
      if (!responses[node.evaluation_question.question_text])
        responses[node.evaluation_question.question_text] = [];
      responses[node.evaluation_question.question_text].push(node.comment);
    });
  });
  // Number of questions
  const num_questions = Object.keys(responses).length;
  // Lists that hold the html for the comments for a specific question
  let recommend = [];
  let skills = [];
  let strengths = [];
  let summary = [];
  // Populate the lists above
  for (let key in responses) {
    if (key.includes('summarize')) {
      summary = responses[key].map((response, index) => {
        return (
          <Row key={index} className={styles.response + ' m-auto p-2'}>
            <TextComponent type={0}>{response}</TextComponent>
          </Row>
        );
      });
    } else if (key.includes('recommend')) {
      recommend = responses[key].map((response, index) => {
        return (
          <Row key={index} className={styles.response + ' m-auto p-2'}>
            <TextComponent type={0}>{response}</TextComponent>
          </Row>
        );
      });
    } else if (key.includes('skills')) {
      skills = responses[key].map((response, index) => {
        return (
          <Row key={index} className={styles.response + ' m-auto p-2'}>
            <TextComponent type={0}>{response}</TextComponent>
          </Row>
        );
      });
    } else if (key.includes('strengths')) {
      strengths = responses[key].map((response, index) => {
        return (
          <Row key={index} className={styles.response + ' m-auto p-2'}>
            <TextComponent type={0}>{response}</TextComponent>
          </Row>
        );
      });
    }
  }

  return (
    <div>
      <StyledTabs
        variant="tabs"
        transition={false}
        onSelect={() => {
          // Scroll to top of modal when a different tab is selected
          document
            .querySelector('.modal-body')
            .scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }}
      >
        {/* Recommend Question */}
        {recommend.length !== 0 && (
          <Tab eventKey="recommended" title="Recommend?">
            <Row className={styles.question_header + ' m-auto pt-2'}>
              Would you recommend this course to another student? Please
              explain.
            </Row>
            {recommend}
          </Tab>
        )}
        {/* Knowledge/Skills Question */}
        {skills.length !== 0 && (
          <Tab eventKey="knowledge/skills" title="Skills">
            <Row className={styles.question_header + ' m-auto pt-2'}>
              What knowledge, skills, and insights did you develop by taking
              this course?
            </Row>
            {skills}
          </Tab>
        )}
        {/* Strengths/Weaknesses Question */}
        {strengths.length !== 0 && (
          <Tab eventKey="strengths/weaknesses" title="Strengths/Weaknesses">
            <Row className={styles.question_header + ' m-auto pt-2'}>
              What are the strengths and weaknesses of this course and how could
              it be improved?
            </Row>
            {strengths}
          </Tab>
        )}
        {/* Summarize Question */}
        {summary.length !== 0 && (
          <Tab eventKey="summary" title="Summary">
            <Row className={styles.question_header + ' m-auto pt-2'}>
              How would you summarize this course? Would you recommend it to
              another student? Why or why not?
            </Row>
            {summary}
          </Tab>
        )}
      </StyledTabs>
      {!num_questions && <strong>No comments for this course</strong>}
    </div>
  );
};

export default EvaluationResponses;
