import { DEFAULT_SCHOOL_CONFIG, mergeSchoolConfig } from './school-config.service';

describe('mergeSchoolConfig', () => {
  it('uses the defaults when the file is missing or not an object', () => {
    expect(mergeSchoolConfig(null)).toEqual(DEFAULT_SCHOOL_CONFIG);
    expect(mergeSchoolConfig('oops')).toEqual(DEFAULT_SCHOOL_CONFIG);
  });

  it('takes the school values and keeps defaults for blank or wrongly typed ones', () => {
    const c = mergeSchoolConfig({ schoolName: ' Iqra School ', shortName: '', logo: 5, icon: 'school/iqra.webp', lowAttendancePct: 80 });
    expect(c.schoolName).toBe('Iqra School');
    expect(c.icon).toBe('school/iqra.webp');
    expect(c.shortName).toBe(DEFAULT_SCHOOL_CONFIG.shortName);
    expect(c.logo).toBe(DEFAULT_SCHOOL_CONFIG.logo);
    expect(c.lowAttendancePct).toBe(80);
  });

  it('rejects an attendance cut-off outside 1-100', () => {
    expect(mergeSchoolConfig({ lowAttendancePct: 0 }).lowAttendancePct).toBe(75);
    expect(mergeSchoolConfig({ lowAttendancePct: 150 }).lowAttendancePct).toBe(75);
  });

  it('accepts an http(s) or relative apiUrl and trims the trailing slash', () => {
    expect(mergeSchoolConfig({ apiUrl: 'https://api.example.com/api/' }).apiUrl).toBe('https://api.example.com/api');
    expect(mergeSchoolConfig({ apiUrl: '/api' }).apiUrl).toBe('/api');
    expect(mergeSchoolConfig({ apiUrl: 'javascript:alert(1)' }).apiUrl).toBeUndefined();
  });
});
