import React, { useMemo, useState, useCallback } from 'react';

import { FetchWorksheet } from '../queries/GetWorksheetListings';
import { Row, Col, Fade, Spinner } from 'react-bootstrap';
import WeekSchedule from '../components/WeekSchedule';
import WorksheetList from '../components/WorksheetList';
import WorksheetAccordion from '../components/WorksheetAccordion';
import WorksheetExpandedList from '../components/WorksheetExpandedList';
import CourseModal from '../components/CourseModal';
import { FaCompressAlt, FaExpandAlt } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

import styles from './Worksheet.module.css';

import { useUser } from '../user';
import { isInWorksheet } from '../utilities';
import NoCoursesFound from '../images/no_courses_found.svg';
import ServerError from '../images/server_error.svg';

/**
 * Renders worksheet page
 */

function Worksheet() {
  // Get user context data
  const { user } = useUser();
  // Current user who's worksheet we are viewing
  const [fb_person, setFbPerson] = useState('me');
  const handleFBPersonChange = (new_person) => {
    // Reset listings data when changing FB person
    setListings([]);
    setInitWorksheet(
      new_person === 'me'
        ? user.worksheet
        : user.fbWorksheets.worksheets[new_person]
    );
    setFbPerson(new_person);
  };

  // Worksheet of the current person
  const cur_worksheet = useMemo(() => {
    return fb_person === 'me'
      ? user.worksheet
      : user.fbWorksheets.worksheets[fb_person];
  }, [user.worksheet, user.fbWorksheets, fb_person]);

  const season_codes = useMemo(() => {
    let season_codes_temp = [];
    if (cur_worksheet) {
      cur_worksheet.forEach((szn) => {
        if (season_codes_temp.indexOf(szn[0]) === -1)
          season_codes_temp.push(szn[0]);
      });
    }
    season_codes_temp.sort();
    season_codes_temp.reverse();
    return season_codes_temp;
  }, [cur_worksheet]);

  // Current season initialized to most recent season
  const [season, setSeason] = useState(
    season_codes.length > 0 ? season_codes[0] : ''
  );
  // Listings data to be fetched from database
  const [listings, setListings] = useState([]);
  // Store the initial worksheet to be cached on the first listings query
  const [init_worksheet, setInitWorksheet] = useState(
    cur_worksheet ? cur_worksheet : []
  );
  // Determines when to show course modal and for what listing
  const [course_modal, setCourseModal] = useState([false, '']);
  // List of courses that the user has marked hidden
  const [hidden_courses, setHiddenCourses] = useState([]);
  // The current listing that the user is hovering over
  const [hover_course, setHoverCourse] = useState();
  // Which component (calendar or list or none) is the user hovering over. Determines which side gets the expand button
  const [hover_expand, setHoverExpand] = useState('none');
  // Currently expanded component (calendar or list or none)
  const [cur_expand, setCurExpand] = useState('none');

  // Function to change season
  const changeSeason = (season_code) => {
    setSeason(season_code);
  };

  // Show course modal for the chosen listing
  const showModal = (listing) => {
    setCourseModal([true, listing]);
  };

  // Hide course modal
  const hideModal = () => {
    setCourseModal([false, '']);
    setHoverExpand(cur_expand);
  };

  // Check to see if this course is hidden
  const isHidden = useCallback(
    (season_code, crn) => {
      for (let i = 0; i < hidden_courses.length; i++) {
        if (
          hidden_courses[i][0] === season_code &&
          hidden_courses[i][1] === crn
        )
          return i;
      }
      return -1;
    },
    [hidden_courses]
  );

  // Hide/Show this course
  const toggleCourse = (season_code, crn, hidden) => {
    // Hide course
    if (!hidden) {
      setHiddenCourses([...hidden_courses, [season_code, crn]]);
    }
    // Show course
    else {
      let temp = [...hidden_courses];
      temp.splice(isHidden(season_code, crn), 1);
      setHiddenCourses(temp);
    }
  };

  // Function to sort worksheet courses by course code
  const sortByCourseCode = (a, b) => {
    if (a.course_code < b.course_code) return -1;
    return 1;
  };

  // List of colors for the calendar events
  const colors = [
    'rgba(108, 194, 111, ',
    'rgba(202, 95, 83, ',
    'rgba(49, 164, 212, ',
    'rgba(223, 134, 83, ',
    'rgba(38, 186, 154, ',
    'rgba(186, 120, 129, ',
  ];

  // Perform search query to fetch listing data for each worksheet course
  // Only performs search query once with the initial worksheet and then caches the result
  // This prevents the need to perform another search query and render "loading..." when removing a course
  const { loading, error, data } = FetchWorksheet(init_worksheet);

  // Initialize listings state if haven't already
  if (
    !listings.length &&
    !loading &&
    !error &&
    cur_worksheet &&
    cur_worksheet.length &&
    data &&
    data.length > 0
  ) {
    let temp = [...data];
    // Assign color to each course
    for (let i = 0; i < data.length; i++) {
      temp[i].color = colors[i % colors.length];
    }
    // Sort list by course code
    temp.sort(sortByCourseCode);
    setListings(temp);
  }

  // Holds the courses that are in the worksheet and in this current season
  // The listings list might have courses that have been removed from the worksheet because we don't fetch listings data again
  // So we need to filter for only the course that are in the worksheet as well as by season
  const season_listings = useMemo(() => {
    if (!listings.length) return [];
    let season_listings_temp = [];
    listings.forEach((listing) => {
      if (
        listing.season_code === season &&
        isInWorksheet(
          listing.season_code,
          listing.crn.toString(),
          cur_worksheet
        )
      ) {
        // Set hidden key of each listing
        listing.hidden = isHidden(listing.season_code, listing.crn) !== -1;
        season_listings_temp.push(listing);
      }
    });
    return season_listings_temp;
  }, [listings, cur_worksheet, isHidden, season]);

  // If user somehow isn't logged in and worksheet is null
  if (cur_worksheet == null) return <div>Error fetching worksheet</div>;
  // Display no courses page if no courses in worksheet
  if (cur_worksheet.length === 0)
    return (
      <div style={{ height: '93vh', width: '100vw' }} className="d-flex">
        <div className="text-center m-auto">
          <img
            alt="No courses found."
            className="py-5"
            src={NoCoursesFound}
            style={{ width: '25%' }}
          ></img>
          <h3>No courses found</h3>
          <div>Please add courses to your worksheet</div>
        </div>
      </div>
    );
  // Wait for search query to finish
  if (loading) {
    return (
      <div style={{ height: '93vh' }}>
        <Spinner
          className={styles.loading_spinner}
          animation="border"
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </Spinner>
      </div>
    );
  } else if (error) {
    return (
      <div style={{ height: '93vh', width: '100vw' }} className="d-flex">
        <div className="text-center m-auto">
          <img
            alt="No courses found."
            className="py-5"
            src={ServerError}
            style={{ width: '25%' }}
          ></img>
          <h3>There seems to be an issue with our server</h3>
          <div>
            Please file a <NavLink to="/feedback">report</NavLink> to let us
            know
          </div>
        </div>
      </div>
    );
  }
  // Error with query
  if (data === undefined || !data.length) return <div>Error with Query</div>;

  // Button size for expand icons
  const expand_btn_size = 18;

  return (
    <div className={styles.container}>
      {/* Desktop View */}
      <div
        className={
          (cur_expand !== 'list'
            ? styles.desktop_container
            : styles.expanded_list_container) + ' d-none d-md-block'
        }
      >
        <Row className={'m-3'}>
          {/* Calendar Component */}
          <Col
            // Width of componenet depends on if it is expanded or not
            md={cur_expand === 'calendar' ? 12 : 9}
            className={
              styles.calendar +
              ' m-0 p-0 ' +
              (cur_expand === 'list' ? styles.hidden : '')
            }
            // Show hover icon
            onMouseEnter={() => setHoverExpand('calendar')}
            // Hide hover icon
            onMouseLeave={() => setHoverExpand('none')}
          >
            <WeekSchedule
              showModal={showModal}
              courses={season_listings}
              hover_course={hover_course}
              setHoverCourse={setHoverCourse}
            />
            {/* Expand/Compress icons for calendar */}
            <Fade in={hover_expand === 'calendar'}>
              <div style={{ zIndex: 420 }}>
                {cur_expand === 'none' ? (
                  <FaExpandAlt
                    className={styles.expand_btn + ' ' + styles.top_right}
                    size={expand_btn_size}
                    onClick={() => {
                      // Expand calendar
                      setCurExpand('calendar');
                    }}
                  />
                ) : (
                  <FaCompressAlt
                    className={styles.expand_btn + ' ' + styles.top_right}
                    size={expand_btn_size}
                    onClick={() => {
                      // Compress calendar
                      setCurExpand('none');
                      // Show hover icons for list because that is where mouse will end up
                      setHoverExpand('list');
                    }}
                  />
                )}
              </div>
            </Fade>
          </Col>
          {/* List Component*/}
          <Col
            // Width depends on if it is expanded or not
            md={cur_expand === 'list' ? 12 : 3}
            className={
              styles.table +
              ' pl-3 ml-auto ' +
              (cur_expand === 'list' ? ' p3-4 ' : 'pr-0 ') +
              (cur_expand === 'calendar' ? styles.hidden : '')
            }
            // Show hover icon
            onMouseEnter={() => setHoverExpand('list')}
            // Hide hover icon
            onMouseLeave={() => setHoverExpand('none')}
          >
            {/* Expanded List Component */}
            <Fade in={cur_expand === 'list'}>
              <div style={{ display: cur_expand === 'list' ? '' : 'none' }}>
                <WorksheetExpandedList
                  courses={season_listings}
                  showModal={showModal}
                  cur_expand={cur_expand}
                  cur_season={season}
                  season_codes={season_codes}
                  onSeasonChange={changeSeason}
                  setFbPerson={handleFBPersonChange}
                  fb_person={fb_person}
                />
              </div>
            </Fade>
            {/* Default List Component */}
            <Fade in={cur_expand !== 'list'}>
              <div style={{ display: cur_expand !== 'list' ? '' : 'none' }}>
                <WorksheetList
                  courses={season_listings}
                  showModal={showModal}
                  cur_season={season}
                  season_codes={season_codes}
                  onSeasonChange={changeSeason}
                  toggleCourse={toggleCourse}
                  setHoverCourse={setHoverCourse}
                  setFbPerson={handleFBPersonChange}
                  cur_person={fb_person}
                />
              </div>
            </Fade>
            {/* Expand/Compress Icons for list */}
            <Fade in={hover_expand === 'list'}>
              <div style={{ zIndex: 420 }}>
                {cur_expand === 'none' ? (
                  <FaExpandAlt
                    className={styles.expand_btn + ' ' + styles.top_left}
                    size={expand_btn_size}
                    onClick={() => {
                      // Expand the list component
                      setCurExpand('list');
                      // Track toggling table view for worksheet
                      window.umami.trackEvent('Table View', 'worksheet');
                    }}
                  />
                ) : (
                  <FaCompressAlt
                    className={styles.expand_btn + ' ' + styles.top_left}
                    size={expand_btn_size}
                    onClick={() => {
                      // Compress the list component
                      setCurExpand('none');
                      // Show hover icons for calendar because that is where mouse will end up
                      setHoverExpand('calendar');
                      // Track toggling list view for worksheet
                      window.umami.trackEvent('List View', 'worksheet');
                    }}
                  />
                )}
              </div>
            </Fade>
          </Col>
        </Row>
      </div>
      {/* Mobile View */}
      <div className="d-md-none">
        <Row className={styles.accordion + ' m-0 p-3'}>
          <Col className="p-0">
            <WorksheetAccordion
              onSeasonChange={changeSeason}
              cur_season={season}
              season_codes={season_codes}
              courses={season_listings}
              showModal={showModal}
              setFbPerson={handleFBPersonChange}
              cur_person={fb_person}
            />
          </Col>
        </Row>
      </div>
      {/* Course Modal */}
      <CourseModal
        hideModal={hideModal}
        show={course_modal[0]}
        listing={course_modal[1]}
      />
    </div>
  );
}

export default Worksheet;
