/**
 * @file utilities used for fetching catalog files.
 */

import fs from 'fs';
import { request } from 'graphql-request';

import { catalogBySeasonQuery, listSeasonsQuery } from './catalog.queries';
import { GRAPHQL_ENDPOINT, STATIC_FILE_DIR } from '../config';
import winston from '../logging/winston';

type Seasons = {
  seasons: {
    season_code: string;
    term: string;
    year: number;
  }[];
};

type Catalog = {
  computed_listing_info: {
    all_course_codes: string[];
    areas: string[];
    average_gut_rating: number;
    average_professor: number;
    average_rating: number;
    average_workload: number;
    average_rating_same_professors: number;
    average_workload_same_professors: number;
    classnotes: string;
    course_code: string;
    credits: number;
    crn: string;
    description: string;
    enrolled: number;
    extra_info: string;
    final_exam: string;
    flag_info: string;
    fysem: boolean;
    last_enrollment: number;
    last_enrollment_same_professors: number;
    listing_id: string;
    locations_summary: string;
    number: string;
    professor_ids: string[];
    professor_names: string[];
    regnotes: string;
    requirements: string;
    rp_attr: string;
    same_course_id: string;
    same_course_and_profs_id: string;
    last_offered_course_id: string;
    school: string;
    season_code: string;
    section: string;
    skills: string;
    subject: string;
    syllabus_url: string;
    times_by_day: string;
    times_summary: string;
    title: string;
  }[];
};

/**
 * Get static catalogs for each season from Hasura,
 * @param overwrite - whether or not to skip existing catalogs.
 */
export async function fetchCatalog(
  overwrite: boolean,
): Promise<PromiseSettledResult<void>[]> {
  let seasons: Seasons = { seasons: [] };
  // Get a list of all seasons
  try {
    seasons = await request(GRAPHQL_ENDPOINT, listSeasonsQuery);
  } catch (err) {
    winston.error(err);
    throw err;
  }

  winston.info(`Fetched ${seasons.seasons.length} seasons`);
  fs.writeFileSync(
    `${STATIC_FILE_DIR}/seasons.json`,
    JSON.stringify(
      seasons.seasons
        .map((x) => x.season_code)
        .sort((a, b) => Number(b) - Number(a)),
    ),
  );

  // For each season, fetch all courses inside it and save
  // (if overwrite = true or if file does not exist)
  const processSeasons = seasons.seasons.map(async (season) => {
    const seasonCode = season.season_code;
    const outputPath = `${STATIC_FILE_DIR}/catalogs/${seasonCode}.json`;

    if (!overwrite && fs.existsSync(outputPath)) {
      winston.info(`Catalog for ${seasonCode} exists, skipping`);
      return;
    }

    let catalog: Catalog = { computed_listing_info: [] };

    try {
      catalog = await request(GRAPHQL_ENDPOINT, catalogBySeasonQuery, {
        season: seasonCode,
      });
    } catch (err) {
      winston.error(err);
      throw err;
    }

    fs.writeFileSync(outputPath, JSON.stringify(catalog.computed_listing_info));

    winston.info(
      `Fetched season ${seasonCode}: n=${catalog.computed_listing_info.length}`,
    );
  });

  return Promise.allSettled(processSeasons);
}
