const skillId = process.env.SKILL_ID;

export const DWD_WEBCAM_BASE_URL = 'https://opendata.dwd.de/weather/webcam';

if (!skillId) {
    throw new Error('SKILL_ID environment variable is required.');
}

export const SKILL_ID = skillId;
