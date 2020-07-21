import React from 'react';
import { Row, Col, Modal } from 'react-bootstrap';
import { SEARCH_EVALUATION_NARRATIVES } from '../queries/QueryStrings';
import { useQuery } from '@apollo/react-hooks';
import EvaluationResponses from './EvaluationResponses';
import EvaluationRatings from './EvaluationRatings';

const CourseModalEvaluations = (props) => {
  const { loading, error, data } = useQuery(SEARCH_EVALUATION_NARRATIVES, {
    variables: {
      season_code: props.season_code,
      course_code: props.course_code ? props.course_code : 'bruh',
    },
  });
  if (loading || error) return <Modal.Body>Loading...</Modal.Body>;
  const info = data.computed_course_info;

  return (
    <Modal.Body>
      <Row className="m-auto">
        <Col md={5} className="px-0 my-0">
          <EvaluationRatings crn={props.crn} info={info} />
        </Col>

        <Col md={7} className="px-0 my-0">
          <EvaluationResponses crn={props.crn} info={info} />
        </Col>
      </Row>
    </Modal.Body>
  );
};

export default CourseModalEvaluations;
