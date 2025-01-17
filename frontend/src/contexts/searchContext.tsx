import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  isEqual,
  type Listing,
  type Season,
  type Weekdays,
} from '../utilities/common';
import { useSessionStorageState } from '../utilities/browserStorage';
import { useCourseData, useWorksheetInfo, seasons } from './ferryContext';
import {
  type SortByOption,
  skillsAreasColors,
  skillsAreas,
  subjects,
  schools,
} from '../utilities/constants';
import {
  checkConflict,
  getDayTimes,
  getEnrolled,
  getNumFriends,
  getOverallRatings,
  getWorkloadRatings,
  isGraduate,
  isDiscussionSection,
  sortCourses,
  toRangeTime,
  toSeasonString,
} from '../utilities/course';
import { CUR_SEASON } from '../config';
import { useUser } from './userContext';

// Option type for all the filter options
export type Option<T extends string | number = string> = {
  label: string;
  value: T;
  color?: string;
  numeric?: boolean;
};

export const isOption = (x: unknown): x is Option<string | number> =>
  // eslint-disable-next-line no-implicit-coercion
  !!x && typeof x === 'object' && 'label' in x && 'value' in x;

export const skillsAreasOptions = ['Areas', 'Skills'].map((type) => ({
  label: type,
  options: Object.entries(
    skillsAreas[type.toLowerCase() as 'areas' | 'skills'],
  ).map(
    ([code, name]): Option => ({
      label: `${code} - ${name}`,
      value: code,
      color: skillsAreasColors[code],
    }),
  ),
}));

export const sortbyOptions = [
  { label: 'Sort by Course Code', value: 'course_code', numeric: false },
  { label: 'Sort by Course Number', value: 'number', numeric: true },
  { label: 'Sort by Course Title', value: 'title', numeric: false },
  { label: 'Sort by Friends', value: 'friend', numeric: true },
  { label: 'Sort by Course Rating', value: 'average_rating', numeric: true },
  {
    label: 'Sort by Professor Rating',
    value: 'average_professor',
    numeric: true,
  },
  { label: 'Sort by Workload', value: 'average_workload', numeric: true },
  {
    label: 'Sort by Guts (Overall - Workload)',
    value: 'average_gut_rating',
    numeric: true,
  },
  { label: 'Sort by Last Enrollment', value: 'last_enrollment', numeric: true },
  { label: 'Sort by Days & Times', value: 'times_by_day', numeric: true },
] as const;

export const subjectsOptions = Object.entries(subjects).map(
  ([code, name]): Option => ({
    label: `${code} - ${name}`,
    value: code,
  }),
);

export const schoolsOptions = Object.entries(schools).map(
  ([code, name]): Option => ({
    label: name,
    value: code,
  }),
);

export const seasonsOptions = seasons.map(
  (x): Option<Season> => ({
    value: x,
    label: toSeasonString(x),
  }),
);

type SortOrderType = 'desc' | 'asc';

type Store = {
  filters: {
    [K in keyof Filters]: FilterHandle<K>;
  };
  canReset: boolean;
  coursesLoading: boolean;
  searchData: Listing[];
  multiSeasons: boolean;
  isLoggedIn: boolean;
  numFriends: { [seasonCodeCrn: string]: string[] };
  resetKey: number;
  duration: number;
  setCanReset: React.Dispatch<React.SetStateAction<boolean>>;
  handleResetFilters: () => void;
  setResetKey: React.Dispatch<React.SetStateAction<number>>;
  setStartTime: React.Dispatch<React.SetStateAction<number>>;
};

const SearchContext = createContext<Store | undefined>(undefined);
SearchContext.displayName = 'SearchContext';

export type Filters = {
  searchText: string;
  selectSubjects: Option[];
  selectSkillsAreas: Option[];
  overallBounds: [number, number];
  workloadBounds: [number, number];
  selectSeasons: Option<Season>[];
  selectDays: Option<Weekdays>[];
  timeBounds: [string, string];
  enrollBounds: [number, number];
  numBounds: [number, number];
  selectSchools: Option[];
  selectCredits: Option<number>[];
  searchDescription: boolean;
  hideCancelled: boolean;
  hideConflicting: boolean;
  hideFirstYearSeminars: boolean;
  hideGraduateCourses: boolean;
  hideDiscussionSections: boolean;
  selectSortby: SortByOption;
  sortOrder: SortOrderType;
};

export const defaultFilters: Filters = {
  searchText: '',
  selectSubjects: [],
  selectSkillsAreas: [],
  overallBounds: [1, 5],
  workloadBounds: [1, 5],
  selectSeasons: [{ value: CUR_SEASON, label: toSeasonString(CUR_SEASON) }],
  selectDays: [],
  timeBounds: ['7:00', '22:00'],
  enrollBounds: [1, 528],
  numBounds: [0, 1000],
  selectSchools: [],
  selectCredits: [],
  searchDescription: false,
  hideCancelled: true,
  hideConflicting: false,
  hideFirstYearSeminars: false,
  hideGraduateCourses: false,
  hideDiscussionSections: true,
  selectSortby: sortbyOptions[0],
  sortOrder: 'asc',
};

export type FilterHandle<K extends keyof Filters> = ReturnType<
  typeof useFilterState<K>
>;

function useFilterState<K extends keyof Filters>(key: K) {
  const [value, setValue] = useSessionStorageState(key, defaultFilters[key]);
  return useMemo(
    () => ({
      value,
      set: setValue,
      hasChanged: !isEqual(value, defaultFilters[key]),
      reset: () => setValue(defaultFilters[key]),
    }),
    [value, setValue, key],
  );
}

/**
 * Stores the user's search, filters, and sorts
 */
export function SearchProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  /* Filtering */
  const searchText = useFilterState('searchText');
  const selectSubjects = useFilterState('selectSubjects');
  const selectSkillsAreas = useFilterState('selectSkillsAreas');
  const overallBounds = useFilterState('overallBounds');
  const workloadBounds = useFilterState('workloadBounds');
  const selectSeasons = useFilterState('selectSeasons');
  const selectDays = useFilterState('selectDays');
  const timeBounds = useFilterState('timeBounds');
  const enrollBounds = useFilterState('enrollBounds');
  const numBounds = useFilterState('numBounds');
  const selectSchools = useFilterState('selectSchools');
  const selectCredits = useFilterState('selectCredits');
  const searchDescription = useFilterState('searchDescription');
  const hideCancelled = useFilterState('hideCancelled');
  const hideConflicting = useFilterState('hideConflicting');
  const hideFirstYearSeminars = useFilterState('hideFirstYearSeminars');
  const hideGraduateCourses = useFilterState('hideGraduateCourses');
  const hideDiscussionSections = useFilterState('hideDiscussionSections');

  /* Sorting */
  const selectSortby = useFilterState('selectSortby');
  const sortOrder = useFilterState('sortOrder');

  /* Resetting */

  // State to determine if user can reset or not
  const [canReset, setCanReset] = useSessionStorageState('canReset', false);
  // State to cause components to reload when filters are reset
  const [resetKey, setResetKey] = useState(0);

  /* Search speed */
  const [startTime, setStartTime] = useState(Date.now());
  const [duration, setDuration] = useState(0);

  // Fetch user context data
  const { user } = useUser();
  // Is the user logged in?
  const isLoggedIn = Boolean(user.worksheet);

  // Object that holds a list of each friend taking a specific course
  const numFriends = useMemo(() => {
    if (!user.friends) return {};
    return getNumFriends(user.friends);
  }, [user.friends]);

  // Pre-process queries
  const processedSearchText = useMemo(
    () =>
      searchText.value
        .split(/\s+/u)
        .filter(Boolean)
        .map((token) => token.toLowerCase()),
    [searchText.value],
  );
  const processedSubjects = useMemo(
    () => selectSubjects.value.map((x) => x.value),
    [selectSubjects.value],
  );
  const processedSkillsAreas = useMemo(() => {
    const ret = selectSkillsAreas.value.map((x) => x.value);
    if (ret.includes('L')) ret.push('L1', 'L2', 'L3', 'L4', 'L5');
    return ret;
  }, [selectSkillsAreas.value]);
  const processedSeasons = useMemo(() => {
    if (selectSeasons.value.length === 0) {
      // Nothing selected, so default to all seasons.
      return seasons.slice(0, 15);
    }
    return selectSeasons.value.map((x) => x.value);
  }, [selectSeasons.value]);
  const processedDays = useMemo(
    () => selectDays.value.map((x) => x.value),
    [selectDays.value],
  );
  const processedSchools = useMemo(
    () => selectSchools.value.map((x) => x.value),
    [selectSchools.value],
  );
  const processedCredits = useMemo(
    () => selectCredits.value.map((x) => x.value),
    [selectCredits.value],
  );
  // If the bounds are unaltered, we need to set them to null
  // to include unrated courses
  const processedOverallBounds = useMemo(
    () => (overallBounds.hasChanged ? overallBounds.value : null),
    [overallBounds],
  );
  const processedWorkloadBounds = useMemo(
    () => (workloadBounds.hasChanged ? workloadBounds.value : null),
    [workloadBounds],
  );
  const processedTimeBounds = useMemo(
    () =>
      timeBounds.hasChanged
        ? (timeBounds.value.map(toRangeTime) as [number, number])
        : null,
    [timeBounds],
  );
  const processedEnrollBounds = useMemo(
    () => (enrollBounds.hasChanged ? enrollBounds.value : null),
    [enrollBounds],
  );
  const processedNumBounds = useMemo(
    () => (numBounds.hasChanged ? numBounds.value : null),
    [numBounds],
  );

  const {
    loading: coursesLoading,
    courses: courseData,
    error: courseLoadError,
  } = useCourseData(processedSeasons);

  // State used to determine whether or not to show season tags
  // (if multiple seasons are queried, the season is indicated)
  const multiSeasons = processedSeasons.length !== 1;

  const { data: worksheetInfo } = useWorksheetInfo(user.worksheet);

  // Filtered and sorted courses
  const searchData = useMemo(() => {
    // Match search results with course data.
    if (coursesLoading || courseLoadError) return [];

    const listings = processedSeasons.flatMap((seasonCode) => {
      const data = courseData[seasonCode];
      if (!data) return [];
      return [...data.values()];
    });

    const filtered = listings.filter((listing) => {
      // Apply filters.
      if (processedOverallBounds !== null) {
        const overall = getOverallRatings(listing, 'stat');
        if (overall === null) return false;
        const rounded = Math.round(overall * 10) / 10;
        if (
          rounded < processedOverallBounds[0] ||
          rounded > processedOverallBounds[1]
        )
          return false;
      }

      if (processedWorkloadBounds !== null) {
        const workload = getWorkloadRatings(listing, 'stat');
        if (workload === null) return false;
        const rounded = Math.round(workload * 10) / 10;
        if (
          rounded < processedWorkloadBounds[0] ||
          rounded > processedWorkloadBounds[1]
        )
          return false;
      }

      if (processedTimeBounds !== null) {
        const times = getDayTimes(listing);
        if (
          !times.some(
            (time) =>
              toRangeTime(time.start) >= processedTimeBounds[0] &&
              toRangeTime(time.end) <= processedTimeBounds[1],
          )
        )
          return false;
      }

      if (processedEnrollBounds !== null) {
        const enrollment = getEnrolled(listing, 'stat');
        if (
          enrollment === null ||
          enrollment < processedEnrollBounds[0] ||
          enrollment > processedEnrollBounds[1]
        )
          return false;
      }

      if (processedNumBounds !== null) {
        const number = Number(listing.number.replace(/\D/gu, ''));
        if (
          number < processedNumBounds[0] ||
          (processedNumBounds[1] < 1000 && number > processedNumBounds[1])
        )
          return false;
      }

      if (hideCancelled.value && listing.extra_info !== 'ACTIVE') return false;

      if (
        hideConflicting.value &&
        listing.times_summary !== 'TBA' &&
        checkConflict(worksheetInfo, listing).length > 0
      )
        return false;

      if (hideDiscussionSections.value && isDiscussionSection(listing))
        return false;

      if (hideFirstYearSeminars.value && listing.fysem !== false) return false;

      if (hideGraduateCourses.value && isGraduate(listing)) return false;

      if (
        processedSubjects.length !== 0 &&
        !processedSubjects.includes(listing.subject)
      )
        return false;

      if (processedDays.length !== 0) {
        const days = getDayTimes(listing).map((daytime) => daytime.day);
        if (
          days.some((day) => !processedDays.includes(day)) ||
          processedDays.some((day) => !days.includes(day))
        )
          return false;
      }

      if (processedSkillsAreas.length !== 0) {
        const listingSkillsAreas = [...listing.areas, ...listing.skills];
        if (
          !processedSkillsAreas.some((area) =>
            listingSkillsAreas.includes(area),
          )
        )
          return false;
      }

      if (
        processedCredits.length !== 0 &&
        listing.credits !== null &&
        !processedCredits.includes(listing.credits)
      )
        return false;

      if (
        processedSchools.length !== 0 &&
        listing.school !== null &&
        !processedSchools.includes(listing.school)
      )
        return false;

      // Handle search text. Each token must match something.
      for (const token of processedSearchText) {
        // First character of the course number
        const numberFirstChar = listing.number.charAt(0);
        if (
          listing.subject.toLowerCase().startsWith(token) ||
          listing.number.toLowerCase().startsWith(token) ||
          // For course numbers that start with a letter,
          // exclude this letter when comparing with the search token
          (/\D/u.test(numberFirstChar) &&
            listing.number
              .toLowerCase()
              .startsWith(numberFirstChar.toLowerCase() + token)) ||
          (searchDescription.value &&
            listing.description?.toLowerCase().includes(token)) ||
          listing.title.toLowerCase().includes(token) ||
          listing.professor_names.some((professor) =>
            professor.toLowerCase().includes(token),
          )
        )
          continue;

        return false;
      }

      return true;
    });
    // Apply sorting order.
    return sortCourses(
      filtered,
      { key: selectSortby.value.value, type: sortOrder.value },
      numFriends,
    );
  }, [
    coursesLoading,
    courseLoadError,
    processedSeasons,
    selectSortby.value.value,
    sortOrder.value,
    numFriends,
    courseData,
    processedOverallBounds,
    processedWorkloadBounds,
    processedTimeBounds,
    processedEnrollBounds,
    processedNumBounds,
    hideCancelled.value,
    hideConflicting.value,
    worksheetInfo,
    hideDiscussionSections.value,
    hideFirstYearSeminars.value,
    hideGraduateCourses.value,
    processedSubjects,
    processedDays,
    processedSkillsAreas,
    processedCredits,
    processedSchools,
    processedSearchText,
    searchDescription.value,
  ]);

  const filters = useMemo(
    () => ({
      searchText,
      selectSubjects,
      selectSkillsAreas,
      overallBounds,
      workloadBounds,
      selectSeasons,
      selectDays,
      timeBounds,
      enrollBounds,
      numBounds,
      selectSchools,
      selectCredits,
      searchDescription,
      hideCancelled,
      hideConflicting,
      hideFirstYearSeminars,
      hideGraduateCourses,
      hideDiscussionSections,
      selectSortby,
      sortOrder,
    }),
    [
      searchText,
      selectSubjects,
      selectSkillsAreas,
      overallBounds,
      workloadBounds,
      selectSeasons,
      selectDays,
      timeBounds,
      enrollBounds,
      numBounds,
      selectSchools,
      selectCredits,
      searchDescription,
      hideCancelled,
      hideConflicting,
      hideFirstYearSeminars,
      hideGraduateCourses,
      hideDiscussionSections,
      selectSortby,
      sortOrder,
    ],
  );

  // For resetting all filters and sorts
  const handleResetFilters = useCallback(() => {
    Object.values(filters).forEach((filter) => filter.reset());

    setResetKey(resetKey + 1);

    setCanReset(false);
    setStartTime(Date.now());
  }, [resetKey, filters, setCanReset]);

  // Check if can or can't reset
  useEffect(() => {
    if (
      Object.entries(filters)
        .filter(([k]) => !['sortOrder', 'selectSortby'].includes(k))
        .some(([, filter]) => filter.hasChanged)
    )
      setCanReset(true);
    else setCanReset(false);
    if (!coursesLoading) {
      const durInSecs = Math.abs(Date.now() - startTime) / 1000;
      setDuration(durInSecs);
    }
  }, [filters, coursesLoading, searchData, startTime, setCanReset]);

  // Store object returned in context provider
  const store = useMemo(
    () => ({
      // Context state.
      canReset,
      filters,
      coursesLoading,
      searchData,
      multiSeasons,
      isLoggedIn,
      numFriends,
      resetKey,
      duration,

      // Update methods.
      setCanReset,
      handleResetFilters,
      setResetKey,
      setStartTime,
    }),
    [
      canReset,
      filters,
      coursesLoading,
      searchData,
      multiSeasons,
      isLoggedIn,
      numFriends,
      resetKey,
      duration,
      setCanReset,
      handleResetFilters,
      setResetKey,
      setStartTime,
    ],
  );

  return (
    <SearchContext.Provider value={store}>{children}</SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext)!;
